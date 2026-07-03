import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    /** Format the displayed value. Defaults to locale string. */
    format?: (value: number) => string;
    /** Animation duration in ms */
    duration?: number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Renders a number that smoothly counts from its previous value to the new
 * one whenever `value` changes. Falls back to an instant update when the
 * user prefers reduced motion or the value is not finite.
 */
export function AnimatedNumber({
    value,
    format = (v) => v.toLocaleString('en-IN'),
    duration = 650,
    className,
    style,
}: AnimatedNumberProps) {
    const [display, setDisplay] = useState(value);
    const fromRef = useRef(value);
    const frameRef = useRef(0);

    useEffect(() => {
        const from = fromRef.current;
        const to = value;
        if (from === to) return;

        const reduceMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!isFinite(from) || !isFinite(to) || reduceMotion) {
            fromRef.current = to;
            setDisplay(to);
            return;
        }

        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            const current = from + (to - from) * eased;
            fromRef.current = current;
            setDisplay(current);
            if (t < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = to;
            }
        };

        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [value, duration]);

    return (
        <span className={className} style={style}>
            {format(display)}
        </span>
    );
}
