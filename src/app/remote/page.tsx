'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  ArrowLeft, 
  Link as LinkIcon, 
  File as FileIcon, 
  UploadCloud, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Folder,
  ChevronDown,
  Database,
  Search,
  Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FolderItem {
  id: string;
  name: string;
  key: string;
}

export default function RemoteUploadPage() {
  const router = useRouter();
  
  const [config, setConfig] = useState({
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);
  
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const savedConfig = {
      endpoint: localStorage.getItem('r2_endpoint') || '',
      accessKeyId: localStorage.getItem('r2_access_key_id') || '',
      secretAccessKey: localStorage.getItem('r2_secret_access_key') || '',
      bucketName: localStorage.getItem('r2_bucket_name') || ''
    };
    setConfig(savedConfig);
    if (savedConfig.endpoint && savedConfig.accessKeyId && savedConfig.secretAccessKey && savedConfig.bucketName) {
      setIsConfigured(true);
      fetchFolders(savedConfig);
    } else {
      router.push('/'); // Redirect to setup if not configured
    }
  }, []);

  const r2Fetch = async (url: string, options: any = {}, overrideConfig?: typeof config) => {
    const c = overrideConfig || config;
    const headers = {
      ...options.headers,
      'x-r2-endpoint': c.endpoint,
      'x-r2-access-key-id': c.accessKeyId,
      'x-r2-secret-access-key': c.secretAccessKey,
      'x-r2-bucket-name': c.bucketName,
    };
    return fetch(url, { ...options, headers });
  };

  const fetchFolders = async (c: typeof config) => {
    setIsLoadingFolders(true);
    try {
      const res = await r2Fetch('/api/r2', {}, c);
      const data = await res.json();
      if (data.folders) {
        setFolders([{ id: 'root', name: 'ROOT (/)', key: '' }, ...data.folders]);
      }
    } catch (err) {
      console.error("Failed to fetch folders", err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const uploadFiles = async (files: File[] | FileList) => {
    setIsUploading(true);
    setStatus({ type: null, message: '' });
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const sanitizedName = file.name.replace(/\s+/g, '-');
        const key = `${prefix}${sanitizedName}`;

        const authRes = await r2Fetch(`/api/r2?action=get-upload-url&key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`);
        const authData = await authRes.json();
        
        if (!authRes.ok || !authData.url) throw new Error(authData.error || "Failed to get upload URL");

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
      setStatus({ type: 'success', message: `Successfully uploaded ${files.length} file(s)!` });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setIsUploading(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await r2Fetch('/api/remote-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prefix, fileName: fileName.trim() || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: 'Remote file synced successfully!' });
        setUrl(''); setFileName('');
      } else throw new Error(data.error || 'Upload failed');
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally { setIsUploading(false); }
  };

  if (!isConfigured) return null;

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-cyan-600/5 to-transparent pointer-events-none" />
      
      <header className="relative z-10 h-20 border-b border-foreground/[0.05] flex items-center justify-between px-8 md:px-12 backdrop-blur-md bg-background/30">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center hover:bg-foreground/[0.08] transition-all group"
          >
            <ArrowLeft size={18} className="text-foreground/40 group-hover:text-foreground group-hover:-translate-x-0.5 transition-all" />
          </button>
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-800 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Cloud size={20} className="text-white" />
             </div>
             <h1 className="text-lg font-black tracking-widest uppercase">Remote <span className="text-cyan-600">Sync</span></h1>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto py-16 px-8">
        <div className="mb-16">
           <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-4 uppercase leading-none">
              Initialize <span className="opacity-20">Remote</span> Sync
           </h2>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/30 max-w-md">
              Stream entities directly from URL to R2 Node.
           </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3">
              <form onSubmit={handleRemoteUpload} className="space-y-8 glass p-10 rounded-[3rem] border-white/5">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-20 ml-6 block">SOURCE ENTITY URL</label>
                    <div className="relative group">
                       <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-600/40" size={18} />
                       <input 
                          type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." 
                          className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pl-16 pr-6 outline-none focus:border-cyan-500/50 transition-all font-bold text-sm"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest opacity-20 ml-6 block">CUSTOM NAME</label>
                       <input 
                          type="text" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Optional..." 
                          className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-6 outline-none focus:border-white/20 transition-all font-bold text-sm"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest opacity-20 ml-6 block">TARGET PATH</label>
                       <div className="relative">
                          <button 
                             type="button" onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                             className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-6 outline-none flex items-center justify-between hover:bg-white/10 transition-all font-bold text-sm"
                          >
                             <span className="truncate">{prefix || 'ROOT /'}</span>
                             <ChevronDown size={18} className={`transition-transform duration-300 ${showFolderDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                             {showFolderDropdown && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 top-full left-0 w-full mt-2 max-h-60 overflow-y-auto bg-background border border-white/10 rounded-3xl shadow-2xl p-4 space-y-1">
                                   {isLoadingFolders ? (
                                      <div className="p-8 flex flex-col items-center gap-3"><Loader2 size={24} className="animate-spin text-cyan-500" /></div>
                                   ) : folders.map(folder => (
                                      <button key={folder.id} type="button" onClick={() => { setPrefix(folder.key); setShowFolderDropdown(false); }} className={`w-full text-left px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${prefix === folder.key ? 'bg-cyan-600/10 text-cyan-600' : 'hover:bg-white/5 opacity-40'}`}>{folder.name}</button>
                                   ))}
                                </motion.div>
                             )}
                          </AnimatePresence>
                       </div>
                    </div>
                 </div>

                 <button 
                    disabled={isUploading || !url}
                    className="w-full relative overflow-hidden py-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-20 shadow-xl shadow-cyan-600/20 mt-4"
                 >
                    <div className="flex items-center justify-center gap-3">
                       {isUploading ? <><Loader2 size={18} className="animate-spin" /> {uploadProgress > 0 ? `SYNCING ${uploadProgress}%` : 'INITIALIZING...'}</> : <><UploadCloud size={18} /> START REMOTE SYNC</>}
                    </div>
                 </button>
              </form>

              <AnimatePresence>
                 {status.type && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-8 p-8 rounded-[2.5rem] border flex items-start gap-5 ${status.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-500' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>
                       {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-1">{status.type === 'success' ? 'SYNC COMPLETE' : 'PROTOCOL ERROR'}</p>
                          <p className="text-sm font-bold tracking-tight opacity-80">{status.message}</p>
                       </div>
                    </motion.div>
                 )}
              </AnimatePresence>
           </motion.div>

           <aside className="lg:col-span-2 space-y-8">
              <div className="p-10 bg-foreground/[0.02] border border-foreground/[0.05] rounded-[3rem] backdrop-blur-3xl min-h-[400px]">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-8 flex items-center gap-2"><Database size={14} className="text-cyan-600" /> NODE SPECS</h3>
                 <div className="space-y-8">
                    <SpecItem icon={<Globe size={18} />} title="Global Edge" desc="Files are fetched by Cloudflare Workers at the edge for maximum speed." />
                    <SpecItem icon={<Database size={18} />} title="R2 Storage" desc="S3-compatible object storage with zero egress fees." />
                    <SpecItem icon={<LinkIcon size={18} />} title="G-Drive Proxy" desc="Automatically resolves sharing links to direct streams." />
                 </div>
              </div>
           </aside>
        </div>
      </div>
    </main>
  );
}

function SpecItem({ icon, title, desc }: any) {
  return (
    <div className="flex gap-4">
       <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] flex items-center justify-center text-cyan-600/40 shrink-0">{icon}</div>
       <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 italic">{title}</p>
          <p className="text-[10px] font-bold text-foreground/30 leading-relaxed uppercase tracking-tight">{desc}</p>
       </div>
    </div>
  );
}

function Globe(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
