import { Shell, type NavSection } from './components/layout/Shell';
import { Home } from './components/views/Home';
import { Journey } from './components/views/Journey';
import { EMICalculator } from './components/calculators/EMICalculator';
import { CompoundInterestCalculator } from './components/calculators/CompoundInterestCalculator';
import { SIPCalculator } from './components/calculators/SIPCalculator';
import { SWPCalculator } from './components/calculators/SWPCalculator';
import { STPCalculator } from './components/calculators/STPCalculator';
import { GoalCalculator } from './components/calculators/GoalCalculator';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  House,
  Compass,
  Calculator,
  PiggyBank,
  TrendingUp,
  ArrowDownToLine,
  ArrowLeftRight,
  Target,
} from 'lucide-react';
import './styles/global.css'; // Global resets & variables

const VIEWS: Record<string, React.ComponentType> = {
  journey: Journey,
  emi: EMICalculator,
  compound: CompoundInterestCalculator,
  sip: SIPCalculator,
  swp: SWPCalculator,
  stp: STPCalculator,
  goal: GoalCalculator,
};

function App() {
  const [activeTab, setActiveTab] = useLocalStorage('active_view', 'home');

  const navSections: NavSection[] = [
    {
      items: [
        { id: 'home', title: 'Home', icon: <House size={20} /> },
        { id: 'journey', title: 'Your Journey', icon: <Compass size={20} /> },
      ],
    },
    {
      label: 'Studios',
      items: [
        { id: 'emi', title: 'Home / Car Loan EMI', icon: <Calculator size={20} /> },
        { id: 'compound', title: 'FD / RD Calculator', icon: <PiggyBank size={20} /> },
        { id: 'sip', title: 'SIP / Mutual Funds', icon: <TrendingUp size={20} /> },
        { id: 'swp', title: 'SWP — Withdrawals', icon: <ArrowDownToLine size={20} /> },
        { id: 'stp', title: 'STP — Fund Transfer', icon: <ArrowLeftRight size={20} /> },
        { id: 'goal', title: 'Goal Planner', icon: <Target size={20} /> },
      ],
    },
  ];

  const ActiveView = VIEWS[activeTab];

  return (
    <Shell
      navSections={navSections}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div key={activeTab} className="animate-fade-in">
        {ActiveView ? <ActiveView /> : <Home onNavigate={setActiveTab} />}
      </div>
    </Shell>
  );
}

export default App;
