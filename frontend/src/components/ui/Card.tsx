import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLMotionProps<'div'> {
  hoverLift?: boolean;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hoverLift = true, className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverLift ? { y: -4 } : undefined}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-slate-950/50',
          hoverLift && 'hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-shadow duration-300',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
