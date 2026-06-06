import { motion } from "motion/react";

export const Background = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-[#030308] overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      
      {/* Animated Glowing Orbs */}
      <motion.div 
        animate={{ 
          x: [0, 100, 0], 
          y: [0, 50, 0],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-primary/20 blur-[120px] rounded-full"
      />
      
      <motion.div 
        animate={{ 
          x: [0, -80, 0], 
          y: [0, 120, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-brand-secondary/20 blur-[150px] rounded-full"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[#030308] via-transparent to-[#030308]/50" />
    </div>
  );
};
