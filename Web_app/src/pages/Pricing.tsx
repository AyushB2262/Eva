import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Sparkles, ChevronDown } from 'lucide-react';
import Logo from '../components/Logo';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/clerk-react';

export default function Pricing() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-zinc-950 text-zinc-100 font-sans overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-yellow-500/10 bg-zinc-950/80 backdrop-blur-md px-6 md:px-20 lg:px-40 py-4 flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex flex-1 justify-end gap-8 items-center">
          <div className="hidden md:flex items-center gap-9 text-sm font-medium text-zinc-400">
            <Link to="/features" className="hover:text-yellow-500 transition-colors">Features</Link>
            <Link to="/pricing" className="text-yellow-500">Pricing</Link>
            <Link to="/support" className="hover:text-yellow-500 transition-colors">Support</Link>
          </div>
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

      <main className="flex-1 px-6 md:px-20 lg:px-40 py-32 md:py-40">
        <div className="flex flex-col items-center text-center gap-4 mb-16">
          <p className="text-yellow-500 font-semibold tracking-widest uppercase text-xs">Simple & Transparent</p>
          <h1 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-tighter">Choose your plan</h1>
          <p className="text-zinc-500 text-lg max-w-xl">Experience the power of premium AI with Eva. Upgrade your workflow with intelligence that adapts to you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1100px] mx-auto items-center">
          {/* Free Plan */}
          <PricingCard 
            title="Free" 
            price="0" 
            description="Perfect for individuals getting started" 
            features={["Basic AI responses", "Standard processing speed", "Community support"]}
            notIncluded={["Advanced neural models"]}
            buttonText="Start for Free"
          />

          {/* Pro Plan */}
          <div className="relative flex flex-col gap-6 rounded-xl border-2 border-yellow-500 bg-zinc-900/50 p-8 shadow-[0_0_30px_rgba(234,179,8,0.2)] scale-105 z-10 transition-transform hover:scale-[1.07]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-zinc-950 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
              Most Popular
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-yellow-500 text-xl font-bold">Pro</h2>
              <p className="text-zinc-400 text-sm">Our most powerful tools for creators</p>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-white text-5xl font-black tracking-tighter">$29</span>
                <span className="text-zinc-500 text-lg font-medium">/mo</span>
              </div>
            </div>
            <button className="w-full flex cursor-pointer items-center justify-center rounded-lg h-12 px-4 bg-yellow-500 text-zinc-950 text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-yellow-500/20">
              Upgrade to Pro
            </button>
            <div className="flex flex-col gap-4 mt-2">
              <div className="text-sm font-semibold flex gap-3 text-white">
                <Sparkles className="text-yellow-500" size={18} />
                Advanced neural processing
              </div>
              <FeatureItem text="Priority response time" />
              <FeatureItem text="Golden theme access" />
              <FeatureItem text="Early feature access" />
              <FeatureItem text="100GB Cloud Storage" />
            </div>
          </div>

          {/* Enterprise Plan */}
          <PricingCard 
            title="Enterprise" 
            price="99" 
            description="Scale with dedicated support" 
            features={["Custom LLM integration", "Dedicated account manager", "Unlimited API calls", "SLA guarantee"]}
            buttonText="Contact Sales"
            dark
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-32 max-w-[800px] mx-auto">
          <h2 className="text-white text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-4">
            <Accordion title="Can I cancel anytime?" content="Yes, you can cancel your subscription at any time through your account settings. You will retain access to your plan until the end of your current billing cycle." />
            <Accordion title="What payment methods are accepted?" content="We accept all major credit cards, PayPal, and Apple Pay. For Enterprise plans, we also support bank transfers and custom invoicing." />
            <Accordion title="Is there a discount for annual billing?" content="Absolutely! When you switch to annual billing, you can save up to 20% compared to the monthly plan. The prices shown above are for monthly billing." />
          </div>
        </div>
      </main>

      <footer className="border-t border-yellow-500/10 bg-zinc-950 py-12 px-6 md:px-20 lg:px-40">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo className="opacity-50" />
          <div className="flex gap-8 text-sm text-zinc-500">
            <Link to="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-yellow-500 transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-yellow-500 transition-colors">Contact</Link>
          </div>
          <p className="text-sm text-zinc-600">© 2024 Eva AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ title, price, description, features, notIncluded = [], buttonText, dark = false }: any) {
  return (
    <div className={`flex flex-col gap-6 rounded-xl border border-yellow-500/10 bg-zinc-900/30 p-8 transition-all hover:border-yellow-500/40`}>
      <div className="flex flex-col gap-1">
        <h2 className="text-white text-lg font-bold">{title}</h2>
        <p className="text-zinc-500 text-sm">{description}</p>
        <div className="flex items-baseline gap-1 mt-4">
          <span className="text-white text-5xl font-black tracking-tighter">${price}</span>
          <span className="text-zinc-500 text-lg font-medium">/mo</span>
        </div>
      </div>
      <button className={`w-full flex cursor-pointer items-center justify-center rounded-lg h-12 px-4 ${dark ? 'bg-zinc-100 text-zinc-950' : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'} text-sm font-bold transition-colors`}>
        {buttonText}
      </button>
      <div className="flex flex-col gap-4 mt-2">
        {features.map((f: string) => <FeatureItem key={f} text={f} />)}
        {notIncluded.map((f: string) => <FeatureItem key={f} text={f} cancelled />)}
      </div>
    </div>
  );
}

function FeatureItem({ text, cancelled = false }: any) {
  return (
    <div className={`text-sm flex gap-3 ${cancelled ? 'text-zinc-600' : 'text-zinc-400'}`}>
      {cancelled ? <XCircle size={18} /> : <CheckCircle className="text-yellow-500" size={18} />}
      {text}
    </div>
  );
}

function Accordion({ title, content }: any) {
  return (
    <details className="group flex flex-col rounded-xl border border-yellow-500/10 bg-zinc-900/40 px-6 py-4 overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between gap-6 list-none">
        <p className="text-white text-base font-semibold">{title}</p>
        <ChevronDown className="text-yellow-500 group-open:rotate-180 transition-transform duration-300" size={20} />
      </summary>
      <div className="mt-4 text-zinc-500 text-sm leading-relaxed border-t border-yellow-500/10 pt-4">
        {content}
      </div>
    </details>
  );
}
