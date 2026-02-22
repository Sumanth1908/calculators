export interface EMIDetails {
    emi: number;
    totalInterest: number;
    totalPayment: number;
}

export interface PrepaymentResult {
    originalTotalInterest: number;
    newTotalInterest: number;
    interestSaved: number;
    originalTenureMonths: number;
    newTenureMonths: number;
    monthsSaved: number;
    schedule: AmortizationScheduleRow[];
}

export interface AmortizationScheduleRow {
    month: number;
    date: string;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
    extraPayment: number;
}

export interface CompoundInterestDetails {
    totalAmount: number;
    totalInterest: number;
}

export interface CompoundInterestScheduleRow {
    period: number;
    date: string;
    interestEarned: number;
    totalAmount: number;
}

export type PrepaymentFrequency = 'daily' | 'monthly' | 'quarterly' | 'yearly';
export type TenureUnit = 'years' | 'months';
export type CalcMode = 'emi' | 'tenure';

export type CompoundingFrequency = 1 | 2 | 4 | 12;
export type PayoutFrequency = 'maturity' | '1' | '2' | '4' | '12';
