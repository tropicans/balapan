import React from 'react';
import clsx from 'clsx';

export function CyberCard({
  children,
  title = '',
  subtitle = '',
  variant = 'cyan', // cyan, pink, green, amber, dark
  className = '',
  headerAction = null,
  isCornerChamfer = true
}) {
  const borderColors = {
    cyan: "border-neonCyan/40 shadow-glowCyan",
    pink: "border-neonPink/40 shadow-glowPink",
    green: "border-neonGreen/40 shadow-glowGreen",
    amber: "border-neonAmber/40 shadow-glowAmber",
    dark: "border-gray-800"
  };

  const titleColors = {
    cyan: "text-neonCyan text-glow-cyan",
    pink: "text-neonPink text-glow-pink",
    green: "text-neonGreen text-glow-green",
    amber: "text-neonAmber text-glow-amber",
    dark: "text-cyberSilver"
  };

  return (
    <div
      className={clsx(
        "relative bg-obsidian/90 border backdrop-blur-md transition-all duration-300",
        isCornerChamfer ? "clip-cyber" : "rounded-lg",
        borderColors[variant] || borderColors.cyan,
        className
      )}
    >
      {/* HUD Decorative Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/60 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/60 pointer-events-none" />

      {(title || headerAction) && (
        <div className="px-5 py-3 border-b border-gray-800/80 flex items-center justify-between bg-black/40">
          <div>
            <h3 className={clsx("font-orbitron font-bold tracking-wider text-sm md:text-base", titleColors[variant])}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-cyberSilver/60 font-mono mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}
