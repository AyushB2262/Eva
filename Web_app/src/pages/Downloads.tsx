import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  Download, 
  ExternalLink, 
  Apple, 
  Play, 
  CheckCircle, 
  ShieldCheck 
} from 'lucide-react';
import Logo from '../components/Logo';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react';

export default function Downloads() {
  return (
    <div className="relative flex flex-col w-full min-h-screen bg-zinc-950 text-zinc-100 font-sans">


      {/* Navigation */}
      <header className="flex items-center justify-between border-b border-yellow-500/10 px-6 py-4 lg:px-20 bg-zinc-950 sticky top-0 z-50">
        <Link to="/">
          <Logo />
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium hover:text-yellow-500 transition-colors">Home</Link>
          <Link to="/features" className="text-sm font-medium hover:text-yellow-500 transition-colors">Features</Link>
          <Link to="/pricing" className="text-sm font-medium hover:text-yellow-500 transition-colors">Pricing</Link>
          <Link to="/support" className="text-sm font-medium hover:text-yellow-500 transition-colors">Support</Link>
          <SignedOut>
            <SignInButton mode="modal">
               <button className="bg-yellow-500 text-zinc-950 px-6 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 lg:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight text-white">
            Bring Eva to <span className="text-yellow-500">every screen</span>
          </h1>
          <p className="text-zinc-500 text-lg md:text-xl max-w-2xl mx-auto">
            Seamlessly sync your conversations, tasks, and data across desktop and mobile. Experience the most advanced AI assistant wherever you go.
          </p>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          <DownloadCard 
            icon={<Monitor size={28} />} 
            title="Windows" 
            version="v2.4.0 • 120MB" 
            platform="Windows 10+" 
          />
          <DownloadCard 
            icon={<Apple size={28} />} 
            title="macOS" 
            version="v2.4.0 • 115MB" 
            platform="macOS 11.0+" 
          />
          
          {/* Web App Card */}
          <div className="bg-yellow-500/5 p-6 rounded-xl border border-yellow-500/40 flex flex-col items-center text-center shadow-lg hover:bg-yellow-500/10 transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-yellow-500 text-zinc-950 text-[10px] font-bold px-2 py-0.5 rounded-bl">INSTANT</div>
            <div className="size-14 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 text-yellow-500">
              <Globe size={28} />
            </div>
            <h3 className="text-lg font-bold mb-1 text-white uppercase tracking-tight">Web App</h3>
            <p className="text-zinc-500 text-xs mb-6 flex-1">
              No installation required<br/>Works in any browser
            </p>
            <div className="w-full space-y-3">
              <Link to="/dashboard" className="w-full">
                <button className="w-full bg-yellow-500 text-zinc-950 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                  <ExternalLink size={16} />
                  Open in Web
                </button>
              </Link>
              <p className="text-[10px] text-zinc-600 leading-tight">
                Note: Web version features are limited to maintain user privacy.
              </p>
            </div>
          </div>

          <DownloadCard 
            icon={<Play size={28} />} 
            title="Android" 
            version="v2.3.5 • 45MB" 
            platform="Google Play Store" 
            isMobile
          />
          <DownloadCard 
            icon={<Apple size={28} />} 
            title="iOS & iPadOS" 
            version="v2.3.5 • 52MB" 
            platform="Requires iOS 14.0+" 
            isMobile
          />


        </div>

        {/* Features Preview */}
        <div className="bg-zinc-900/50 rounded-2xl p-8 lg:p-12 border border-white/5 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">The full desktop experience</h2>
            <ul className="space-y-4 text-zinc-500">
              <li className="flex items-center gap-3 justify-center lg:justify-start">
                <CheckCircle className="text-yellow-500" size={20} />
                Native performance and hardware acceleration
              </li>
              <li className="flex items-center gap-3 justify-center lg:justify-start">
                <CheckCircle className="text-yellow-500" size={20} />
                Customizable keyboard shortcuts for instant access
              </li>
              <li className="flex items-center gap-3 justify-center lg:justify-start">
                <CheckCircle className="text-yellow-500" size={20} />
                Offline processing for core AI features
              </li>
            </ul>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-bold text-yellow-500 uppercase tracking-widest font-mono">
                <ShieldCheck size={18} />
                Secure End-to-End Sync
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2">
            <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white/5 bg-zinc-950">
               <img 
                 className="w-full aspect-video object-cover opacity-80" 
                 src="https://lh3.googleusercontent.com/aida-public/AB6AXuCetIqnC9HGGTJAqEZxRxCD44J3j6BbWlsErLkDZq659hLCjvZDAUOsetGvgz4JO7PjpNIoCEyHqO04srYgOrrLSe3z8u0JsGeIju1NlB0qz0BdrJeXpwwh3-2iJOeOoPDVG71HA2LscgzVGnyOs9xdfphE_ri786iFJI-SUJPPAyHTSMUMva1jhxj4xNC5BDeKjQmFXagRnmJ2SuTL0UjwbhavxtgcCihkmfnnPyuEI-wszmmbFqs0-BrrhPBBtl_PVbbpXv7trTDC" 
                 alt="Desktop Interface" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent"></div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-zinc-950 py-12 px-6 mt-auto border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo className="opacity-50" />
          <div className="flex gap-8 text-sm font-medium text-zinc-500">
            <Link to="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-yellow-500 transition-colors">Terms of Service</Link>
            <Link to="/release-notes" className="hover:text-yellow-500 transition-colors">Release Notes</Link>
            <Link to="/support" className="hover:text-yellow-500 transition-colors">Help Center</Link>
          </div>
          <div className="text-zinc-600 text-xs">
            © 2024 Eva AI Technologies Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function DownloadCard({ icon, title, version, platform, isMobile = false }: any) {
  return (
    <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/5 flex flex-col items-center text-center shadow-sm hover:border-yellow-500/30 transition-all">
      <div className="size-14 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 text-yellow-500">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-1 text-white uppercase tracking-tight">{title}</h3>
      <p className="text-zinc-600 text-[10px] uppercase font-mono tracking-tight mb-6 flex-1">
        {version}<br/>{platform}
      </p>
      <button className="w-full bg-yellow-500 text-zinc-950 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all">
        <Download size={16} />
        {isMobile ? 'Get App' : 'Download'}
      </button>
    </div>
  );
}


