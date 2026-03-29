import { useState } from 'react';
import { Shell } from './components/layout/Shell';
import { EMICalculator } from './components/calculators/EMICalculator';
import { CompoundInterestCalculator } from './components/calculators/CompoundInterestCalculator';
import { SIPCalculator } from './components/calculators/SIPCalculator';
import { SWPCalculator } from './components/calculators/SWPCalculator';
import { STPCalculator } from './components/calculators/STPCalculator';

import { GoalCalculator } from './components/calculators/GoalCalculator';
import { Calculator, PiggyBank, TrendingUp, ArrowDownToLine, ArrowLeftRight, Target } from 'lucide-react';
import './styles/global.css'; // Global resets & variables

function App() {
  const [activeTab, setActiveTab] = useState('emi');

  const navItems = [
    { id: 'emi', title: 'Home / Car Loan EMI', icon: <Calculator size={20} /> },
    { id: 'compound', title: 'FD / RD Calculator', icon: <PiggyBank size={20} /> },
    { id: 'sip', title: 'SIP / Mutual Funds', icon: <TrendingUp size={20} /> },
    { id: 'swp', title: 'SWP — Withdrawals', icon: <ArrowDownToLine size={20} /> },
    { id: 'stp', title: 'STP — Fund Transfer', icon: <ArrowLeftRight size={20} /> },

    { id: 'goal', title: 'Goal Planner', icon: <Target size={20} /> },
  ];

  return (
    <Shell
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="animate-fade-in">
        {activeTab === 'emi' && <EMICalculator />}
        {activeTab === 'compound' && <CompoundInterestCalculator />}
        {activeTab === 'sip' && <SIPCalculator />}
        {activeTab === 'swp' && <SWPCalculator />}
        {activeTab === 'stp' && <STPCalculator />}

        {activeTab === 'goal' && <GoalCalculator />}
      </div>
    </Shell>
  );
}

export default App;
