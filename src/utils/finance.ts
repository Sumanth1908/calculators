import type {
    EMIDetails,
    CompoundInterestDetails,
    PrepaymentResult,
    AmortizationScheduleRow,
    CompoundInterestScheduleRow,
    PrepaymentFrequency,
    CompoundingFrequency,
    PayoutFrequency,
    SIPResult,
    SIPScheduleRow,
    SWPResult,
    SWPScheduleRow,
    STPResult,
    STPScheduleRow,
    PPFResult,
    PPFScheduleRow,
    RDResult,
    RDScheduleRow,
    GoalResult
} from '../types/finance.types';

export type {
    EMIDetails,
    CompoundInterestDetails,
    PrepaymentResult,
    AmortizationScheduleRow,
    CompoundInterestScheduleRow,
    PrepaymentFrequency,
    CompoundingFrequency,
    PayoutFrequency,
    SIPResult,
    SIPScheduleRow,
    SWPResult,
    SWPScheduleRow,
    STPResult,
    STPScheduleRow,
    PPFResult,
    PPFScheduleRow,
    RDResult,
    RDScheduleRow,
    GoalResult
};

/**
 * Calculates Equated Monthly Installment (EMI)
 */
export function calculateEMI(principal: number, annualRate: number, tenureYears: number): EMIDetails {
    if (principal <= 0 || annualRate <= 0 || tenureYears <= 0) {
        return { emi: 0, totalInterest: 0, totalPayment: 0 };
    }

    const monthlyRate = annualRate / 12 / 100;
    const tenureMonths = tenureYears * 12;

    const emi =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    const totalPayment = emi * tenureMonths;
    const totalInterest = totalPayment - principal;

    return {
        emi: isNaN(emi) ? 0 : emi,
        totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
        totalPayment: isNaN(totalPayment) ? 0 : totalPayment,
    };
}

/**
 * Calculates Tenure in Years given a fixed EMI
 */
export function calculateTenureFromEMI(principal: number, annualRate: number, emi: number): number {
    if (principal <= 0 || annualRate <= 0 || emi <= 0) {
        return 0;
    }

    const monthlyRate = annualRate / 12 / 100;

    // If EMI is less than or equal to monthly interest, loan will never be paid off
    if (emi <= principal * monthlyRate) {
        return Infinity;
    }

    const nMonths = Math.log(emi / (emi - principal * monthlyRate)) / Math.log(1 + monthlyRate);

    // Return years rounded to 2 decimal places to be consistent with tenure expectations
    return Number((nMonths / 12).toFixed(2));
}

/**
 * Calculates Compound Interest
 */
export function calculateCompoundInterest(
    principal: number,
    annualRate: number,
    timeYears: number,
    compoundingFrequency: CompoundingFrequency = 1,
    payoutFrequency: PayoutFrequency = 'maturity' // Default to payout at maturity
): CompoundInterestDetails {
    if (principal <= 0 || annualRate <= 0 || timeYears <= 0) {
        return { totalAmount: 0, totalInterest: 0 };
    }

    const rateAsDecimal = annualRate / 100;

    let totalAmount = 0;

    if (payoutFrequency === 'maturity') {
        totalAmount =
            principal *
            Math.pow(
                1 + rateAsDecimal / compoundingFrequency,
                compoundingFrequency * timeYears
            );
    } else {
        // If payout is periodic (e.g. monthly/quarterly), the interest does not compound 
        // into the main principal for the *next* payout cycle if it's withdrawn.
        // However, a standard FD calculation in Indian banking still compounds quarterly, 
        // but pays out the simple interest of that compounded chunk.
        // Let's keep it simple: if there's a payout, it's basically simple interest on the base principal if they withdraw it,
        // OR standard compounding if they leave it.
        // Usually, Non-Cumulative FD (with payouts) calculates interest simply per period.
        const payoutsPerYear = Number(payoutFrequency);
        const periodInterest = principal * (rateAsDecimal / payoutsPerYear);
        const totalPayouts = timeYears * payoutsPerYear;
        // Total amount is principal + all those simple interest payouts
        totalAmount = principal + (periodInterest * totalPayouts);
    }

    const totalInterest = totalAmount - principal;

    return {
        totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
        totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
    };
}

