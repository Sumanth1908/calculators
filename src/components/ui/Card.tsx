import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: ReactNode;
    className?: string;
}

export function Card({ children, className = '' }: CardProps) {
    return (
        <div className={`${styles.card} ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }: CardProps) {
    return (
        <div className={`${styles.cardHeader} ${className}`}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = '' }: CardProps) {
    return (
        <h3 className={`${styles.cardTitle} ${className}`}>
            {children}
        </h3>
    );
}

export function CardContent({ children, className = '' }: CardProps) {
    return (
        <div className={`${styles.cardContent} ${className}`}>
            {children}
        </div>
    );
}
