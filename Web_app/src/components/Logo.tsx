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
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 15"
        className="fill-yellow-500 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M 3 1 L 6 1 L 7 4 L 13 4 L 14 1 L 17 1 L 19 4 L 14 14 L 6 14 L 1 4 Z" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
      </svg>
      {showText && (
        <h2 className="text-xl font-bold leading-tight tracking-tight text-zinc-100">
          Eva
        </h2>
      )}
    </div>
  );
}

