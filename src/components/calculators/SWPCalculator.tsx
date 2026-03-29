import { useState, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { SliderInput } from '../ui/SliderInput';
import { Button } from '../ui/Button';
import { calculateSWP, calculateSWPSchedule, formatCurrency } from '../../utils/finance';
import type { SWPScheduleRow } from '../../types/finance.types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './EMI.module.css';

export function SWPCalculator() {
    const [corpus, setCorpus] = useLocalStorage('swp_corpus', 5000000);
    const [monthly, setMonthly] = useLocalStorage('swp_monthly', 25000);
    const [rate, setRate] = useLocalStorage('swp_rate', 10);
    const [years, setYears] = useLocalStorage('swp_years', 20);
    const [startDate] = useLocalStorage('swp_start', new Date().toISOString().split('T')[0]);
    const [showSchedule, setShowSchedule] = useState(false);

    const result = useMemo(() => calculateSWP(corpus, monthly, rate, years), [corpus, monthly, rate, years]);
    const schedule = useMemo(() => calculateSWPSchedule(corpus, monthly, rate, years, new Date(startDate)), [corpus, monthly, rate, years, startDate]);

    const chartData = useMemo(() => {
        const yearlyData = [];
        for (let y = 1; y <= years; y++) {
            const idx = y * 12 - 1;
            const row = schedule[idx] ?? schedule[schedule.length - 1];
            if (row) {
                yearlyData.push({
                    year: `Yr ${y}`,
                    balance: row.closingBalance
                });
            } else {
                yearlyData.push({ year: `Yr ${y}`, balance: 0 });
            }
        }
        return yearlyData;
    }, [schedule, years]);

    const isCorpusExhausted = result.finalCorpus <= 0;
    const exhaustedYear = isCorpusExhausted ? Math.ceil(result.monthsLasted / 12) : null;

    const handleReset = () => {
        setCorpus(5000000);
        setMonthly(25000);
        setRate(10);
        setYears(20);
    };

    const formatYAxis = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
        return `₹${val}`;
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.container}>
                <Card className={styles.inputCard}>
                    <CardHeader>
                        <CardTitle>SWP — Systematic Withdrawal Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.inputsGrid} style={{ gap: '1.25rem' }}>
                            <SliderInput
                                label="Initial Corpus"
                                value={corpus}
                                min={100000}
                                max={50000000}
                                step={100000}
                                onChange={setCorpus}
                            />
                            <SliderInput
                                label="Monthly Withdrawal"
                                value={monthly}
                                min={1000}
                                max={200000}
                                step={1000}
                                onChange={setMonthly}
                            />
                            <SliderInput
                                label="Expected Annual Return (%)"
                                value={rate}
                                min={0}
                                max={20}
                                step={0.5}
                                onChange={setRate}
                                format={(v) => `${v}%`}
                                formatTick={(v) => `${v}%`}
                            />
                            <SliderInput
                                label="Withdrawal Period"
                                value={years}
                                min={1}
                                max={40}
                                step={1}
                                onChange={setYears}
                                format={(v) => `${v} yrs`}
                                formatTick={(v) => `${v}y`}
                            />
                        </div>
                        <div className={styles.actions}>
                            <Button variant="outline" onClick={handleReset} fullWidth>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className={styles.resultCard}>
                    <CardHeader>
                        <CardTitle>Withdrawal Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Final Corpus</span>
                            <span className={styles.highlight} style={{ color: isCorpusExhausted ? 'var(--color-danger, #ef4444)' : 'var(--color-primary-600)' }}>
                                {isCorpusExhausted ? '₹0 (Exhausted)' : formatCurrency(result.finalCorpus, 'en-IN')}
                            </span>
                        </div>

                        {isCorpusExhausted && (
                            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '1rem', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                                ⚠️ Corpus gets exhausted after <strong>Year {exhaustedYear}</strong>. Consider reducing monthly withdrawals or increasing your corpus.
                            </div>
                        )}

                        <hr className={styles.divider} />

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Total Withdrawn</span>
                                <span className={styles.resultValue}>{formatCurrency(result.totalWithdrawn, 'en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Total Returns Earned</span>
                                <span className={styles.resultValue} style={{ color: 'var(--color-success)' }}>+{formatCurrency(result.totalReturns, 'en-IN')}</span>
                            </div>
                        </div>

                        <div className={styles.resultItemTotal}>
                            <span className={styles.resultLabel}>Duration Corpus Lasted</span>
                            <span className={styles.resultValue}>
                                {Math.floor(result.monthsLasted / 12)} Yrs {result.monthsLasted % 12} Mos
                            </span>
                        </div>

                        <div style={{ height: '250px', width: '100%', marginTop: '2rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="swpBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-600)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--color-primary-600)" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} tickFormatter={formatYAxis} width={65} />
                                    <Tooltip
                                        formatter={(value: number | undefined) => [formatCurrency(value || 0, 'en-IN'), 'Remaining Corpus']}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                    />
                                    <Area type="monotone" dataKey="balance" name="Remaining Corpus" stroke="var(--color-primary-600)" fill="url(#swpBalanceGrad)" strokeWidth={2.5} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <Button onClick={() => setShowSchedule(!showSchedule)} variant="outline" fullWidth>
                                {showSchedule ? 'Hide Withdrawal Schedule' : 'View Withdrawal Schedule'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {showSchedule && schedule.length > 0 && (
                <div className={styles.scheduleContainer}>
                    <div className={styles.scheduleHeader}>
                        <h3 className={styles.scheduleTitle}>Monthly Withdrawal Schedule</h3>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.scheduleTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Returns Earned</th>
                                    <th>Withdrawal</th>
                                    <th>Remaining Corpus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((row: SWPScheduleRow) => (
                                    <tr key={row.month}>
                                        <td>{row.date}</td>
                                        <td style={{ color: 'var(--color-success)' }}>+{formatCurrency(row.returns, 'en-IN')}</td>
                                        <td style={{ color: 'var(--color-danger, #ef4444)' }}>-{formatCurrency(row.withdrawal, 'en-IN')}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(row.closingBalance, 'en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                * Disclaimer: Returns are estimated and subject to market risk. Actual withdrawal amounts may vary.
            </div>
        </div>
    );
}
