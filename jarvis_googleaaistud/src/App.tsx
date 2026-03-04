import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Folder, Video, VideoOff, Terminal } from 'lucide-react';
import { useLiveSession } from './hooks/useLiveSession';
import { motion } from 'motion/react';

export default function App() {
  const [connectedFiles, setConnectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isConnected, connect, disconnect, transcripts } = useLiveSession(connectedFiles);
  const [cameraActive, setCameraActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log'>('dashboard');

  const handleConnectFolder = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setConnectedFiles(filesArray);
    }
  };

  const toggleConnection = async () => {
    if (isConnected) {
      disconnect();
      setCameraActive(false);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
        connect(videoRef.current!);
      } catch (err) {
        console.error("Failed to access camera:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md z-20 relative">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <h1 className="text-xl font-medium tracking-tight">Jarvis Core</h1>
          </div>
          <div className="flex bg-zinc-800/50 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('log')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'log' ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              System Log
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            webkitdirectory="" 
            directory="" 
            multiple 
          />
          <button
            onClick={handleConnectFolder}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm font-medium"
          >
            <Folder size={16} />
            {connectedFiles.length > 0 ? `${connectedFiles.length} Files Connected` : 'Connect Folder'}
          </button>
          <button
            onClick={toggleConnection}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              isConnected 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50' 
                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}
          >
            {isConnected ? <MicOff size={16} /> : <Mic size={16} />}
            {isConnected ? 'Disconnect' : 'Initialize System'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {/* Dashboard View */}
        <div className={`absolute inset-0 flex transition-opacity duration-300 ${activeTab === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
          {/* Left Panel: Camera & Files */}
          <div className="w-80 border-r border-zinc-800 bg-zinc-900/30 flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Camera Feed */}
            <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 relative aspect-video shadow-lg">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                muted 
                playsInline
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <VideoOff size={24} />
                  <span className="text-xs font-medium uppercase tracking-wider">Camera Offline</span>
                </div>
              )}
              {cameraActive && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider">Live</span>
                </div>
              )}
            </div>

            {/* File Explorer */}
            <div className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col shadow-lg">
              <div className="flex items-center gap-2 mb-4 text-zinc-400">
                <Folder size={16} />
                <h2 className="text-xs font-medium uppercase tracking-wider">Connected Files</h2>
              </div>
              {connectedFiles.length > 0 ? (
                <ul className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  {connectedFiles.map((file, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-800/50 transition-colors cursor-default">
                      <div className="w-1 h-1 rounded-full bg-zinc-600"></div>
                      <span className="truncate font-mono text-xs">{file.webkitRelativePath || file.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2 text-center px-4">
                  <Folder size={24} className="opacity-50" />
                  <p className="text-xs">No directory connected. Connect a folder to grant file access.</p>
                </div>
              )}
            </div>
          </div>

          {/* Center Panel: Orb */}
          <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
            {/* Central Orb */}
            <div className="flex-1 flex items-center justify-center relative">
              <motion.div 
                animate={{ 
                  scale: isConnected ? [1, 1.05, 1] : 1,
                  opacity: isConnected ? [0.8, 1, 0.8] : 0.3
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className="relative w-64 h-64 flex items-center justify-center"
              >
                <div className={`absolute inset-0 rounded-full blur-3xl transition-colors duration-1000 ${isConnected ? 'bg-emerald-500/20' : 'bg-zinc-500/10'}`}></div>
                <div className={`w-32 h-32 rounded-full border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl transition-all duration-1000 ${isConnected ? 'shadow-emerald-500/20 bg-emerald-500/5' : 'bg-zinc-800/20'}`}>
                  <div className={`w-16 h-16 rounded-full transition-colors duration-1000 ${isConnected ? 'bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-zinc-700/50'}`}></div>
                </div>
              </motion.div>
            </div>

            {/* Real-time Transcript Overlay */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 pointer-events-none">
              <div className="bg-zinc-950/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 min-h-[100px] justify-end">
                {transcripts.length === 0 ? (
                  <p className="text-zinc-500 text-sm font-mono italic text-center">Awaiting voice input...</p>
                ) : (
                  transcripts.slice(-2).map((t, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={transcripts.length - 2 + i} 
                      className={`flex flex-col gap-1 ${t.role === 'User' ? 'items-end' : 'items-start'}`}
                    >
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${t.role === 'User' ? 'text-blue-400' : 'text-emerald-500'}`}>{t.role}</span>
                      <p className={`text-sm ${t.role === 'User' ? 'text-blue-100' : 'text-zinc-300'} line-clamp-2`}>{t.text}</p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Log View */}
        <div className={`absolute inset-0 flex flex-col bg-zinc-950 p-6 overflow-y-auto transition-opacity duration-300 custom-scrollbar ${activeTab === 'log' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-20">
            <div className="flex items-center gap-2 text-zinc-500 mb-4 border-b border-zinc-800 pb-4 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10 pt-2">
              <Terminal size={18} />
              <h2 className="text-sm font-mono uppercase tracking-wider">Communication Log</h2>
            </div>
            {transcripts.length === 0 ? (
              <p className="text-zinc-600 text-sm font-mono italic text-center mt-10">Awaiting input...</p>
            ) : (
              transcripts.map((t, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={`flex flex-col gap-1 ${t.role === 'User' ? 'items-end' : 'items-start'}`}
                >
                  <span className={`text-xs font-mono uppercase tracking-wider ${t.role === 'User' ? 'text-blue-400' : 'text-emerald-500'}`}>{t.role}</span>
                  <div className={`p-4 rounded-2xl max-w-[80%] ${t.role === 'User' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-50' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.text}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
