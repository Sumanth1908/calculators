import { useRef, useCallback } from 'react';
import styles from './SliderInput.module.css';

interface SliderInputProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    /** Format the displayed badge value. Defaults to locale string. */
    format?: (value: number) => string;
    /** Format min/max tick labels. Defaults to compact notation. */
    formatTick?: (value: number) => string;
}

function defaultFormat(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString('en-IN');
}

export function SliderInput({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    format = defaultFormat,
    formatTick,
}: SliderInputProps) {
    const sliderRef = useRef<HTMLInputElement>(null);

    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(Number(e.target.value));
        },
        [onChange]
    );

    const tickFmt = formatTick ?? format;

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <span className={styles.label}>{label}</span>
                <span className={styles.valueBadge}>{format(value)}</span>
            </div>

            <div className={styles.sliderTrack}>
                <div className={styles.sliderFill} style={{ width: `${pct}%` }} />
                <div className={styles.sliderThumb} style={{ left: `${pct}%` }} />
                <input
                    ref={sliderRef}
                    className={styles.slider}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={handleChange}
                    aria-label={label}
                    aria-valuenow={value}
                    aria-valuemin={min}
                    aria-valuemax={max}
                />
            </div>

            <div className={styles.minMax}>
                <span>{tickFmt(min)}</span>
                <span>{tickFmt(max)}</span>
            </div>
        </div>
    );
}
