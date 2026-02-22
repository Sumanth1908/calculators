import { useState } from 'react';
import { Shell } from './components/layout/Shell';
import { EMICalculator } from './components/calculators/EMICalculator';
import { CompoundInterestCalculator } from './components/calculators/CompoundInterestCalculator';
import { Calculator, PiggyBank } from 'lucide-react';
import './styles/global.css'; // Global resets & variables

function App() {
  const [activeTab, setActiveTab] = useState('emi');

  const navItems = [
    { id: 'emi', title: 'Home / Car Loan EMI', icon: <Calculator size={20} /> },
    { id: 'compound', title: 'Fixed Deposit (FD/RD)', icon: <PiggyBank size={20} /> },
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
      </div>
    </Shell>
  );
}

export default App;
