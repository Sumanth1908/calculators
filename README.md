# FinCalc - Personal Finance Dashboard

FinCalc is a modern, responsive, and robust financial suite built with React, TypeScript, and Vite. It provides an intuitive interface for calculating and visualizing complex personal finance scenarios like Loan EMIs, Repayment Schedules with dynamic prepayments, and Fixed/Recurring Deposits (FD/RD).

## Features

- **Home / Car Loan EMI Calculator**: Accurately compute interest and tenure with flexible input parameters.
- **Dynamic Prepayment Strategy Engine**: Simulate recurring prepayments with *Daily, Monthly, Quarterly, and Yearly* frequency options. Calculate exactly how much interest and time is saved!
- **Target Tenure Mode**: Easily switch from solving for EMI to solving for Tenure based on a customized target monthly payment.
- **Fixed & Recurring Deposit Calculator**: Model cumulative and non-cumulative interest payouts at various compounding intervals.
- **Interactive Repayment Schedules**: Deep dive into fully dynamic month-by-month tables showing payments, interest split, extra payments, and remaining balances.
- **Live Recharts Visualization**: See your financial timeline beautifully plotted to grasp the impact of prepayments interactively.
- **Local Storage Persistance**: Your inputs are auto-saved to your browser. You can return later exactly where you left off.
- **Fluid & Responsive UI**: Optimized for mobile, tablet, and desktop viewing with beautiful custom CSS Modules.
- **Dark/Light Mode**: Full theme switching built directly into the Shell architecture.

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS Modules (with dynamic CSS custom variables for theming)
- **Icons**: Lucide React
- **Charts**: Recharts

## Setup Instructions

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

3. **Build for Production**
   ```bash
   npm run build
   ```
   This will run `tsc` and Vite's production building engine, placing the optimized bundle in `/dist`.

## Project Structure Highlights

- `src/components/calculators/`: Contains isolated calculator forms (`EMICalculator.tsx`, `CompoundInterestCalculator.tsx`).
- `src/components/ui/`: Reusable primitive components like Inputs, Cards, and Buttons.
- `src/components/layout/Shell.tsx`: The orchestrating responsive UI shell holding navigation and theme logic.
- `src/utils/finance.ts`: Pure mathematical engine powering EMI calculations, compound interest, and advanced schedule generation algorithms.
- `src/styles/global.css`: Centralized token source (Colors, Spacing, Typography).

## Optimization

The codebase is engineered to minimize computational overhead utilizing React's `useMemo` hooks heavily on the financial simulation tables, ensuring real-time un-lagged feedback (3-5ms response times) as the user types without requiring explicit submit actions.
