# 🚀 R2 Data Node - Open Source Cloud Explorer

A premium, open-source Cloudflare R2 management dashboard. Built for developers who want a beautiful, local-first interface to manage their cloud objects.

![Premium UI](https://res.cloudinary.com/dqr68vsqp/image/upload/v1700000000/r2-node-preview.png)

## ✨ Features

- **Premium Aesthetics**: Glassmorphism, dark mode, and vibrant micro-animations.
- **Zero-Config Deployment**: Users can input their own R2 credentials directly in the browser.
- **Secure by Default**: Credentials are stored in `localStorage` and sent only in request headers to the backend proxy.
- **Remote Sync**: Upload files directly from URLs (including Google Drive) to your R2 bucket.
- **File Browser**: Upload, delete, preview (images & video), and manage folders seamlessly.
- **Storage Insights**: Real-time bucket usage statistics and entity breakdown.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + Vanilla CSS Transitions
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Cloud SDK**: AWS SDK for S3 (R2 Compatible)

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/your-username/r2-data-node.git
cd r2-data-node
npm install
```

### 2. Run Locally
```bash
npm run dev
```

### 3. Initialize Node
Open `http://localhost:3000` and enter your Cloudflare R2 credentials:
- **Endpoint**: Found in your Cloudflare R2 dashboard (Account ID based).
- **Access Key / Secret Key**: Created via R2 API Tokens.
- **Bucket Name**: Your target bucket.

## 🔒 Security Note

This application is designed to be run locally or by trusted users. When configured via the UI, credentials are stored in the browser's `localStorage`. The server acts as a proxy for the S3 client to avoid CORS issues and keep your secrets away from public bucket access.

## 📄 License

MIT License. Feel free to fork, modify, and distribute.

---
Built with ❤️ for the Open Source Community.
