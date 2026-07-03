/**
 * Cash-flow simulation engine — the single core all calculators can build on.
 *
 * Everything in personal finance is the same computation: a set of accounts
 * compounding monthly, with money flowing in, out, or between them. A SIP is
 * a recurring deposit; a loan is a balance accruing interest with payment
 * outflows; retirement is a deposit stream chained into a withdrawal stream.
 * `simulate()` runs that computation month by month and reports balances and
 * flow totals, so each "calculator" reduces to a small preset over it.
 */

export interface RatePhase {
    /** Last month (1-based, inclusive) this rate applies to */
    untilMonth: number;
    annualRatePct: number;
}

export interface EngineAccount {
    id: string;
    /** Opening balance, defaults to 0 */
    initial?: number;
    /** Constant annual rate, or ordered phases for rates that change over time */
    rates: number | RatePhase[];
}

export interface EngineFlow {
    /** Key under which this flow's actual amounts are reported */
    id: string;
    /** Account receiving money. Omit for a pure outflow. */
    to?: string;
    /** Account money is taken from. Omit for a pure inflow. */
    from?: string;
    /** Base monthly amount at startMonth */
    amount: number;
    /** 1-based, inclusive */
    startMonth: number;
    /** 1-based, inclusive */
    endMonth: number;
    /** Amount grows this % at each anniversary of startMonth (step-up SIP) */
    annualStepUpPct?: number;
    /** Amount grows this % every month (inflation-indexed withdrawals) */
    monthlyGrowthPct?: number;
    /**
     * 'start' applies the flow before the month's growth (annuity-due, the
     * SIP convention); 'end' applies it after growth (loan EMIs, SWP).
     * Defaults to 'end'.
     */
    timing?: 'start' | 'end';
    /** Never take more than the source account holds */
    capToBalance?: boolean;
}

export interface SimulationInput {
    months: number;
    accounts: EngineAccount[];
    flows: EngineFlow[];
}

export interface MonthState {
    month: number;
    /** Closing balance per account */
    balances: Record<string, number>;
    /** Actual amount moved per flow id this month (0 when inactive/capped out) */
    flows: Record<string, number>;
}

export interface SimulationResult {
    months: MonthState[];
    /** Closing balances after the final month */
    final: Record<string, number>;
    /** Total external money put into each account (flows with `to`, no `from`) */
    deposited: Record<string, number>;
    /** Total external money taken out of each account (flows with `from`, no `to`) */
    withdrawn: Record<string, number>;
}

function monthlyRateFor(account: EngineAccount, month: number): number {
    if (typeof account.rates === 'number') {
        return account.rates / 12 / 100;
    }
    const phase =
        account.rates.find((p) => month <= p.untilMonth) ??
        account.rates[account.rates.length - 1];
    return (phase?.annualRatePct ?? 0) / 12 / 100;
}

function flowAmountFor(flow: EngineFlow, month: number): number {
    if (month < flow.startMonth || month > flow.endMonth) return 0;
    let amount = flow.amount;
    if (flow.annualStepUpPct) {
        const yearsElapsed = Math.floor((month - flow.startMonth) / 12);
        amount *= Math.pow(1 + flow.annualStepUpPct / 100, yearsElapsed);
    }
    if (flow.monthlyGrowthPct) {
        amount *= Math.pow(1 + flow.monthlyGrowthPct / 100, month - flow.startMonth);
    }
    return amount;
}

export function simulate(input: SimulationInput): SimulationResult {
    const balances: Record<string, number> = {};
    const deposited: Record<string, number> = {};
    const withdrawn: Record<string, number> = {};

    for (const account of input.accounts) {
        balances[account.id] = account.initial ?? 0;
        deposited[account.id] = 0;
        withdrawn[account.id] = 0;
    }

    const months: MonthState[] = [];

    const applyFlow = (flow: EngineFlow, month: number, record: Record<string, number>) => {
        let amount = flowAmountFor(flow, month);
        if (amount <= 0) {
            record[flow.id] = record[flow.id] ?? 0;
            return;
        }
        if (flow.from !== undefined) {
            if (flow.capToBalance) {
                amount = Math.min(amount, Math.max(0, balances[flow.from]));
            }
            balances[flow.from] -= amount;
            if (flow.to === undefined) withdrawn[flow.from] += amount;
        }
        if (flow.to !== undefined) {
            balances[flow.to] += amount;
            if (flow.from === undefined) deposited[flow.to] += amount;
        }
        record[flow.id] = (record[flow.id] ?? 0) + amount;
    };

    for (let month = 1; month <= input.months; month++) {
        const flowRecord: Record<string, number> = {};
        for (const flow of input.flows) {
            flowRecord[flow.id] = 0;
        }

        for (const flow of input.flows) {
            if ((flow.timing ?? 'end') === 'start') applyFlow(flow, month, flowRecord);
        }

        for (const account of input.accounts) {
            balances[account.id] *= 1 + monthlyRateFor(account, month);
        }

        for (const flow of input.flows) {
            if ((flow.timing ?? 'end') === 'end') applyFlow(flow, month, flowRecord);
        }

        months.push({ month, balances: { ...balances }, flows: flowRecord });
    }

    return { months, final: { ...balances }, deposited, withdrawn };
}
