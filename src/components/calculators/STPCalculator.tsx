import { useState, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { SliderInput } from '../ui/SliderInput';
import { Button } from '../ui/Button';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { BreakdownDonut } from '../ui/BreakdownDonut';
import { ScenarioActions } from '../ui/ScenarioActions';
import { calculateSTP, calculateSTPSchedule, formatCurrency, formatCompactINR } from '../../utils/finance';
import type { STPScheduleRow } from '../../types/finance.types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './EMI.module.css';

export function STPCalculator() {
    const [sourceCorpus, setSourceCorpus] = useLocalStorage('stp_source', 1000000);
    const [monthlyTransfer, setMonthlyTransfer] = useLocalStorage('stp_transfer', 20000);
    const [sourceReturn, setSourceReturn] = useLocalStorage('stp_src_rate', 6.5);
    const [targetReturn, setTargetReturn] = useLocalStorage('stp_tgt_rate', 12);
    const [years, setYears] = useLocalStorage('stp_years', 4);
    const [startDate] = useLocalStorage('stp_start', new Date().toISOString().split('T')[0]);
    const [showSchedule, setShowSchedule] = useState(false);

    const result = useMemo(
        () => calculateSTP(sourceCorpus, monthlyTransfer, sourceReturn, targetReturn, years),
        [sourceCorpus, monthlyTransfer, sourceReturn, targetReturn, years]
    );
    const schedule = useMemo(
        () => calculateSTPSchedule(sourceCorpus, monthlyTransfer, sourceReturn, targetReturn, years, new Date(startDate)),
        [sourceCorpus, monthlyTransfer, sourceReturn, targetReturn, years, startDate]
    );

    const chartData = useMemo(() => {
        const yearlyData = [];
        for (let y = 1; y <= years; y++) {
            const idx = Math.min(y * 12 - 1, schedule.length - 1);
            const row = schedule[idx];
            if (row) {
                yearlyData.push({
                    year: `Yr ${y}`,
                    source: row.sourceBalance,
                    target: row.targetBalance
                });
            }
        }
        return yearlyData;
    }, [schedule, years]);

    const handleReset = () => {
        setSourceCorpus(1000000);
        setMonthlyTransfer(20000);
        setSourceReturn(6.5);
        setTargetReturn(12);
        setYears(4);
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
                        <CardTitle>STP — Systematic Transfer Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            💡 STP lets you transfer a fixed amount monthly from a <strong>source fund</strong> (e.g., liquid/debt) to a <strong>target fund</strong> (e.g., equity), gradually deploying capital while earning returns on the parked amount.
                        </div>
                        <div className={styles.inputsGrid} style={{ gap: '1.25rem' }}>
                            <SliderInput
                                label="Source Corpus"
                                value={sourceCorpus}
                                min={100000}
                                max={50000000}
                                step={100000}
                                onChange={setSourceCorpus}
                            />
                            <SliderInput
                                label="Monthly Transfer"
                                value={monthlyTransfer}
                                min={1000}
                                max={200000}
                                step={1000}
                                onChange={setMonthlyTransfer}
                            />
                            <SliderInput
                                label="Source Fund Return (%)"
                                value={sourceReturn}
                                min={0}
                                max={15}
                                step={0.5}
                                onChange={setSourceReturn}
                                format={(v) => `${v}%`}
                                formatTick={(v) => `${v}%`}
                            />
                            <SliderInput
                                label="Target Fund Return (%)"
                                value={targetReturn}
                                min={0}
                                max={30}
                                step={0.5}
                                onChange={setTargetReturn}
                                format={(v) => `${v}%`}
                                formatTick={(v) => `${v}%`}
                            />
                            <SliderInput
                                label="STP Duration"
                                value={years}
                                min={1}
                                max={15}
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <CardTitle>STP Summary</CardTitle>
                            <ScenarioActions
                                studio="stp"
                                studioTitle="STP — Fund Transfer"
                                title={`${formatCompactINR(sourceCorpus)} · ${formatCompactINR(monthlyTransfer)}/mo · ${years}y`}
                                inputs={{
                                    stp_source: sourceCorpus,
                                    stp_transfer: monthlyTransfer,
                                    stp_src_rate: sourceReturn,
                                    stp_tgt_rate: targetReturn,
                                    stp_years: years,
                                }}
                                metrics={[
                                    { label: 'Total portfolio', display: formatCurrency(result.sourceCorpusFinal + result.targetCorpusFinal, 'en-IN'), value: result.sourceCorpusFinal + result.targetCorpusFinal, kind: 'currency' },
                                    { label: 'Target fund', display: formatCurrency(result.targetCorpusFinal, 'en-IN'), value: result.targetCorpusFinal, kind: 'currency' },
                                    { label: 'Total gains', display: formatCurrency(result.totalGains, 'en-IN'), value: result.totalGains, kind: 'currency' },
                                ]}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Total Portfolio Value</span>
                            <AnimatedNumber
                                className={styles.highlight}
                                value={result.sourceCorpusFinal + result.targetCorpusFinal}
                                format={(v) => formatCurrency(v, 'en-IN')}
                            />
                        </div>

                        <hr className={styles.divider} />

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Source Fund (Remaining)</span>
                                <AnimatedNumber
                                    className={styles.resultValue}
                                    value={result.sourceCorpusFinal}
                                    format={(v) => formatCurrency(v, 'en-IN')}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Target Fund (Built-up)</span>
                                <AnimatedNumber
                                    className={styles.resultValue}
                                    style={{ color: 'var(--color-success)' }}
                                    value={result.targetCorpusFinal}
                                    format={(v) => formatCurrency(v, 'en-IN')}
                                />
                            </div>
                        </div>

                        <div className={styles.resultItemTotal}>
                            <span className={styles.resultLabel}>Total Gains</span>
                            <AnimatedNumber
                                className={styles.resultValue}
                                style={{ color: 'var(--color-success)' }}
                                value={result.totalGains}
                                format={(v) => `+${formatCurrency(v, 'en-IN')}`}
                            />
                        </div>

                        <div className={styles.donutSection}>
                            <BreakdownDonut
                                segments={[
                                    { name: 'Source Fund', value: result.sourceCorpusFinal, color: 'var(--color-primary-500)' },
                                    { name: 'Target Fund', value: result.targetCorpusFinal, color: 'var(--color-success)' },
                                ]}
                                centerLabel="Portfolio"
                                centerValue={formatYAxis(result.sourceCorpusFinal + result.targetCorpusFinal)}
                                formatValue={(v) => formatCurrency(v, 'en-IN')}
                                height={180}
                            />
                        </div>

                        <div style={{ height: '250px', width: '100%', marginTop: '2rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="year" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} tickFormatter={formatYAxis} width={65} />
                                    <Tooltip
                                        formatter={(value: number | undefined) => formatCurrency(value || 0, 'en-IN')}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
                                    <Line type="monotone" dataKey="source" name="Source Fund" stroke="var(--color-primary-600)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="target" name="Target Fund" stroke="var(--color-success)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                </LineChart>
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
                        <h3 className={styles.scheduleTitle}>Monthly STP Schedule</h3>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.scheduleTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Transfer Amount</th>
                                    <th>Source Balance</th>
                                    <th>Target Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((row: STPScheduleRow) => (
                                    <tr key={row.month}>
                                        <td>{row.date}</td>
                                        <td>{formatCurrency(row.transferAmount, 'en-IN')}</td>
                                        <td>{formatCurrency(row.sourceBalance, 'en-IN')}</td>
                                        <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatCurrency(row.targetBalance, 'en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                * Disclaimer: Returns are indicative and subject to market conditions. STP is for gradual market participation.
            </div>
        </div>
    );
}
