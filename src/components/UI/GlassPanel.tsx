import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export const GlassPanel = ({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass-panel shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]",
        className
      )}
    >
      {children}
    </div>
  );
};
