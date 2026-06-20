// ============================================================================
// Gesture Arena — GlassCard (Reusable Glassmorphism Container)
// ============================================================================

import React from 'react';

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** When true, adds a subtle animated border glow */
  glow?: boolean;
  /** Tailwind padding class override, e.g. 'p-4' or 'p-8'. Defaults to 'p-6'. */
  padding?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  style,
  glow = false,
  padding = 'p-6',
}) => {
  return (
    <div
      className={`glass-card ${padding} ${glow ? 'animate-border-glow' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default GlassCard;
