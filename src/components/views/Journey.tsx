import { useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '../ui/Card';
import { SliderInput } from '../ui/SliderInput';
import { Button } from '../ui/Button';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { BreakdownDonut } from '../ui/BreakdownDonut';
import { ScenarioActions } from '../ui/ScenarioActions';
import { calculateJourney, formatCurrency, formatCompactINR } from '../../utils/finance';
import type { JourneyInputs } from '../../types/finance.types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
    ResponsiveContainer,
} from 'recharts';
import styles from '../calculators/EMI.module.css';

const formatYAxis = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
};

export function Journey() {
    const [currentAge, setCurrentAge] = useLocalStorage('journey_age', 30);
    const [retirementAge, setRetirementAge] = useLocalStorage('journey_retire', 60);
    const [lifeExpectancy, setLifeExpectancy] = useLocalStorage('journey_life', 90);
    const [monthlySIP, setMonthlySIP] = useLocalStorage('journey_sip', 30000);
    const [stepUp, setStepUp] = useLocalStorage('journey_stepup', 5);
    const [preReturn, setPreReturn] = useLocalStorage('journey_pre_return', 12);
    const [postReturn, setPostReturn] = useLocalStorage('journey_post_return', 7);
    const [monthlyExpense, setMonthlyExpense] = useLocalStorage('journey_expense', 50000);
    const [inflation, setInflation] = useLocalStorage('journey_inflation', 6);

    // Keep the phases in a sane order even if sliders cross
    const retireAge = Math.max(retirementAge, currentAge + 1);
    const lifeAge = Math.max(lifeExpectancy, retireAge + 1);

    const inputs: JourneyInputs = useMemo(
        () => ({
            currentAge,
            retirementAge: retireAge,
            lifeExpectancy: lifeAge,
            monthlyInvestment: monthlySIP,
            stepUpPercent: stepUp,
            preRetirementReturn: preReturn,
            postRetirementReturn: postReturn,
            monthlyExpenseToday: monthlyExpense,
            inflation,
        }),
        [currentAge, retireAge, lifeAge, monthlySIP, stepUp, preReturn, postReturn, monthlyExpense, inflation]
    );

    const result = useMemo(() => calculateJourney(inputs), [inputs]);

    // What-if scenarios for the insight chips
    const workTwoMore = useMemo(
        () => calculateJourney({ ...inputs, retirementAge: retireAge + 2, lifeExpectancy: Math.max(lifeAge, retireAge + 3) }),
        [inputs, retireAge, lifeAge]
    );
    const investFiveMore = useMemo(
        () => calculateJourney({ ...inputs, monthlyInvestment: monthlySIP + 5000 }),
        [inputs, monthlySIP]
    );

    const chartData = useMemo(
        () =>
            result.points.map((p) => ({
                age: p.age,
                grow: p.growCorpus,
                spend: p.spendCorpus,
            })),
        [result.points]
    );

    const moneyOutlivesYou = result.depletionAge === null;
    const yearsLasted = result.depletionAge !== null ? result.depletionAge - retireAge : lifeAge - retireAge;
    const multiple = result.totalInvested > 0 ? result.corpusAtRetirement / result.totalInvested : 0;

    const handleReset = () => {
        setCurrentAge(30);
        setRetirementAge(60);
        setLifeExpectancy(90);
        setMonthlySIP(30000);
        setStepUp(5);
        setPreReturn(12);
        setPostReturn(7);
        setMonthlyExpense(50000);
        setInflation(6);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.container}>
                <Card className={styles.inputCard}>
                    <CardHeader>
                        <CardTitle>🧭 Your Journey — one life, one chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.inputsGrid} style={{ gap: '1.25rem' }}>
                            <SliderInput
                                label="Your Age Today"
                                value={currentAge}
                                min={18}
                                max={60}
                                step={1}
                                onChange={setCurrentAge}
                                format={(v) => `${v} yrs`}
                                formatTick={(v) => `${v}`}
                            />
                            <SliderInput
                                label="Retirement Age"
                                value={retireAge}
                                min={Math.min(currentAge + 1, 75)}
                                max={75}
                                step={1}
                                onChange={setRetirementAge}
                                format={(v) => `${v} yrs`}
                                formatTick={(v) => `${v}`}
                            />
                            <SliderInput
                                label="Plan Until Age"
                                value={lifeAge}
                                min={Math.min(retireAge + 1, 100)}
                                max={100}
                                step={1}
                                onChange={setLifeExpectancy}
                                format={(v) => `${v} yrs`}
                                formatTick={(v) => `${v}`}
                            />
                            <SliderInput
                                label="Monthly Investment"
                                value={monthlySIP}
                                min={1000}
                                max={300000}
                                step={1000}
                                onChange={setMonthlySIP}
                            />
                            <SliderInput
                                label="Annual Step-Up (%)"
                                value={stepUp}
                                min={0}
                                max={20}
                                step={1}
                                onChange={setStepUp}
                                format={(v) => (v === 0 ? 'None' : `${v}%`)}
                                formatTick={(v) => `${v}%`}
                            />
                            <SliderInput
                                label="Return Before Retirement (%)"
                                value={preReturn}
                                min={1}
                                max={20}
                                step={0.5}
                                onChange={setPreReturn}
                                format={(v) => `${v}%`}
                                formatTick={(v) => `${v}%`}
                            />
                            <SliderInput
                                label="Return After Retirement (%)"
                                value={postReturn}
                                min={1}
                                max={15}
                                step={0.5}
                                onChange={setPostReturn}
                                format={(v) => `${v}%`}
                                formatTick={(v) => `${v}%`}
                            />
                            <SliderInput
                                label="Monthly Expenses (today's ₹)"
                                value={monthlyExpense}
                                min={10000}
                                max={500000}
                                step={5000}
                                onChange={setMonthlyExpense}
                            />
                            <SliderInput
                                label="Inflation (%)"
                                value={inflation}
                                min={0}
                                max={12}
                                step={0.5}
                                onChange={setInflation}
                                format={(v) => `${v}%`}
                                formatTick={(v) => `${v}%`}
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
                            <CardTitle>Your Wealth Timeline</CardTitle>
                            <ScenarioActions
                                studio="journey"
                                studioTitle="Your Journey"
                                title={`Age ${currentAge}→${retireAge}→${lifeAge} · ${formatCompactINR(monthlySIP)}/mo`}
                                inputs={{
                                    journey_age: currentAge,
                                    journey_retire: retireAge,
                                    journey_life: lifeAge,
                                    journey_sip: monthlySIP,
                                    journey_stepup: stepUp,
                                    journey_pre_return: preReturn,
                                    journey_post_return: postReturn,
                                    journey_expense: monthlyExpense,
                                    journey_inflation: inflation,
                                }}
                                metrics={[
                                    { label: `Corpus at ${retireAge}`, display: formatCurrency(result.corpusAtRetirement, 'en-IN'), value: result.corpusAtRetirement, kind: 'currency' },
                                    { label: 'Total invested', display: formatCurrency(result.totalInvested, 'en-IN'), value: result.totalInvested, kind: 'currency' },
                                    { label: 'Wealth multiple', display: `${multiple.toFixed(1)}×`, value: multiple, kind: 'number' },
                                    { label: 'Retirement funded for (yrs)', display: `${yearsLasted.toFixed(0)}${moneyOutlivesYou ? '+' : ''}`, value: yearsLasted, kind: 'number' },
                                ]}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.resultItem}>
                            <span className={styles.resultLabel}>Corpus at {retireAge}</span>
                            <AnimatedNumber
                                className={styles.highlight}
                                value={result.corpusAtRetirement}
                                format={(v) => formatCurrency(v, 'en-IN')}
                            />
                        </div>

                        {moneyOutlivesYou ? (
                            <div className={`${styles.insightChip} ${styles.insightChipSuccess}`}>
                                🎉 Your money outlives the plan — at age {lifeAge} you'd still have{' '}
                                <strong>{formatCurrency(result.legacyAmount, 'en-IN')}</strong> to pass on.
                            </div>
                        ) : (
                            <div className={`${styles.insightChip} ${styles.insightChipDanger}`}>
                                ⚠️ Money runs out at age <strong>{Math.floor(result.depletionAge!)}</strong> —{' '}
                                {Math.ceil(lifeAge - result.depletionAge!)} years short. Try investing more,
                                retiring later, or trimming expenses.
                            </div>
                        )}

                        <hr className={styles.divider} />

                        <div className={styles.twoCol} style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>You Invest In Total</span>
                                <AnimatedNumber
                                    className={styles.resultValue}
                                    value={result.totalInvested}
                                    format={(v) => formatCurrency(v, 'en-IN')}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Wealth Multiple</span>
                                <AnimatedNumber
                                    className={styles.resultValue}
                                    style={{ color: 'var(--color-success)' }}
                                    value={multiple}
                                    format={(v) => `${v.toFixed(1)}×`}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span className={styles.resultLabel}>Expenses at {retireAge} (inflated)</span>
                                <AnimatedNumber
                                    className={styles.resultValue}
                                    value={result.monthlyExpenseAtRetirement}
                                    format={(v) => `${formatCurrency(v, 'en-IN')}/mo`}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                <span className={styles.resultLabel}>Retirement Funded For</span>
                                <AnimatedNumber
                                    className={styles.resultValue}
                                    value={yearsLasted}
                                    format={(v) => `${v.toFixed(0)} yrs${moneyOutlivesYou ? '+' : ''}`}
                                />
                            </div>
                        </div>

                        <div className={styles.donutSection}>
                            <BreakdownDonut
                                segments={[
                                    { name: 'Invested', value: result.totalInvested, color: 'var(--color-primary-500)' },
                                    { name: 'Returns', value: result.corpusAtRetirement - result.totalInvested, color: 'var(--color-success)' },
                                ]}
                                centerLabel={`At Age ${retireAge}`}
                                centerValue={formatYAxis(result.corpusAtRetirement)}
                                formatValue={(v) => formatCurrency(v, 'en-IN')}
                                height={180}
                            />
                        </div>

                        <div style={{ height: '300px', width: '100%', marginTop: '2rem', marginBottom: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="journeyGrowGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.45} />
                                            <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="journeySpendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.45} />
                                            <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis
                                        dataKey="age"
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                        minTickGap={25}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                        tickFormatter={formatYAxis}
                                        width={65}
                                    />
                                    <Tooltip
                                        formatter={(value: number | undefined) => formatCurrency(value || 0, 'en-IN')}
                                        labelFormatter={(label) => `Age ${label}`}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
                                    <ReferenceLine
                                        x={retireAge}
                                        stroke="var(--color-accent-500)"
                                        strokeDasharray="4 4"
                                        label={{ value: `Retire @ ${retireAge}`, position: 'top', fill: 'var(--color-accent-500)', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <Area type="monotone" dataKey="grow" name="Growing (investing)" stroke="var(--color-primary-500)" fill="url(#journeyGrowGrad)" strokeWidth={2.5} dot={false} />
                                    <Area type="monotone" dataKey="spend" name="Retirement (spending)" stroke="var(--color-warning)" fill="url(#journeySpendGrad)" strokeWidth={2.5} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className={styles.insightChip}>
                            ⏳ Working <strong>2 more years</strong> grows your corpus to{' '}
                            <strong>{formatCurrency(workTwoMore.corpusAtRetirement, 'en-IN')}</strong>
                            {result.corpusAtRetirement > 0 && (
                                <> (+{(((workTwoMore.corpusAtRetirement - result.corpusAtRetirement) / result.corpusAtRetirement) * 100).toFixed(0)}%)</>
                            )}
                        </div>
                        <div className={styles.insightChip}>
                            💪 Just <strong>₹5,000 more</strong> per month adds{' '}
                            <strong>{formatCurrency(investFiveMore.corpusAtRetirement - result.corpusAtRetirement, 'en-IN')}</strong>{' '}
                            to your retirement corpus.
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                * Disclaimer: This is a simplified simulation for planning purposes. Actual returns, inflation and expenses will vary.
            </div>
        </div>
    );
}
