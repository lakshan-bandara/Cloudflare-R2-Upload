import { NextRequest, NextResponse } from "next/server";
import { Upload } from "@aws-sdk/lib-storage";
import { createR2Client } from "@/lib/r2";

// Helper to get R2 configuration from headers or environment
const getR2Config = (request: NextRequest) => {
    const endpoint = request.headers.get("x-r2-endpoint") || process.env.R2_ENDPOINT || "";
    const accessKeyId = request.headers.get("x-r2-access-key-id") || process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = request.headers.get("x-r2-secret-access-key") || process.env.R2_SECRET_ACCESS_KEY || "";
    const bucketName = request.headers.get("x-r2-bucket-name") || process.env.R2_BUCKET_NAME || "";

    return { endpoint, accessKeyId, secretAccessKey, bucketName };
};

// Security Helper: Check if request is authorized
const isAuthorized = (request: NextRequest) => {
    const { accessKeyId, secretAccessKey } = getR2Config(request);
    if (accessKeyId && secretAccessKey && request.headers.get("x-r2-access-key-id")) {
        return true;
    }
    const authHeader = request.headers.get("authorization");
    return authHeader === process.env.ADMIN_PASSWORD;
};

// Helper: Convert Google Drive link and handle Large Files / Confirmation tokens
const getGoogleDriveStream = async (url: string) => {
  const GDrivePattern = /(?:https?:\/\/)?(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([\w-]+)/;
  const match = url.match(GDrivePattern);
  if (!match || !match[1]) return null;

  const fileId = match[1];
  const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // First request to get cookies and the confirm token
  const initialResponse = await fetch(initialUrl, { 
    headers: { 'User-Agent': userAgent },
    cache: 'no-store'
  });
  
  const text = await initialResponse.text();
  const setCookie = initialResponse.headers.get("set-cookie") || "";

  // More aggressive parsing for the confirm token
  const tokenMatch = text.match(/[&;]confirm=([0-9a-zA-Z_]+)/) || text.match(/confirm=([0-9a-zA-Z_]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (token) {
    return {
        url: `${initialUrl}&confirm=${token}`,
        headers: {
            'User-Agent': userAgent,
            'Cookie': setCookie
        } as Record<string, string>
    };
  }

  return { 
    url: initialUrl, 
    headers: { 'User-Agent': userAgent } as Record<string, string>
  };
};

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    try {
        const { endpoint, accessKeyId, secretAccessKey, bucketName } = getR2Config(request);
        if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
            return NextResponse.json({ error: "Missing R2 configuration" }, { status: 400 });
        }

        const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
        const { url, prefix = "", fileName } = await request.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        let downloadUrl = url;
        let downloadHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        
        // Handle Google Drive Specifics
        if (url.includes("drive.google.com")) {
            const gdResult = await getGoogleDriveStream(url);
            if (gdResult) {
                downloadUrl = gdResult.url;
                downloadHeaders = { ...downloadHeaders, ...gdResult.headers };
            }
        }
        
        // Use fetch to get the file stream from the remote URL
        const response = await fetch(downloadUrl, { 
            headers: downloadHeaders,
            cache: 'no-store'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch remote file: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error("Empty response body from remote source");
        }

        // Get Metadata
        let detectedContentType = response.headers.get("content-type") || "application/octet-stream";
        let finalFileName = fileName;

        if (!finalFileName) {
            const contentDisp = response.headers.get("content-disposition");
            if (contentDisp && contentDisp.includes("filename=")) {
                finalFileName = contentDisp.split("filename=")[1].replace(/["']/g, "").split(";")[0].trim();
            } else {
                const urlObj = new URL(url);
                finalFileName = urlObj.pathname.split("/").pop();
                if (!finalFileName || finalFileName === "" || finalFileName === "view" || finalFileName === "uc") {
                    const ext = detectedContentType.split("/")[1]?.split(";")[0] || "bin";
                    finalFileName = `remote-file-${Date.now()}.${ext}`;
                }
            }
        }

        const key = `${prefix}${finalFileName}`;

        // Stream the data to R2 using @aws-sdk/lib-storage's Upload
        const parallelUploads3 = new Upload({
            client: client,
            params: {
              Bucket: bucketName,
              Key: key,
              Body: response.body, // Web Stream (ReadableStream)
              ContentType: detectedContentType,
            },
            queueSize: 4, 
            partSize: 5 * 1024 * 1024, 
            leavePartsOnError: false, 
        });

        await parallelUploads3.done();

        return NextResponse.json({ 
            success: true, 
            message: "Remote file uploaded successfully",
            key: key
        });

    } catch (error: any) {
        console.error("Remote upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
