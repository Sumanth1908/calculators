import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { calculateEMI, formatCurrency, calculateAmortizationSchedule, calculatePrepaymentImpact, calculateTenureFromEMI } from '../../utils/finance';
import type { PrepaymentResult, AmortizationScheduleRow, PrepaymentFrequency, TenureUnit, CalcMode } from '../../types/finance.types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './EMI.module.css';

export function EMICalculator() {
    const [principal, setPrincipal] = useLocalStorage('emi_principal', 5000000);
    const [rate, setRate] = useLocalStorage('emi_rate', 8.5);
    const [tenure, setTenure] = useLocalStorage('emi_tenure', 20); // Stores value in terms of the selected unit
    const [tenureUnit, setTenureUnit] = useLocalStorage<TenureUnit>('emi_tenure_unit', 'years');
    const [startDate, setStartDate] = useLocalStorage('emi_start_date', new Date().toISOString().split('T')[0]);

    // Prepayment States
    const [monthlyPrepayment, setMonthlyPrepayment] = useLocalStorage('pre_monthly', 0);
    const [prepaymentFrequency, setPrepaymentFrequency] = useLocalStorage<PrepaymentFrequency>('pre_frequency', 'monthly');
    const [lumpSumAmount, setLumpSumAmount] = useLocalStorage('pre_lumpsum', 0);
    const [lumpSumMonth, setLumpSumMonth] = useLocalStorage('pre_lumpsum_month', 12);

    const [emiDetails, setEmiDetails] = useState({ emi: 0, totalInterest: 0, totalPayment: 0 });
    const [prepaymentResult, setPrepaymentResult] = useState<PrepaymentResult | null>(null);

    const [showSchedule, setShowSchedule] = useState(false);

    const [calcMode, setCalcMode] = useLocalStorage<CalcMode>('emi_calc_mode', 'emi');
    const [customEmi, setCustomEmi] = useLocalStorage('emi_custom_val', 43391);

    const tenureInYears = useMemo(() => tenureUnit === 'months' ? tenure / 12 : tenure, [tenure, tenureUnit]);

    const activeTenure = useMemo(() => calcMode === 'emi' ? tenureInYears : calculateTenureFromEMI(principal, rate, customEmi), [calcMode, tenureInYears, principal, rate, customEmi]);
    const activeEmi = useMemo(() => calcMode === 'emi' ? calculateEMI(principal, rate, tenureInYears).emi : customEmi, [calcMode, principal, rate, tenureInYears, customEmi]);

    useEffect(() => {
        if (activeTenure === Infinity) {
            setEmiDetails({ emi: activeEmi, totalInterest: Infinity, totalPayment: Infinity });
            setPrepaymentResult(null);
            return;
        }

        const details = calcMode === 'emi'
            ? calculateEMI(principal, rate, tenureInYears)
            : (function () {
                const computedTenure = calculateTenureFromEMI(principal, rate, customEmi);
                const payment = customEmi * computedTenure * 12;
                return { emi: customEmi, totalPayment: payment, totalInterest: payment - principal };
            })();

        setEmiDetails(details);

        if (monthlyPrepayment > 0 || lumpSumAmount > 0) {
            const preRes = calculatePrepaymentImpact(principal, rate, activeTenure, monthlyPrepayment, prepaymentFrequency, lumpSumAmount, lumpSumMonth, new Date(startDate));
            setPrepaymentResult(preRes);
        } else {
            setPrepaymentResult(null);
        }
    }, [principal, rate, tenureInYears, customEmi, calcMode, monthlyPrepayment, prepaymentFrequency, lumpSumAmount, lumpSumMonth, startDate, activeTenure, activeEmi]);

    const standardSchedule = useMemo(() => {
        if (activeTenure === Infinity) return [];
        return calculateAmortizationSchedule(principal, rate, activeTenure, emiDetails.emi, new Date(startDate));
    }, [principal, rate, activeTenure, emiDetails.emi, startDate]);

    const scheduleToDisplay = useMemo(() => {
        if (prepaymentResult && prepaymentResult.schedule) {
            return prepaymentResult.schedule;
        }
        return standardSchedule;
    }, [prepaymentResult, standardSchedule]);

    const chartData = useMemo(() => {
        return standardSchedule.map((standardRow, index) => {
            const preRow = prepaymentResult?.schedule[index];
            return {
                month: standardRow.month,
                date: standardRow.date,
                standardBalance: standardRow.balance,
                prepaymentBalance: preRow ? preRow.balance : 0,
            };
        });
    }, [standardSchedule, prepaymentResult]);

    const handleReset = () => {
        setPrincipal(5000000);
        setRate(8.5);
        setTenure(20);
        setTenureUnit('years');
        setStartDate(new Date().toISOString().split('T')[0]);
        setMonthlyPrepayment(0);
        setPrepaymentFrequency('monthly');
        setLumpSumAmount(0);
        setLumpSumMonth(12);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.container}>
                {/* Input Section */}
                <Card className={styles.inputCard}>
                    <CardHeader>
                        <CardTitle>Home / Personal Loan EMI</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--color-bg-subtle)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                            <button
                                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', backgroundColor: calcMode === 'emi' ? 'var(--color-bg-surface)' : 'transparent', color: calcMode === 'emi' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)', boxShadow: calcMode === 'emi' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                onClick={() => setCalcMode('emi')}
                            >
                                Calculate EMI
                            </button>
                            <button
                                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', backgroundColor: calcMode === 'tenure' ? 'var(--color-bg-surface)' : 'transparent', color: calcMode === 'tenure' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)', boxShadow: calcMode === 'tenure' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                onClick={() => setCalcMode('tenure')}
                            >
                                Calculate Tenure
                            </button>
                        </div>
                        <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                            <Input
                                label="Loan Amount (₹)"
                                type="number"
                                value={principal}
                                onChange={(e) => setPrincipal(Number(e.target.value))}
                                min={0}
                            />
                            <Input
                                label="Interest Rate (%)"
                                type="number"
                                step="0.1"
                                value={rate}
                                onChange={(e) => setRate(Number(e.target.value))}
                                min={0}
                                max={100}
                            />
                        </div>
                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <Input
                                label={calcMode === 'emi' ? "Computed EMI (₹)" : "Target EMI (₹)"}
                                type="number"
                                value={calcMode === 'emi' ? Math.round(activeEmi) : customEmi}
                                onChange={(e) => setCustomEmi(Number(e.target.value))}
                                min={1}
                                disabled={calcMode === 'emi'}
                            />

                            <Input
                                label={calcMode === 'tenure' ? "Target Tenure" : "Tenure"}
                                labelRightElement={
                                    <select
                                        value={tenureUnit}
                                        onChange={(e) => {
                                            const newUnit = e.target.value as TenureUnit;
                                            if (calcMode === 'emi') {
                                                if (newUnit === 'months' && tenureUnit === 'years') setTenure(tenure * 12);
                                                if (newUnit === 'years' && tenureUnit === 'months') setTenure(Number((tenure / 12).toFixed(2)));
                                            }
                                            setTenureUnit(newUnit);
                                        }}
                                        style={{
                                            padding: '0.125rem 0.25rem',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: 'var(--color-bg-surface)',
                                            color: 'var(--color-text-primary)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            opacity: 1
                                        }}
                                    >
                                        <option value="years">Years</option>
                                        <option value="months">Months</option>
                                    </select>
                                }
                                type="number"
                                value={calcMode === 'tenure' ? (tenureUnit === 'years' ? activeTenure : Math.round(activeTenure * 12)) : tenure}
                                onChange={(e) => setTenure(Number(e.target.value))}
                                min={0.1}
                                max={tenureUnit === 'months' ? 1200 : 100}
                                disabled={calcMode === 'tenure'}
                            />
                        </div>

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <Input
                                label="Loan Start Date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <hr className={styles.divider} />

                        <h4 style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-primary-600)' }}>
                            Prepayment Strategy (Optional)
                        </h4>

                        <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Input
                                    label="Recurring Prepayment (₹)"
                                    type="number"
                                    value={monthlyPrepayment}
                                    onChange={(e) => setMonthlyPrepayment(Number(e.target.value))}
                                    min={0}
                                />
                            </div>
                            <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                    Prepayment Frequency
                                </label>
                                <select
                                    value={prepaymentFrequency}
                                    onChange={(e) => setPrepaymentFrequency(e.target.value as PrepaymentFrequency)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'var(--color-bg-surface)',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '1rem',
                                        minHeight: '40px'
                                    }}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.twoCol}>
                            <Input
                                label="One-Time Lump Sum (₹)"
                                type="number"
                                value={lumpSumAmount}
                                onChange={(e) => setLumpSumAmount(Number(e.target.value))}
                                min={0}
                            />
                            <Input
                                label="Paid After (Months)"
                                type="number"
                                value={lumpSumMonth}
                                onChange={(e) => setLumpSumMonth(Number(e.target.value))}
                                min={1}
                            />
                        </div>
                        <div className={styles.actions}>
                            <Button variant="outline" onClick={handleReset} fullWidth>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Section */}
                <Card className={styles.resultCard}>
                    <CardHeader>
                        <CardTitle>EMI Details & Visualization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Monthly EMI</span>
                            <span className={styles.highlight}>{formatCurrency(emiDetails.emi, 'en-IN')}</span>
                        </div>

                        <hr className={styles.divider} />

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Principal Amount</span>
                                <span className={styles.resultValue} style={{ fontSize: '1.125rem' }}>{formatCurrency(principal, 'en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Total Interest</span>
                                <span className={styles.resultValue} style={{ fontSize: '1.125rem' }}>{activeTenure === Infinity ? '∞' : formatCurrency(emiDetails.totalInterest, 'en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Loan Tenure</span>
                                <span className={styles.resultValue} style={{ fontSize: '1.125rem' }}>{activeTenure === Infinity ? 'Infinite / Unpaid' : `${Math.floor(Math.round(activeTenure * 12) / 12)} Yrs, ${Math.round(activeTenure * 12) % 12} Mos (${Math.round(activeTenure * 12)} Months)`}</span>
                            </div>
                        </div>

                        <div className={styles.resultItemTotal}>
                            <span className={styles.resultLabel}>Total Amount Payable</span>
                            <span className={styles.resultValue}>{activeTenure === Infinity ? '∞' : formatCurrency(emiDetails.totalPayment, 'en-IN')}</span>
                        </div>

                        {prepaymentResult && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-lg)' }}>
                                <h4 style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--color-success)' }}>
                                    ✨ Prepayment Savings
                                </h4>
                                <div className={styles.resultItem}>
                                    <span className={styles.resultLabel}>Interest Saved</span>
                                    <span className={styles.resultValue} style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                                        {formatCurrency(prepaymentResult.interestSaved, 'en-IN')}
                                    </span>
                                </div>
                                <div className={styles.resultItem}>
                                    <span className={styles.resultLabel}>Time Saved</span>
                                    <span className={styles.resultValue} style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                        {Math.floor(prepaymentResult.monthsSaved / 12)} Yrs, {prepaymentResult.monthsSaved % 12} Mos ({prepaymentResult.monthsSaved} Months)
                                    </span>
                                </div>

                                <br />

                                <div className={styles.resultItem}>
                                    <span className={styles.resultLabel}>Revised Tenure</span>
                                    <span className={styles.resultValue}>
                                        {Math.floor(prepaymentResult.newTenureMonths / 12)} Yrs, {prepaymentResult.newTenureMonths % 12} Mos ({prepaymentResult.newTenureMonths} Months)
                                    </span>
                                </div>
                            </div>
                        )}

                        <div style={{ height: '300px', width: '100%', marginTop: '2.5rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                        tickFormatter={(val) => `M${val}`}
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
                                            return row ? `${row.date} (Month ${label})` : `Month ${label}`;
                                        }}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line type="monotone" dataKey="standardBalance" name="Standard Balance" stroke="var(--color-primary-600)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    {prepaymentResult && (
                                        <Line type="monotone" dataKey="prepaymentBalance" name="Revised Balance" stroke="var(--color-success)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <Button onClick={() => setShowSchedule(!showSchedule)} variant="outline" fullWidth>
                                {showSchedule ? 'Hide Repayment Schedule' : 'View Repayment Schedule'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {showSchedule && scheduleToDisplay.length > 0 && (
                <div className={styles.scheduleContainer}>
                    <div className={styles.scheduleHeader}>
                        <h3 className={styles.scheduleTitle}>{prepaymentResult ? "Revised Repayment Schedule" : "Repayment Schedule"}</h3>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.scheduleTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Payment</th>
                                    <th>Extra/Pre-payment</th>
                                    <th>Principal Component</th>
                                    <th>Interest Component</th>
                                    <th>Remaining Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduleToDisplay.map((row: AmortizationScheduleRow) => (
                                    <tr key={row.month} style={row.extraPayment > 0 ? { backgroundColor: 'var(--color-success-50, rgba(16, 185, 129, 0.05))' } : {}}>
                                        <td>{row.date}</td>
                                        <td>{formatCurrency(row.payment, 'en-IN')}</td>
                                        <td style={{ color: row.extraPayment > 0 ? 'var(--color-success)' : 'inherit', fontWeight: row.extraPayment > 0 ? 600 : 'normal' }}>
                                            {row.extraPayment > 0 ? `+${formatCurrency(row.extraPayment, 'en-IN')}` : '-'}
                                        </td>
                                        <td>{formatCurrency(row.principal, 'en-IN')}</td>
                                        <td>{formatCurrency(row.interest, 'en-IN')}</td>
                                        <td>{formatCurrency(row.balance, 'en-IN')}</td>
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
