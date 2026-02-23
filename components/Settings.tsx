
import React from 'react';
import { Language, LanguageCode, NotificationSetting } from '../types';
import { Globe, Check, Trash2, Bell } from 'lucide-react';
import { translations } from '../constants/translations';

interface SettingsProps {
  currentLang: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  notificationSetting: NotificationSetting;
  onNotificationSettingChange: (setting: NotificationSetting) => void;
  onBack: () => void;
  onDeleteAccount: () => void;
  isAnonymous: boolean;
}

const languages: Language[] = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'jp', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

const Settings: React.FC<SettingsProps> = ({ 
  currentLang, 
  onLanguageChange, 
  notificationSetting,
  onNotificationSettingChange,
  onBack, 
  onDeleteAccount, 
  isAnonymous 
}) => {
  const t = translations[currentLang];

  const notificationOptions: { value: NotificationSetting; label: string }[] = [
    { value: 'all', label: t.notifAll },
    { value: '5km', label: t.notif5km },
    { value: '1km', label: t.notif1km },
    { value: 'mine', label: t.notifMine },
    { value: 'none', label: t.notifNone },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 h-full overflow-y-auto pb-32">
      <div className="pt-4">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t.settings}</h2>
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2 ml-1">
          <Bell size={18} className="text-blue-500" />
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t.notificationSettings}</h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {notificationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onNotificationSettingChange(option.value)}
              className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${
                notificationSetting === option.value 
                  ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100' 
                  : 'border-white bg-white shadow-sm hover:border-slate-200'
              }`}
            >
              <span className={`font-bold ${notificationSetting === option.value ? 'text-blue-900' : 'text-slate-700'}`}>
                {option.label}
              </span>
              {notificationSetting === option.value && (
                <div className="bg-blue-500 p-1 rounded-full text-white">
                  <Check size={16} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Language Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2 ml-1">
          <Globe size={18} className="text-orange-500" />
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t.language}</h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${
                currentLang === lang.code 
                  ? 'border-orange-500 bg-orange-50/50 shadow-md shadow-orange-100' 
                  : 'border-white bg-white shadow-sm hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{lang.flag}</span>
                <span className={`font-bold ${currentLang === lang.code ? 'text-orange-900' : 'text-slate-700'}`}>
                  {lang.name}
                </span>
              </div>
              {currentLang === lang.code && (
                <div className="bg-orange-500 p-1 rounded-full text-white">
                  <Check size={16} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {!isAnonymous && (
        <div className="space-y-4 pt-8 border-t border-slate-100">
           <div className="flex items-center gap-2 mb-2 ml-1">
            <Trash2 size={18} className="text-red-500" />
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Hesap İşlemleri</h3>
          </div>
          
          <button
            onClick={() => {
              if (window.confirm('Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                onDeleteAccount();
              }
            }}
            className="w-full flex items-center justify-between p-5 rounded-3xl border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 transition-all font-bold"
          >
            <span>Hesabımı Sil</span>
            <Trash2 size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