export function calculatePrepaymentImpact(
    principal: number,
    annualRate: number,
    tenureYears: number,
    recurringPrepayment: number,
    recurringFrequency: PrepaymentFrequency,
    lumpSumAmount: number,
    lumpSumMonth: number, // Which month the lump sum is paid
    startDate: Date = new Date()
): PrepaymentResult {
    const emiDetails = calculateEMI(principal, annualRate, tenureYears);
    const monthlyRate = annualRate / 12 / 100;
    const originalTenureMonths = tenureYears * 12;

    let balance = principal;
    let newTotalInterest = 0;
    let monthsCount = 0;

    const schedule: AmortizationScheduleRow[] = [];

    // Simulate month by month
    while (balance > 0 && monthsCount < originalTenureMonths) {
        monthsCount++;
        const currentMonthDate = addMonths(startDate, monthsCount);

        const interestForMonth = balance * monthlyRate;
        newTotalInterest += interestForMonth;

        // Total paid this month
        let paymentThisMonth = emiDetails.emi;
        let extraPaymentAmount = 0;

        if (recurringFrequency === 'monthly') {
            extraPaymentAmount += recurringPrepayment;
        } else if (recurringFrequency === 'quarterly' && monthsCount % 3 === 0) {
            extraPaymentAmount += recurringPrepayment;
        } else if (recurringFrequency === 'yearly' && monthsCount % 12 === 0) {
            extraPaymentAmount += recurringPrepayment;
        } else if (recurringFrequency === 'daily') {
            // Calculate actual days in this specific month
            const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
            extraPaymentAmount += recurringPrepayment * daysInMonth;
        }

        // Add lump sum if it's the specified month
        if (monthsCount === lumpSumMonth) {
            extraPaymentAmount += lumpSumAmount;
        }

        paymentThisMonth += extraPaymentAmount;

        let principalPaidThisMonth = paymentThisMonth - interestForMonth;

        if (principalPaidThisMonth > balance) {
            principalPaidThisMonth = balance;
            paymentThisMonth = principalPaidThisMonth + interestForMonth;
            extraPaymentAmount = paymentThisMonth - emiDetails.emi;
            if (extraPaymentAmount < 0) extraPaymentAmount = 0;
        }

        balance -= principalPaidThisMonth;

        // If balance goes negative, we've paid it off
        if (balance <= 0) {
            balance = 0;
        }

        schedule.push({
            month: monthsCount,
            date: formatDateMonthYear(currentMonthDate),
            payment: paymentThisMonth,
            principal: principalPaidThisMonth,
            interest: interestForMonth,
            balance: balance,
            extraPayment: extraPaymentAmount
        });

        if (balance <= 0) break;
    }

    return {
        originalTotalInterest: emiDetails.totalInterest,
        newTotalInterest,
        interestSaved: emiDetails.totalInterest - newTotalInterest,
        originalTenureMonths,
        newTenureMonths: monthsCount,
        monthsSaved: originalTenureMonths - monthsCount,
        schedule
    };
}

export function formatCurrency(amount: number, locale = 'en-US', currency = 'USD'): string {
    if (isNaN(amount)) return '0';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: locale === 'en-IN' ? 'INR' : currency,
        maximumFractionDigits: 0
    }).format(amount);
}

export function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

