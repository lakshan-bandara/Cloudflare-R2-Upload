import { NextRequest, NextResponse } from "next/server";
import { 
    ListObjectsV2Command, 
    DeleteObjectCommand, 
    PutObjectCommand, 
    GetObjectCommand 
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    
    // If user provides their own keys, they are implicitly authorized for those keys
    if (accessKeyId && secretAccessKey && request.headers.get("x-r2-access-key-id")) {
        return true;
    }

    // Fallback to legacy password auth for server-side env vars
    const authHeader = request.headers.get("authorization");
    return authHeader === process.env.ADMIN_PASSWORD;
};

// Helper: Format file size
const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    try {
        const { endpoint, accessKeyId, secretAccessKey, bucketName } = getR2Config(request);
        if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
            return NextResponse.json({ error: "Missing R2 configuration" }, { status: 400 });
        }

        const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
        const { searchParams } = new URL(request.url);
        const prefix = searchParams.get("prefix") || "";
        const action = searchParams.get("action");
        const key = searchParams.get("key");
        const contentType = searchParams.get("contentType");

        // Action: Get download URL
        if (action === "download" && key) {
            const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
            const url = await getSignedUrl(client, command, { expiresIn: 3600 });
            return NextResponse.json({ url });
        }

        // Action: Get DIRECT UPLOAD URL for large files
        if (action === "get-upload-url" && key) {
            const command = new PutObjectCommand({ 
                Bucket: bucketName, 
                Key: key,
                ContentType: contentType || "application/octet-stream"
            });
            const url = await getSignedUrl(client, command, { expiresIn: 3600 });
            return NextResponse.json({ url });
        }

        // Action: True bucket-wide storage stats (no delimiter = flat list of ALL objects)
        if (action === "storage-stats") {
            const IMAGE_EXTS = new Set(['jpg','jpeg','png','webp','gif','svg','bmp','ico']);
            const VIDEO_EXTS = new Set(['mp4','mov','webm','avi','mkv','m4v']);
            let imageBytes = 0, videoBytes = 0, otherBytes = 0, totalFiles = 0;
            let token: string | undefined = undefined;
            do {
                const cmd = new ListObjectsV2Command({
                    Bucket: bucketName,
                    ContinuationToken: token,
                });
                const res = await client.send(cmd) as any;
                for (const obj of (res.Contents || [])) {
                    const ext = (obj.Key?.split('.').pop() || '').toLowerCase();
                    const bytes = obj.Size || 0;
                    if (!obj.Key?.endsWith('/')) { // skip folder markers
                        totalFiles++;
                        if (IMAGE_EXTS.has(ext)) imageBytes += bytes;
                        else if (VIDEO_EXTS.has(ext)) videoBytes += bytes;
                        else otherBytes += bytes;
                    }
                }
                token = res.NextContinuationToken;
            } while (token);
            return NextResponse.json({ imageBytes, videoBytes, otherBytes, totalFiles, totalBytes: imageBytes + videoBytes + otherBytes });
        }

        let allFolders: any[] = [];
        let allFiles: any[] = [];
        let continuationToken: string | undefined = undefined;

        do {
            const command: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                Delimiter: "/",
                ContinuationToken: continuationToken,
            });

            const response = await client.send(command) as any;
            
            const fetchedFolders = (response.CommonPrefixes || []).map((cp: any) => ({
                id: cp.Prefix,
                name: cp.Prefix?.replace(prefix, "").replace("/", "") || "",
                type: "folder",
                size: "-",
                updated: "-",
                key: cp.Prefix,
            }));

            const fetchedFiles = (response.Contents || [])
                .filter((obj: any) => obj.Key !== prefix)
                .map((obj: any) => ({
                    id: obj.Key,
                    name: obj.Key?.split('/').pop() || "",
                    type: obj.Key?.split(".").pop()?.toLowerCase() || "file",
                    size: formatSize(obj.Size || 0),
                    updated: obj.LastModified?.toISOString() || "",
                    key: obj.Key,
                }));

            allFolders = [...allFolders, ...fetchedFolders];
            allFiles = [...allFiles, ...fetchedFiles];
            continuationToken = response.NextContinuationToken;

        } while (continuationToken);

        const uniqueFolders = Array.from(new Map(allFolders.map(f => [f.key, f])).values());

        return NextResponse.json({ folders: uniqueFolders, files: allFiles });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    try {
        const { endpoint, accessKeyId, secretAccessKey, bucketName } = getR2Config(request);
        const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
        
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const prefix = formData.get("prefix") as string || "";
        const folderName = formData.get("folderName") as string;

        if (folderName) {
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: `${prefix}${folderName}/`,
                Body: "",
            });
            await client.send(command);
            return NextResponse.json({ success: true, message: "Folder created" });
        }

        if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
        const arrayBuffer = await file.arrayBuffer();
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: `${prefix}${file.name}`,
            Body: new Uint8Array(arrayBuffer),
            ContentType: file.type,
        });

        await client.send(command);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    try {
        const { endpoint, accessKeyId, secretAccessKey, bucketName } = getR2Config(request);
        const client = createR2Client(endpoint, accessKeyId, secretAccessKey);
        
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");
        if (!key) return NextResponse.json({ error: "Key required" }, { status: 400 });

        const command = new DeleteObjectCommand({ Bucket: bucketName, Key: key });
        await client.send(command);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
