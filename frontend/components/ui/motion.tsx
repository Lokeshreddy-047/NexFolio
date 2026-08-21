"use client";

import React, { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  HTMLMotionProps,
  Variants,
  useSpring
} from "framer-motion";

// ---------------------------------------------------------------------------
// Reusable Animation Variants
// ---------------------------------------------------------------------------

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05
    }
  }
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 22,
      stiffness: 260
    }
  }
};

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" }
  }
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.15, ease: "easeIn" }
  }
};

// ---------------------------------------------------------------------------
// 1. MotionContainer (Staggered Children Wrapper)
// ---------------------------------------------------------------------------

interface MotionContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function MotionContainer({
  children,
  className = "",
  delay = 0.05,
  ...props
}: MotionContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06,
            delayChildren: delay
          }
        }
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 2. MotionCard (Interactive Card with Spring Hover-Lift)
// ---------------------------------------------------------------------------

interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverLift?: boolean;
}

export function MotionCard({
  children,
  className = "",
  hoverLift = true,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={
        hoverLift
          ? {
              y: -3,
              transition: { type: "spring", stiffness: 400, damping: 25 }
            }
          : undefined
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 3. MotionItem (Standard Staggered Item)
// ---------------------------------------------------------------------------

interface MotionItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

export function MotionItem({
  children,
  className = "",
  ...props
}: MotionItemProps) {
  return (
    <motion.div variants={itemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 4. AnimatedCounter (Spring Numeric Count-Up)
// ---------------------------------------------------------------------------

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = ""
}: AnimatedCounterProps) {
  const springValue = useSpring(0, { damping: 30, stiffness: 200 });
  const [displayValue, setDisplayValue] = useState<string>(
    decimals > 0 ? (0).toFixed(decimals) : "0"
  );

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (decimals > 0) {
        setDisplayValue(latest.toLocaleString("en-IN", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }));
      } else {
        setDisplayValue(Math.round(latest).toLocaleString("en-IN"));
      }
    });
    return () => unsubscribe();
  }, [springValue, decimals]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 5. AnimatedModal (Physics Modal with Backdrop)
// ---------------------------------------------------------------------------

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedModal({
  isOpen,
  onClose,
  children,
  className = ""
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalBackdropVariants}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            key="modal-content"
            variants={modalContentVariants}
            onClick={(e) => e.stopPropagation()}
            className={className}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// 6. PageTransition (Full Route Motion Wrapper)
// ---------------------------------------------------------------------------

export function PageTransition({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 7. AnimatedProgressBar (Spring Progress Fill)
// ---------------------------------------------------------------------------

export function AnimatedProgressBar({
  progress,
  className = "",
  barClassName = ""
}: {
  progress: number;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div className={`w-full overflow-hidden rounded-full ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: "spring", damping: 25, stiffness: 120, delay: 0.1 }}
        className={`h-full ${barClassName}`}
      />
    </div>
  );
}

// Export Framer Motion Core Exports for direct imports
export { motion, AnimatePresence };
