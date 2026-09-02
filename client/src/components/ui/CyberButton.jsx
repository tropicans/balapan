import React from 'react';
import clsx from 'clsx';
import { sound } from '../../utils/audio.js';

export function CyberButton({
  children,
  onClick,
  variant = 'cyan', // cyan, pink, green, amber, red, ghost
  size = 'md', // sm, md, lg, xl, giant
  className = '',
  disabled = false,
  type = 'button',
  icon: Icon = null,
  ...props
}) {
  const baseStyles = "relative inline-flex items-center justify-center font-orbitron font-bold uppercase tracking-wider transition-all duration-200 clip-cyber select-none active:scale-[0.98]";

  const variants = {
    cyan: "bg-neonCyan/15 text-neonCyan border border-neonCyan/80 hover:bg-neonCyan/30 hover:shadow-glowCyan active:bg-neonCyan/40",
    pink: "bg-neonPink/15 text-neonPink border border-neonPink/80 hover:bg-neonPink/30 hover:shadow-glowPink active:bg-neonPink/40",
    green: "bg-neonGreen/15 text-neonGreen border border-neonGreen/80 hover:bg-neonGreen/30 hover:shadow-glowGreen active:bg-neonGreen/40",
    amber: "bg-neonAmber/15 text-neonAmber border border-neonAmber/80 hover:bg-neonAmber/30 hover:shadow-glowAmber active:bg-neonAmber/40",
    red: "bg-red-950/40 text-red-400 border border-red-500/80 hover:bg-red-900/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] active:bg-red-800",
    dark: "bg-obsidian/80 text-cyberSilver border border-gray-700 hover:border-neonCyan/50 hover:text-neonCyan",
    ghost: "bg-transparent text-cyberSilver/70 hover:text-neonCyan hover:bg-obsidian/50"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
    xl: "px-9 py-5 text-lg",
    giant: "w-full py-8 text-2xl font-black tracking-widest"
  };

  const disabledStyles = "opacity-40 cursor-not-allowed pointer-events-none filter grayscale";

  const handleClick = (e) => {
    if (disabled) return;
    sound.playTone(600, 'sine', 0.05, 0.1);
    if (onClick) onClick(e);
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={clsx(
        baseStyles,
        variants[variant] || variants.cyan,
        sizes[size] || sizes.md,
        disabled && disabledStyles,
        className
      )}
      {...props}
    >
      {Icon && <Icon className={clsx("w-5 h-5", children ? "mr-2" : "")} />}
      <span>{children}</span>
    </button>
  );
}
