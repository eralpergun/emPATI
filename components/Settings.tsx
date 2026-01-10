
import React from 'react';
import { Language, LanguageCode } from '../types';
import { Globe, Check } from 'lucide-react';
import { translations } from '../constants/translations';

interface SettingsProps {
  currentLang: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onBack: () => void;
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

const Settings: React.FC<SettingsProps> = ({ currentLang, onLanguageChange, onBack }) => {
  const t = translations[currentLang];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 h-full overflow-y-auto pb-32">
      <div className="pt-4">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t.settings}</h2>
      </div>

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
    </div>
  );
};

export default Settings;