export function formatDateMonthYear(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function calculateAmortizationSchedule(principal: number, annualRate: number, tenureYears: number, emi: number, startDate: Date = new Date()): AmortizationScheduleRow[] {
    if (principal <= 0 || annualRate <= 0 || tenureYears <= 0 || emi <= 0) {
        return [];
    }

    const monthlyRate = annualRate / 12 / 100;
    const schedule: AmortizationScheduleRow[] = [];
    let balance = principal;

    for (let month = 1; month <= tenureYears * 12; month++) {
        const interest = balance * monthlyRate;
        let principalPayment = emi - interest;

        // Adjust for final month
        if (principalPayment > balance || month === tenureYears * 12) {
            principalPayment = balance;
        }

        balance -= principalPayment;
        if (balance < 0) balance = 0;

        schedule.push({
            month,
            date: formatDateMonthYear(addMonths(startDate, month)),
            payment: principalPayment + interest,
            principal: principalPayment,
            interest: interest,
            balance: balance,
            extraPayment: 0
        });

        if (balance <= 0) break;
    }

    return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIP Calculator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates Systematic Investment Plan (SIP) returns with optional annual step-up.
 * @param monthlyInvestment - monthly SIP amount
 * @param annualReturn - expected annual return in %
 * @param years - investment duration in years
 * @param annualStepUpPercent - percentage by which SIP increases every year (0 for none)
 */
export function calculateSIP(
    monthlyInvestment: number,
    annualReturn: number,
    years: number,
    annualStepUpPercent: number = 0
): SIPResult {
    if (monthlyInvestment <= 0 || annualReturn <= 0 || years <= 0) {
        return { investedAmount: 0, estimatedReturns: 0, totalValue: 0 };
    }

    const monthlyRate = annualReturn / 12 / 100;
    const totalMonths = years * 12;
    let totalValue = 0;
    let totalInvested = 0;
    let currentSIP = monthlyInvestment;

    for (let month = 1; month <= totalMonths; month++) {
        if (month > 1 && (month - 1) % 12 === 0 && annualStepUpPercent > 0) {
            currentSIP = currentSIP * (1 + annualStepUpPercent / 100);
        }
        totalInvested += currentSIP;
        const monthsRemaining = totalMonths - month;
        totalValue += currentSIP * Math.pow(1 + monthlyRate, monthsRemaining + 1);
    }

    return {
        investedAmount: totalInvested,
        estimatedReturns: totalValue - totalInvested,
        totalValue
    };
}

export function calculateSIPSchedule(
    monthlyInvestment: number,
    annualReturn: number,
    years: number,
    annualStepUpPercent: number = 0,
    startDate: Date = new Date()
): SIPScheduleRow[] {
    if (monthlyInvestment <= 0 || annualReturn <= 0 || years <= 0) return [];

    const monthlyRate = annualReturn / 12 / 100;
    const totalMonths = years * 12;
    const schedule: SIPScheduleRow[] = [];
    let corpus = 0;
    let totalInvested = 0;
    let currentSIP = monthlyInvestment;

    for (let month = 1; month <= totalMonths; month++) {
        if (month > 1 && (month - 1) % 12 === 0 && annualStepUpPercent > 0) {
            currentSIP = currentSIP * (1 + annualStepUpPercent / 100);
        }
        const returnThisMonth = corpus * monthlyRate;
        corpus = corpus + returnThisMonth + currentSIP;
        totalInvested += currentSIP;

        schedule.push({
            month,
            date: formatDateMonthYear(addMonths(startDate, month)),
            investment: currentSIP,
            returns: returnThisMonth,
            totalInvested,
            totalValue: corpus
        });
    }

    return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// SWP (Systematic Withdrawal Plan) Calculator
// ─────────────────────────────────────────────────────────────────────────────

export function calculateSWP(
    initialCorpus: number,
    monthlyWithdrawal: number,
    annualReturn: number,
    years: number
): SWPResult {
    if (initialCorpus <= 0 || monthlyWithdrawal <= 0) {
        return { totalWithdrawn: 0, totalReturns: 0, finalCorpus: 0, monthsLasted: 0 };
    }

    const monthlyRate = annualReturn / 12 / 100;
    const totalMonths = years * 12;
    let corpus = initialCorpus;
    let totalWithdrawn = 0;
    let totalReturns = 0;
    let monthsLasted = 0;

    for (let month = 1; month <= totalMonths; month++) {
        if (corpus <= 0) break;
        const returns = corpus * monthlyRate;
        totalReturns += returns;
        corpus += returns;
        const withdrawal = Math.min(monthlyWithdrawal, corpus);
        corpus -= withdrawal;
        totalWithdrawn += withdrawal;
        monthsLasted = month;
    }

    return {
        totalWithdrawn,
        totalReturns,
        finalCorpus: Math.max(0, corpus),
        monthsLasted
    };
}

export function calculateSWPSchedule(
    initialCorpus: number,
    monthlyWithdrawal: number,
    annualReturn: number,
    years: number,
    startDate: Date = new Date()
): SWPScheduleRow[] {
    if (initialCorpus <= 0 || monthlyWithdrawal <= 0) return [];

    const monthlyRate = annualReturn / 12 / 100;
    const totalMonths = years * 12;
    const schedule: SWPScheduleRow[] = [];
    let corpus = initialCorpus;

    for (let month = 1; month <= totalMonths; month++) {
        if (corpus <= 0) break;
        const returns = corpus * monthlyRate;
        corpus += returns;
        const withdrawal = Math.min(monthlyWithdrawal, corpus);
        corpus -= withdrawal;

        schedule.push({
            month,
            date: formatDateMonthYear(addMonths(startDate, month)),
            withdrawal,
            returns,
            closingBalance: Math.max(0, corpus)
        });
    }

    return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// STP (Systematic Transfer Plan) Calculator
// ─────────────────────────────────────────────────────────────────────────────

export function calculateSTP(
    sourceCorpus: number,
    monthlyTransfer: number,
    sourceAnnualReturn: number,
    targetAnnualReturn: number,
    years: number
): STPResult {
    if (sourceCorpus <= 0 || monthlyTransfer <= 0) {
        return { totalTransferred: 0, sourceCorpusFinal: 0, targetCorpusFinal: 0, totalGains: 0 };
    }

    const sourceMonthlyRate = sourceAnnualReturn / 12 / 100;
    const targetMonthlyRate = targetAnnualReturn / 12 / 100;
    const totalMonths = years * 12;
    let source = sourceCorpus;
    let target = 0;

    for (let month = 1; month <= totalMonths; month++) {
        if (source <= 0) break;
        source += source * sourceMonthlyRate;
        const transfer = Math.min(monthlyTransfer, source);
        source -= transfer;
        target += transfer;
        target += target * targetMonthlyRate;
    }

    const totalTransferred = Math.min(sourceCorpus, monthlyTransfer * totalMonths);
    return {
        totalTransferred,
        sourceCorpusFinal: Math.max(0, source),
        targetCorpusFinal: target,
        totalGains: source + target - sourceCorpus
    };
}

export function calculateSTPSchedule(
    sourceCorpus: number,
    monthlyTransfer: number,
    sourceAnnualReturn: number,
    targetAnnualReturn: number,
    years: number,
    startDate: Date = new Date()
): STPScheduleRow[] {
    if (sourceCorpus <= 0 || monthlyTransfer <= 0) return [];

    const sourceMonthlyRate = sourceAnnualReturn / 12 / 100;
    const targetMonthlyRate = targetAnnualReturn / 12 / 100;
    const totalMonths = years * 12;
    const schedule: STPScheduleRow[] = [];
    let source = sourceCorpus;
    let target = 0;

    for (let month = 1; month <= totalMonths; month++) {
        if (source <= 0) break;
        source += source * sourceMonthlyRate;
        const transfer = Math.min(monthlyTransfer, source);
        source -= transfer;
        target += transfer;
        target += target * targetMonthlyRate;

        schedule.push({
            month,
            date: formatDateMonthYear(addMonths(startDate, month)),
            transferAmount: transfer,
            sourceBalance: Math.max(0, source),
            targetBalance: target
        });
    }

    return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// PPF (Public Provident Fund) Calculator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PPF interest is calculated on the minimum balance between 5th and end of the month,
 * compounded annually. We simplify by computing interest on the yearly balance.
 */
export function calculatePPF(
    yearlyInvestment: number,
    annualRate: number = 7.1,
    years: number = 15
): PPFResult {
    if (yearlyInvestment <= 0) return { totalInvested: 0, totalInterest: 0, maturityAmount: 0 };

    const rate = annualRate / 100;
    let balance = 0;
    let totalInvested = 0;

    for (let year = 1; year <= years; year++) {
        balance += yearlyInvestment;
        totalInvested += yearlyInvestment;
        balance += balance * rate;
    }

    return {
        totalInvested,
        totalInterest: balance - totalInvested,
        maturityAmount: balance
    };
}

export function calculatePPFSchedule(
    yearlyInvestment: number,
    annualRate: number = 7.1,
    years: number = 15
): PPFScheduleRow[] {
    if (yearlyInvestment <= 0) return [];

    const rate = annualRate / 100;
    const schedule: PPFScheduleRow[] = [];
    let balance = 0;

    for (let year = 1; year <= years; year++) {
        const opening = balance;
        balance += yearlyInvestment;
        const interest = balance * rate;
        balance += interest;

        schedule.push({
            year,
            openingBalance: opening,
            investment: yearlyInvestment,
            interestEarned: interest,
            closingBalance: balance
        });
    }

    return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal-Based Savings Calculator
// ─────────────────────────────────────────────────────────────────────────────

export function calculateGoalSavings(
    targetAmount: number,
    annualReturn: number,
    years: number,
    inflationRate: number = 0
): GoalResult {
    if (targetAmount <= 0 || years <= 0) {
        return { monthlyInvestmentRequired: 0, totalInvested: 0, totalReturns: 0, targetAmount };
    }

    // Inflation-adjusted target
    const adjustedTarget = inflationRate > 0
        ? targetAmount * Math.pow(1 + inflationRate / 100, years)
        : targetAmount;

    const monthlyRate = annualReturn / 12 / 100;
    const totalMonths = years * 12;

    // PMT formula: SIP needed to reach a future value
    let monthlyInvestmentRequired = 0;
    if (monthlyRate === 0) {
        monthlyInvestmentRequired = adjustedTarget / totalMonths;
    } else {
        monthlyInvestmentRequired =
            (adjustedTarget * monthlyRate) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    const totalInvested = monthlyInvestmentRequired * totalMonths;

    return {
        monthlyInvestmentRequired,
        totalInvested,
        totalReturns: adjustedTarget - totalInvested,
        targetAmount: adjustedTarget
    };
}

export function calculateCompoundInterestSchedule(
    principal: number,
    annualRate: number,
    timeYears: number,
    compoundingFrequency: CompoundingFrequency = 1,
    startDate: Date = new Date(),
    payoutFrequency: PayoutFrequency = 'maturity'
): CompoundInterestScheduleRow[] {
    if (principal <= 0 || annualRate <= 0 || timeYears <= 0) {
        return [];
    }

    const schedule: CompoundInterestScheduleRow[] = [];
    const rateAsDecimal = annualRate / 100;

    if (payoutFrequency === 'maturity') {
        // Cumulative FD (compounds and stays in)
        // We will display the schedule based on the compounding frequency itself
        const periodsPerYear = compoundingFrequency;
        const totalPeriods = timeYears * periodsPerYear;
        const periodRate = rateAsDecimal / periodsPerYear;
        const monthsPerPeriod = 12 / periodsPerYear;

        let currentBalance = principal;

        for (let period = 1; period <= totalPeriods; period++) {
            const interestEarned = currentBalance * periodRate;
            currentBalance += interestEarned;

            schedule.push({
                period,
                date: formatDateMonthYear(addMonths(startDate, period * monthsPerPeriod)),
                interestEarned: interestEarned,
                totalAmount: currentBalance
            });
        }
    } else {
        // Non-Cumulative FD (regular payouts)
        const periodsPerYear = Number(payoutFrequency);
        const totalPeriods = timeYears * periodsPerYear;
        const periodRate = rateAsDecimal / periodsPerYear;
        const monthsPerPeriod = 12 / periodsPerYear;

        let cumulativeInterest = 0;

        for (let period = 1; period <= totalPeriods; period++) {
            // In a non-cumulative FD, interest is on the raw principal
            const interestEarned = principal * periodRate;
            cumulativeInterest += interestEarned;

            schedule.push({
                period,
                date: formatDateMonthYear(addMonths(startDate, period * monthsPerPeriod)),
                interestEarned: interestEarned,
                totalAmount: principal + cumulativeInterest // Current Total Net Worth from this FD
            });
        }
    }

    return schedule;
}

/**
 * Calculates Recurring Deposit (RD) maturity value.
 * Uses the standard Indian banking quarterly compounding formula:
 * M = R × [(1 + i)^n - 1] / (1 - (1 + i)^(-1/3))
 * Where:
 *   R = monthly instalment, i = quarterly interest rate, n = quarters
 *
 * Simplified equivalent used here: month-by-month compound accumulation.
 */
export function calculateRD(
    monthly: number,
    annualRate: number,
    tenureMonths: number
): RDResult {
    if (monthly <= 0 || annualRate <= 0 || tenureMonths <= 0) {
        return { totalInvested: 0, totalInterest: 0, maturityAmount: 0 };
    }

    // Standard RD formula used by Indian banks (quarterly compounding)
    // i = quarterly rate, n = number of quarters
    const quarterlyRate = annualRate / 400; // annualRate/4/100
    const quarters = tenureMonths / 3;

    // Each monthly instalment compounds from when it was deposited to maturity
    // M = R × [(1+i)^n - 1] / [1 - (1+i)^(-1/3)]
    const maturityAmount =
        monthly *
        (Math.pow(1 + quarterlyRate, quarters) - 1) /
        (1 - Math.pow(1 + quarterlyRate, -1 / 3));

    const totalInvested = monthly * tenureMonths;
    const totalInterest = maturityAmount - totalInvested;

    return {
        totalInvested: isNaN(totalInvested) ? 0 : totalInvested,
        totalInterest: isNaN(totalInterest) ? 0 : Math.max(0, totalInterest),
        maturityAmount: isNaN(maturityAmount) ? 0 : maturityAmount,
    };
}

/**
 * Generates a month-by-month RD schedule.
 * Each month a new instalment is deposited and all previous instalments earn interest.
 */
export function calculateRDSchedule(
    monthly: number,
    annualRate: number,
    tenureMonths: number,
    startDate: Date = new Date()
): RDScheduleRow[] {
    if (monthly <= 0 || annualRate <= 0 || tenureMonths <= 0) return [];

    const schedule: RDScheduleRow[] = [];
    const monthlyRate = annualRate / 12 / 100;
    // Each instalment deposited at month k earns interest for (tenureMonths - k + 1) months
    // We approximate running maturity value as sum of each instalment's compound growth
    let runningMaturity = 0;

    for (let m = 1; m <= tenureMonths; m++) {
        const remainingMonths = tenureMonths - m + 1;
        const futurePrincipal = monthly * Math.pow(1 + monthlyRate, remainingMonths);
        runningMaturity += futurePrincipal;

        // For schedule display: show the accumulated value up to this month
        // (all instalments so far compounded to current month)
        let accumulated = 0;
        for (let k = 1; k <= m; k++) {
            accumulated += monthly * Math.pow(1 + monthlyRate, m - k + 1);
        }
        const totalInvestedSoFar = monthly * m;
        const interestSoFar = accumulated - totalInvestedSoFar;

        schedule.push({
            month: m,
            date: formatDateMonthYear(addMonths(startDate, m - 1)),
            investment: monthly,
            interestEarned: interestSoFar,
            totalInvested: totalInvestedSoFar,
            maturityValue: accumulated,
        });
    }

    return schedule;
}
