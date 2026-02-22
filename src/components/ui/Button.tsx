import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, variant = 'primary', size = 'md', fullWidth = false, className = '', ...props }, ref) => {
        const combinedClasses = [
            styles.button,
            styles[variant],
            styles[size],
            fullWidth ? styles.fullWidth : '',
            className,
        ].filter(Boolean).join(' ');

        return (
            <button ref={ref} className={combinedClasses} {...props}>
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
