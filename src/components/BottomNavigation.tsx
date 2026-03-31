import React from 'react';
import { 
  Home, 
  Calendar as CalendarIcon, 
  ShoppingCart, 
  BookOpen, 
  Sparkles, 
  Wallet 
} from 'lucide-react';
import './BottomNavigation.css';

interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  notificationsCount: number;
  visibleSections: Record<string, boolean>;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab, 
  setActiveTab,
  notificationsCount,
  visibleSections
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'planner', label: 'Menù', icon: CalendarIcon },
    { id: 'shopping', label: 'Spesa', icon: ShoppingCart },
    { id: 'recipes', label: 'Ricette', icon: BookOpen },
    { id: 'cleaning', label: 'Pulizie', icon: Sparkles },
    { id: 'finance', label: 'Finanze', icon: Wallet },
  ].filter(tab => tab.id === 'home' || visibleSections[tab.id]);

  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        <div 
          className="nav-indicator" 
          style={{ 
            width: `${100 / tabs.length}%`,
            transform: `translateX(${activeIndex * 100}%)`
          }} 
        />
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="icon-wrapper">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {tab.id === 'home' && notificationsCount > 0 && (
                  <span className="bottom-nav-badge" />
                )}
              </div>
              <span className="bottom-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
