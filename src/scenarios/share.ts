/**
 * Share-by-URL: a studio's inputs encode into the link's hash so a scenario
 * can be sent to anyone — no accounts, no backend, everything stays on-device.
 */

const VALID_VIEWS = ['home', 'journey', 'emi', 'compound', 'sip', 'swp', 'stp', 'goal'];

/** Only these localStorage key prefixes may be written from a share link */
const ALLOWED_KEY_PREFIXES = [
    'sip_', 'emi_', 'pre_', 'fd_', 'rd_', 'swp_', 'stp_', 'goal_', 'journey_',
];
const ALLOWED_EXACT_KEYS = ['fd_rd_tab'];

interface SharePayload {
    v: string;
    i: Record<string, unknown>;
}

function isAllowedKey(key: string): boolean {
    return (
        ALLOWED_EXACT_KEYS.includes(key) ||
        ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
    );
}

export function buildShareLink(view: string, inputs: Record<string, unknown>): string {
    const payload: SharePayload = { v: view, i: inputs };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#s=${encoded}`;
}

/**
 * If the page was opened via a share link, write the shared inputs into
 * localStorage and select the shared view, then strip the hash. Must run
 * before React mounts so studios read the hydrated values.
 */
export function hydrateFromShareLink(): void {
    const hash = window.location.hash;
    if (!hash.startsWith('#s=')) return;

    try {
        const payload = JSON.parse(decodeURIComponent(atob(hash.slice(3)))) as SharePayload;
        if (!VALID_VIEWS.includes(payload.v) || typeof payload.i !== 'object' || payload.i === null) {
            return;
        }
        for (const [key, value] of Object.entries(payload.i)) {
            if (isAllowedKey(key)) {
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        }
        window.localStorage.setItem('active_view', JSON.stringify(payload.v));
    } catch {
        // Malformed link — fall through to a normal app start
    } finally {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
}
