import React from 'react';
import { Diamond } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = "", size = 32, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50"
        style={{ width: size, height: size }}
      >
        <div 
          className="rounded-full bg-yellow-500 animate-pulse"
          style={{ width: size * 0.375, height: size * 0.375 }}
        ></div>
      </div>
      {showText && (
        <h2 className="text-xl font-bold leading-tight tracking-tight text-zinc-100">
          Eva
        </h2>
      )}
    </div>
  );
}

