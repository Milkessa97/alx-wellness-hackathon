import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

export type CardVariant = 'default' | 'safe' | 'elevated' | 'crisis';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white border-ivory-300 shadow-warm-md',
      safe: 'bg-sage-100/50 border-sage-200 shadow-warm-sm',
      elevated: 'bg-amber-100/50 border-amber-200 shadow-warm-sm',
      crisis: 'bg-rose-100/50 border-rose-200 shadow-warm-sm',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={clsx(
          "rounded-2xl border p-6 md:p-8 hover:shadow-warm-md transition-shadow duration-300",
          variantClasses[variant],
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

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx("flex flex-col space-y-1.5 pb-4 border-b border-ivory-200/50 mb-4", className)} {...props}>
    {children}
  </div>
);
CardHeader.displayName = "CardHeader";

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={clsx("font-display font-bold text-lg md:text-xl text-ink-soft tracking-tight", className)} {...props}>
    {children}
  </h3>
);
CardTitle.displayName = "CardTitle";

export const CardDescription = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={clsx("text-xs md:text-sm text-ink-light", className)} {...props}>
    {children}
  </p>
);
CardDescription.displayName = "CardDescription";

export const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx("", className)} {...props}>
    {children}
  </div>
);
CardContent.displayName = "CardContent";

export const CardFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx("flex items-center pt-4 border-t border-ivory-200/50 mt-4", className)} {...props}>
    {children}
  </div>
);
CardFooter.displayName = "CardFooter";

export default Card;
