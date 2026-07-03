import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { calculateSIP, formatCurrency } from '../../utils/finance';
import styles from './Home.module.css';

interface HomeProps {
    onNavigate: (id: string) => void;
}

const QUESTIONS = [
    {
        id: 'emi',
        emoji: '🏠',
        title: 'Can I afford this loan?',
        sub: 'EMIs, prepayment strategies & interest saved',
        accent: '#0ea5e9',
    },
    {
        id: 'sip',
        emoji: '🌱',
        title: 'What if I invest every month?',
        sub: 'SIP & step-up mutual fund projections',
        accent: '#10b981',
    },
    {
        id: 'goal',
        emoji: '🎯',
        title: 'How much for my dream?',
        sub: 'Education, wedding, home — plan any goal',
        accent: '#f59e0b',
    },
    {
        id: 'compound',
        emoji: '🏦',
        title: 'How much will my deposit grow?',
        sub: 'FD & RD maturity, payouts and yields',
        accent: '#8b5cf6',
    },
    {
        id: 'swp',
        emoji: '🌅',
        title: 'Will my money last in retirement?',
        sub: 'Systematic withdrawals from a corpus',
        accent: '#ef4444',
    },
    {
        id: 'stp',
        emoji: '💧',
        title: 'How do I deploy a lumpsum safely?',
        sub: 'Systematic transfer from debt to equity',
        accent: '#06b6d4',
    },
];

// Rotating "magic of compounding" facts for the hero ticker
const TICKER_FACTS = [
    { monthly: 10000, years: 20 },
    { monthly: 5000, years: 30 },
    { monthly: 25000, years: 15 },
    { monthly: 50000, years: 10 },
].map((f) => ({ ...f, value: calculateSIP(f.monthly, 12, f.years).totalValue }));

export function Home({ onNavigate }: HomeProps) {
    const [factIndex, setFactIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setFactIndex((i) => (i + 1) % TICKER_FACTS.length);
        }, 5000);
        return () => clearInterval(id);
    }, []);

    const fact = TICKER_FACTS[factIndex];

    return (
        <div className={styles.home}>
            <section className={styles.hero}>
                <span className={styles.eyebrow}>FinCalc — your money studio</span>
                <h1 className={styles.headline}>
                    What's your <span className={styles.headlineAccent}>money question</span> today?
                </h1>
                <p className={styles.subtitle}>
                    Pick a question below and play with the answer — every number, chart and
                    insight reacts live as you move the sliders.
                </p>
                <div className={styles.ticker}>
                    <Sparkles size={16} />
                    <span>
                        ₹{fact.monthly.toLocaleString('en-IN')}/month × {fact.years} yrs at 12% ≈
                    </span>
                    <AnimatedNumber
                        className={styles.tickerValue}
                        value={fact.value}
                        duration={900}
                        format={(v) => formatCurrency(v, 'en-IN')}
                    />
                </div>
            </section>

            <button className={styles.featured} onClick={() => onNavigate('journey')}>
                <div>
                    <span className={styles.featuredBadge}>New · Your Journey</span>
                    <h2 className={styles.featuredTitle}>See your whole money life in one picture</h2>
                    <p className={styles.featuredSub}>
                        From your first SIP to your last retirement withdrawal — one interactive
                        timeline. Scrub your retirement age and watch your wealth curve reshape.
                    </p>
                    <span className={styles.featuredCta}>
                        Chart my journey <ArrowRight size={18} />
                    </span>
                </div>
                <svg className={styles.featuredCurve} width="180" height="96" viewBox="0 0 180 96" fill="none" aria-hidden="true">
                    <path
                        d="M6 88 C 48 82, 78 48, 104 24 S 152 34, 174 56"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M6 88 C 48 82, 78 48, 104 24 S 152 34, 174 56 L 174 92 L 6 92 Z"
                        fill="rgba(255,255,255,0.12)"
                    />
                    <circle cx="104" cy="24" r="5" fill="#ffffff" />
                </svg>
            </button>

            <span className={styles.sectionLabel}>Or jump straight to a studio</span>
            <div className={styles.grid}>
                {QUESTIONS.map((q) => (
                    <button
                        key={q.id}
                        className={styles.qcard}
                        style={{ '--accent': q.accent } as CSSProperties}
                        onClick={() => onNavigate(q.id)}
                    >
                        <span className={styles.qemoji}>{q.emoji}</span>
                        <span className={styles.qtitle}>{q.title}</span>
                        <span className={styles.qsub}>{q.sub}</span>
                        <ArrowRight className={styles.qarrow} size={18} />
                    </button>
                ))}
            </div>
        </div>
    );
}
