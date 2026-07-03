import { describe, it, expect } from 'vitest';
import { simulate } from '../src/core/engine';
import {
    calculateEMI,
    calculateSIP,
    calculateSIPSchedule,
    calculateSWP,
    calculateSWPSchedule,
    calculateSTP,
} from '../src/utils/finance';

/**
 * The engine and the closed-form calculator functions are independent
 * implementations of the same finance. These tests cross-validate them:
 * two different derivations agreeing is strong evidence both are right.
 */

describe('engine vs SIP formulas', () => {
    it('matches calculateSIP and the SIP schedule for a plain SIP', () => {
        const monthly = 10000;
        const rate = 12;
        const years = 15;

        const sim = simulate({
            months: years * 12,
            accounts: [{ id: 'fund', rates: rate }],
            flows: [
                { id: 'sip', to: 'fund', amount: monthly, startMonth: 1, endMonth: years * 12, timing: 'start' },
            ],
        });

        const summary = calculateSIP(monthly, rate, years);
        const schedule = calculateSIPSchedule(monthly, rate, years);

        expect(sim.final.fund).toBeCloseTo(summary.totalValue, 4);
        expect(sim.final.fund).toBeCloseTo(schedule[schedule.length - 1].totalValue, 4);
        expect(sim.deposited.fund).toBeCloseTo(summary.investedAmount, 4);
    });

    it('matches calculateSIP with an annual step-up', () => {
        const monthly = 5000;
        const rate = 10;
        const years = 20;
        const stepUp = 8;

        const sim = simulate({
            months: years * 12,
            accounts: [{ id: 'fund', rates: rate }],
            flows: [
                { id: 'sip', to: 'fund', amount: monthly, startMonth: 1, endMonth: years * 12, annualStepUpPct: stepUp, timing: 'start' },
            ],
        });

        const summary = calculateSIP(monthly, rate, years, stepUp);
        expect(sim.final.fund).toBeCloseTo(summary.totalValue, 4);
        expect(sim.deposited.fund).toBeCloseTo(summary.investedAmount, 4);
    });
});

describe('engine vs SWP formulas', () => {
    it('matches the SWP schedule month by month', () => {
        const corpus = 5000000;
        const monthly = 40000;
        const rate = 8;
        const years = 15;

        const sim = simulate({
            months: years * 12,
            accounts: [{ id: 'fund', initial: corpus, rates: rate }],
            flows: [
                { id: 'wd', from: 'fund', amount: monthly, startMonth: 1, endMonth: years * 12, capToBalance: true },
            ],
        });

        const schedule = calculateSWPSchedule(corpus, monthly, rate, years);
        for (const idx of [0, 59, schedule.length - 1]) {
            expect(sim.months[idx].balances.fund).toBeCloseTo(schedule[idx].closingBalance, 4);
        }

        const summary = calculateSWP(corpus, monthly, rate, years);
        expect(sim.withdrawn.fund).toBeCloseTo(summary.totalWithdrawn, 4);
    });

    it('caps withdrawals at the remaining balance when the corpus depletes', () => {
        const sim = simulate({
            months: 24,
            accounts: [{ id: 'fund', initial: 100000, rates: 6 }],
            flows: [
                { id: 'wd', from: 'fund', amount: 20000, startMonth: 1, endMonth: 24, capToBalance: true },
            ],
        });

        expect(sim.final.fund).toBeCloseTo(0, 4);
        expect(sim.withdrawn.fund).toBeLessThan(20000 * 24);
        // Once empty, later withdrawals are zero
        expect(sim.months[23].flows.wd).toBe(0);
    });
});

describe('engine vs loan amortization', () => {
    it('pays a loan to exactly zero with the closed-form EMI', () => {
        const principal = 5000000;
        const rate = 8.5;
        const years = 20;
        const { emi } = calculateEMI(principal, rate, years);

        // From the lender's view a loan is a balance accruing interest with
        // a monthly payment flowing out.
        const sim = simulate({
            months: years * 12,
            accounts: [{ id: 'loan', initial: principal, rates: rate }],
            flows: [
                { id: 'emi', from: 'loan', amount: emi, startMonth: 1, endMonth: years * 12 },
            ],
        });

        expect(sim.final.loan).toBeCloseTo(0, 2);
    });
});

describe('engine vs STP', () => {
    it('agrees with calculateSTP within timing-convention tolerance', () => {
        const source = 1000000;
        const transfer = 20000;
        const years = 4;

        const sim = simulate({
            months: years * 12,
            accounts: [
                { id: 'source', initial: source, rates: 6.5 },
                { id: 'target', rates: 12 },
            ],
            flows: [
                { id: 'stp', from: 'source', to: 'target', amount: transfer, startMonth: 1, endMonth: years * 12, capToBalance: true },
            ],
        });

        const summary = calculateSTP(source, transfer, 6.5, 12, years);
        const engineTotal = sim.final.source + sim.final.target;
        const formulaTotal = summary.sourceCorpusFinal + summary.targetCorpusFinal;
        // calculateSTP grows the target after receiving the transfer; the
        // engine transfers after growth, so allow a small relative tolerance.
        expect(Math.abs(engineTotal - formulaTotal) / formulaTotal).toBeLessThan(0.02);
    });
});

describe('engine mechanics', () => {
    it('applies rate phases in order', () => {
        const sim = simulate({
            months: 24,
            accounts: [
                {
                    id: 'acc',
                    initial: 100000,
                    rates: [
                        { untilMonth: 12, annualRatePct: 12 },
                        { untilMonth: 24, annualRatePct: 0 },
                    ],
                },
            ],
            flows: [],
        });

        const afterYearOne = 100000 * Math.pow(1.01, 12);
        expect(sim.months[11].balances.acc).toBeCloseTo(afterYearOne, 4);
        // No growth in the zero-rate phase
        expect(sim.final.acc).toBeCloseTo(afterYearOne, 4);
    });

    it('grows inflation-indexed flows monthly', () => {
        const sim = simulate({
            months: 13,
            accounts: [{ id: 'acc', initial: 1000000, rates: 0 }],
            flows: [
                { id: 'wd', from: 'acc', amount: 1000, startMonth: 1, endMonth: 13, monthlyGrowthPct: 1 },
            ],
        });

        expect(sim.months[0].flows.wd).toBeCloseTo(1000, 6);
        expect(sim.months[12].flows.wd).toBeCloseTo(1000 * Math.pow(1.01, 12), 6);
    });

    it('keeps flows at zero outside their active window', () => {
        const sim = simulate({
            months: 12,
            accounts: [{ id: 'acc', rates: 0 }],
            flows: [
                { id: 'dep', to: 'acc', amount: 500, startMonth: 4, endMonth: 6 },
            ],
        });

        expect(sim.months[0].flows.dep).toBe(0);
        expect(sim.months[4].flows.dep).toBe(500);
        expect(sim.final.acc).toBe(1500);
    });
});
