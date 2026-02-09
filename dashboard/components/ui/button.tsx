import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer';

    const variants: Record<string, string> = {
      default: 'bg-[#FF4D00] text-white hover:bg-[#E64500] shadow-[0_0_20px_-5px_rgba(255,77,0,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,77,0,0.5)]',
      outline: 'border border-[rgba(255,255,255,0.12)] text-[#EDEDED] hover:border-[#FF4D00] hover:text-[#FF4D00] bg-transparent',
      ghost: 'text-[#888888] hover:text-[#EDEDED] hover:bg-[rgba(255,255,255,0.04)] bg-transparent',
      danger: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20',
    };

    const sizes: Record<string, string> = {
      default: 'h-10 px-5 py-2 text-sm',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-12 px-8 text-base',
      icon: 'h-9 w-9',
    };

    return <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
  }
);

Button.displayName = 'Button';
export { Button };
