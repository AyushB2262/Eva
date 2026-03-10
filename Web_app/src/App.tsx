import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Folder, Video, VideoOff, Terminal, MonitorSmartphone, XSquare } from 'lucide-react';
import { useLiveSession } from './hooks/useLiveSession';
import { motion } from 'motion/react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import Login from './components/Login';
import Avatar3D from './components/Avatar3D';

export default function App() {
  const [connectedFiles, setConnectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Implemented Memory Constraints (Limit history to 2 logins, clear caches)
  useEffect(() => {
    if (!sessionStorage.getItem('evaSessionActive')) {
      sessionStorage.setItem('evaSessionActive', 'true');
      const loginCount = parseInt(localStorage.getItem('evaLoginCount') || '0', 10) + 1;

      if (loginCount > 2) {
        // Clear all previous caches safely
        console.log("Memory constraint reached: Clearing previous memories and caches to optimize AI performance.");
        indexedDB.deleteDatabase('eva_memory_db');
        localStorage.setItem('evaLoginCount', '1');
      } else {
        localStorage.setItem('evaLoginCount', loginCount.toString());
      }
    }
  }, []);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const { isConnected, connect, disconnect, audioVolume } = useLiveSession(connectedFiles, screenVideoRef, cameraEnabled);
  const [cameraActive, setCameraActive] = useState(false);
  const [screenActive, setScreenActive] = useState(false);

  // Privacy Bug Fix: Physically stop camera tracks when toggled off
  useEffect(() => {
    if (!isConnected || !cameraActive) return;

    if (!cameraEnabled) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getVideoTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    } else {
      if (videoRef.current && !videoRef.current.srcObject) {
        navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 } }
        }).then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
          }
        }).catch(err => {
          console.error("Failed to re-enable camera:", err);
          setCameraEnabled(false);
        });
      }
    }
  }, [cameraEnabled, isConnected, cameraActive]);
  const handleConnectFolder = async () => {
    try {
      // @ts-ignore - showDirectoryPicker is potentially not typed standardly everywhere
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });

      const allFiles: File[] = [];

      const ignoreDirs = ['.git', 'node_modules', 'dist', 'build', '.next'];

      async function getFilesRecursively(entry: any, path: string = '') {
        if (entry.kind === 'file') {
          if (entry.name.startsWith('.DS_Store')) return;
          const file = await entry.getFile();
          // Polyfill webkitRelativePath for our existing code
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: false
          });
          // Also store the handle on the file object for later writing/moving
          (file as any).handle = entry;
          allFiles.push(file);
        } else if (entry.kind === 'directory') {
          if (ignoreDirs.includes(entry.name)) return;

          for await (const handle of entry.values()) {
            await getFilesRecursively(handle, path + entry.name + '/');
          }
        }
      }

      await getFilesRecursively(dirHandle);

      // Store the root handle globally so we can use it to create new files later
      (window as any).__evaDirectoryHandle = dirHandle;

      setConnectedFiles(allFiles);
    } catch (err) {
      console.error("Failed to connect folder:", err);
      // User likely cancelled the prompt
    }
  };

  const toggleScreenShare = async () => {
    if (screenActive) {
      if (screenVideoRef.current && screenVideoRef.current.srcObject) {
        const stream = screenVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        screenVideoRef.current.srcObject = null;
      }
      setScreenActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        });
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.play();
        }
        setScreenActive(true);

        // Listen for user stopping screen share from browser built-in UI
        stream.getVideoTracks()[0].onended = () => {
          setScreenActive(false);
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        };

        // We also need to connect this to the Live API session. 
        // For MVP, we pass it down to useLiveSession, or we can just handle it similarly to webcam.
      } catch (err) {
        console.error("Failed to share screen:", err);
      }
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          }
        });
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
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                </div>
                <h1 className="text-xl font-medium tracking-tight">Eva Core</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleScreenShare}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${screenActive ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
              >
                {screenActive ? <XSquare size={16} /> : <MonitorSmartphone size={16} />}
                {screenActive ? 'Stop Sharing' : 'Share Screen'}
              </button>
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
                  : 'bg-yellow-500 text-zinc-950 hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
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
                <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 relative aspect-video shadow-lg group">
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${!cameraEnabled ? 'opacity-0' : 'opacity-100'}`}
                    muted
                    playsInline
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2">
                      <VideoOff size={24} />
                      <span className="text-xs font-medium uppercase tracking-wider">Camera Offline</span>
                    </div>
                  )}
                  {cameraActive && !cameraEnabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2">
                      <VideoOff size={24} />
                      <span className="text-xs font-medium uppercase tracking-wider">Camera Paused</span>
                    </div>
                  )}
                  {cameraActive && cameraEnabled && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                      <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-wider">Live</span>
                    </div>
                  )}

                  {/* Camera Toggle Button (Only show when connected) */}
                  {isConnected && (
                    <button
                      onClick={() => setCameraEnabled(!cameraEnabled)}
                      className={`absolute bottom-2 right-2 p-2 rounded-lg backdrop-blur-md border transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ${cameraEnabled
                        ? 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                        : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:text-red-300'
                        }`}
                      title={cameraEnabled ? "Pause Camera" : "Resume Camera"}
                    >
                      {cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                    </button>
                  )}
                </div>

                {/* Screen Share Feed */}
                <div className={`rounded-xl overflow-hidden bg-zinc-900 border border-yellow-500/30 relative aspect-video shadow-lg animate-in fade-in slide-in-from-top-4 ${!screenActive ? 'hidden' : ''}`}>
                  <video
                    ref={screenVideoRef}
                    className="w-full h-full object-contain bg-black"
                    muted
                    playsInline
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-yellow-500/20 backdrop-blur-md px-2 py-1 rounded-md border border-yellow-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></div>
                    <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider">Screen</span>
                  </div>
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
                <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 items-center justify-center overflow-hidden">
                  <Avatar3D volume={audioVolume} isConnected={isConnected} />
                </div>

              </div>
            </div>
          </main>
        </div>
      </SignedIn>
    </>
  );
}
