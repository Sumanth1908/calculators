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
    revisedEmi: number;
    emiReduced: number;
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
export type PrepaymentReductionMode = 'tenure' | 'emi';
export type TenureUnit = 'years' | 'months';
export type CalcMode = 'emi' | 'tenure';

export type CompoundingFrequency = 1 | 2 | 4 | 12;
export type PayoutFrequency = 'maturity' | '1' | '2' | '4' | '12';

// SIP Types
export interface SIPResult {
    investedAmount: number;
    estimatedReturns: number;
    totalValue: number;
}

export interface SIPScheduleRow {
    month: number;
    date: string;
    investment: number;
    returns: number;
    totalInvested: number;
    totalValue: number;
}

// SWP Types
export interface SWPResult {
    totalWithdrawn: number;
    totalReturns: number;
    finalCorpus: number;
    monthsLasted: number;
}

export interface SWPScheduleRow {
    month: number;
    date: string;
    withdrawal: number;
    returns: number;
    closingBalance: number;
}

// STP Types
export interface STPResult {
    totalTransferred: number;
    sourceCorpusFinal: number;
    targetCorpusFinal: number;
    totalGains: number;
}

export interface STPScheduleRow {
    month: number;
    date: string;
    transferAmount: number;
    sourceBalance: number;
    targetBalance: number;
}

// PPF Types
export interface PPFResult {
    totalInvested: number;
    totalInterest: number;
    maturityAmount: number;
}

export interface PPFScheduleRow {
    year: number;
    openingBalance: number;
    investment: number;
    interestEarned: number;
    closingBalance: number;
}

// RD Types
export interface RDResult {
    totalInvested: number;
    totalInterest: number;
    maturityAmount: number;
}

export interface RDScheduleRow {
    month: number;
    date: string;
    investment: number;
    interestEarned: number;
    totalInvested: number;
    maturityValue: number;
}

// Goal-Based Savings Types
export interface GoalResult {
    monthlyInvestmentRequired: number;
    totalInvested: number;
    totalReturns: number;
    targetAmount: number;
}

export type SIPStepUpFrequency = 'none' | 'yearly';
