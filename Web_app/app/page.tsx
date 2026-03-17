'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import { 
  Sparkles, 
  Monitor, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  Brain, 
  CloudCheck, 
  ChevronDown 
} from 'lucide-react';
import Logo from '@/components/Logo';
import { motion } from 'motion/react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-100 antialiased overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-yellow-500/10 bg-zinc-950/80 backdrop-blur-md px-6 md:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="/features" className="hover:text-yellow-500 transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-yellow-500 transition-colors">Pricing</Link>
            <Link href="/support" className="hover:text-yellow-500 transition-colors">Support</Link>
          </div>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="flex min-w-[100px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-yellow-500 text-zinc-950 text-sm font-bold transition-transform hover:scale-105">
                  Login
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-20">
        <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 py-20 text-center overflow-hidden">
          {/* 3D Holographic Visual Asset (Blurred Background) */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-40">
            <img 
              src="/assets/orb_bg.png" 
              alt="Eva Orb Background" 
              className="w-full max-w-[1200px] object-contain blur-[80px] scale-150 rotate-12"
            />
          </div>

          
          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-8">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex flex-col gap-4"
            >
              <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter drop-shadow-2xl">
                Eva
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
                Experience the sophisticated 3D holographic AI assistant designed for elegance and efficiency.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-6 w-full max-w-md"
            >
              <SignedIn>
                <Link href="/downloads" className="w-full">
                  <button className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-8 bg-yellow-500 text-zinc-950 text-lg font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all">
                    Download Now
                  </button>
                </Link>
                <div className="flex items-center gap-4 w-full">
                  <div className="h-[1px] flex-1 bg-yellow-500/20"></div>
                  <span className="text-yellow-500 text-xs font-bold tracking-widest uppercase italic">Logic with limited features inside your browser</span>
                  <div className="h-[1px] flex-1 bg-yellow-500/20"></div>
                </div>
                <Link href="/dashboard" className="w-full">
                  <button className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-8 bg-zinc-100/10 text-zinc-100 text-sm font-medium border border-zinc-100/20 hover:bg-zinc-100/20 transition-all backdrop-blur-sm">
                    Enter Eva Browser Mode
                  </button>
                </Link>
              </SignedIn>

              <SignedOut>
                <SignInButton mode="modal">
                   <button className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-8 bg-yellow-500 text-zinc-950 text-lg font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all">
                    Log in to Get Started
                  </button>
                </SignInButton>
              </SignedOut>
            </motion.div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
            <span className="text-[10px] tracking-[0.2em] uppercase text-yellow-500">Scroll to explore</span>
            <ChevronDown className="animate-bounce" size={20} />
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-24 px-6 md:px-20 bg-zinc-900/30">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-6">
              <span className="text-yellow-500 font-bold tracking-[0.3em] uppercase text-sm">The Vision</span>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                The Future of <br/><span className="text-yellow-500">Assistance</span>
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Eva is a premium AI companion that blends advanced neural intelligence with a seamless, holographic interface. Unlike traditional chatbots, Eva understands context, emotion, and subtle nuances in your daily workflow.
              </p>
              <div className="flex items-center gap-4 py-4">
                <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white">Intelligent Context</h4>
                  <p className="text-sm text-zinc-500">Memory that spans across all your devices.</p>
                </div>
              </div>
            </div>
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-yellow-500/20 group">
              <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBP2XE-MNDJiCC0yXrqmQrpWIq8l2mBNmGt0LuC0Z8GvSy_cLihwt0NBtHQE_erRoEDbjajlBOtJNqMKmxiNE5uuLelfGK48OfoeYSir_YwCnRHY2oHvgHiwzcrnJ4YN-IFrU27iLguWWnAYJu2CIurjhc47K49fGEVEVbL87XF48o9uJ7S0dkDnQ9RYzHCayRehaIQ7j7VmC1SA3BDC5iIc8ywzCKMALocv-5IkYxfXZdcIjhLz_ztN4UGC9qmu8NQU8MrXfjny3Lt" alt="Eva Visual" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
            </div>
          </div>
        </section>

        {/* Access Anywhere Section */}
        <section className="py-24 px-6 md:px-20 bg-zinc-950">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Access Anywhere</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto">Available across Desktop, Mobile, and Web platforms for constant connectivity.</p>
          </div>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card icon={<Monitor size={24} />} title="Sophisticated Desktop" description="A native experience for Windows and macOS, featuring deep system integration and low-latency response times." />
            <Card icon={<Smartphone size={24} />} title="Mobile On-the-Go" description="Stay connected with Eva via our iOS and Android apps. Voice commands and real-time syncing keep you productive." />
            <Card icon={<Globe size={24} />} title="Web Dashboard" description="No installation required. Access Eva's core brain from any modern browser with full security encryption." />
          </div>
        </section>

        {/* Security Section */}
        <section className="py-24 px-6 md:px-20 border-t border-yellow-500/10 bg-zinc-900/10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <img className="rounded-3xl shadow-2xl shadow-yellow-500/5 border border-white/5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwexpbUrDMTRhNATnUsLQ_K17BoAxYVjRVXi7SCFeM7CGJ5HOQta4YP1KJLogLwtrC9a4ABqHhiMb9fgGR87J0W7kzqqEPeXJyw06V6dEK-dNXIxgh9sRHgkuQ28dRy-2W8J8Tz3FrI3QrZnjHYSkCbrgyeadjLUWDyN3adkFixRO_pl9zkLCVyqY2BztE54aSQVTrQ1UdVYcp4aNlZrzStVu22KS4-l3JtselFFHpphjFd4EA_uO5Uo0pmMaZqweIT0ke5GmY7GO1" alt="Security" />
            </div>
            <div className="flex-1 flex flex-col gap-8">
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">Premium Security by Design</h2>
              <div className="grid gap-6">
                <SecurityItem icon={<ShieldCheck size={20} />} title="End-to-End Encryption" description="Your conversations are yours alone. We use military-grade AES-256 encryption." />
                <SecurityItem icon={<Brain size={20} />} title="Private Training" description="We never use your personal data to train public models. Your instance is unique." />
                <SecurityItem icon={<CloudCheck size={20} />} title="Data Portability" description="Download or delete your history at any time with a single tap." />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 text-center">
          <div className="max-w-3xl mx-auto bg-yellow-500/10 rounded-3xl p-12 border border-yellow-500/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to meet Eva?</h2>
            <p className="text-zinc-500 mb-10 text-lg">Join thousands of professionals using the world's most elegant AI assistant.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <button className="px-10 py-4 bg-yellow-500 text-zinc-950 font-bold rounded-xl hover:scale-105 transition-transform">Get Started Today</button>
              </Link>
              <Link href="/pricing">
                <button className="px-10 py-4 bg-transparent text-yellow-500 font-bold border border-yellow-500/50 rounded-xl hover:bg-yellow-500/5 transition-all">View Pricing</button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-yellow-500/10 bg-zinc-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo />
          <div className="flex gap-8 text-sm text-zinc-500">
            <Link href="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-yellow-500 transition-colors">Terms of Service</Link>
            <Link href="/support" className="hover:text-yellow-500 transition-colors">Contact Support</Link>
          </div>
          <div className="text-zinc-600 text-sm font-light">
            © 2024 Eva Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Card({ icon, title, description }: any) {
  return (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-500/50 transition-colors flex flex-col gap-4">
      <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500 mb-2">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h3>
      <p className="text-zinc-500 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function SecurityItem({ icon, title, description }: any) {
  return (
    <div className="flex gap-4">
      <div className="text-yellow-500 shrink-0 mt-1">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-zinc-200">{title}</h4>
        <p className="text-zinc-500 text-sm">{description}</p>
      </div>
    </div>
  );
}
