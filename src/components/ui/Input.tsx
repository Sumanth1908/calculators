import React from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    labelRightElement?: React.ReactNode;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, labelRightElement, error, icon, className = '', ...props }, ref) => {
        return (
            <div className={`${styles.wrapper} ${className}`}>
                {(label || labelRightElement) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '1.25rem' }}>
                        {label && <label className={styles.label}>{label}</label>}
                        {labelRightElement}
                    </div>
                )}
                <div className={styles.inputContainer}>
                    {icon && <span className={styles.icon}>{icon}</span>}
                    <input
                        ref={ref}
                        className={`${styles.input} ${icon ? styles.withIcon : ''} ${error ? styles.hasError : ''}`}
                        {...props}
                    />
                </div>
                {error && <span className={styles.errorText}>{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
