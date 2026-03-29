import { useState, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
    calculateCompoundInterest,
    calculateCompoundInterestSchedule,
    calculateRD,
    calculateRDSchedule,
    formatCurrency,
} from '../../utils/finance';
import type {
    CompoundInterestScheduleRow,
    CompoundingFrequency,
    PayoutFrequency,
    RDScheduleRow,
    TenureUnit,
} from '../../types/finance.types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import styles from './EMI.module.css';

type CalcTab = 'fd' | 'rd';

const tenureSelectStyle = {
    padding: '0.125rem 0.25rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-surface)',
    color: 'var(--color-text-primary)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    opacity: 1,
};

const frequencySelectStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-primary)',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    outline: 'none',
};

const frequencyLabelStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
    marginBottom: '0.5rem',
    display: 'block',
};

const formatYAxis = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
};

/* ─── FD Sub-component ─────────────────────────────────────────────────────── */
function FDCalculator() {
    const [principal, setPrincipal] = useLocalStorage('fd_principal', 100000);
    const [rate, setRate] = useLocalStorage('fd_rate', 7.5);
    const [tenure, setTenure] = useLocalStorage('fd_tenure', 3);
    const [tenureUnit, setTenureUnit] = useLocalStorage<TenureUnit>('fd_tenure_unit', 'years');
    const [frequency, setFrequency] = useLocalStorage<CompoundingFrequency>('fd_frequency', 4);
    const [payoutFrequency, setPayoutFrequency] = useLocalStorage<PayoutFrequency>('fd_payout', 'maturity');
    const [startDate, setStartDate] = useLocalStorage('fd_start_date', new Date().toISOString().split('T')[0]);
    const [showSchedule, setShowSchedule] = useState(false);

    const tenureInYears = useMemo(
        () => (tenureUnit === 'months' ? tenure / 12 : tenure),
        [tenure, tenureUnit]
    );

    const result = useMemo(
        () => calculateCompoundInterest(principal, rate, tenureInYears, frequency, payoutFrequency),
        [principal, rate, tenureInYears, frequency, payoutFrequency]
    );

    const schedule = useMemo(
        () => calculateCompoundInterestSchedule(principal, rate, tenureInYears, frequency, new Date(startDate), payoutFrequency),
        [principal, rate, tenureInYears, frequency, startDate, payoutFrequency]
    );

    const chartData = useMemo(() =>
        schedule.map((row) => ({
            period: row.period,
            date: row.date,
            principal,
            interest: row.totalAmount - principal,
            total: row.totalAmount,
        })),
        [schedule, principal]
    );

    const handleReset = () => {
        setPrincipal(100000);
        setRate(7.5);
        setTenure(3);
        setTenureUnit('years');
        setFrequency(4);
        setPayoutFrequency('maturity');
        setStartDate(new Date().toISOString().split('T')[0]);
    };

    return (
        <>
            <div className={styles.container}>
                <Card className={styles.inputCard}>
                    <CardHeader>
                        <CardTitle>Fixed Deposit (FD) Calculator</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Row 1: Principal + Rate */}
                        <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                            <Input
                                label="Principal Amount (₹)"
                                type="number"
                                value={principal}
                                onChange={(e) => setPrincipal(Number(e.target.value))}
                                min={0}
                            />
                            <Input
                                label="Interest Rate (% p.a.)"
                                type="number"
                                step="0.1"
                                value={rate}
                                onChange={(e) => setRate(Number(e.target.value))}
                                min={0}
                                max={25}
                            />
                        </div>

                        {/* Row 2: Tenure + Start Date */}
                        <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                            <Input
                                label="Tenure"
                                labelRightElement={
                                    <select
                                        value={tenureUnit}
                                        onChange={(e) => {
                                            const newUnit = e.target.value as TenureUnit;
                                            if (newUnit === 'months' && tenureUnit === 'years') setTenure(tenure * 12);
                                            if (newUnit === 'years' && tenureUnit === 'months') setTenure(Number((tenure / 12).toFixed(2)));
                                            setTenureUnit(newUnit);
                                        }}
                                        style={tenureSelectStyle}
                                    >
                                        <option value="years">Years</option>
                                        <option value="months">Months</option>
                                    </select>
                                }
                                type="number"
                                value={tenure}
                                onChange={(e) => setTenure(Number(e.target.value))}
                                min={1}
                                max={tenureUnit === 'months' ? 240 : 20}
                            />
                            <Input
                                label="Start Date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        {/* Row 3: Compounding + Payout Frequency */}
                        <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                            <div>
                                <label style={frequencyLabelStyle}>Compounding Frequency</label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(Number(e.target.value) as CompoundingFrequency)}
                                    style={frequencySelectStyle}
                                >
                                    <option value={1}>Annually</option>
                                    <option value={2}>Semi-Annually</option>
                                    <option value={4}>Quarterly</option>
                                    <option value={12}>Monthly</option>
                                </select>
                            </div>
                            <div>
                                <label style={frequencyLabelStyle}>Payout Frequency</label>
                                <select
                                    value={payoutFrequency}
                                    onChange={(e) => setPayoutFrequency(e.target.value as PayoutFrequency)}
                                    style={frequencySelectStyle}
                                >
                                    <option value="maturity">At Maturity (Cumulative)</option>
                                    <option value="1">Annually</option>
                                    <option value="2">Semi-Annually</option>
                                    <option value="4">Quarterly</option>
                                    <option value="12">Monthly</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <Button variant="outline" onClick={handleReset} fullWidth>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                <Card className={styles.resultCard}>
                    <CardHeader>
                        <CardTitle>Maturity Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Maturity Amount</span>
                            <span className={styles.highlight}>{formatCurrency(result.totalAmount, 'en-IN')}</span>
                        </div>

                        <hr className={styles.divider} />

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Principal</span>
                                <span className={styles.resultValue}>{formatCurrency(principal, 'en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Total Interest</span>
                                <span className={styles.resultValue} style={{ color: 'var(--color-success)' }}>
                                    +{formatCurrency(result.totalInterest, 'en-IN')}
                                </span>
                            </div>
                        </div>

                        <div className={styles.resultItemTotal}>
                            <span className={styles.resultLabel}>Effective Annual Yield</span>
                            <span className={styles.resultValue}>
                                {tenureInYears > 0 && principal > 0
                                    ? `${(((result.totalAmount / principal) - 1) / tenureInYears * 100).toFixed(2)}%`
                                    : '—'}
                            </span>
                        </div>

                        <div style={{ height: '270px', width: '100%', marginTop: '2rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="fdPrincipalGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-600)" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="var(--color-primary-600)" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="fdInterestGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.45} />
                                            <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis
                                        dataKey="period"
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                        tickFormatter={(v) => `P${v}`}
                                        minTickGap={30}
                                    />
                                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} tickFormatter={formatYAxis} width={65} />
                                    <Tooltip
                                        formatter={(value: number | undefined) => formatCurrency(value || 0, 'en-IN')}
                                        labelFormatter={(label, payload) => {
                                            const row = payload?.[0]?.payload;
                                            return row ? `${row.date} (Period ${label})` : `Period ${label}`;
                                        }}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
                                    <Area type="monotone" dataKey="principal" name="Principal" stroke="var(--color-primary-600)" fill="url(#fdPrincipalGrad)" strokeWidth={2} dot={false} stackId="1" />
                                    <Area type="monotone" dataKey="interest" name="Interest Earned" stroke="var(--color-success)" fill="url(#fdInterestGrad)" strokeWidth={2} dot={false} stackId="1" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <Button onClick={() => setShowSchedule(!showSchedule)} variant="outline" fullWidth>
                                {showSchedule ? 'Hide Payout Schedule' : 'View Payout Schedule'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Schedule — full width at bottom */}
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
                                    <th>Interest Earned</th>
                                    <th>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((row: CompoundInterestScheduleRow) => (
                                    <tr key={row.period}>
                                        <td>{row.date}</td>
                                        <td style={{ color: 'var(--color-success)' }}>+{formatCurrency(row.interestEarned, 'en-IN')}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(row.totalAmount, 'en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

/* ─── RD Sub-component ─────────────────────────────────────────────────────── */
function RDCalculator() {
    const [monthly, setMonthly] = useLocalStorage('rd_monthly', 5000);
    const [rate, setRate] = useLocalStorage('rd_rate', 7.0);
    const [tenure, setTenure] = useLocalStorage('rd_tenure', 24);
    const [tenureUnit, setTenureUnit] = useLocalStorage<TenureUnit>('rd_tenure_unit', 'months');
    const [startDate, setStartDate] = useLocalStorage('rd_start_date', new Date().toISOString().split('T')[0]);
    const [showSchedule, setShowSchedule] = useState(false);

    const tenureInMonths = useMemo(
        () => (tenureUnit === 'years' ? tenure * 12 : tenure),
        [tenure, tenureUnit]
    );

    const result = useMemo(
        () => calculateRD(monthly, rate, tenureInMonths),
        [monthly, rate, tenureInMonths]
    );

    const schedule = useMemo(
        () => calculateRDSchedule(monthly, rate, tenureInMonths, new Date(startDate)),
        [monthly, rate, tenureInMonths, startDate]
    );

    // Yearly aggregates for chart
    const chartData = useMemo(() => {
        const yearly = [];
        const totalYears = Math.ceil(tenureInMonths / 12);
        for (let y = 1; y <= totalYears; y++) {
            const row = schedule[Math.min(y * 12 - 1, schedule.length - 1)];
            if (row) {
                yearly.push({
                    year: `Yr ${y}`,
                    invested: row.totalInvested,
                    interest: Math.max(0, row.maturityValue - row.totalInvested),
                });
            }
        }
        return yearly;
    }, [schedule, tenureInMonths]);

    const handleReset = () => {
        setMonthly(5000);
        setRate(7.0);
        setTenure(24);
        setTenureUnit('months');
        setStartDate(new Date().toISOString().split('T')[0]);
    };

    return (
        <>
            <div className={styles.container}>
                <Card className={styles.inputCard}>
                    <CardHeader>
                        <CardTitle>Recurring Deposit (RD) Calculator</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Row 1: Monthly + Rate */}
                        <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                            <Input
                                label="Monthly Instalment (₹)"
                                type="number"
                                value={monthly}
                                onChange={(e) => setMonthly(Number(e.target.value))}
                                min={100}
                            />
                            <Input
                                label="Interest Rate (% p.a.)"
                                type="number"
                                step="0.1"
                                value={rate}
                                onChange={(e) => setRate(Number(e.target.value))}
                                min={0}
                                max={20}
                            />
                        </div>

                        {/* Row 2: Tenure + Start Date */}
                        <div className={styles.twoCol} style={{ marginBottom: '1rem' }}>
                            <Input
                                label="Tenure"
                                labelRightElement={
                                    <select
                                        value={tenureUnit}
                                        onChange={(e) => {
                                            const newUnit = e.target.value as TenureUnit;
                                            if (newUnit === 'years' && tenureUnit === 'months') setTenure(Number((tenure / 12).toFixed(2)));
                                            if (newUnit === 'months' && tenureUnit === 'years') setTenure(tenure * 12);
                                            setTenureUnit(newUnit);
                                        }}
                                        style={tenureSelectStyle}
                                    >
                                        <option value="months">Months</option>
                                        <option value="years">Years</option>
                                    </select>
                                }
                                type="number"
                                value={tenure}
                                onChange={(e) => setTenure(Number(e.target.value))}
                                min={1}
                                max={tenureUnit === 'months' ? 120 : 10}
                            />
                            <Input
                                label="Start Date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            🏦 Interest compounded quarterly as per standard Indian banking norms (RBI guidelines).
                        </div>

                        <div className={styles.actions}>
                            <Button variant="outline" onClick={handleReset} fullWidth>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                <Card className={styles.resultCard}>
                    <CardHeader>
                        <CardTitle>Maturity Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Maturity Amount</span>
                            <span className={styles.highlight}>{formatCurrency(result.maturityAmount, 'en-IN')}</span>
                        </div>

                        <hr className={styles.divider} />

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Total Deposited</span>
                                <span className={styles.resultValue}>{formatCurrency(result.totalInvested, 'en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Total Interest</span>
                                <span className={styles.resultValue} style={{ color: 'var(--color-success)' }}>
                                    +{formatCurrency(result.totalInterest, 'en-IN')}
                                </span>
                            </div>
                        </div>

                        <div className={styles.resultItemTotal}>
                            <span className={styles.resultLabel}>Monthly Instalment</span>
                            <span className={styles.resultValue}>
                                {formatCurrency(monthly, 'en-IN')} × {tenureInMonths} months
                            </span>
                        </div>

                        <div style={{ height: '270px', width: '100%', marginTop: '2rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="rdInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-600)" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="var(--color-primary-600)" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="rdInterestGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.45} />
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
                                    <Area type="monotone" dataKey="invested" name="Total Deposited" stroke="var(--color-primary-600)" fill="url(#rdInvestedGrad)" strokeWidth={2} dot={false} stackId="1" />
                                    <Area type="monotone" dataKey="interest" name="Interest Earned" stroke="var(--color-success)" fill="url(#rdInterestGrad)" strokeWidth={2} dot={false} stackId="1" />
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

            {/* Schedule — full width at bottom */}
            {showSchedule && schedule.length > 0 && (
                <div className={styles.scheduleContainer}>
                    <div className={styles.scheduleHeader}>
                        <h3 className={styles.scheduleTitle}>Month-wise RD Schedule</h3>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.scheduleTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Instalment</th>
                                    <th>Total Deposited</th>
                                    <th>Interest So Far</th>
                                    <th>Maturity Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((row: RDScheduleRow) => (
                                    <tr key={row.month}>
                                        <td>{row.date}</td>
                                        <td>{formatCurrency(row.investment, 'en-IN')}</td>
                                        <td>{formatCurrency(row.totalInvested, 'en-IN')}</td>
                                        <td style={{ color: 'var(--color-success)' }}>+{formatCurrency(row.interestEarned, 'en-IN')}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(row.maturityValue, 'en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

/* ─── Main Export ───────────────────────────────────────────────────────────── */
export function CompoundInterestCalculator() {
    const [activeTab, setActiveTab] = useLocalStorage<CalcTab>('fd_rd_tab', 'fd');

    return (
        <div className={styles.wrapper}>
            {/* FD / RD Tab Switcher */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                backgroundColor: 'var(--color-bg-subtle)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-md)',
                maxWidth: '320px',
            }}>
                <button
                    style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        border: 'none',
                        backgroundColor: activeTab === 'fd' ? 'var(--color-bg-surface)' : 'transparent',
                        color: activeTab === 'fd' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
                        boxShadow: activeTab === 'fd' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9375rem',
                    }}
                    onClick={() => setActiveTab('fd')}
                >
                    🏦 Fixed Deposit
                </button>
                <button
                    style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        border: 'none',
                        backgroundColor: activeTab === 'rd' ? 'var(--color-bg-surface)' : 'transparent',
                        color: activeTab === 'rd' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
                        boxShadow: activeTab === 'rd' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9375rem',
                    }}
                    onClick={() => setActiveTab('rd')}
                >
                    🔄 Recurring Deposit
                </button>
            </div>

            {activeTab === 'fd' ? <FDCalculator /> : <RDCalculator />}

            <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                * Disclaimer: Calculations are indicative. Actual figures may vary per bank policies.
            </div>
        </div>
    );
}
