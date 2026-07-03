import { useState, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { SliderInput } from '../ui/SliderInput';
import { Button } from '../ui/Button';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { BreakdownDonut } from '../ui/BreakdownDonut';
import { ScenarioActions } from '../ui/ScenarioActions';
import { calculateSIP, calculateSIPSchedule, formatCurrency, formatCompactINR } from '../../utils/finance';
import type { SIPScheduleRow } from '../../types/finance.types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './EMI.module.css';

export function SIPCalculator() {
    const [monthly, setMonthly] = useLocalStorage('sip_monthly', 10000);
    const [rate, setRate] = useLocalStorage('sip_rate', 12);
    const [years, setYears] = useLocalStorage('sip_years', 15);
    const [stepUp, setStepUp] = useLocalStorage('sip_stepup', 0);
    const [startDate] = useLocalStorage('sip_start', new Date().toISOString().split('T')[0]);
    const [showSchedule, setShowSchedule] = useState(false);

    const result = useMemo(() => calculateSIP(monthly, rate, years, stepUp), [monthly, rate, years, stepUp]);
    const schedule = useMemo(() => calculateSIPSchedule(monthly, rate, years, stepUp, new Date(startDate)), [monthly, rate, years, stepUp, startDate]);

    const chartData = useMemo(() => {
        // Aggregate to yearly for readability
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
    }, [schedule, years]);

    // First year where returns exceed the amount invested so far
    const crossoverYear = useMemo(() => {
        const idx = chartData.findIndex((d) => d.gains > d.invested);
        return idx >= 0 ? idx + 1 : null;
    }, [chartData]);

    const handleReset = () => {
        setMonthly(10000);
        setRate(12);
        setYears(15);
        setStepUp(0);
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
                        <CardTitle>SIP / Mutual Fund Calculator</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.inputsGrid} style={{ gap: '1.25rem' }}>
                            <SliderInput
                                label="Monthly Investment"
                                value={monthly}
                                min={500}
                                max={200000}
                                step={500}
                                onChange={setMonthly}
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
                                label="Investment Duration"
                                value={years}
                                min={1}
                                max={40}
                                step={1}
                                onChange={setYears}
                                format={(v) => `${v} yrs`}
                                formatTick={(v) => `${v}y`}
                            />
                            <SliderInput
                                label="Annual Step-Up (%)"
                                value={stepUp}
                                min={0}
                                max={25}
                                step={1}
                                onChange={setStepUp}
                                format={(v) => v === 0 ? 'None' : `${v}%`}
                                formatTick={(v) => `${v}%`}
                            />
                            {stepUp > 0 && (
                                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                    💡 Your SIP will increase by <strong>{stepUp}%</strong> every year — a Step-Up SIP that significantly boosts your wealth.
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <CardTitle>Wealth Projection</CardTitle>
                            <ScenarioActions
                                studio="sip"
                                studioTitle="SIP / Mutual Funds"
                                title={`${formatCompactINR(monthly)}/mo · ${rate}% · ${years}y${stepUp > 0 ? ` · +${stepUp}%/yr` : ''}`}
                                inputs={{ sip_monthly: monthly, sip_rate: rate, sip_years: years, sip_stepup: stepUp }}
                                metrics={[
                                    { label: 'Total corpus', display: formatCurrency(result.totalValue, 'en-IN'), value: result.totalValue, kind: 'currency' },
                                    { label: 'Total invested', display: formatCurrency(result.investedAmount, 'en-IN'), value: result.investedAmount, kind: 'currency' },
                                    { label: 'Estimated returns', display: formatCurrency(result.estimatedReturns, 'en-IN'), value: result.estimatedReturns, kind: 'currency' },
                                    { label: 'Wealth gained', display: result.investedAmount > 0 ? `${((result.estimatedReturns / result.investedAmount) * 100).toFixed(1)}%` : '0%', value: result.investedAmount > 0 ? (result.estimatedReturns / result.investedAmount) * 100 : 0, kind: 'percent' },
                                ]}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Total Corpus</span>
                            <AnimatedNumber
                                className={styles.highlight}
                                value={result.totalValue}
                                format={(v) => formatCurrency(v, 'en-IN')}
                            />
                        </div>

                        <hr className={styles.divider} />

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Total Invested</span>
                                <AnimatedNumber
                                    className={styles.resultValue}
                                    value={result.investedAmount}
                                    format={(v) => formatCurrency(v, 'en-IN')}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Estimated Returns</span>
                                <AnimatedNumber
                                    className={styles.resultValue}
                                    style={{ color: 'var(--color-success)' }}
                                    value={result.estimatedReturns}
                                    format={(v) => `+${formatCurrency(v, 'en-IN')}`}
                                />
                            </div>
                        </div>

                        <div className={styles.resultItemTotal}>
                            <span className={styles.resultLabel}>Wealth Gained (%)</span>
                            <AnimatedNumber
                                className={styles.resultValue}
                                value={result.investedAmount > 0 ? (result.estimatedReturns / result.investedAmount) * 100 : 0}
                                format={(v) => `${v.toFixed(1)}%`}
                            />
                        </div>

                        {result.investedAmount > 0 && (
                            <div className={styles.insightChip}>
                                🚀 Your money multiplies{' '}
                                <strong>{(result.totalValue / result.investedAmount).toFixed(1)}×</strong> in {years} years
                                {crossoverYear && (
                                    <> — returns overtake your own contributions in <strong>year {crossoverYear}</strong></>
                                )}
                            </div>
                        )}

                        <div className={styles.donutSection}>
                            <BreakdownDonut
                                segments={[
                                    { name: 'Invested', value: result.investedAmount, color: 'var(--color-primary-500)' },
                                    { name: 'Returns', value: result.estimatedReturns, color: 'var(--color-success)' },
                                ]}
                                centerLabel="Corpus"
                                centerValue={formatYAxis(result.totalValue)}
                                formatValue={(v) => formatCurrency(v, 'en-IN')}
                            />
                        </div>

                        <div style={{ height: '280px', width: '100%', marginTop: '2rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="sipInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-600)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-primary-600)" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="sipGainsGrad" x1="0" y1="0" x2="0" y2="1">
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
                                    <Area type="monotone" dataKey="invested" name="Amount Invested" stroke="var(--color-primary-600)" fill="url(#sipInvestedGrad)" strokeWidth={2} dot={false} />
                                    <Area type="monotone" dataKey="gains" name="Est. Returns" stroke="var(--color-success)" fill="url(#sipGainsGrad)" strokeWidth={2} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <Button onClick={() => setShowSchedule(!showSchedule)} variant="outline" fullWidth>
                                {showSchedule ? 'Hide Monthly Schedule' : 'View Monthly Schedule'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {showSchedule && schedule.length > 0 && (
                <div className={styles.scheduleContainer}>
                    <div className={styles.scheduleHeader}>
                        <h3 className={styles.scheduleTitle}>Monthly Investment Schedule</h3>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.scheduleTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>SIP Amount</th>
                                    <th>Returns This Month</th>
                                    <th>Total Invested</th>
                                    <th>Corpus Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((row: SIPScheduleRow) => (
                                    <tr key={row.month}>
                                        <td>{row.date}</td>
                                        <td>{formatCurrency(row.investment, 'en-IN')}</td>
                                        <td style={{ color: 'var(--color-success)' }}>+{formatCurrency(row.returns, 'en-IN')}</td>
                                        <td>{formatCurrency(row.totalInvested, 'en-IN')}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(row.totalValue, 'en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                * Disclaimer: Mutual fund investments are subject to market risks. Past returns are not indicative of future performance.
            </div>
        </div>
    );
}
