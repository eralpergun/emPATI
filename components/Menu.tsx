
import React, { useMemo } from 'react';
import { Map, Clock, Heart, Navigation, User, ChevronRight, Info, Trash2, Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS, it, fr, de, es, pt, ru, ja, arSA } from 'date-fns/locale';
import { LanguageCode, FoodMarker } from '../types';
import Logo from './Logo';
import { translations } from '../constants/translations';

interface MenuProps {
  stats: {
    nearbyCount: number;
    freshCount: number;
    staleCount: number;
    lastAdded: any;
    isLocationEnabled: boolean;
    locationStatus: string;
  };
  markers: FoodMarker[];
  onOpenMap: () => void;
  onOpenSettings: () => void;
  userName: string;
  currentLang: LanguageCode;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onDeleteAll?: () => void;
  showAlert: (title: string, message: string, type?: 'danger' | 'warning' | 'info' | 'success', onConfirm?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
  onRequestLocation: () => void;
}

const locales: Record<LanguageCode, any> = {
  tr, en: enUS, it, fr, de, es, pt, ru, jp: ja, ar: arSA
};

const Menu: React.FC<MenuProps> = ({ stats, markers, onOpenMap, onOpenSettings, userName, currentLang, isAdmin, isSuperAdmin, onDeleteAll, showAlert, showConfirm, onRequestLocation }) => {
  const t = translations[currentLang];
  const locale = locales[currentLang] || tr;

  const leaderboard = useMemo(() => {
    const counts: Record<string, number> = {};
    markers.forEach(m => {
      const rawName = m.addedBy;
      const name = (!rawName || rawName === '@@ANONYMOUS@@') ? t.anonymousUser : rawName;
      counts[name] = (counts[name] || 0) + 1;
    });
    
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count], index) => ({ name, count, rank: index + 1 }));
  }, [markers, t]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 h-full overflow-y-auto pb-40">
      <div className="flex justify-between items-start mt-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.welcome}, {userName}! 👋</h2>
          <p className="text-slate-500 mt-1 font-medium">{t.summary}</p>
        </div>
      </div>

      {isSuperAdmin && (
        <button 
          onClick={() => {
            showConfirm(
              'Delete All Food',
              'Are you sure you want to delete all food spots? This action cannot be undone!',
              () => onDeleteAll?.(),
              'danger'
            );
          }}
          className="w-full bg-red-500 p-5 rounded-[2rem] text-white flex items-center justify-center gap-3 hover:bg-red-600 transition-colors shadow-xl shadow-red-200"
        >
          <Trash2 size={24} />
          <span className="font-black text-lg">Delete All Food</span>
        </button>
      )}

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
              <button 
                onClick={onRequestLocation}
                className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-wider animate-pulse hover:bg-red-600 transition-colors"
              >
                {t.enableLocation || "Konumu Etkinleştir"}
              </button>
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

      {/* Leaderboard Section */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-yellow-100 p-2.5 rounded-2xl text-yellow-600">
            <Trophy size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">{t.leaderboard}</h3>
            <p className="text-xs text-slate-400 font-bold">{t.leaderboardDesc}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {leaderboard.length > 0 ? (
            leaderboard.map((user, index) => (
              <div key={user.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-slate-100 text-slate-700' : 
                    index === 2 ? 'bg-orange-100 text-orange-700' : 
                    'bg-slate-50 text-slate-400'
                  }`}>
                    {user.rank}
                  </div>
                  <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                    {user.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900">{user.count}</span>
                  <Heart size={14} className="text-red-500 fill-red-500" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-400 text-sm py-4 font-medium">{t.noData}</p>
          )}
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
                {t.lastAddedBy.replace('{user}', (!stats.lastAdded.addedBy || stats.lastAdded.addedBy === '@@ANONYMOUS@@') ? t.anonymousUser : stats.lastAdded.addedBy)}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-bold">
                {formatDistanceToNow(stats.lastAdded.timestamp, { addSuffix: true, locale } as any)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/[0.03] p-6 rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center gap-4">
        <Logo size={32} color="#cbd5e1" />
        <p className="text-xs text-slate-500 leading-relaxed text-center font-medium">
          {t.doubleClickTip}
        </p>
      </div>
    </div>
  );
};

export default Menu;
