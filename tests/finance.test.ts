import { describe, it, expect } from 'vitest';
import {
    calculateEMI,
    calculateTenureFromEMI,
    calculateCompoundInterest,
    calculateSIP,
    calculateSIPSchedule,
    calculateSWP,
    calculateSTP,
    calculateRD,
    calculateGoalSavings,
    calculatePrepaymentImpact,
    calculateJourney,
} from '../src/utils/finance';

describe('calculateEMI', () => {
    it('matches the known EMI for a ₹50L home loan at 8.5% for 20 years', () => {
        const { emi, totalInterest, totalPayment } = calculateEMI(5000000, 8.5, 20);
        expect(emi).toBeCloseTo(43391.16, 1);
        expect(totalPayment).toBeCloseTo(emi * 240, 4);
        expect(totalInterest).toBeCloseTo(totalPayment - 5000000, 4);
    });

    it('returns zeros for degenerate inputs', () => {
        expect(calculateEMI(0, 8.5, 20).emi).toBe(0);
        expect(calculateEMI(5000000, 0, 20).emi).toBe(0);
        expect(calculateEMI(5000000, 8.5, 0).emi).toBe(0);
    });
});

describe('calculateTenureFromEMI', () => {
    it('is the inverse of calculateEMI', () => {
        const { emi } = calculateEMI(3000000, 9, 15);
        expect(calculateTenureFromEMI(3000000, 9, emi)).toBeCloseTo(15, 1);
    });

    it('returns Infinity when the EMI cannot cover the interest', () => {
        // Monthly interest on ₹50L at 12% is ₹50,000
        expect(calculateTenureFromEMI(5000000, 12, 40000)).toBe(Infinity);
    });
});

describe('calculateCompoundInterest', () => {
    it('matches the closed-form quarterly compounding formula', () => {
        const { totalAmount } = calculateCompoundInterest(100000, 7.5, 3, 4, 'maturity');
        expect(totalAmount).toBeCloseTo(100000 * Math.pow(1 + 0.075 / 4, 12), 6);
    });

    it('pays simple interest per period in payout mode', () => {
        const { totalAmount, totalInterest } = calculateCompoundInterest(100000, 8, 2, 4, '4');
        // 8 quarterly payouts of 2% each on the base principal
        expect(totalInterest).toBeCloseTo(100000 * 0.02 * 8, 6);
        expect(totalAmount).toBeCloseTo(100000 + totalInterest, 6);
    });
});

describe('calculateSIP', () => {
    it('matches the closed-form annuity-due future value', () => {
        const monthly = 10000;
        const i = 0.12 / 12;
        const n = 120;
        const expected = monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
        expect(calculateSIP(monthly, 12, 10).totalValue).toBeCloseTo(expected, 4);
    });

    it('keeps the summary and the schedule consistent', () => {
        const summary = calculateSIP(15000, 11, 12, 10);
        const schedule = calculateSIPSchedule(15000, 11, 12, 10);
        const last = schedule[schedule.length - 1];
        expect(last.totalValue).toBeCloseTo(summary.totalValue, 4);
        expect(last.totalInvested).toBeCloseTo(summary.investedAmount, 4);
    });
});

describe('calculateSWP', () => {
    it('conserves money: final = initial + returns − withdrawn', () => {
        const initial = 5000000;
        const result = calculateSWP(initial, 30000, 9, 20);
        expect(result.finalCorpus).toBeCloseTo(initial + result.totalReturns - result.totalWithdrawn, 4);
    });

    it('depletes early when withdrawals outpace returns', () => {
        const result = calculateSWP(1000000, 50000, 6, 10);
        expect(result.finalCorpus).toBe(0);
        expect(result.monthsLasted).toBeLessThan(120);
        expect(result.monthsLasted).toBeGreaterThan(12);
    });
});

describe('calculateSTP', () => {
    it('moves the whole corpus when transfers outlast the source', () => {
        const result = calculateSTP(500000, 50000, 6, 12, 2);
        expect(result.sourceCorpusFinal).toBe(0);
        expect(result.targetCorpusFinal).toBeGreaterThan(500000);
        expect(result.totalGains).toBeCloseTo(
            result.sourceCorpusFinal + result.targetCorpusFinal - 500000,
            6
        );
    });
});

