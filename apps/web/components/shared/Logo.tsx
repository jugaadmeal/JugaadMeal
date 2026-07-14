'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'light' | 'dark' | 'default';
  iconSize?: number;
}

import brandLogoImg from './brand_logo.png';

export function LogoIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      src={brandLogoImg.src}
      alt="Jugaadmeal Logo"
      className={cn("inline-block select-none object-contain rounded-lg dark-mode-logo-filter", className)}
      style={{ width: size, height: size }}
    />
  );
}

export default function Logo({ className, iconOnly = false, variant = 'default', iconSize = 34 }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoIcon size={iconSize} />
      {!iconOnly && (
        <div className="flex flex-col text-left">
          <div className="flex items-baseline text-lg sm:text-2xl font-black tracking-tight leading-none">
            <span className="text-secondary dark:text-white">Jugaad</span>
            <span className="text-primary font-extrabold">meal</span>
          </div>
          <span className="text-[9px] font-bold tracking-widest text-text-muted/80 dark:text-gray-300 uppercase mt-1 leading-none hidden sm:block">
            campus food, finally hacked
          </span>
        </div>
      )}
    </div>
  );
}

// Simple fallback helper if utils classnames doesn't exist
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
