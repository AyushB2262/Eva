import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, Shield, MessagesSquare, ChevronDown, Headset } from 'lucide-react';
import Logo from '../components/Logo';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react';

export default function Support() {
  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-yellow-500/10 px-6 py-4 lg:px-20 bg-zinc-950 sticky top-0 z-50 backdrop-blur-md bg-zinc-950/80">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link to="/features" className="hover:text-yellow-500 transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-yellow-500 transition-colors">Pricing</Link>
            <Link to="/support" className="text-yellow-500">Support</Link>
          </nav>
          <SignedOut>
            <SignInButton mode="modal">
               <button className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-yellow-500 text-zinc-950 text-sm font-bold tracking-[0.015em] hover:opacity-90 transition-opacity">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-6 py-16 lg:py-24 text-center max-w-4xl mx-auto">
          <span className="text-yellow-500 font-semibold tracking-widest uppercase text-xs">Premium Support</span>
          <h2 className="mt-4 text-4xl lg:text-7xl font-black tracking-tighter">How can we help you?</h2>
          <p className="mt-4 text-zinc-500 text-lg">Search our documentation or contact our elite concierge team.</p>
          <div className="mt-10 relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-yellow-500">
              <Search size={20} />
            </div>
            <input 
              className="w-full bg-zinc-900 border border-yellow-500/10 rounded-xl py-4 pl-12 pr-4 focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all placeholder:text-zinc-600 text-white" 
              placeholder="Search for answers, guides, or troubleshooting..." 
              type="text"
            />
          </div>
        </section>

        {/* Quick Links */}
        <section className="px-6 py-12 lg:px-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SupportCard 
              icon={<Sparkles size={24} />} 
              title="Getting Started" 
              description="Learn how to personalize Eva's voice, personality, and workflow integrations." 
            />
            <SupportCard 
              icon={<Shield size={24} />} 
              title="Security & Privacy" 
              description="Understanding our enterprise-grade encryption and data protection policies." 
            />
            <SupportCard 
              icon={<MessagesSquare size={24} />} 
              title="Community" 
              description="Join the Eva Inner Circle to share prompts and advanced use cases with others." 
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-6 py-20 lg:px-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-2">
            <FaqItem question="How do I upgrade to the Concierge Tier?" />
            <FaqItem question="Can I use Eva offline for sensitive tasks?" />
            <FaqItem question="Does Eva support multi-language voice interaction?" />
            <FaqItem question="How can I export my chat history?" />
          </div>
        </section>

        {/* Contact Section */}
        <section className="px-6 py-20 bg-yellow-500/5 border-t border-yellow-500/10 mb-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="lg:w-1/2 space-y-6">
                <h2 className="text-4xl font-black tracking-tighter">Still need help?</h2>
                <p className="text-zinc-500 text-lg">Our dedicated support team is available 24/7 to ensure your AI experience is seamless and productive.</p>
                <div className="flex gap-4">
                  <button className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold px-8 py-3 rounded-lg transition-colors">Contact Support</button>
                  <button className="border border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-bold px-8 py-3 rounded-lg transition-colors">Live Chat</button>
                </div>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="bg-zinc-900 p-1 rounded-2xl shadow-2xl border border-yellow-500/20">
                  <div className="bg-yellow-500/5 h-64 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent"></div>
                    <Headset size={80} className="text-yellow-500/20" />
                    <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-yellow-500/60 font-mono">
                      <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                        Average response: 4 mins
                      </span>
                      <span>Available Now</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-yellow-500/10 px-6 py-12 lg:px-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo className="opacity-50" />
          <div className="flex gap-8 text-sm text-zinc-500">
            <Link to="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-yellow-500 transition-colors">Terms of Service</Link>
            <Link to="/support" className="hover:text-yellow-500 transition-colors">Contact Support</Link>
          </div>
          <div className="text-zinc-600 text-sm font-light">
            © 2024 Eva Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function SupportCard({ icon, title, description }: any) {
  return (
    <div className="bg-zinc-900 p-8 rounded-xl border border-yellow-500/10 hover:border-yellow-500/40 transition-all cursor-pointer group">
      <div className="bg-yellow-500/10 text-yellow-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FaqItem({ question }: any) {
  return (
    <div className="border-b border-yellow-500/10 pb-4">
      <button className="flex items-center justify-between w-full text-left py-4 focus:outline-none group">
        <span className="font-medium text-lg text-zinc-300 group-hover:text-yellow-500 transition-colors">{question}</span>
        <ChevronDown className="text-yellow-500" size={20} />
      </button>
    </div>
  );
}
