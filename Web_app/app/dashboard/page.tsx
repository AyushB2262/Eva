'use client';

import dynamic from 'next/dynamic';

const DashboardContent = dynamic(() => import('@/components/DashboardContent'), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono text-sm tracking-widest uppercase">Initializing Neural Core...</div>
});

export default function DashboardPage() {
  return <DashboardContent />;
}

