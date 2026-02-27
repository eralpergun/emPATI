
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Login from './components/Login';
import MapView from './components/MapView';
import Menu from './components/Menu';
import Settings from './components/Settings';
import BottomNav from './components/BottomNav';
import { User, FoodMarker, LanguageCode, NotificationSetting } from './types';
import { Cat, WifiOff, X } from 'lucide-react';
import { translations } from './constants/translations';
import { db, ref, push, get, remove, query, limitToLast, isConfigured, set, update } from './lib/firebase';

type View = 'login' | 'menu' | 'map' | 'settings';
type LocationStatus = 'searching' | 'precise' | 'approximate' | 'denied' | 'error';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('login');
  const [markers, setMarkers] = useState<FoodMarker[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number>(Infinity);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('searching');
  const [useHighAccuracy, setUseHighAccuracy] = useState(true);
  const [language, setLanguage] = useState<LanguageCode>('tr');
  const [notificationSetting, setNotificationSetting] = useState<NotificationSetting>(() => {
    return (localStorage.getItem('empati_notif_setting') as NotificationSetting) || 'mine';
  });
  const [notifications, setNotifications] = useState<{id: string, type: string}[]>([]);
  const notifiedMarkersRef = useRef<Set<string>>(new Set());

  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);
  const [suggestedLang, setSuggestedLang] = useState<LanguageCode | null>(null);
  const languageCheckDoneRef = useRef(false);

  const t = translations[language];
  const lastUpdateRef = useRef<number>(0);

  const resolveName = (name: string) => {
    if (!name) return t.anonymousUser;
    return name === '@@ANONYMOUS@@' ? t.anonymousUser : name;
  };

  const countryToLang: Record<string, LanguageCode> = {
    tr: 'tr',
    us: 'en', gb: 'en', uk: 'en',
    it: 'it',
    fr: 'fr',
    de: 'de',
    es: 'es',
    pt: 'pt', br: 'pt',
    ru: 'ru',
    jp: 'jp',
    sa: 'ar', ae: 'ar', eg: 'ar', qa: 'ar'
  };

  const checkLocationLanguage = async (lat: number, lon: number) => {
    if (languageCheckDoneRef.current) return;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      // Simple reverse geocoding to get country code
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: {
          'User-Agent': 'EmpatiApp/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.address?.country_code?.toLowerCase();
        
        if (countryCode && countryToLang[countryCode]) {
          const detectedLang = countryToLang[countryCode];
          // If detected language is different from current language and hasn't been dismissed before
          if (detectedLang !== language) {
             const dismissed = localStorage.getItem(`empati_lang_dismiss_${detectedLang}`);
             if (!dismissed) {
               setSuggestedLang(detectedLang);
               setShowLanguagePrompt(true);
             }
          }
        }
      }
    } catch (error: any) {
      // Silently fail for non-critical language detection
      if (error.name !== 'AbortError') {
        console.warn("Language detection skipped due to network or service constraints.");
      }
    } finally {
      languageCheckDoneRef.current = true;
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (userLocation && !languageCheckDoneRef.current) {
      checkLocationLanguage(userLocation[0], userLocation[1]);
    }
  }, [userLocation]);

  const handleAcceptLanguage = () => {
    if (suggestedLang) {
      handleLanguageChange(suggestedLang);
      setShowLanguagePrompt(false);
    }
  };

  const handleDeclineLanguage = () => {
    if (suggestedLang) {
      localStorage.setItem(`empati_lang_dismiss_${suggestedLang}`, 'true');
      setShowLanguagePrompt(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: useHighAccuracy,
      timeout: 20000, 
      maximumAge: 10000 
    };

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      
      // Ignore extremely poor accuracy (over 10km for PCs)
      if (accuracy > 10000) return;

      setUserLocation(prevLoc => {
        if (!prevLoc) {
          setLocationAccuracy(accuracy);
          setLocationStatus(accuracy < 100 ? 'precise' : 'approximate');
          return [latitude, longitude];
        }

        const dist = calculateDistance(latitude, longitude, prevLoc[0], prevLoc[1]);
        const now = Date.now();
        
        // Update if:
        // 1. Accuracy is significantly better
        // 2. User moved more than 5 meters
        // 3. It's been more than 5 seconds since last update
        if (accuracy < locationAccuracy * 0.8 || dist > 5 || (now - lastUpdateRef.current > 5000)) {
          setLocationAccuracy(accuracy);
          setLocationStatus(accuracy < 100 ? 'precise' : 'approximate');
          lastUpdateRef.current = now;
          return [latitude, longitude];
        }

        return prevLoc;
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      // Only log if it's not a timeout (to reduce noise) or if it's a permanent error
      if (err.code !== err.TIMEOUT) {
        console.warn("Geolocation error:", err.message);
      }

      if (err.code === err.PERMISSION_DENIED) {
        setLocationStatus('denied');
      } else if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        // If high accuracy fails, switch to low accuracy
        if (useHighAccuracy) {
          console.log("Switching to low accuracy location mode...");
          setUseHighAccuracy(false);
        } else {
          setLocationStatus('error');
        }
      }
    };

    // Continuous watching
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [useHighAccuracy]); // Re-run when accuracy mode changes

  useEffect(() => {
    const savedUser = localStorage.getItem('empati_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('menu');
    }
    const savedLang = localStorage.getItem('empati_lang') as LanguageCode;
    if (savedLang && translations[savedLang]) setLanguage(savedLang);
  }, []);

  useEffect(() => {
    if (!isConfigured || !db) return;

    const fetchMarkers = async () => {
      try {
        const markersRef = ref(db, 'markers');
        // Fetch last 100 markers to prevent loading too much data
        const q = query(markersRef, limitToLast(100));
        const snapshot = await get(q);
        
        const loadedMarkers: FoodMarker[] = [];
        const now = Date.now();
        
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val() as FoodMarker;
            // Filter by 24h window
            if (now - data.timestamp < 24 * 60 * 60 * 1000) {
              loadedMarkers.push({ ...data, id: childSnapshot.key as string });
            }
          });
        }
        setMarkers(loadedMarkers);
      } catch (error) {
        console.error("Realtime Database fetch error:", error);
      }
    };

    // Initial fetch
    fetchMarkers();

    // Poll every 15 seconds as requested to reduce server load
    const intervalId = setInterval(fetchMarkers, 15000);

    return () => clearInterval(intervalId);
  }, []);

  // Check for expired markers based on user settings
  useEffect(() => {
    if (!user || user.name === '@@ANONYMOUS@@' || notificationSetting === 'none') return;

    const now = Date.now();
    
    markers.forEach(marker => {
      const hoursElapsed = (now - marker.timestamp) / (1000 * 60 * 60);
      
      if (hoursElapsed >= 24 && !notifiedMarkersRef.current.has(marker.id)) {
        let shouldNotify = false;

        if (notificationSetting === 'all') {
          shouldNotify = true;
        } else if (notificationSetting === 'mine') {
          shouldNotify = marker.addedBy === user.name;
        } else if (notificationSetting === '5km' && userLocation) {
          const dist = calculateDistance(userLocation[0], userLocation[1], marker.lat, marker.lng);
          if (dist <= 5000) shouldNotify = true;
        } else if (notificationSetting === '1km' && userLocation) {
          const dist = calculateDistance(userLocation[0], userLocation[1], marker.lat, marker.lng);
          if (dist <= 1000) shouldNotify = true;
        }

        if (shouldNotify) {
          const typeLabel = marker.type === 'cat' ? t.catFood : marker.type === 'dog' ? t.dogFood : t.bothFood;
          setNotifications(prev => [...prev, { 
            id: marker.id, 
            type: typeLabel 
          }]);
          notifiedMarkersRef.current.add(marker.id);
        }
      }
    });
  }, [markers, user, t, notificationSetting, userLocation]);

  const stats = useMemo(() => {
    const now = Date.now();
    const nearbyMarkers = userLocation 
      ? markers.filter(m => calculateDistance(userLocation[0], userLocation[1], m.lat, m.lng) <= 10000)
      : markers;
    const fresh = nearbyMarkers.filter(m => (now - m.timestamp) / (1000 * 60 * 60) < 6);
    const lastAdded = markers.length > 0 
      ? [...markers].sort((a, b) => b.timestamp - a.timestamp)[0] 
      : null;

    return {
      nearbyCount: nearbyMarkers.length,
      freshCount: fresh.length,
      staleCount: nearbyMarkers.length - fresh.length,
      lastAdded: lastAdded ? { ...lastAdded, addedBy: resolveName(lastAdded.addedBy) } : null,
      isLocationEnabled: locationStatus !== 'denied' && locationStatus !== 'error',
      locationStatus
    };
  }, [markers, userLocation, language, locationStatus]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('empati_user', JSON.stringify(newUser));
    setView('menu');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    localStorage.removeItem('empati_user');
  };

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem('empati_lang', lang);
  };

  const handleNotificationSettingChange = (setting: NotificationSetting) => {
    setNotificationSetting(setting);
    localStorage.setItem('empati_notif_setting', setting);
  };

  const addMarker = async (lat: number, lng: number, type: 'cat' | 'dog' | 'both') => {
    if (!user) return;
    
    const newMarker: Omit<FoodMarker, 'id'> = {
      lat,
      lng,
      addedBy: user.name,
      timestamp: Date.now(),
      type: type 
    };

    // Optimistically update local state immediately
    const tempId = Math.random().toString();
    setMarkers(prev => [...prev, { ...newMarker, id: tempId }]);

    if (isConfigured && db) {
      try {
        const markersRef = ref(db, 'markers');
        await push(markersRef, newMarker);
        
        // Update user's last activity if not anonymous
        if (user.name !== '@@ANONYMOUS@@' && !user.isAdmin) {
          const safeUsername = user.name.trim().replace(/[.#$\[\]\/]/g, '_');
          const lastActivityRef = ref(db, `users/${safeUsername}/lastActivity`);
          // We use set here to update just the timestamp
          // Note: This assumes the user exists. If they don't (e.g. old session), it might create a partial record or fail silently depending on rules.
          // Since we created the user on login, it should be fine.
          set(lastActivityRef, Date.now()).catch(err => console.error("Activity update error", err));
        }

        // No need to fetch immediately, the interval will catch it eventually for others
        // and we already have it locally.
      } catch (e) {
        console.error("Marker addition error: ", e);
        alert("Mama eklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.");
        // Rollback on error if needed, but for now we keep it simple
        setMarkers(prev => prev.filter(m => m.id !== tempId));
      }
    }
  };

  const handleDeleteAllMarkers = async () => {
    if (!isConfigured || !db || !user?.isAdmin) return;

    try {
      const markersRef = ref(db, 'markers');
      await remove(markersRef);
      setMarkers([]);
      alert("Tüm mamalar başarıyla silindi.");
    } catch (error) {
      console.error("Error deleting markers:", error);
      alert("Mamalar silinirken bir hata oluştu.");
    }
  };

  const handleDeleteMarker = async (id: string) => {
    if (!isConfigured || !db || !user) return;

    const markerToDelete = markers.find(m => m.id === id);
    if (!markerToDelete) return;

    // Allow if admin OR if the user is the owner
    if (!user.isAdmin && markerToDelete.addedBy !== user.name) {
      alert("Bu mamayı silme yetkiniz yok.");
      return;
    }

    try {
      const markerRef = ref(db, `markers/${id}`);
      await remove(markerRef);
      setMarkers(prev => prev.filter(m => m.id !== id));
      alert("Mama başarıyla silindi.");
    } catch (error) {
      console.error("Error deleting marker:", error);
      alert("Mama silinirken bir hata oluştu.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !db) return;
    
    try {
      const safeUsername = user.name.trim().replace(/[.#$\[\]\/]/g, '_');
      
      // Fetch all markers to anonymize (not just the last 100 in state)
      const markersRef = ref(db, 'markers');
      const snapshot = await get(markersRef);
      const updates: Record<string, any> = {};
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const markerData = child.val();
          if (markerData.addedBy === user.name) {
            updates[`markers/${child.key}/addedBy`] = '@@ANONYMOUS@@';
          }
        });
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }

      await remove(ref(db, `users/${safeUsername}`));
      handleLogout();
      alert("Hesabınız başarıyla silindi. Eklediğiniz mamalar anonim olarak korunacaktır.");
    } catch (error) {
      console.error("Account deletion error:", error);
      alert("Hesap silinirken bir hata oluştu.");
    }
  };

  if (!user || view === 'login') return <Login onLogin={handleLogin} currentLang={language} />;

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden bg-slate-50">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-4 px-6 flex justify-between items-center z-[3000] shadow-sm">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setView('menu')}>
          <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-500/20">
            <Cat size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">emPATİ</h1>
        </div>
        <div className="flex items-center gap-4">
          {!isConfigured && (
            <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <WifiOff size={12} /> Offline
            </div>
          )}
          <button onClick={handleLogout} className="text-xs font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">{t.logout}</button>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        <div className={`absolute inset-0 z-20 bg-slate-50 transition-all duration-300 ${view === 'menu' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <Menu 
            stats={stats} 
            markers={markers}
            onOpenMap={() => setView('map')} 
            onOpenSettings={() => setView('settings')} 
            userName={resolveName(user.name)} 
            currentLang={language} 
            isAdmin={user.isAdmin}
            onDeleteAll={handleDeleteAllMarkers}
          />
        </div>
        <div className={`absolute inset-0 z-30 bg-slate-50 transition-opacity duration-300 ${view === 'settings' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <Settings 
            currentLang={language} 
            onLanguageChange={handleLanguageChange} 
            notificationSetting={notificationSetting}
            onNotificationSettingChange={handleNotificationSettingChange}
            onBack={() => setView('menu')} 
            onDeleteAccount={handleDeleteAccount}
            isAnonymous={user.name === '@@ANONYMOUS@@' || !!user.isAdmin}
          />
        </div>
        <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${view === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <MapView 
            markers={markers} 
            userLocation={userLocation}
            locationAccuracy={locationAccuracy}
            onAddMarker={addMarker} 
            onBack={() => setView('menu')}
            currentLang={language}
            isVisible={view === 'map'}
            isAdmin={user.isAdmin}
            onDeleteMarker={handleDeleteMarker}
            currentUserName={user.name}
          />
        </div>
      </main>
      <BottomNav currentView={view as any} onViewChange={(v) => setView(v as View)} currentLang={language} />

      {/* Notifications */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[6000] w-full max-w-sm px-4 space-y-3 pointer-events-none">
        {notifications.map((notif) => (
          <div 
            key={notif.id} 
            className="bg-white/95 backdrop-blur-md border-l-4 border-red-500 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-top-10 fade-in duration-500 pointer-events-auto"
          >
            <div className="bg-red-100 p-2 rounded-xl text-red-600">
              <Cat size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-900">{t.expiredNotification}</h4>
              <p className="text-xs text-slate-500 font-medium">
                {t.expiredNotificationDesc.replace('{type}', notif.type)}
              </p>
            </div>
            <button 
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Language Suggestion Modal */}
      {showLanguagePrompt && suggestedLang && (
        <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black uppercase">{suggestedLang}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">Dil Değiştirilsin mi?</h3>
              <p className="text-slate-500 font-medium text-sm">
                Bulunduğunuz konumun diline ({suggestedLang.toUpperCase()}) geçmek ister misiniz?
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={handleDeclineLanguage}
                  className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Hayır
                </button>
                <button 
                  onClick={handleAcceptLanguage}
                  className="py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Evet, Değiştir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
