import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = false,
      onClick,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isReallyDisabled = disabled || loading;

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs h-8',
      md: 'px-4 py-2.5 text-sm h-10',
      lg: 'px-6 py-3.5 text-base h-12',
    };

    const variantClasses = {
      primary: 'bg-ink text-ivory-50 border border-transparent shadow-warm-sm',
      ghost: 'bg-transparent border border-ink text-ink hover:bg-ivory-200',
      danger: 'bg-rose-600 text-white shadow-warm-sm hover:bg-rose-700',
      outline: 'bg-white hover:bg-ivory-50 text-ink-muted border border-ivory-200 shadow-warm-sm',
      secondary: 'bg-ivory-200 hover:bg-ivory-300 text-ink-soft',
    };

    // motion configuration for micro-interactions
    const motionProps = isReallyDisabled
      ? {}
      : {
          whileHover: variant === 'primary' 
            ? { y: -2, scale: 1.01, boxShadow: '0 4px 24px rgba(26,26,26,0.08)' } // lifts with shadow-warm-md
            : { y: -1, scale: 1.01 },
          whileTap: { scale: 0.97 },
          transition: { type: 'spring', stiffness: 400, damping: 17 },
        };

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isReallyDisabled}
        onClick={onClick}
        className={clsx(
          "inline-flex items-center justify-center font-sans font-semibold rounded-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...motionProps}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current shadow-transparent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
