
import React, { useState, useEffect } from 'react';
import { User, LanguageCode } from '../types';
import { Cat, ArrowRight, UserCircle, Lock, UserPlus, LogIn } from 'lucide-react';
import { translations } from '../constants/translations';
import { db, ref, get, set, remove } from '../lib/firebase';

interface LoginProps {
  onLogin: (user: User) => void;
  currentLang: LanguageCode;
}

const Login: React.FC<LoginProps> = ({ onLogin, currentLang }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'admin'>('login');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = translations[currentLang];

  // Cleanup inactive users on mount
  useEffect(() => {
    const cleanupInactiveUsers = async () => {
      if (!db) return;
      try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
          const users = snapshot.val();
          const now = Date.now();
          const twoMonths = 60 * 24 * 60 * 60 * 1000;
          
          Object.entries(users).forEach(async ([key, userData]: [string, any]) => {
            if (now - userData.lastActivity > twoMonths) {
              await remove(ref(db, `users/${key}`));
            }
          });
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    };
    cleanupInactiveUsers();
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const admins = {
      'eralp': 'Eralp Ergün',
      'sabri': 'Sabri Ahirzaman',
      'nehir': 'Nehir Çatalbaş',
      'tibet': 'Tibet Şahin'
    };

    if (admins[adminPassword as keyof typeof admins]) {
      onLogin({ name: admins[adminPassword as keyof typeof admins], isAdmin: true });
    } else {
      setError('Hatalı şifre!');
    }
  };

  const handleUserAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir.');
      setLoading(false);
      return;
    }

    // Sanitize username for Firebase key (no ., $, #, [, ], /)
    const safeUsername = username.trim().replace(/[.#$\[\]\/]/g, '_');

    try {
      const userRef = ref(db, `users/${safeUsername}`);
      const snapshot = await get(userRef);

      if (mode === 'register') {
        if (snapshot.exists()) {
          setError('Bu kullanıcı adı zaten alınmış.');
        } else {
          await set(userRef, {
            password: password, // In a real app, hash this!
            createdAt: Date.now(),
            lastActivity: Date.now()
          });
          onLogin({ name: username.trim() });
        }
      } else {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.password === password) {
            // Update last activity
            await set(ref(db, `users/${safeUsername}/lastActivity`), Date.now());
            onLogin({ name: username.trim() });
          } else {
            setError('Hatalı şifre.');
          }
        } else {
          setError('Kullanıcı bulunamadı.');
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymous = () => {
    onLogin({ name: '@@ANONYMOUS@@' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-4 py-8 overflow-y-auto">
      <div className="max-w-md w-full my-auto py-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-orange-500 rounded-[2rem] sm:rounded-[2.5rem] text-white mb-4 sm:mb-6 shadow-2xl shadow-orange-100 animate-bounce-slow">
            <Cat className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-1 tracking-tighter">emPATİ</h1>
          <p className="text-orange-600 font-black text-[10px] sm:text-sm uppercase tracking-[0.2em] mb-2 sm:mb-4">İyiliği Haritaya İşle!</p>
          <p className="text-slate-500 text-base sm:text-lg font-medium">
            {mode === 'admin' ? 'Yönetici Girişi' : (mode === 'register' ? 'Hesap Oluştur' : t.loginTitle)}
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 space-y-5 sm:space-y-6">
          {mode === 'admin' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Yönetici Şifresi"
                  className="w-full px-6 py-4 sm:py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-slate-800 font-bold"
                />
                {error && <p className="text-red-500 text-sm mt-2 ml-2 font-bold">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={!adminPassword}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 sm:py-5 rounded-[1.5rem] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group text-lg"
              >
                Giriş Yap
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleUserAuth} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı Adı"
                  className="w-full px-6 py-4 sm:py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-slate-800 font-bold mb-4"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifre"
                  className="w-full px-6 py-4 sm:py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-slate-800 font-bold"
                />
                {error && <p className="text-red-500 text-sm mt-2 ml-2 font-bold">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 sm:py-5 rounded-[1.5rem] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group text-lg"
              >
                {loading ? 'İşleniyor...' : (mode === 'register' ? 'Kayıt Ol' : 'Giriş Yap')}
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          <div className="space-y-3 pt-2 border-t border-slate-100">
            {mode !== 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                    setUsername('');
                    setPassword('');
                  }}
                  className="w-full text-slate-600 hover:text-slate-900 font-bold py-3 transition-colors flex items-center justify-center gap-2"
                >
                  {mode === 'login' ? (
                    <>
                      <UserPlus size={18} />
                      Hesap Oluştur
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Giriş Yap
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleAnonymous}
                  className="w-full bg-white hover:bg-slate-50 text-slate-400 border-2 border-slate-100 font-bold py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 group text-sm"
                >
                  <UserCircle size={20} className="text-slate-300 group-hover:text-slate-500" />
                  {t.anonBtn}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'admin' ? 'login' : 'admin');
                setError('');
                setAdminPassword('');
                setUsername('');
                setPassword('');
              }}
              className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold py-2 transition-colors flex items-center justify-center gap-2"
            >
              {mode === 'admin' ? (
                <>
                  <UserCircle size={14} />
                  Kullanıcı Girişine Dön
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Yönetici Girişi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
