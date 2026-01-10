
import React from 'react';
import { Map, Clock, Heart, Navigation, User, ChevronRight, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS, it, fr, de, es, pt, ru, ja, arSA } from 'date-fns/locale';
import { LanguageCode } from '../types';
import { translations } from '../constants/translations';

interface MenuProps {
  stats: {
    nearbyCount: number;
    freshCount: number;
    staleCount: number;
    lastAdded: any;
    isLocationEnabled: boolean;
  };
  onOpenMap: () => void;
  onOpenSettings: () => void;
  userName: string;
  currentLang: LanguageCode;
}

const locales: Record<LanguageCode, any> = {
  tr, en: enUS, it, fr, de, es, pt, ru, jp: ja, ar: arSA
};

const Menu: React.FC<MenuProps> = ({ stats, onOpenMap, onOpenSettings, userName, currentLang }) => {
  const t = translations[currentLang];
  const locale = locales[currentLang] || tr;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 h-full overflow-y-auto pb-32">
      <div className="flex justify-between items-start mt-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.welcome}, {userName}! 👋</h2>
          <p className="text-slate-500 mt-1 font-medium">{t.summary}</p>
        </div>
      </div>

      <button 
        onClick={onOpenMap}
        className="w-full bg-slate-900 p-7 rounded-[2.5rem] text-white flex items-center justify-between group hover:scale-[1.02] transition-all shadow-2xl shadow-slate-300"
      >
        <div className="flex items-center gap-6 text-left">
          <div className="bg-orange-500 p-5 rounded-3xl group-hover:rotate-12 transition-transform shadow-lg shadow-orange-400/30">
            <Map size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight">{t.openMap}</h3>
            <p className="text-slate-400 font-medium text-sm">{t.mapDesc}</p>
          </div>
        </div>
        <ChevronRight size={28} className="text-slate-600 group-hover:translate-x-2 transition-transform" />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col gap-4 transition-colors ${!stats.isLocationEnabled ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-2xl ${!stats.isLocationEnabled ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              <Navigation size={22} />
            </div>
            {!stats.isLocationEnabled && (
              <span className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-wider animate-pulse">{t.locationDisabled}</span>
            )}
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">{stats.isLocationEnabled ? stats.nearbyCount : '--'}</p>
            <p className="text-sm font-bold text-slate-500 leading-tight">{t.nearby}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600">
              <Heart size={22} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900">{stats.freshCount} {t.fresh}</p>
              <p className="text-[11px] text-slate-400 font-bold">{t.freshDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900">{stats.staleCount} {t.stale}</p>
              <p className="text-[11px] text-slate-400 font-bold">{t.staleDesc}</p>
            </div>
          </div>
        </div>
      </div>

      {stats.lastAdded && (
        <div className="bg-orange-50/50 p-6 rounded-[2.5rem] border border-orange-100/50">
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-orange-600" />
            <h4 className="text-[10px] font-black text-orange-800 uppercase tracking-widest">{t.lastActivity}</h4>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-50">
              <User size={28} />
            </div>
            <div>
              <p className="text-sm text-slate-800 font-bold">
                {t.lastAddedBy.replace('{user}', stats.lastAdded.addedBy)}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-bold">
                {formatDistanceToNow(stats.lastAdded.timestamp, { addSuffix: true, locale } as any)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/[0.03] p-6 rounded-[2rem] border border-dashed border-slate-200">
        <p className="text-xs text-slate-500 leading-relaxed text-center font-medium">
          {t.doubleClickTip}
        </p>
      </div>
    </div>
  );
};

export default Menu;
