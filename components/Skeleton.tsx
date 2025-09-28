'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  pulse?: boolean;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, pulse = true, rounded = 'rounded-md', ...props }) => {
  return (
    <div
      className={cn(
        'bg-[hsl(var(--brand-green-light)/0.25)] relative overflow-hidden',
        pulse && 'animate-pulse',
        rounded,
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-40 animate-[shimmer_1.8s_infinite]" />
    </div>
  );
};

// Keyframes via global CSS suggestion: add to globals if not present
// @keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
