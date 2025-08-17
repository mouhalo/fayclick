'use client';

import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  ripple?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      ripple = true,
      fullWidth = false,
      children,
      className = '',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isRippling, setIsRippling] = React.useState(false);
    const [ripplePosition, setRipplePosition] = React.useState({ x: 0, y: 0 });

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !loading) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setRipplePosition({ x, y });
        setIsRippling(true);
        
        setTimeout(() => setIsRippling(false), 600);
      }
      
      if (onClick && !disabled && !loading) {
        onClick(e);
      }
    };

    const baseClasses = [
      'relative inline-flex items-center justify-center',
      'font-semibold rounded-xl transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'overflow-hidden transform active:scale-95',
      fullWidth ? 'w-full' : '',
    ].join(' ');

    const variantClasses = {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-lg hover:shadow-xl',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
      ghost: 'text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
      gradient: 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 shadow-lg hover:shadow-xl',
      destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl',
    };

    const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple Effect */}
        {ripple && isRippling && (
          <span
            className="absolute bg-white/30 rounded-full animate-[ripple_600ms_ease-out]"
            style={{
              left: ripplePosition.x,
              top: ripplePosition.y,
              width: '2px',
              height: '2px',
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 600ms ease-out',
            }}
          />
        )}
        
        {/* Loading Spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-inherit">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        
        {/* Button Content */}
        <span className={`inline-flex items-center ${loading ? 'opacity-0' : ''}`}>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// Ajout du keyframe pour l'effet ripple dans le head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      0% {
        width: 2px;
        height: 2px;
        opacity: 1;
      }
      100% {
        width: 500px;
        height: 500px;
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}