"use client";

interface ChartFullscreenWrapperProps {
  children: React.ReactNode;
  ariaDescription?: string;
}

export function ChartFullscreenWrapper({ children, ariaDescription }: ChartFullscreenWrapperProps) {
  return (
    <div className="relative" role="img" aria-label={ariaDescription}>
      {ariaDescription && <span className="sr-only">{ariaDescription}</span>}
      {children}
    </div>
  );
}
