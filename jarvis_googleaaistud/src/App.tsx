import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Folder, Video, VideoOff, Terminal } from 'lucide-react';
import { useLiveSession } from './hooks/useLiveSession';
import { motion } from 'motion/react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import Login from './components/Login';

export default function App() {
  const [connectedFiles, setConnectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isConnected, connect, disconnect, audioVolume } = useLiveSession(connectedFiles);
  const [cameraActive, setCameraActive] = useState(false);

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
    <>
      <SignedOut>
        <Login />
      </SignedOut>
      <SignedIn>
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">      {/* Header */}
          <header className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md z-20 relative">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                <h1 className="text-xl font-medium tracking-tight">Jarvis Core</h1>
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
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${isConnected
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50'
                  : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
              >
                {isConnected ? <MicOff size={16} /> : <Mic size={16} />}
                {isConnected ? 'Disconnect' : 'Initialize System'}
              </button>
              <div className="ml-2 flex items-center justify-center">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-9 h-9 border border-zinc-800"
                    }
                  }}
                />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 relative overflow-hidden">
            {/* Dashboard View */}
            <div className="absolute inset-0 flex transition-opacity duration-300 opacity-100 z-10">
              {/* Left Panel: Camera & Files */}
              <div className="w-[340px] border-r border-zinc-800 bg-zinc-900/30 flex flex-col p-4 gap-4 overflow-y-auto">
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

              {/* Central & Right Panels Container */}
              <div className="flex-1 flex flex-row relative h-full">

                {/* Center Panel: Orb */}
                <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 items-center justify-center">
                  <motion.div
                    animate={{
                      scale: isConnected ? 1 + audioVolume * 0.4 : 1, // Pulse dynamically to voice. Max scale 1.4 when loud.
                      opacity: isConnected ? Math.max(0.8, audioVolume) : 0.3
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                      mass: 0.5
                    }}
                    className="relative w-72 h-72 flex items-center justify-center"
                  >
                    <div className={`absolute inset-0 rounded-full blur-3xl transition-colors duration-1000 ${isConnected ? 'bg-emerald-500/20' : 'bg-zinc-500/10'}`}></div>
                    <div className={`w-36 h-36 rounded-full border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl transition-all duration-1000 ${isConnected ? 'shadow-emerald-500/30 bg-emerald-500/5' : 'bg-zinc-800/20'}`}>
                      <div className={`w-20 h-20 rounded-full transition-colors duration-1000 ${isConnected ? 'bg-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.5)]' : 'bg-zinc-700/50'}`}></div>
                    </div>
                  </motion.div>
                </div>

              </div>
            </div>
          </main>
        </div>
      </SignedIn>
    </>
  );
}
