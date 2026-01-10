
import React from 'react';
import { Home, Map, Settings } from 'lucide-react';
import { LanguageCode } from '../types';
import { translations } from '../constants/translations';

interface BottomNavProps {
  currentView: 'menu' | 'map' | 'settings';
  onViewChange: (view: 'menu' | 'map' | 'settings') => void;
  currentLang: LanguageCode;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange, currentLang }) => {
  const t = translations[currentLang];

  const tabs = [
    { id: 'menu', icon: Home, label: t.welcome },
    { id: 'map', icon: Map, label: t.openMap },
    { id: 'settings', icon: Settings, label: t.settings },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[4000] w-[calc(100%-2rem)] max-w-md">
      <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] p-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-3 px-6 rounded-2xl transition-all duration-300 relative ${
                isActive 
                  ? 'text-orange-500 bg-orange-50' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                {tab.id === 'menu' ? 'ANA' : (tab.id === 'map' ? 'HARİTA' : 'AYAR')}
              </span>
              {isActive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
