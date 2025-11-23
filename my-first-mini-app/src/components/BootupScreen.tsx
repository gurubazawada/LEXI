"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedLexi } from "./AnimatedLexi";

interface BootupScreenProps {
  children: React.ReactNode;
}

export function BootupScreen({ children }: BootupScreenProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show bootup screen for 1.5 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="bootup"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: "#0f52aa" }}
          >
            <AnimatedLexi variant="logo" size={250} />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
