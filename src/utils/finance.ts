import type {
    EMIDetails,
    CompoundInterestDetails,
    PrepaymentResult,
    AmortizationScheduleRow,
    CompoundInterestScheduleRow,
    PrepaymentFrequency,
    CompoundingFrequency,
    PayoutFrequency
} from '../types/finance.types';

export type {
    EMIDetails,
    CompoundInterestDetails,
    PrepaymentResult,
    AmortizationScheduleRow,
    CompoundInterestScheduleRow,
    PrepaymentFrequency,
    CompoundingFrequency,
    PayoutFrequency
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
