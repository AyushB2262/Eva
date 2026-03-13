import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Search, 
  Sparkles, 
  Shield, 
  MessagesSquare, 
  ChevronDown, 
  Headset, 
  Gauge, 
  CheckCircle2, 
  Star,
  MessageSquare,
  Bolt,
  BarChart3,
  Layers3
} from 'lucide-react';
import Logo from '../components/Logo';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react';

export default function Features() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-zinc-950 text-zinc-100 font-sans overflow-x-hidden">
      {/* Navigation */}
      <header className="flex items-center justify-between border-b border-yellow-500/10 px-6 md:px-20 py-4 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex flex-1 justify-end gap-8">
          <div className="hidden md:flex items-center gap-9 text-sm font-medium text-zinc-400">
            <Link to="/features" className="text-yellow-500">Features</Link>
            <Link to="/pricing" className="hover:text-yellow-500 transition-colors">Pricing</Link>
            <Link to="/support" className="hover:text-yellow-500 transition-colors">Support</Link>
          </div>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-5 bg-yellow-500 text-zinc-950 text-sm font-bold transition-all hover:brightness-110">
                Get Started
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <main className="flex flex-1 justify-center py-10">
        <div className="layout-content-container flex flex-col max-w-[1200px] flex-1 px-6 md:px-10">
          {/* Hero Section */}
          <section className="flex flex-col gap-8 py-10 md:py-20 lg:flex-row items-center">
            <div className="w-full bg-center bg-no-repeat aspect-square md:aspect-video bg-cover rounded-xl shadow-2xl shadow-yellow-500/10 border border-yellow-500/20" 
                 style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA1-d9nxMh3UmwugpSVErQcmtM7fTousA25ndahi0iNYVD8ZCiLkanqSc7yz5n6VOteut7p9AowAd0TJAFHk1y-xu5VeGeahW3Lnjmtzcp6R4UNDXx1wigZetwUF0zyImfcLrsnCEYbxFMnE0ibcXaM6uTwgEQy-ykCf79ow7XYK4th3UmJ4GSXBXUd751ggOkM9R-m5eRBg_tAvc3ZPxyInhXsFV7OEdgQyunz-P1VcqikGtHKc7_X4UNx_OvPfeaZBsVGArdYjLNa")' }}>
            </div>
            <div className="flex flex-col gap-6 lg:min-w-[450px] lg:justify-center">
              <div className="flex flex-col gap-3">
                <span className="text-yellow-500 font-bold tracking-widest text-xs uppercase">Elite Performance</span>
                <h1 className="text-white text-4xl md:text-7xl font-black leading-tight tracking-tighter">
                  Next-Gen Intelligence
                </h1>
                <p className="text-zinc-500 text-lg font-normal leading-relaxed max-w-[500px]">
                  Experience a premium AI assistant that doesn't just respond, but anticipates. Designed with a stunning 3D holographic interface for unparalleled interaction.
                </p>
              </div>
              <div className="flex gap-4">
                <button className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-yellow-500 text-zinc-950 text-base font-bold transition-all hover:scale-105">
                  Start Free Trial
                </button>
                <button className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-base font-bold transition-all hover:bg-yellow-500/20">
                  Watch Demo
                </button>
              </div>
            </div>
          </section>

          {/* Statistics */}
          <div className="flex flex-wrap gap-4 py-8">
            <StatCard icon={<Gauge size={20} />} label="Response Time" value="< 0.5s" hint="Ultra-low latency processing" />
            <StatCard icon={<CheckCircle2 size={20} />} label="Task Accuracy" value="99.9%" hint="Precision-tuned neural engine" />
            <StatCard icon={<Star size={20} />} label="Satisfaction" value="4.9/5" hint="Rated top-tier by power users" />
          </div>

          {/* Core Capabilities Grid */}
          <div className="flex flex-col gap-12 py-16">
            <div className="flex flex-col gap-4 text-center items-center">
              <h2 className="text-yellow-500 font-bold tracking-widest text-sm uppercase">Capabilities</h2>
              <h1 className="text-white text-3xl md:text-5xl font-black tracking-tighter">
                Redefining Human-AI Synergy
              </h1>
              <p className="text-zinc-500 text-lg font-normal max-w-[800px]">
                Eva combines elegance with unmatched computational power to handle your most complex tasks through a specialized ecosystem of features.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeatureCard 
                img="https://lh3.googleusercontent.com/aida-public/AB6AXuCK7XUiLoM8ZDTcCFzypQna4vhJc7pDOkTLu-6JIABOp0-Fpv-6JkrHNf491YrCY_tB52lGnuQf-N3Yi1ES_mUYvmkcYzzMznbmJl5noFJ5UIglUK2jFW580aTNfuYJX3KzCCwVRtB5xdTPxxEmtU00ywWHwHyJERw5HjPV5_59GaiL-nIKA-_1tdQlGiTyWdTJc2vQNMgICWM0tjMF7470yNXMRpC9kDfZkyc1E-iUuAJbukzl1EZLO-dbPYsQe4jCrzADZplmQbJL"
                icon={<MessageSquare size={24} />}
                title="Natural Conversations"
                description="Engage in fluid, human-like dialogue that understands context, tone, and nuance. Eva remembers previous interactions to build a personalized relationship over time."
              />
              <FeatureCard 
                img="https://lh3.googleusercontent.com/aida-public/AB6AXuA6ezlhYV3II3U6ME2A4_f2hO84IBJgfrdRT1Ou9Bz47xhBYhHxfY8lV6ZSmWrOz6UFwqtsAHsN-RH211elecNulVKLm9R-N1VhOxMw9QdazxrDR6kheId62Z_-ZsqDx2rN-IKMk089Ry5WAy5ixyA2PMZm2Z_WYtnTaFUvsvmTLAOagOFOFDvcVJIAXHCkrUkqO_6PIyip_8PjRsNPMVkxKOwzIchnVbXPb9AE4pvEcaoWHC_0Cln4X1EVWP3-y6wfniNIeswkqt1D"
                icon={<Bolt size={24} />}
                title="Smart Automation"
                description="Streamline your workflow with AI that handles repetitive tasks autonomously. From scheduling to complex data entry, Eva manages the details while you focus on the vision."
              />
              <FeatureCard 
                img="https://lh3.googleusercontent.com/aida-public/AB6AXuCRaxXuze2e6qxcrTA0ukreNASB6tJVlN0TSbHsVOy2zYayhEurQbUTuJAQkY568BPB_aImTpl4zEiqZMkfSGbGqWTSa0W5DyufkslfMoGQhBEV79PMhHdkIdL8S97-zm875WaiXj7Aq67yEg8rpX1IyalgfMdLtFfx5fX6uIPRc1qmaasw2eZcMW_CDhgSIA97nASge-jDzKptrGjrW8JwMEfnkF3xOfaUVlApnwIlewKotCIXmqodMRCP74LTlLi2IX8WKS8NjfH6"
                icon={<BarChart3 size={24} />}
                title="Proactive Insights"
                description="Receive timely suggestions and data-driven insights before you even ask. Eva monitors your preferred data streams to highlight opportunities and risks in real-time."
              />
              <FeatureCard 
                img="https://lh3.googleusercontent.com/aida-public/AB6AXuCsVQiIPmzY9MOzDLEmUEhxxJ7igeFOOsVxptF18gLx6jl9kgQf1XFht5JTBK1PzLTu0m1dLu6c7vuc-Hwx7-c_pp9oh4NdCrDGect2cmkgkIfr42Zz3CNCr981sXWSjsAZOkFu6IqMlqYHcFaQRJ-ELTjCtGQYL5otR0X919AVjrmTA0wQylBlH2EgcP1T7A4TE-qvN3bq1o4K-352CqXU86HISMb3LGYq0GMlKUaE-TYCCK7tOMCyxMP0QW5HG8O-xk-rXB4yHi_4"
                icon={<Layers3 size={24} />}
                title="3D Holographic AI"
                description="A tactile, visual representation of Eva. Interact with a beautiful 3D interface that brings your digital world to life, responding to touch, voice, and presence."
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className="my-16 rounded-3xl bg-yellow-500/5 p-10 md:p-20 text-center border border-yellow-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col items-center gap-8">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">Ready to upgrade your reality?</h2>
              <p className="text-zinc-500 text-lg max-w-[600px]">Join thousands of professionals who have already integrated Eva into their daily high-performance workflows.</p>
              <Link to="/dashboard">
                <button className="flex min-w-[200px] cursor-pointer items-center justify-center rounded-lg h-14 px-8 bg-yellow-500 text-zinc-950 text-lg font-bold shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform">
                  Get Started Now
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-yellow-500/10 py-10 px-6 md:px-20 bg-zinc-950">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo className="opacity-50" />
          <div className="flex gap-8 text-zinc-500 text-sm">
            <Link to="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-yellow-500 transition-colors">Terms of Service</Link>
            <Link to="/support" className="hover:text-yellow-500 transition-colors">Contact Support</Link>
          </div>
          <p className="text-zinc-600 text-sm">© 2024 Eva AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: any) {
  return (
    <div className="flex min-w-[200px] flex-1 flex-col gap-2 rounded-xl p-8 border border-yellow-500/10 bg-yellow-500/5">
      <div className="flex items-center gap-2 text-yellow-500">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-widest font-mono">{label}</p>
      </div>
      <p className="text-white tracking-tighter text-4xl font-black leading-tight">{value}</p>
      <p className="text-yellow-500/80 text-xs font-medium uppercase tracking-tight">{hint}</p>
    </div>
  );
}

function FeatureCard({ img, icon, title, description }: any) {
  return (
    <div className="group flex flex-col gap-5 p-6 rounded-2xl bg-zinc-900/40 border border-yellow-500/5 hover:border-yellow-500/30 transition-all">
      <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl grayscale group-hover:grayscale-0 transition-all duration-500" 
           style={{ backgroundImage: `url("${img}")` }}></div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-yellow-500">
          {icon}
          <h3 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h3>
        </div>
        <p className="text-zinc-500 leading-relaxed text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}
