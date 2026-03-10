
import React, { useState, useEffect } from 'react';
import { Language, LanguageCode, NotificationSetting } from '../types';
import Logo from './Logo';
import { Globe, Check, Trash2, Bell, Users, Search, Eye, EyeOff, ShieldAlert, UserCircle } from 'lucide-react';
import { translations } from '../constants/translations';
import { db, ref, get, remove, update, push, set } from '../lib/firebase';
import ConfirmModal from './ConfirmModal';

interface SettingsProps {
  currentLang: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  notificationSetting: NotificationSetting;
  onNotificationSettingChange: (setting: NotificationSetting) => void;
  onBack: () => void;
  onDeleteAccount: (username: string) => void;
  isAnonymous: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userName: string;
  onLoginAsUser: (username: string) => void;
  markerAddingEnabled: boolean;
  onToggleMarkerAdding: (enabled: boolean) => void;
  adminMarkerAddingEnabled: boolean;
  onToggleAdminMarkerAdding: (enabled: boolean) => void;
  registrationEnabled: boolean;
  onToggleRegistration: (enabled: boolean) => void;
  showAlert: (title: string, message: string, type?: 'danger' | 'warning' | 'info' | 'success', onConfirm?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
}

interface AdminData {
  id: string;
  name: string;
  username: string;
  password: string;
  isSuperAdmin?: boolean;
}

interface UserData {
  username: string;
  password?: string;
  createdAt: number;
  lastActivity: number;
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
  isAnonymous,
  isAdmin,
  isSuperAdmin,
  userName,
  onLoginAsUser,
  markerAddingEnabled,
  onToggleMarkerAdding,
  adminMarkerAddingEnabled,
  onToggleAdminMarkerAdding,
  registrationEnabled,
  onToggleRegistration,
  showAlert,
  showConfirm
}) => {
  const t = translations[currentLang];
  const [users, setUsers] = useState<UserData[]>([]);
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    type: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
    type: 'danger'
  });

  // Admin Management State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminKey, setNewAdminKey] = useState('');
  const [newAdminIsSuper, setNewAdminIsSuper] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchAdmins();
    }
  }, [isAdmin, userName]);

  const fetchAdmins = async () => {
    if (!db) return;
    setLoadingAdmins(true);
    try {
      const adminsRef = ref(db, 'admins');
      const snapshot = await get(adminsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const adminList = Object.entries(data).map(([id, details]: [string, any]) => ({
          id,
          ...details
        }));
        setAdmins(adminList);
      } else {
        setAdmins([]);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newAdminName || !newAdminUsername || !newAdminKey) return;

    try {
      // Use username as key for admin
      const safeUsername = newAdminUsername.trim().replace(/[.#$\[\]\/]/g, '_');
      const adminRef = ref(db, `admins/${safeUsername}`);
      await set(adminRef, {
        name: newAdminName,
        username: newAdminUsername,
        password: newAdminKey,
        isSuperAdmin: newAdminIsSuper
      });
      setNewAdminName('');
      setNewAdminUsername('');
      setNewAdminKey('');
      setNewAdminIsSuper(false);
      setShowAdminForm(false);
      fetchAdmins();
      showAlert("Başarılı", "Yeni yönetici başarıyla eklendi.", 'success');
    } catch (error) {
      console.error("Error adding admin:", error);
      showAlert("Hata", "Yönetici eklenirken bir hata oluştu.", 'danger');
    }
  };

  const handleDeleteAdmin = async (id: string, username: string) => {
    if (!db) return;

    setModalConfig({
      isOpen: true,
      title: 'Yöneticiyi Sil',
      message: `Bu yöneticiyi silmek istediğinize emin misiniz?`,
      confirmText: 'Evet, Sil',
      type: 'danger',
      onConfirm: async () => {
        try {
          await remove(ref(db, `admins/${id}`));
          fetchAdmins();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error("Error deleting admin:", error);
        }
      }
    });
  };

  const fetchUsers = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userList = Object.entries(data).map(([username, details]: [string, any]) => ({
          username,
          ...details
        }));
        setUsers(userList);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (username: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  const notificationOptions: { value: NotificationSetting; label: string }[] = [
    { value: 'all', label: t.notifAll },
    { value: '5km', label: t.notif5km },
    { value: '1km', label: t.notif1km },
    { value: 'mine', label: t.notifMine },
    { value: 'none', label: t.notifNone },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 h-full overflow-y-auto pb-40">
      <div className="pt-4 flex items-center gap-3">
        <Logo size={48} />
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

      {/* Admin User Management */}
      {isAdmin && (
        <div className="space-y-6 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 ml-1">
              <Users size={20} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Kullanıcı Yönetimi</h3>
            </div>
            <button 
              onClick={fetchUsers}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Yenile
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-indigo-500 transition-all outline-none font-medium"
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Yükleniyor...</p>
              </div>
            ) : paginatedUsers.length > 0 ? (
              <>
                {paginatedUsers.map((u) => (
                  <div key={u.username} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                          <ShieldAlert size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-none">{u.username}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                            {new Date(u.createdAt).toLocaleDateString()} tarihinde katıldı
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onDeleteAccount(u.username)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Şifre:</span>
                        <span className="font-mono font-bold text-slate-700">
                          ••••••••
                        </span>
                      </div>
                      {onLoginAsUser && (
                        <button 
                          onClick={() => onLoginAsUser(u.username)}
                          className="px-3 py-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Giriş Yap
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-50"
                    >
                      Önceki
                    </button>
                    <span className="text-xs font-bold text-slate-600">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-50"
                    >
                      Sonraki
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-sm text-slate-400 font-medium">Kullanıcı bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Super Admin Management */}
      {isSuperAdmin && (
        <div className="space-y-6 pt-8 border-t border-slate-100">
          <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-none">Mama Eklemeyi Kapat/Aç</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                Tüm kullanıcılar için mama ekleme özelliğini yönetin
              </p>
            </div>
            <button 
              onClick={() => onToggleMarkerAdding?.(!markerAddingEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${markerAddingEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${markerAddingEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-none">Admin Mama Eklemeyi Kapat/Aç</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                Normal yöneticilerin mama ekleme yetkisini yönetin (Süper Adminler hariç)
              </p>
            </div>
            <button 
              onClick={() => onToggleAdminMarkerAdding?.(!adminMarkerAddingEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${adminMarkerAddingEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${adminMarkerAddingEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-none">Hesap Oluşturmayı Kapat/Aç</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                Yeni kullanıcı kayıtlarını yönetin
              </p>
            </div>
            <button 
              onClick={() => onToggleRegistration?.(!registrationEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${registrationEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${registrationEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 ml-1">
              <ShieldAlert size={20} className="text-orange-600" />
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Yönetici Yönetimi</h3>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchAdmins}
                className="text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors"
              >
                Yenile
              </button>
              <button 
                onClick={() => setShowAdminForm(!showAdminForm)}
                className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
              >
                {showAdminForm ? 'İptal' : 'Yönetici Ekle'}
              </button>
            </div>
          </div>

          {showAdminForm && (
            <form onSubmit={handleAddAdmin} className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <input 
                type="text"
                placeholder="Yönetici Adı Soyadı"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-orange-200 focus:border-orange-500 outline-none font-bold"
                required
              />
              <input 
                type="text"
                placeholder="Yönetici Kullanıcı Adı"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-orange-200 focus:border-orange-500 outline-none font-bold"
                required
              />
              <input 
                type="text"
                placeholder="Giriş Şifresi (Key)"
                value={newAdminKey}
                onChange={(e) => setNewAdminKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-orange-200 focus:border-orange-500 outline-none font-bold"
                required
              />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={newAdminIsSuper}
                  onChange={(e) => setNewAdminIsSuper(e.target.checked)}
                  className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                />
                Süper Admin Yap
              </label>
              <button 
                type="submit"
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-200"
              >
                Kaydet
              </button>
            </form>
          )}

          <div className="space-y-3">
            {loadingAdmins ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Yükleniyor...</p>
              </div>
            ) : admins.length > 0 ? (
              admins.map((admin) => (
                <div key={admin.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      <UserCircle size={20} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 leading-none">{admin.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                        Kullanıcı Adı: {admin.username} • Şifre: {admin.password} {admin.isSuperAdmin && '• SÜPER ADMIN'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-sm text-slate-400 font-medium">Yönetici bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isAnonymous && !isAdmin && (
        <div className="space-y-4 pt-8 border-t border-slate-100">
           <div className="flex items-center gap-2 mb-2 ml-1">
            <Trash2 size={18} className="text-red-500" />
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Hesap İşlemleri</h3>
          </div>
          
          <button
            onClick={() => onDeleteAccount(userName)}
            className="w-full flex items-center justify-between p-5 rounded-3xl border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 transition-all font-bold"
          >
            <span>Hesabımı Sil</span>
            <Trash2 size={20} />
          </button>
        </div>
      )}

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText="İptal"
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        type={modalConfig.type}
      />
    </div>
  );
};

export default Settings;