describe('calculateRD', () => {
    it('earns positive interest that grows with tenure', () => {
        const short = calculateRD(5000, 7, 12);
        const long = calculateRD(5000, 7, 60);
        expect(short.maturityAmount).toBeGreaterThan(short.totalInvested);
        expect(long.totalInterest / long.totalInvested).toBeGreaterThan(
            short.totalInterest / short.totalInvested
        );
    });
});

describe('calculateGoalSavings', () => {
    it('produces a SIP that actually reaches the target', () => {
        const target = 2000000;
        const result = calculateGoalSavings(target, 12, 10, 0);
        const check = calculateSIP(result.monthlyInvestmentRequired, 12, 10);
        expect(check.totalValue).toBeCloseTo(target, 2);
    });

    it('inflates the target when an inflation rate is given', () => {
        const result = calculateGoalSavings(1000000, 12, 10, 6);
        expect(result.targetAmount).toBeCloseTo(1000000 * Math.pow(1.06, 10), 4);
    });
});

describe('calculatePrepaymentImpact', () => {
    it('saves interest and shortens the loan', () => {
        const result = calculatePrepaymentImpact(5000000, 8.5, 20, 10000, 'monthly', 0, 0);
        expect(result.newTenureMonths).toBeLessThan(result.originalTenureMonths);
        expect(result.interestSaved).toBeGreaterThan(0);
        expect(result.interestSaved).toBeCloseTo(
            result.originalTotalInterest - result.newTotalInterest,
            6
        );
        const last = result.schedule[result.schedule.length - 1];
        expect(last.balance).toBe(0);
    });
});

describe('calculateJourney', () => {
    const base = {
        currentAge: 30,
        retirementAge: 60,
        lifeExpectancy: 90,
        monthlyInvestment: 30000,
        stepUpPercent: 0,
        preRetirementReturn: 12,
        postRetirementReturn: 7,
        monthlyExpenseToday: 50000,
        inflation: 6,
    };

    it('accumulates exactly like the SIP calculator', () => {
        const journey = calculateJourney(base);
        const sip = calculateSIP(base.monthlyInvestment, base.preRetirementReturn, 30);
        expect(journey.corpusAtRetirement).toBeCloseTo(sip.totalValue, 2);
        expect(journey.totalInvested).toBeCloseTo(sip.investedAmount, 2);
    });

    it('inflates retirement expenses from today\'s rupees', () => {
        const journey = calculateJourney(base);
        const expected = base.monthlyExpenseToday * Math.pow(1 + 0.06 / 12, 360);
        expect(journey.monthlyExpenseAtRetirement).toBeCloseTo(expected, 4);
    });

    it('leaves a legacy when expenses are modest', () => {
        const journey = calculateJourney({ ...base, monthlyExpenseToday: 20000 });
        expect(journey.depletionAge).toBeNull();
        expect(journey.legacyAmount).toBeGreaterThan(0);
    });

    it('runs out when expenses are extreme', () => {
        const journey = calculateJourney({ ...base, monthlyExpenseToday: 400000 });
        expect(journey.depletionAge).not.toBeNull();
        expect(journey.depletionAge!).toBeGreaterThan(60);
        expect(journey.depletionAge!).toBeLessThan(90);
        expect(journey.legacyAmount).toBe(0);
    });

    it('bridges the chart series at the retirement age', () => {
        const journey = calculateJourney(base);
        const bridge = journey.points.find((p) => p.age === base.retirementAge);
        expect(bridge?.growCorpus).not.toBeNull();
        expect(bridge?.spendCorpus).not.toBeNull();
        expect(bridge?.growCorpus).toBeCloseTo(bridge?.spendCorpus ?? 0, 6);
    });

    it('returns an empty result for impossible inputs', () => {
        expect(calculateJourney({ ...base, retirementAge: 25 }).points).toHaveLength(0);
    });
});
