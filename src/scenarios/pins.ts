/**
 * Pinned scenarios — snapshots of a studio's inputs and headline results,
 * persisted in localStorage so they survive reloads and can be compared.
 */

export interface ScenarioMetric {
    label: string;
    /** Pre-formatted value for display */
    display: string;
    /** Raw numeric value, when one exists, so Compare can show deltas */
    value?: number;
    /** How to format a delta between two scenarios */
    kind?: 'currency' | 'percent' | 'number';
}

export interface Scenario {
    id: string;
    /** Groups pins for comparison, e.g. 'sip', 'fd', 'rd' */
    studio: string;
    studioTitle: string;
    /** Nav view id to open when restoring this pin, if different from `studio` (e.g. FD/RD both live under 'compound') */
    navView?: string;
    /** Short human summary of the inputs, e.g. '₹10K/mo · 12% · 15y' */
    title: string;
    savedAt: number;
    /** localStorage key → value, so a pin can be loaded back into its studio */
    inputs: Record<string, unknown>;
    metrics: ScenarioMetric[];
}

const STORAGE_KEY = 'fincalc_pins';
const MAX_PINS = 24;

export function loadPins(): Scenario[] {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function persist(pins: Scenario[]): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    } catch {
        // Storage full or unavailable — pinning is best-effort
    }
}

export function savePin(pin: Omit<Scenario, 'id' | 'savedAt'>): Scenario {
    const scenario: Scenario = {
        ...pin,
        id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        savedAt: Date.now(),
    };
    const pins = [scenario, ...loadPins()].slice(0, MAX_PINS);
    persist(pins);
    return scenario;
}

export function deletePin(id: string): Scenario[] {
    const pins = loadPins().filter((p) => p.id !== id);
    persist(pins);
    return pins;
}

/** Write a pin's inputs back into localStorage so its studio restores them on mount */
export function applyPinInputs(pin: Scenario): void {
    for (const [key, value] of Object.entries(pin.inputs)) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // best-effort
        }
    }
}
