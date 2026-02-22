import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { calculateCompoundInterest, formatCurrency, calculateCompoundInterestSchedule } from '../../utils/finance';
import type { CompoundInterestDetails, CompoundInterestScheduleRow } from '../../types/finance.types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './EMI.module.css'; // Reusing EMI styles for layout consistency

export function CompoundInterestCalculator() {
    const [principal, setPrincipal] = useLocalStorage('ci_principal', 50000);
    const [rate, setRate] = useLocalStorage('ci_rate', 7.5);
    const [time, setTime] = useLocalStorage('ci_time', 5);
    const [frequency, setFrequency] = useLocalStorage('ci_frequency', 4); // Default to Quarterly Compounding for FDs typically
    const [payoutFrequency, setPayoutFrequency] = useLocalStorage('ci_payout', 'maturity');
    const [startDate, setStartDate] = useLocalStorage('ci_start_date', new Date().toISOString().split('T')[0]);

    const [ciDetails, setCiDetails] = useState<CompoundInterestDetails>({ totalAmount: 0, totalInterest: 0 });
    const [showSchedule, setShowSchedule] = useState(false);

    useEffect(() => {
        const details = calculateCompoundInterest(principal, rate, time, frequency, payoutFrequency);
        setCiDetails(details);
    }, [principal, rate, time, frequency, payoutFrequency]);

    const schedule = useMemo(() => {
        return calculateCompoundInterestSchedule(principal, rate, time, frequency, new Date(startDate), payoutFrequency);
    }, [principal, rate, time, frequency, startDate, payoutFrequency]);

    const chartData = useMemo(() => {
        return schedule.map((row) => ({
            period: row.period,
            date: row.date,
            amount: row.totalAmount,
            principalInvested: payoutFrequency === 'maturity' ? principal : principal + row.interestEarned // Roughly trace principal
        }));
    }, [schedule, principal, payoutFrequency]);

    const handleReset = () => {
        setPrincipal(50000);
        setRate(7.5);
        setTime(5);
        setFrequency(4);
        setPayoutFrequency('maturity');
        setStartDate(new Date().toISOString().split('T')[0]);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.container}>
                {/* Input Section */}
                <Card className={styles.inputCard}>
                    <CardHeader>
                        <CardTitle>Compound Interest (FD/RD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.inputsGrid}>
                            <div className={styles.twoCol}>
                                <Input
                                    label="Principal (₹)"
                                    type="number"
                                    value={principal}
                                    onChange={(e) => setPrincipal(Number(e.target.value))}
                                    min={0}
                                />
                                <Input
                                    label="Interest (%)"
                                    type="number"
                                    step="0.1"
                                    value={rate}
                                    onChange={(e) => setRate(Number(e.target.value))}
                                    min={0}
                                    max={100}
                                />
                            </div>
                            <div className={styles.twoCol}>
                                <Input
                                    label="Time Period (Years)"
                                    type="number"
                                    value={time}
                                    onChange={(e) => setTime(Number(e.target.value))}
                                    min={1}
                                    max={100}
                                />
                                <Input
                                    label="Start Date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                                <div className="flex flex-col gap-2 mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>Compounding Frequency</label>
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(Number(e.target.value))}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem 0.75rem',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'var(--color-bg-surface)',
                                            color: 'var(--color-text-primary)',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        <option value={1}>Annually</option>
                                        <option value={2}>Semi-Annually</option>
                                        <option value={4}>Quarterly</option>
                                        <option value={12}>Monthly</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2 mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>Payout Frequency</label>
                                    <select
                                        value={payoutFrequency}
                                        onChange={(e) => setPayoutFrequency(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem 0.75rem',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'var(--color-bg-surface)',
                                            color: 'var(--color-text-primary)',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        <option value="maturity">At Maturity (Cumulative)</option>
                                        <option value="1">Annually (Non-Cumulative)</option>
                                        <option value="2">Semi-Annually (Non-Cumulative)</option>
                                        <option value="4">Quarterly (Non-Cumulative)</option>
                                        <option value="12">Monthly (Non-Cumulative)</option>
                                    </select>
                                </div>
                            </div>

                        </div>
                        <div className={styles.actions}>
                            <Button variant="outline" onClick={handleReset} fullWidth>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Section */}
                <Card className={styles.resultCard}>
                    <CardHeader>
                        <CardTitle>Investment Returns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Total Wealth</span>
                            <span className={styles.highlight}>{formatCurrency(ciDetails.totalAmount, 'en-IN')}</span>
                        </div>

                        <hr className={styles.divider} />

                        <div className={styles.twoCol}>
                            <div className={styles.resultItem}>
                                <span className={styles.resultLabel}>Principal Invested</span>
                                <span className={styles.resultValue}>{formatCurrency(principal, 'en-IN')}</span>
                            </div>
                            <div className={styles.resultItemTotal}>
                                <span className={styles.resultLabel}>Total Interest Earned</span>
                                <span className={styles.resultValue} style={{ color: 'var(--color-success)' }}>
                                    +{formatCurrency(ciDetails.totalInterest, 'en-IN')}
                                </span>
                            </div>
                        </div>

                        <div style={{ height: '300px', width: '100%', marginTop: '2.5rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis
                                        dataKey="period"
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                        tickFormatter={(val) => `P${val}`}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                        tickFormatter={(val) => {
                                            if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                                            if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                                            if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
                                            return val;
                                        }}
                                        width={60}
                                    />
                                    <Tooltip
                                        formatter={(value: number | undefined) => formatCurrency(value || 0, 'en-IN')}
                                        labelFormatter={(label, payload) => {
                                            const row = payload?.[0]?.payload;
                                            return row ? `${row.date} (Period ${label})` : `Period ${label}`;
                                        }}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line type="monotone" dataKey="amount" name="Total Wealth" stroke="var(--color-primary-600)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />

                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <Button onClick={() => setShowSchedule(!showSchedule)} variant="outline" fullWidth>
                                {showSchedule ? 'Hide Payout Schedule' : 'View Payout Schedule'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {showSchedule && schedule.length > 0 && (
                <div className={styles.scheduleContainer}>
                    <div className={styles.scheduleHeader}>
                        <h3 className={styles.scheduleTitle}>Interest Payout Schedule</h3>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.scheduleTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Period Interest Earned</th>
                                    <th>Accumulated Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((row: CompoundInterestScheduleRow) => (
                                    <tr key={row.period}>
                                        <td>{row.date}</td>
                                        <td>{formatCurrency(row.interestEarned, 'en-IN')}</td>
                                        <td>{formatCurrency(row.totalAmount, 'en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                * Disclaimer: The calculations and results provided are for informational purposes only. Actual figures may vary based on financial institution policies.
            </div>
        </div>
    );
}
