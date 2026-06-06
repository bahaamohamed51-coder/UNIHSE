import React from "react";
import { cn } from "../../lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo: React.FC<LogoProps> = ({ className, size = "md" }) => {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl lg:text-4xl",
  };

  return (
    <div dir="ltr" className={cn("flex flex-row items-center gap-1.5 font-bold select-none justify-start", className)}>
      <span 
        className={cn(
          "font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-cyan-300 drop-shadow-[0_0_12px_rgba(0,242,255,0.5)] italic pt-0 pl-0 pr-[4px] pb-[4px] animate-pulse-slow",
          sizes[size]
        )}
      >
        UNI
      </span>
      <span 
        style={{ fontFamily: "Georgia", fontSize: size === "lg" ? "32px" : "24px", textAlign: "center", fontStyle: "normal", fontWeight: "normal" }}
        className={cn(
          "text-[#e2e8f0] border-b-2 border-brand-secondary/30 pb-0.5"
        )}
      >
        HSE
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse-slow shrink-0" />
    </div>
  );
};
