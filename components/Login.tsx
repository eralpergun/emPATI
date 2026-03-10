
import React, { useState, useEffect } from 'react';
import { User, LanguageCode } from '../types';
import Logo from './Logo';
import { ArrowRight, UserCircle, Lock, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { translations } from '../constants/translations';
import { db, ref, get, set, remove, push } from '../lib/firebase';
import { hashPassword, comparePassword } from '../utils/hash';

interface LoginProps {
  onLogin: (user: User) => void;
  currentLang: LanguageCode;
  registrationEnabled: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, currentLang, registrationEnabled }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
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

  const handleUserAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir.');
      setLoading(false);
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      setLoading(false);
      return;
    }

    // Sanitize username for Firebase key (no ., $, #, [, ], /)
    const safeUsername = username.trim().replace(/[.#$\[\]\/]/g, '_');

    try {
      // Check if it's an admin
      const adminRef = ref(db, `admins/${safeUsername}`);
      const adminSnapshot = await get(adminRef);

      if (adminSnapshot.exists()) {
        const adminData = adminSnapshot.val();
        const isMatch = await comparePassword(password, adminData.password);
        if (isMatch || adminData.password === password) {
          onLogin({ 
            name: adminData.name, 
            username: adminData.username || safeUsername,
            isAdmin: true, 
            isSuperAdmin: !!adminData.isSuperAdmin 
          });
          return;
        } else {
          setError('Hatalı şifre.');
          setLoading(false);
          return;
        }
      }

      const userRef = ref(db, `users/${safeUsername}`);
      const snapshot = await get(userRef);

      if (mode === 'register') {
        if (!registrationEnabled) {
          setError('Yeni hesap oluşturma şu an kapalıdır.');
          setLoading(false);
          return;
        }
        if (snapshot.exists()) {
          setError('Bu kullanıcı adı zaten alınmış.');
        } else {
          const hashedPassword = await hashPassword(password);
          await set(userRef, {
            password: hashedPassword,
            createdAt: Date.now(),
            lastActivity: Date.now()
          });
          onLogin({ name: username.trim(), username: safeUsername });
        }
      } else {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const isMatch = await comparePassword(password, userData.password);
          if (isMatch || userData.password === password) {
            // Update last activity
            await set(ref(db, `users/${safeUsername}/lastActivity`), Date.now());
            onLogin({ name: username.trim(), username: safeUsername });
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
          <div className="inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-[2rem] sm:rounded-[2.5rem] mb-4 sm:mb-6 shadow-2xl shadow-orange-100 animate-bounce-slow overflow-hidden p-4">
            <Logo size="100%" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-1 tracking-tighter">emPATİ</h1>
          <p className="text-orange-600 font-black text-[10px] sm:text-sm uppercase tracking-[0.2em] mb-2 sm:mb-4">İyiliği Haritaya İşle!</p>
          <p className="text-slate-500 text-base sm:text-lg font-medium">
            {mode === 'register' ? 'Hesap Oluştur' : t.loginTitle}
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 space-y-5 sm:space-y-6">
          {!registrationEnabled && (
            <div className="bg-orange-50 text-orange-700 p-4 rounded-[1.5rem] text-center font-bold text-sm">
              Hesap oluşturma kapalıdır.
            </div>
          )}
          <form onSubmit={handleUserAuth} className="space-y-4">
            <div>
              <div className="relative mb-4">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı Adı"
                  className="w-full px-6 py-4 sm:py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-slate-800 font-bold"
                />
              </div>
              
              <div className="relative mb-4">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifre"
                  className="w-full px-6 py-4 sm:py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-slate-800 font-bold pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {mode === 'register' && (
                <div className="relative mb-4">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifreyi Onayla"
                    className="w-full px-6 py-4 sm:py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-slate-800 font-bold pr-14"
                  />
                </div>
              )}
              
              {error && <p className="text-red-500 text-sm mt-2 ml-2 font-bold">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loading || !username || !password || (mode === 'register' && !confirmPassword)}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 sm:py-5 rounded-[1.5rem] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group text-lg"
            >
              {loading ? 'İşleniyor...' : (mode === 'register' ? 'Kayıt Ol' : 'Giriş Yap')}
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            {registrationEnabled && (
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                  setUsername('');
                  setPassword('');
                  setConfirmPassword('');
                  setShowPassword(false);
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
            )}
            
            {mode === 'login' && registrationEnabled && (
              <button
                type="button"
                onClick={handleAnonymous}
                className="w-full bg-white hover:bg-slate-50 text-slate-400 border-2 border-slate-100 font-bold py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 group text-sm"
              >
                <UserCircle size={20} className="text-slate-300 group-hover:text-slate-500" />
                {t.anonBtn}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
