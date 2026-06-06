import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children?: ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: any;
  disabled?: boolean;
}

export const GlassButton = ({ children, className, variant = "primary", ...props }: Props) => {
  const variants = {
    primary: "bg-brand-primary/20 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/30",
    secondary: "bg-white/5 border-white/10 text-white hover:bg-white/10",
    danger: "bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30",
    ghost: "bg-transparent border-transparent text-white/70 hover:text-white hover:bg-white/5"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "px-4 py-2 rounded-lg border transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
};
