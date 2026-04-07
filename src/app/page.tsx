'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  HardDrive,
  Upload,
  Search,
  MoreVertical,
  File as FileIcon,
  Image as ImageIcon,
  Video,
  Settings as SettingsIcon,
  Trash2,
  Download,
  Plus,
  Folder,
  ChevronRight,
  ArrowLeft,
  X,
  Loader2,
  ExternalLink,
  Info,
  CheckCircle2,
  Copy,
  Lock,
  Unlock,
  Key,
  Maximize2,
  LogOut,
  CheckSquare,
  Square,
  Database,
  Layers,
  Activity,
  ShieldCheck,
  Sun,
  Moon,
  Link as LinkIcon,
  Settings,
  Eye,
  EyeOff,
  Github,
  Globe,
  Server,
  Package,
  AlertCircle
} from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useRouter } from 'next/navigation';

interface FileItemType {
  id: string;
  name: string;
  size: string;
  type: string;
  updated: string;
  key: string;
}

type ViewType = 'overview' | 'settings' | 'about';

export default function Dashboard() {
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // R2 Configuration State
  const [config, setConfig] = useState({
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: '',
    publicUrl: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    // Load config from localStorage
    const savedConfig = {
      endpoint: localStorage.getItem('r2_endpoint') || '',
      accessKeyId: localStorage.getItem('r2_access_key_id') || '',
      secretAccessKey: localStorage.getItem('r2_secret_access_key') || '',
      bucketName: localStorage.getItem('r2_bucket_name') || '',
      publicUrl: localStorage.getItem('r2_public_url') || ''
    };
    setConfig(savedConfig);

    if (savedConfig.endpoint && savedConfig.accessKeyId && savedConfig.secretAccessKey && savedConfig.bucketName) {
      setIsConfigured(true);
    }

    // Load theme
    const savedTheme = localStorage.getItem('r2_theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const saveConfig = (newConfig: typeof config) => {
    localStorage.setItem('r2_endpoint', newConfig.endpoint);
    localStorage.setItem('r2_access_key_id', newConfig.accessKeyId);
    localStorage.setItem('r2_secret_access_key', newConfig.secretAccessKey);
    localStorage.setItem('r2_bucket_name', newConfig.bucketName);
    localStorage.setItem('r2_public_url', newConfig.publicUrl);
    setConfig(newConfig);
    setIsConfigured(!!(newConfig.endpoint && newConfig.accessKeyId && newConfig.secretAccessKey && newConfig.bucketName));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('r2_theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [prefix, setPrefix] = useState('');
  const [items, setItems] = useState<{ folders: FileItemType[], files: FileItemType[] }>({ folders: [], files: [] });
  const [loading, setLoading] = useState(false);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [previewItem, setPreviewItem] = useState<{ item: FileItemType, url: string } | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storageStats, setStorageStats] = useState({
    imageBytes: 0, videoBytes: 0, otherBytes: 0, totalBytes: 0, totalFiles: 0, loaded: false
  });

  // Helper for R2 API requests with credentials in headers
  const r2Fetch = async (url: string, options: any = {}) => {
    const headers = {
      ...options.headers,
      'x-r2-endpoint': config.endpoint,
      'x-r2-access-key-id': config.accessKeyId,
      'x-r2-secret-access-key': config.secretAccessKey,
      'x-r2-bucket-name': config.bucketName,
    };
    return fetch(url, { ...options, headers });
  };

  const fetchStorageStats = async () => {
    if (!isConfigured) return;
    try {
      const res = await r2Fetch('/api/r2?action=storage-stats');
      const data = await res.json();
      if (!data.error) setStorageStats({ ...data, loaded: true });
    } catch { }
  };

  const parseSize = (sizeStr: string): number => {
    if (!sizeStr || sizeStr === '-') return 0;
    const match = sizeStr.match(/([0-9.]+)\s*(B|KB|MB|GB|TB)?/i);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    return val * (multipliers[unit] || 1);
  };

  const stats = useMemo(() => {
    const totalFolders = items.folders.length;
    const totalFiles = items.files.length;
    const imageFiles = items.files.filter(f => ['jpg', 'png', 'webp', 'jpeg', 'gif'].includes(f.type));
    const videoFiles = items.files.filter(f => ['mp4', 'mov', 'webm'].includes(f.type));
    const otherFiles = items.files.filter(f => !['jpg', 'png', 'webp', 'jpeg', 'gif', 'mp4', 'mov', 'webm'].includes(f.type));
    const imagesCount = imageFiles.length;
    const videosCount = videoFiles.length;

    const imageBytes = imageFiles.reduce((acc, f) => acc + parseSize(f.size), 0);
    const videoBytes = videoFiles.reduce((acc, f) => acc + parseSize(f.size), 0);
    const otherBytes = otherFiles.reduce((acc, f) => acc + parseSize(f.size), 0);
    const totalUsedBytes = imageBytes + videoBytes + otherBytes;
    const totalLimitBytes = 10 * 1024 ** 3; // 10 GB R2 Free Tier

    const fmt = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
      return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    };

    return {
      totalFolders, totalFiles, imagesCount, videosCount,
      totalItems: totalFiles + totalFolders,
      imageBytes, videoBytes, otherBytes, totalUsedBytes,
      totalLimitBytes, fmt,
      usedPct: (totalUsedBytes / totalLimitBytes) * 100,
    };
  }, [items]);

  const fetchItems = async () => {
    if (!isConfigured) return;
    setLoading(true);
    setSelectedKeys(new Set());
    try {
      const res = await r2Fetch(`/api/r2?prefix=${encodeURIComponent(prefix)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data);
    } catch (err: any) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isConfigured && activeView === 'overview') {
      fetchItems();
      fetchStorageStats();
    }
  }, [isConfigured, prefix, activeView]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isConfigured) return;
      const data = e.clipboardData;
      if (!data) return;
      const files: File[] = [];
      if (data.files && data.files.length > 0) {
        for (let i = 0; i < data.files.length; i++) {
          const f = data.files[i];
          if (f.name === 'image.png' || f.name === 'blob' || !f.name) {
            const ext = f.type.split('/')[1] || 'png';
            files.push(new File([f], `pasted-${Date.now()}-${i}.${ext}`, { type: f.type }));
          } else {
            files.push(f);
          }
        }
      } else if (data.items) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              const ext = item.type.split('/')[1] || 'png';
              files.push(new File([blob], `pasted-${Date.now()}-${i}.${ext}`, { type: item.type }));
            }
          }
        }
      }
      if (files.length > 0) handleFileUploads(files);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isConfigured, prefix]);

  const handleFileUploads = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadFileName(file.name);
        const sanitizedName = file.name.replace(/\s+/g, '-');
        const key = `${prefix}${sanitizedName}`;
        const authRes = await r2Fetch(`/api/r2?action=get-upload-url&key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`);
        const authData = await authRes.json();
        if (!authData.url) throw new Error(authData.error || "Failed to get upload URL");

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', authData.url, true);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
          };
          xhr.onload = () => (xhr.status === 200 || xhr.status === 204) ? resolve(true) : reject(new Error('Upload failed'));
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(file);
        });
      }
      fetchItems();
      fetchStorageStats();
    } catch (err: any) { alert(err.message); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if (isConfigured) setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (isConfigured && e.dataTransfer.files.length > 0) handleFileUploads(e.dataTransfer.files);
  };

  const createFolder = async () => {
    if (!newFolderName) return;
    try {
      const formData = new FormData();
      formData.append("folderName", newFolderName.trim().replace(/\s+/g, '-'));
      formData.append("prefix", prefix);
      const res = await r2Fetch("/api/r2", { method: "POST", body: formData });
      if (res.ok) { setShowFolderModal(false); setNewFolderName(""); fetchItems(); }
    } catch (err) { console.error(err); }
  };

  const deleteItem = async (key: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await r2Fetch(`/api/r2?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (res.ok) fetchItems();
    } catch (err) { console.error(err); }
  };

  const bulkDelete = async () => {
    const count = selectedKeys.size;
    if (!confirm(`Are you sure you want to delete ${count} items?`)) return;
    setLoading(true);
    try {
      for (const key of Array.from(selectedKeys)) {
        await r2Fetch(`/api/r2?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      }
      fetchItems();
    } catch (err) { alert("Some items failed to delete"); fetchItems(); }
  };

  const toggleSelect = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) newSelected.delete(key); else newSelected.add(key);
    setSelectedKeys(newSelected);
  };

  const selectAll = () => {
    const allItems = [...items.folders, ...items.files];
    if (selectedKeys.size === allItems.length) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(allItems.map(i => i.key)));
  };

  const openPreview = async (item: FileItemType) => {
    let url = "";
    if (config.publicUrl) {
      const encodedPath = item.key.split('/').map(part => encodeURIComponent(part)).join('/');
      url = `${config.publicUrl}/${encodedPath}`;
    } else {
      const res = await r2Fetch(`/api/r2?action=download&key=${encodeURIComponent(item.key)}`);
      const data = await res.json();
      if (data.url) url = data.url;
    }
    setPreviewItem({ item, url });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { filteredAndSortedItems, totalPages, paginatedItems } = useMemo(() => {
    const list = [...items.folders, ...items.files]
      .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        const dateA = new Date(a.updated).getTime() || 0;
        const dateB = new Date(b.updated).getTime() || 0;
        return dateB - dateA;
      });
    const total = Math.ceil(list.length / ITEMS_PER_PAGE);
    return { filteredAndSortedItems: list, totalPages: total, paginatedItems: list.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) };
  }, [items, searchQuery, currentPage]);

  const renderConfigStep = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full p-8 md:p-12 glass rounded-[3rem] border-white/10 shadow-2xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/20">
          <Database size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">Initialize Node</h2>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Connect your Cloudflare R2 Bucket</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Endpoint URL</label>
          <input
            type="text" placeholder="https://<account-id>.r2.cloudflarestorage.com"
            value={config.endpoint} onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-cyan-500/50 transition-all text-sm font-bold"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Access Key ID</label>
            <input
              type="text" placeholder="Access Key"
              value={config.accessKeyId} onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-cyan-500/50 transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Secret Access Key</label>
            <div className="relative">
              <input
                type={showSecrets ? "text" : "password"} placeholder="Secret Key"
                value={config.secretAccessKey} onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-cyan-500/50 transition-all text-sm font-bold"
              />
              <button onClick={() => setShowSecrets(!showSecrets)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors">
                {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Bucket Name</label>
            <input
              type="text" placeholder="my-bucket"
              value={config.bucketName} onChange={(e) => setConfig({ ...config, bucketName: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-cyan-500/50 transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Public URL (Optional)</label>
            <input
              type="text" placeholder="https://pub-xxxx.r2.dev"
              value={config.publicUrl} onChange={(e) => setConfig({ ...config, publicUrl: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none focus:border-cyan-500/50 transition-all text-sm font-bold"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => saveConfig(config)}
        disabled={!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucketName}
        className="w-full mt-8 py-5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 disabled:cursor-not-allowed text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-cyan-600/20 active:scale-95"
      >
        Synchronize Node
      </button>

      <p className="mt-6 text-[8px] font-bold text-center uppercase tracking-widest opacity-30 px-4">
        Credentials are stored locally in your browser's persistent storage and never sent to our servers except for direct API proxying to Cloudflare.
      </p>
    </motion.div>
  );

  const renderOverview = () => (
    <div className="flex flex-col xl:flex-row gap-8 pb-32 md:pb-0">
      <div className="flex-1">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-xs font-bold text-foreground/40 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
          <button onClick={() => setPrefix('')} className="hover:text-foreground transition-colors uppercase tracking-widest">ROOT</button>
          {prefix.split('/').filter(Boolean).map((part, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <ChevronRight size={12} className="opacity-40" />
              <button onClick={() => setPrefix(arr.slice(0, i + 1).join('/') + '/')} className="hover:text-foreground transition-colors uppercase tracking-widest">{part}</button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3">
              {prefix ? (
                <button onClick={() => {
                  const parts = prefix.split('/').filter(Boolean); parts.pop();
                  setPrefix(parts.length ? parts.join('/') + '/' : '');
                }}><ArrowLeft size={18} className="text-foreground/20 hover:text-foreground transition-colors" /></button>
              ) : null}
              <span className="truncate opacity-80">{prefix.split('/').filter(Boolean).pop() || "Cloud Explorer"}</span>
            </h2>
            {items.files.length + items.folders.length > 0 && (
              <button onClick={selectAll} className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-foreground/[0.03] border border-foreground/[0.05] hover:bg-foreground/[0.08] text-[9px] font-black uppercase tracking-[0.2em] transition-all text-foreground/40">
                {selectedKeys.size === [...items.folders, ...items.files].length && selectedKeys.size > 0 ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
          <button onClick={() => setShowFolderModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/[0.05] hover:bg-foreground/[0.08] text-[9px] font-black uppercase tracking-widest transition-all text-foreground/60">
            <Plus size={14} className="text-cyan-600" /> FOLDER
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-8 h-8 border-4 border-foreground/5 border-t-cyan-600 rounded-full animate-spin"></div>
            <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 italic">Syncing Entities...</p>
          </div>
        ) : items.files.length === 0 && items.folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-20">
            <Cloud size={64} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Entity Layer</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4 md:gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedItems.map((item) => (
                  <motion.div key={item.key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <FileItem
                      item={item}
                      isSelected={selectedKeys.has(item.key)}
                      onSelect={() => toggleSelect(item.key)}
                      onFolderClick={() => setPrefix(item.key)}
                      onDelete={() => deleteItem(item.key)}
                      onPreview={() => openPreview(item)}
                      onCopy={() => {
                        const url = config.publicUrl ? `${config.publicUrl}/${item.key.split('/').map(p => encodeURIComponent(p)).join('/')}` : item.key;
                        navigator.clipboard.writeText(url);
                        setCopiedKey(item.key);
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      isCopied={copiedKey === item.key}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/5 font-black text-[9px] uppercase tracking-widest disabled:opacity-10">Prev</button>
                <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] italic">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-5 py-2 rounded-xl bg-foreground/[0.03] border border-foreground/5 font-black text-[9px] uppercase tracking-widest disabled:opacity-10">Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Storage Sidebar */}
      <aside className="w-full xl:w-72 mt-10 xl:mt-0 flex flex-col gap-4">
        <div className="p-6 bg-foreground/[0.02] backdrop-blur-xl rounded-[2rem] border border-foreground/[0.05] overflow-hidden relative">
          {!storageStats.loaded && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.03] to-transparent animate-[shimmer_1.5s_infinite] pointer-events-none" />}
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-5 flex items-center gap-2">
            <HardDrive size={12} className="text-cyan-600" /> STORAGE
          </h3>
          <div className="mb-4">
            <div className="flex items-end gap-1.5 mb-1">
              <span className="text-2xl font-black tracking-tighter text-foreground/90">{storageStats.loaded ? stats.fmt(storageStats.totalBytes) : '—'}</span>
              <span className="text-[10px] font-bold text-foreground/30 mb-1">/ 10 GB</span>
            </div>
            <p className="text-[9px] text-foreground/20 font-bold uppercase tracking-widest">
              {storageStats.loaded ? `${((storageStats.totalBytes / (10 * 1024 ** 3)) * 100).toFixed(3)}% used` : 'Calculating…'}
            </p>
          </div>
          <div className="h-2 w-full bg-foreground/[0.05] rounded-full overflow-hidden flex mb-6">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(storageStats.imageBytes / (10 * 1024 ** 3)) * 100}%` }} className="h-full bg-cyan-500" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${(storageStats.videoBytes / (10 * 1024 ** 3)) * 100}%` }} className="h-full bg-purple-500" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${(storageStats.otherBytes / (10 * 1024 ** 3)) * 100}%` }} className="h-full bg-amber-500" />
          </div>
          <div className="space-y-3">
            <StatItem label="Images" value={stats.fmt(storageStats.imageBytes)} color="bg-cyan-500" />
            <StatItem label="Videos" value={stats.fmt(storageStats.videoBytes)} color="bg-purple-500" />
            <StatItem label="Other" value={stats.fmt(storageStats.otherBytes)} color="bg-amber-500" />
          </div>
          <button onClick={fetchStorageStats} className="mt-6 w-full py-2 rounded-xl text-[8px] font-black uppercase tracking-widest text-foreground/20 hover:bg-foreground/[0.03] transition-all">↻ Refresh Stats</button>
        </div>

        <div className="p-5 bg-foreground/[0.02] rounded-[2rem] border border-foreground/[0.05]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/20 mb-4 flex items-center gap-2">
            <Activity size={12} className="text-cyan-600" /> OVERVIEW
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Entities</span>
              <span className="text-[10px] font-black">{storageStats.totalFiles}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Active Dir</span>
              <span className="text-[10px] font-black">{prefix || 'ROOT'}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center">
          <SettingsIcon size={24} className="text-cyan-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">Configuration</h2>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System Node Parameters</p>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] p-8 border-white/10 space-y-6">
        <div className="grid gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Endpoint</label>
            <input type="text" value={config.endpoint} onChange={e => setConfig({ ...config, endpoint: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-cyan-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Access Key</label>
              <input type="text" value={config.accessKeyId} onChange={e => setConfig({ ...config, accessKeyId: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-cyan-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Secret Key</label>
              <input type="password" value={config.secretAccessKey} onChange={e => setConfig({ ...config, secretAccessKey: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Bucket Name</label>
              <input type="text" value={config.bucketName} onChange={e => setConfig({ ...config, bucketName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-cyan-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Public URL</label>
              <input type="text" value={config.publicUrl} onChange={e => setConfig({ ...config, publicUrl: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-cyan-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={() => saveConfig(config)} className="flex-1 py-5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all">Update Node</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-8 py-5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-red-500/20">Wipe Data</button>
        </div>
      </div>

      <div className="p-8 bg-foreground/[0.02] rounded-[2.5rem] border border-foreground/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-foreground/[0.05] flex items-center justify-center">
            <Github size={20} className="opacity-40" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest">Open Source Core</p>
            <p className="text-[9px] font-bold opacity-30">License: MIT</p>
          </div>
        </div>
        <button className="px-6 py-3 rounded-xl bg-foreground/[0.05] border border-foreground/[0.05] text-[9px] font-black uppercase tracking-widest hover:bg-foreground/[0.1] transition-all">View Repository</button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen relative bg-background text-foreground transition-colors duration-500 overflow-hidden font-sans">
      <SplashScreen />

      {!isConfigured ? (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-background p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(8,145,178,0.05),transparent_70%)] pointer-events-none" />
          {renderConfigStep()}
        </div>
      ) : (
        <div className="relative z-10 flex h-screen flex-col md:flex-row">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex w-64 border-r border-foreground/[0.05] bg-sidebar backdrop-blur-3xl flex-col p-8">
            <div className="flex items-center gap-3 px-2 mb-12">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-800 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
                <span className="font-black text-sm text-white tracking-tight select-none">R2</span>
              </div>
              <div>
                <span className="font-black text-xs tracking-widest uppercase block">OpenSource</span>
                <span className="text-[8px] font-black text-cyan-600 uppercase tracking-[0.2em]">Data Node</span>
              </div>
            </div>

            <nav className="flex-1 space-y-4">
              <SidebarItem icon={<Package size={18} />} label="Files" active={activeView === 'overview'} onClick={() => setActiveView('overview')} />
              <SidebarItem icon={<LinkIcon size={18} />} label="Remote" active={false} onClick={() => router.push('/remote')} />
              <SidebarItem icon={<SettingsIcon size={18} />} label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
            </nav>

            <div className="mt-auto space-y-4 pt-8 border-t border-foreground/[0.05]">
              <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.05]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">System Online</span>
              </div>
            </div>
          </aside>

          <section className="flex-1 flex flex-col overflow-hidden">
            <header className="h-20 border-b border-foreground/[0.05] flex items-center justify-between px-8 md:px-12 bg-background/50 backdrop-blur-2xl">
              <div className="flex items-center gap-6 flex-1">
                <div className="relative max-w-[280px] w-full group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/10 group-focus-within:text-cyan-600 transition-colors" size={14} />
                  <input
                    type="text" placeholder="FILTER ENTITIES..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-foreground/[0.03] border border-foreground/[0.05] rounded-2xl py-2.5 pl-12 pr-6 outline-none focus:bg-foreground/[0.06] focus:border-cyan-500/20 transition-all text-[11px] font-bold"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-foreground/[0.03] border border-foreground/[0.05] text-foreground/20 hover:text-cyan-600 hover:bg-foreground/[0.06] transition-all active:scale-95">
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <input type="file" multiple hidden ref={fileInputRef} onChange={(e) => handleFileUploads(e.target.files || [])} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center px-8 h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-cyan-600/20"
                >
                  <Upload size={16} className="mr-3" /> Upload
                </button>
              </div>
            </header>

            <div
              className="flex-1 overflow-y-auto p-8 md:p-12 no-scrollbar"
              onDragOver={handleDragOver}
            >
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                {activeView === 'overview' ? renderOverview() : renderSettings()}
              </motion.div>
            </div>
          </section>

          {/* Drag Overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] bg-cyan-600/10 backdrop-blur-sm flex items-center justify-center p-12"
                onDragOver={e => e.preventDefault()} onDragLeave={handleDragLeave} onDrop={handleDrop}
              >
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-2xl aspect-video rounded-[4rem] border-4 border-dashed border-cyan-500/50 bg-background/90 flex flex-col items-center justify-center gap-6 shadow-2xl">
                  <div className="w-24 h-24 rounded-full bg-cyan-600/10 flex items-center justify-center text-cyan-500 animate-bounce">
                    <Upload size={48} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Drop to Upload</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Entities will synchronize with R2 Node</p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Action Bar */}
          <AnimatePresence>
            {selectedKeys.size > 0 && (
              <motion.div initial={{ y: 100, x: '-50%' }} animate={{ y: 0, x: '-50%' }} exit={{ y: 100, x: '-50%' }} className="fixed bottom-10 left-1/2 z-[5000] min-w-[450px] bg-background/90 backdrop-blur-xl rounded-[2.5rem] p-6 border border-cyan-500/30 shadow-2xl flex items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 flex items-center justify-center text-cyan-600 font-black italic text-xl">{selectedKeys.size}</div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Entities Selected</p>
                    <p className="text-[10px] font-bold">Synchronized Layer Actions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedKeys(new Set())} className="px-6 py-3 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.05] text-[9px] font-black uppercase tracking-widest transition-all">Cancel</button>
                  <button onClick={bulkDelete} className="px-8 py-3 rounded-xl bg-red-500 text-white shadow-xl shadow-red-500/20 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-600">Delete Permanently</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Progress */}
      <AnimatePresence>
        {uploading && (
          <div className="fixed bottom-10 right-10 z-[6000] w-80 glass rounded-[2.5rem] p-6 border-white/10 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 flex items-center justify-center text-cyan-500 animate-spin"><Loader2 size={24} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-30 truncate mb-1">{uploadFileName}</p>
                <p className="text-xl font-black italic tracking-tighter">{uploadProgress}%</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-cyan-600 shadow-[0_0_20px_rgba(8,145,178,0.5)]" />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[7000] flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => setPreviewItem(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-5xl max-h-full rounded-[3rem] overflow-hidden flex flex-col">
              <div className="absolute top-8 right-8 z-20">
                <button onClick={() => setPreviewItem(null)} className="w-14 h-14 rounded-2xl bg-white/5 text-white/40 hover:text-white transition-all backdrop-blur-xl border border-white/10 flex items-center justify-center"><X size={24} /></button>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                {['jpg', 'png', 'webp', 'jpeg', 'gif'].includes(previewItem.item.type) ? (
                  <img src={previewItem.url} className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl" alt="" />
                ) : ['mp4', 'mov', 'webm'].includes(previewItem.item.type) ? (
                  <VideoPlayer src={previewItem.url} className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden" />
                ) : (
                  <div className="flex flex-col items-center gap-6 opacity-20">
                    <FileIcon size={80} strokeWidth={1} />
                    <p className="text-xs font-black uppercase tracking-[0.5em]">No Preview Available</p>
                  </div>
                )}
              </div>
              <div className="p-8 bg-white/5 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-black italic tracking-tighter text-white/90">{previewItem.item.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{previewItem.item.size} • {previewItem.item.type}</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => window.open(previewItem.url, '_blank')} className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all">Download</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Folder Modal */}
      <AnimatePresence>
        {showFolderModal && (
          <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowFolderModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md glass rounded-[3rem] p-10 border-white/10 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 flex items-center justify-center text-cyan-600"><Folder size={24} /></div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">New Entity Dir</h3>
              </div>
              <input
                autoFocus type="text" placeholder="DIRECTORY NAME..."
                value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 outline-none focus:border-cyan-500/50 transition-all text-sm font-bold mb-8"
              />
              <div className="flex gap-4">
                <button onClick={() => setShowFolderModal(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all">Cancel</button>
                <button onClick={createFolder} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white [10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-cyan-600/20">Create</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${active ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-600/20' : 'text-foreground/30 hover:bg-foreground/[0.03] hover:text-foreground/70'}`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function StatItem({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${color} opacity-40 group-hover:opacity-100 transition-opacity`} />
        <span className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest group-hover:text-foreground/50 transition-colors">{label}</span>
      </div>
      <span className="text-[10px] font-black">{value}</span>
    </div>
  );
}

function FileItem({ item, isSelected, onSelect, onFolderClick, onDelete, onPreview, onCopy, isCopied }: any) {
  const isFolder = item.type === 'folder';

  return (
    <div
      className={`group relative aspect-square rounded-[2.5rem] border transition-all duration-500 cursor-pointer overflow-hidden ${isSelected ? 'bg-cyan-600/5 border-cyan-500/50 shadow-2xl shadow-cyan-500/10' : 'bg-foreground/[0.02] border-foreground/[0.05] hover:bg-foreground/[0.04] hover:border-foreground/[0.1] hover:scale-[1.02]'}`}
      onClick={() => isFolder ? onFolderClick() : onPreview()}
    >
      <div className="absolute top-5 left-5 z-10" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <div className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${isSelected ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-foreground/[0.03] border-foreground/[0.07] text-transparent group-hover:text-foreground/10 group-hover:border-foreground/20'}`}>
          <CheckCircle2 size={14} />
        </div>
      </div>

      <div className="absolute top-5 right-5 z-10 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
        <div className="flex gap-2">
          {!isFolder && (
            <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-xl border border-foreground/[0.1] text-foreground/40 hover:text-cyan-600 transition-all shadow-xl">
              {isCopied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-xl border border-foreground/[0.1] text-foreground/40 hover:text-red-500 transition-all shadow-xl">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${isSelected ? 'bg-cyan-600/20 text-cyan-600 scale-110 rotate-3' : 'bg-foreground/[0.03] text-foreground/20 group-hover:bg-foreground/[0.08] group-hover:text-cyan-600/40 group-hover:-rotate-3'}`}>
          {isFolder ? <Folder size={32} strokeWidth={1.5} /> : ['jpg', 'png', 'webp', 'jpeg', 'gif'].includes(item.type) ? <ImageIcon size={32} strokeWidth={1.5} /> : ['mp4', 'mov', 'webm'].includes(item.type) ? <Video size={32} strokeWidth={1.5} /> : <FileIcon size={32} strokeWidth={1.5} />}
        </div>
        <div className="text-center px-2">
          <p className="text-[11px] font-black italic tracking-tighter truncate max-w-[140px] mb-1">{item.name}</p>
          <p className="text-[8px] font-black uppercase tracking-widest opacity-20">{isFolder ? 'Directory' : `${item.size} • ${item.type}`}</p>
        </div>
      </div>
    </div>
  );
}
