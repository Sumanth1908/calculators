import { useEffect, useRef, useState } from 'react';
import { Pin, Check, Link2 } from 'lucide-react';
import { savePin, type ScenarioMetric } from '../../scenarios/pins';
import { buildShareLink } from '../../scenarios/share';
import styles from './ScenarioActions.module.css';

interface ScenarioActionsProps {
    studio: string;
    studioTitle: string;
    /** Nav view id to open when restoring this pin/link, if different from `studio` (e.g. FD/RD both live under 'compound') */
    navView?: string;
    /** Short human summary of the current inputs, used as the pin's title */
    title: string;
    /** localStorage key → current value, so the scenario can be restored/shared */
    inputs: Record<string, unknown>;
    metrics: ScenarioMetric[];
}

/**
 * "Pin" snapshots the current scenario for the Compare view;
 * "Share" copies a link that reopens this studio with these exact inputs.
 */
export function ScenarioActions({ studio, studioTitle, navView, title, inputs, metrics }: ScenarioActionsProps) {
    const [pinned, setPinned] = useState(false);
    const [copied, setCopied] = useState(false);
    const timers = useRef<number[]>([]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const flash = (setter: (v: boolean) => void) => {
        setter(true);
        timers.current.push(window.setTimeout(() => setter(false), 1800));
    };

    const handlePin = () => {
        savePin({ studio, studioTitle, navView, title, inputs, metrics });
        flash(setPinned);
    };

    const handleShare = async () => {
        const link = buildShareLink(navView ?? studio, inputs);
        try {
            await navigator.clipboard.writeText(link);
            flash(setCopied);
        } catch {
            window.prompt('Copy this link to share the scenario:', link);
        }
    };

    return (
        <div className={styles.actions}>
            <button
                className={`${styles.button} ${pinned ? styles.buttonDone : ''}`}
                onClick={handlePin}
                title="Pin this scenario to compare it later"
            >
                {pinned ? <Check size={14} /> : <Pin size={14} />}
                <span>{pinned ? 'Pinned' : 'Pin'}</span>
            </button>
            <button
                className={`${styles.button} ${copied ? styles.buttonDone : ''}`}
                onClick={handleShare}
                title="Copy a link that opens this exact scenario"
            >
                {copied ? <Check size={14} /> : <Link2 size={14} />}
                <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
        </div>
    );
}
