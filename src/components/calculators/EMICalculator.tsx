import { useState, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { calculateEMI, formatCurrency, calculateAmortizationSchedule, calculatePrepaymentImpact, calculateTenureFromEMI } from '../../utils/finance';
import type { PrepaymentResult, AmortizationScheduleRow, PrepaymentFrequency, PrepaymentReductionMode, TenureUnit, CalcMode } from '../../types/finance.types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator, Clock3, WalletCards } from 'lucide-react';
import styles from './EMI.module.css';

export function EMICalculator() {
    const [principal, setPrincipal] = useLocalStorage('emi_principal', 5000000);
    const [rate, setRate] = useLocalStorage('emi_rate', 8.5);
    const [tenure, setTenure] = useLocalStorage('emi_tenure', 20); // Stores value in terms of the selected unit
    const [tenureUnit, setTenureUnit] = useLocalStorage<TenureUnit>('emi_tenure_unit', 'years');
    const [startDate, setStartDate] = useLocalStorage('emi_start_date', new Date().toISOString().split('T')[0]);

    // Prepayment States
    const [prepaymentAmount, setPrepaymentAmount] = useLocalStorage('pre_amount', 0);
    const [prepaymentFrequency, setPrepaymentFrequency] = useLocalStorage<string>('pre_frequency', 'monthly');
    const [prepaymentReductionMode, setPrepaymentReductionMode] = useLocalStorage<PrepaymentReductionMode>('pre_reduction_mode', 'tenure');
    const [lumpSumMonth, setLumpSumMonth] = useLocalStorage('pre_lumpsum_month', 12);

    const [showSchedule, setShowSchedule] = useState(false);

    const [calcMode, setCalcMode] = useLocalStorage<CalcMode>('emi_calc_mode', 'emi');
    const [customEmi, setCustomEmi] = useLocalStorage('emi_custom_val', 43391);

    const tenureInYears = useMemo(() => tenureUnit === 'months' ? tenure / 12 : tenure, [tenure, tenureUnit]);

    const activeTenure = useMemo(() => calcMode === 'emi' ? tenureInYears : calculateTenureFromEMI(principal, rate, customEmi), [calcMode, tenureInYears, principal, rate, customEmi]);
    const activeEmi = useMemo(() => calcMode === 'emi' ? calculateEMI(principal, rate, tenureInYears).emi : customEmi, [calcMode, principal, rate, tenureInYears, customEmi]);

    const emiDetails = useMemo(() => {
        if (!activeTenure || activeTenure === Infinity) {
            return { emi: activeEmi || 0, totalInterest: activeTenure === Infinity ? Infinity : 0, totalPayment: activeTenure === Infinity ? Infinity : 0 };
        }

        return calcMode === 'emi'
            ? calculateEMI(principal, rate, tenureInYears)
            : (function () {
                const computedTenure = calculateTenureFromEMI(principal, rate, customEmi);
                if (computedTenure === Infinity) return { emi: customEmi, totalPayment: Infinity, totalInterest: Infinity };
                const payment = customEmi * computedTenure * 12;
                return { emi: customEmi, totalPayment: payment, totalInterest: payment - principal };
            })();
    }, [activeEmi, activeTenure, calcMode, customEmi, principal, rate, tenureInYears]);

    const prepaymentResult = useMemo<PrepaymentResult | null>(() => {
        if (!activeTenure || activeTenure === Infinity || prepaymentAmount <= 0) return null;

        const monthlyPrepaymentForImpact = prepaymentFrequency !== 'one-time' ? prepaymentAmount : 0;
        const lumpSumForImpact = prepaymentFrequency === 'one-time' ? prepaymentAmount : 0;
        const freqForImpact = (prepaymentFrequency === 'one-time' ? 'monthly' : prepaymentFrequency) as PrepaymentFrequency;

        return calculatePrepaymentImpact(principal, rate, activeTenure, monthlyPrepaymentForImpact, freqForImpact, lumpSumForImpact, lumpSumMonth, new Date(startDate), prepaymentReductionMode, activeEmi);
    }, [principal, rate, prepaymentAmount, prepaymentFrequency, prepaymentReductionMode, lumpSumMonth, startDate, activeTenure, activeEmi]);

    const standardSchedule = useMemo(() => {
        if (!activeTenure || activeTenure === Infinity) return [];
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

    const displayedTotalPayment = useMemo(() => {
        if (activeTenure === Infinity) return Infinity;
        if (prepaymentResult) return principal + prepaymentResult.newTotalInterest;
        return emiDetails.totalPayment;
    }, [activeTenure, emiDetails.totalPayment, prepaymentResult, principal]);

    const handleReset = () => {
        setPrincipal(5000000);
        setRate(8.5);
        setTenure(20);
        setTenureUnit('years');
        setStartDate(new Date().toISOString().split('T')[0]);
        setPrepaymentAmount(0);
        setPrepaymentFrequency('monthly');
        setPrepaymentReductionMode('tenure');
        setLumpSumMonth(12);
        setCustomEmi(43391);
    };

    const handleIntChange = (setter: (val: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawVal = e.target.value.replace(/[^0-9]/g, '');
        if (rawVal === '') {
            setter(0);
        } else {
            setter(parseInt(rawVal, 10));
        }
    };

    const formatInt = (val: number) => {
        if (!val || isNaN(val)) return '';
        return new Intl.NumberFormat('en-IN').format(val);
    };

    const formatTenureReadout = (years: number) => {
        if (years === Infinity) return 'Infinite / Unpaid';
        if (!years || isNaN(years)) return '-';

        return tenureUnit === 'years'
            ? `${Number(years.toFixed(2))} Years`
            : `${Math.round(years * 12)} Months`;
    };

    const handleTenureUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newUnit = e.target.value as TenureUnit;
        if (calcMode === 'emi') {
            if (newUnit === 'months' && tenureUnit === 'years') setTenure(Math.round(tenure * 12));
            if (newUnit === 'years' && tenureUnit === 'months') setTenure(Math.max(1, Math.round(tenure / 12)));
        }
        setTenureUnit(newUnit);
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
                        <div className={styles.modeGroup} aria-label="Calculation mode">
                            <button
                                className={calcMode === 'emi' ? styles.modeButtonActive : styles.modeButton}
                                type="button"
                                aria-pressed={calcMode === 'emi'}
                                onClick={() => setCalcMode('emi')}
                            >
                                <Calculator size={18} />
                                <span>Calculate EMI</span>
                            </button>
                            <button
                                className={calcMode === 'tenure' ? styles.modeButtonActive : styles.modeButton}
                                type="button"
                                aria-pressed={calcMode === 'tenure'}
                                onClick={() => setCalcMode('tenure')}
                            >
                                <Clock3 size={18} />
                                <span>Calculate Tenure</span>
                            </button>
                        </div>
                        <div className={styles.formStack}>
                            <div className={styles.twoCol}>
                                <Input
                                    label="Loan Amount (₹)"
                                    type="text"
                                    inputMode="numeric"
                                    value={formatInt(principal)}
                                    onChange={handleIntChange(setPrincipal)}
                                />
                                <Input
                                    label="Interest Rate (%)"
                                    type="number"
                                    step="0.1"
                                    value={rate === 0 ? '' : rate}
                                    onChange={(e) => setRate(e.target.value === '' ? 0 : Number(e.target.value))}
                                    min={0}
                                    max={100}
                                />
                            </div>

                        {calcMode === 'emi' ? (
                            <>
                                <div className={styles.twoCol}>
                                    <Input
                                        label="Tenure"
                                        labelRightElement={
                                            <select className={styles.unitSelect} value={tenureUnit} onChange={handleTenureUnitChange}>
                                                <option value="years">Years</option>
                                                <option value="months">Months</option>
                                            </select>
                                        }
                                        type="number"
                                        value={tenure === 0 ? '' : tenure}
                                        onChange={(e) => setTenure(e.target.value === '' ? 0 : Math.round(Number(e.target.value)))}
                                        min={0.1}
                                        max={tenureUnit === 'months' ? 1200 : 100}
                                    />
                                    <Input
                                        label="Loan Start Date"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className={styles.readoutField}>
                                    <div className={styles.readoutHeader}>
                                        <span>Computed EMI</span>
                                        <span className={styles.readoutBadge}>Calculated</span>
                                    </div>
                                    <div className={styles.readoutValue}>{formatCurrency(activeEmi, 'en-IN')}</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={styles.twoCol}>
                                    <Input
                                        label="Target EMI (₹)"
                                        type="text"
                                        inputMode="numeric"
                                        value={formatInt(customEmi)}
                                        onChange={handleIntChange(setCustomEmi)}
                                    />
                                    <Input
                                        label="Loan Start Date"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className={styles.readoutField}>
                                    <div className={styles.readoutHeader}>
                                        <span>Computed Tenure</span>
                                        <span className={styles.readoutMeta}>
                                            <span className={styles.readoutBadge}>Calculated</span>
                                            <select className={styles.unitSelect} value={tenureUnit} onChange={handleTenureUnitChange}>
                                                <option value="years">Years</option>
                                                <option value="months">Months</option>
                                            </select>
                                        </span>
                                    </div>
                                    <div className={styles.readoutValue}>{formatTenureReadout(activeTenure)}</div>
                                </div>
                            </>
                            )}
                        </div>

                        <hr className={styles.divider} />

                        <h4 className={styles.sectionTitle}>
                            Prepayment Strategy (Optional)
                        </h4>

                        <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                            <div className={styles.fieldStack}>
                                <Input
                                    label="Prepayment Amount (₹)"
                                    type="text"
                                    inputMode="numeric"
                                    value={formatInt(prepaymentAmount)}
                                    onChange={handleIntChange(setPrepaymentAmount)}
                                />
                            </div>
                            <div className={styles.fieldStack}>
                                <label className={styles.fieldLabel}>
                                    Prepayment Frequency
                                </label>
                                <select
                                    className={styles.select}
                                    value={prepaymentFrequency}
                                    onChange={(e) => setPrepaymentFrequency(e.target.value)}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="yearly">Yearly</option>
                                    <option value="one-time">One-time</option>
                                </select>
                            </div>
                        </div>

                        {prepaymentFrequency === 'one-time' && (
                            <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                                <Input
                                    label="Paid After (Months)"
                                    type="number"
                                    value={lumpSumMonth === 0 ? '' : lumpSumMonth}
                                    onChange={(e) => setLumpSumMonth(e.target.value === '' ? 0 : Number(e.target.value))}
                                    min={1}
                                />
                                <div />
                            </div>
                        )}

                        <div className={styles.strategySection}>
                            <label className={styles.fieldLabel}>
                                Prepayment Benefit
                            </label>
                            <div className={styles.strategyGrid}>
                                <button
                                    className={prepaymentReductionMode === 'tenure' ? styles.strategyButtonActive : styles.strategyButton}
                                    type="button"
                                    aria-pressed={prepaymentReductionMode === 'tenure'}
                                    onClick={() => setPrepaymentReductionMode('tenure')}
                                >
                                    <span className={styles.strategyIcon}><Clock3 size={18} /></span>
                                    <span className={styles.strategyCopy}>
                                        <strong>Reduce Tenure</strong>
                                        <span>Same EMI, faster payoff</span>
                                    </span>
                                </button>
                                <button
                                    className={prepaymentReductionMode === 'emi' ? styles.strategyButtonActive : styles.strategyButton}
                                    type="button"
                                    aria-pressed={prepaymentReductionMode === 'emi'}
                                    onClick={() => setPrepaymentReductionMode('emi')}
                                >
                                    <span className={styles.strategyIcon}><WalletCards size={18} /></span>
                                    <span className={styles.strategyCopy}>
                                        <strong>Reduce EMI</strong>
                                        <span>Same tenure, lower payment</span>
                                    </span>
                                </button>
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
                            <span className={styles.resultLabel}>{prepaymentResult ? 'Revised Total Payable' : 'Total Amount Payable'}</span>
                            <span className={styles.resultValue}>{displayedTotalPayment === Infinity ? '∞' : formatCurrency(displayedTotalPayment, 'en-IN')}</span>
                        </div>

                        {prepaymentResult && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-lg)' }}>
                                <h4 style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--color-success)' }}>
                                    Prepayment Savings
                                </h4>
                                <div className={styles.resultItem}>
                                    <span className={styles.resultLabel}>Interest Saved</span>
                                    <span className={styles.resultValue} style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                                        {formatCurrency(prepaymentResult.interestSaved, 'en-IN')}
                                    </span>
                                </div>
                                {prepaymentReductionMode === 'tenure' ? (
                                    <div className={styles.resultItem}>
                                        <span className={styles.resultLabel}>Time Saved</span>
                                        <span className={styles.resultValue} style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                            {Math.floor(prepaymentResult.monthsSaved / 12)} Yrs, {prepaymentResult.monthsSaved % 12} Mos ({prepaymentResult.monthsSaved} Months)
                                        </span>
                                    </div>
                                ) : (
                                    <div className={styles.resultItem}>
                                        <span className={styles.resultLabel}>Reduced EMI</span>
                                        <span className={styles.resultValue} style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                            {formatCurrency(prepaymentResult.revisedEmi, 'en-IN')}
                                        </span>
                                    </div>
                                )}

                                <br />

                                <div className={styles.resultItem}>
                                    <span className={styles.resultLabel}>{prepaymentReductionMode === 'tenure' ? 'Revised Tenure' : 'EMI Reduction'}</span>
                                    <span className={styles.resultValue}>
                                        {prepaymentReductionMode === 'tenure'
                                            ? `${Math.floor(prepaymentResult.newTenureMonths / 12)} Yrs, ${prepaymentResult.newTenureMonths % 12} Mos (${prepaymentResult.newTenureMonths} Months)`
                                            : formatCurrency(prepaymentResult.emiReduced, 'en-IN')}
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
