
import React, { useState } from 'react';
import { User, LanguageCode } from '../types';
import { Cat, ArrowRight, UserCircle } from 'lucide-react';
import { translations } from '../constants/translations';

interface LoginProps {
  onLogin: (user: User) => void;
  currentLang: LanguageCode;
}

const Login: React.FC<LoginProps> = ({ onLogin, currentLang }) => {
  const [fullName, setFullName] = useState('');
  const t = translations[currentLang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim()) {
      onLogin({ name: fullName.trim() });
    }
  };

  const handleAnonymous = () => {
    // Statik isim yerine sentinel değer kullanıyoruz ki her dilde anlık değişsin
    onLogin({ name: '@@ANONYMOUS@@' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-orange-500 rounded-[2.5rem] text-white mb-6 shadow-2xl shadow-orange-100 animate-bounce-slow">
            <Cat size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter">emPATİ</h1>
          <p className="text-slate-500 text-lg font-medium">{t.loginTitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6">
          <div className="space-y-4">
            <div>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-slate-800 font-bold"
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={!fullName.trim()}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-5 rounded-[1.5rem] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group text-lg"
            >
              {t.loginBtn}
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={handleAnonymous}
              className="w-full bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-100 font-bold py-5 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 group"
            >
              <UserCircle size={22} className="text-slate-400 group-hover:text-slate-600" />
              {t.anonBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
