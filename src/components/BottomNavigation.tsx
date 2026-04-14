import React, { useEffect, useMemo, useState } from 'react';
import { 
  Home, 
  Calendar as CalendarIcon, 
  ShoppingCart, 
  BookOpen, 
  Sparkles, 
  Wallet,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import './BottomNavigation.css';

interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  preloadTab?: (tab: string) => void;
  notificationsCount: number;
  visibleSections: Record<string, boolean>;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab, 
  setActiveTab,
  preloadTab,
  notificationsCount,
  visibleSections
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primaryTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'planner', label: 'Menù', icon: CalendarIcon },
    { id: 'cleaning', label: 'Pulizie', icon: Sparkles },
  ].filter(tab => tab.id === 'home' || visibleSections[tab.id]);

  const secondaryTabs = useMemo(() => ([
    { id: 'shopping', label: 'Spesa', icon: ShoppingCart },
    { id: 'recipes', label: 'Ricette', icon: BookOpen },
    { id: 'finance', label: 'Finanze', icon: Wallet },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ].filter(tab => tab.id === 'settings' || visibleSections[tab.id])), [visibleSections]);

  const isMoreActive = secondaryTabs.some(tab => tab.id === activeTab);
  const tabs = [...primaryTabs, { id: 'more', label: 'Altro', icon: MoreHorizontal }];
  const activeIndex = isMoreActive
    ? tabs.findIndex(tab => tab.id === 'more')
    : tabs.findIndex(tab => tab.id === activeTab);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [activeTab]);

  return (
    <>
      {isMoreOpen && <button className="bottom-nav-sheet-backdrop" aria-label="Chiudi menu altro" onClick={() => setIsMoreOpen(false)} />}
      {isMoreOpen && (
        <div className="bottom-nav-sheet" role="dialog" aria-label="Altre sezioni">
          <div className="bottom-nav-sheet-header">
            <span>Altro</span>
            <button className="bottom-nav-sheet-close" onClick={() => setIsMoreOpen(false)} aria-label="Chiudi">
              <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="bottom-nav-sheet-grid">
            {secondaryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`bottom-nav-secondary-item ${isActive ? 'active' : ''}`}
                  onMouseEnter={() => preloadTab?.(tab.id)}
                  onFocus={() => preloadTab?.(tab.id)}
                  onTouchStart={() => preloadTab?.(tab.id)}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMoreOpen(false);
                  }}
                >
                  <div className="bottom-nav-secondary-icon">
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
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
          const isActive = tab.id === 'more' ? isMoreActive || isMoreOpen : activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onMouseEnter={() => tab.id !== 'more' && preloadTab?.(tab.id)}
              onFocus={() => tab.id !== 'more' && preloadTab?.(tab.id)}
              onTouchStart={() => tab.id !== 'more' && preloadTab?.(tab.id)}
              onClick={() => {
                if (tab.id === 'more') {
                  setIsMoreOpen((open) => !open);
                  return;
                }
                setActiveTab(tab.id);
              }}
              aria-expanded={tab.id === 'more' ? isMoreOpen : undefined}
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
    </>
  );
};
