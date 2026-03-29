import { useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { SliderInput } from '../ui/SliderInput';
import { Button } from '../ui/Button';
import { calculateGoalSavings, calculateSIPSchedule, formatCurrency } from '../../utils/finance';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './EMI.module.css';

const PRESET_GOALS = [
    { label: '🎓 Education', amount: 2000000, years: 15 },
    { label: '🏠 Home Down Payment', amount: 2500000, years: 5 },
    { label: '💍 Wedding', amount: 1500000, years: 5 },
    { label: '✈️ Dream Vacation', amount: 500000, years: 3 },
    { label: '🚗 Car', amount: 1200000, years: 4 },
    { label: '🏖️ Retirement', amount: 30000000, years: 25 },
];

export function GoalCalculator() {
    const [target, setTarget] = useLocalStorage('goal_target', 2000000);
    const [rate, setRate] = useLocalStorage('goal_rate', 12);
    const [years, setYears] = useLocalStorage('goal_years', 10);
    const [inflation, setInflation] = useLocalStorage('goal_inflation', 0);
    const [goalName, setGoalName] = useLocalStorage('goal_name', 'My Goal');

    const result = useMemo(() => calculateGoalSavings(target, rate, years, inflation), [target, rate, years, inflation]);

    const chartData = useMemo(() => {
        const schedule = calculateSIPSchedule(result.monthlyInvestmentRequired, rate, years, 0, new Date());
        const yearlyData = [];
        for (let y = 1; y <= years; y++) {
            const row = schedule[y * 12 - 1];
            if (row) {
                yearlyData.push({
                    year: `Yr ${y}`,
                    invested: row.totalInvested,
                    gains: row.totalValue - row.totalInvested,
                    total: row.totalValue
                });
            }
        }
        return yearlyData;
    }, [result.monthlyInvestmentRequired, rate, years]);

    const handleReset = () => {
        setTarget(2000000);
        setRate(12);
        setYears(10);
        setInflation(0);
        setGoalName('My Goal');
    };

    const formatYAxis = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
        return `₹${val}`;
    };

    return (
        <div className={styles.wrapper}>
            {/* Preset Goals */}
            <div style={{ marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>Quick Start with a Preset Goal:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {PRESET_GOALS.map((g) => (
                        <button
                            key={g.label}
                            onClick={() => { setTarget(g.amount); setYears(g.years); setGoalName(g.label); }}
                            style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: 'var(--radius-full, 9999px)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: target === g.amount && years === g.years ? 'var(--color-primary-600)' : 'var(--color-bg-surface)',
                                color: target === g.amount && years === g.years ? 'white' : 'var(--color-text-primary)',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.container}>
                <Card className={styles.inputCard}>
                    <CardHeader>
                        <CardTitle>Goal-Based Savings Planner</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.inputsGrid} style={{ gap: '1.25rem' }}>
                            <Input
                                label="Goal Name"
                                type="text"
                                value={goalName}
                                onChange={(e) => setGoalName(e.target.value)}
                            />
                            <SliderInput
                                label="Target Amount"
                                value={target}
                                min={50000}
                                max={50000000}
                                step={50000}
                                onChange={setTarget}
                            />
                            <SliderInput
                                label="Time to Goal"
                                value={years}
                                min={1}
                                max={40}
                                step={1}
                                onChange={setYears}
                                format={(v) => `${v} yrs`}
                                formatTick={(v) => `${v}y`}
                            />
                            <SliderInput
                                label="Expected Annual Return (%)"
                                value={rate}
                                min={1}
                                max={30}
                                step={0.5}
                                onChange={setRate}
                                format={(v) => `${v}%`}
                                formatTick={(v) => `${v}%`}
                            />
                            <SliderInput
                                label="Inflation Rate (%)"
                                value={inflation}
                                min={0}
                                max={12}
                                step={0.5}
                                onChange={setInflation}
                                format={(v) => v === 0 ? 'Not set' : `${v}%`}
                                formatTick={(v) => `${v}%`}
                            />
                            {inflation > 0 && (
                                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                    📈 Inflation-adjusted target: <strong>{formatCurrency(result.targetAmount, 'en-IN')}</strong> (from ₹{(target / 100000).toFixed(1)}L today to {(result.targetAmount / 100000).toFixed(1)}L in {years} years)
                                </div>
                            )}
                        </div>
                        <div className={styles.actions}>
                            <Button variant="outline" onClick={handleReset} fullWidth>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className={styles.resultCard}>
                    <CardHeader>
                        <CardTitle>Your Goal: {goalName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Monthly SIP Required</span>
                            <span className={styles.highlight}>{formatCurrency(result.monthlyInvestmentRequired, 'en-IN')}</span>
                        </div>

                        <hr className={styles.divider} />

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Total You'll Invest</span>
                                <span className={styles.resultValue}>{formatCurrency(result.totalInvested, 'en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Returns Contribution</span>
                                <span className={styles.resultValue} style={{ color: 'var(--color-success)' }}>+{formatCurrency(result.totalReturns, 'en-IN')}</span>
                            </div>
                        </div>

                        <div className={styles.resultItemTotal}>
                            <span className={styles.resultLabel}>Final Corpus at Goal</span>
                            <span className={styles.resultValue}>{formatCurrency(result.targetAmount, 'en-IN')}</span>
                        </div>

                        <div style={{ height: '250px', width: '100%', marginTop: '2rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="goalInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-600)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--color-primary-600)" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="goalGainsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} tickFormatter={formatYAxis} width={65} />
                                    <Tooltip
                                        formatter={(value: number | undefined) => formatCurrency(value || 0, 'en-IN')}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
                                    <Area type="monotone" dataKey="invested" name="Amount Invested" stroke="var(--color-primary-600)" fill="url(#goalInvestedGrad)" strokeWidth={2} dot={false} />
                                    <Area type="monotone" dataKey="gains" name="Returns" stroke="var(--color-success)" fill="url(#goalGainsGrad)" strokeWidth={2} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                * Disclaimer: Calculations are for informational purposes only. Actual investment returns may vary based on market conditions.
            </div>
        </div>
    );
}
