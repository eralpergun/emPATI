
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Logo from './components/Logo';
import Login from './components/Login';
import MapView from './components/MapView';
import Menu from './components/Menu';
import Settings from './components/Settings';
import BottomNav from './components/BottomNav';
import { User, FoodMarker, LanguageCode, NotificationSetting } from './types';
import { Cat, WifiOff, X } from 'lucide-react';
import { translations } from './constants/translations';
import { db, ref, push, get, remove, query, limitToLast, isConfigured, set, update, onValue } from './lib/firebase';
import { hashPassword } from './utils/hash';
import ConfirmModal from './components/ConfirmModal';

type View = 'login' | 'menu' | 'map' | 'settings';
type LocationStatus = 'searching' | 'precise' | 'approximate' | 'denied' | 'error';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('login');
  const [markers, setMarkers] = useState<FoodMarker[]>([]);
  const [markerAddingEnabled, setMarkerAddingEnabled] = useState(true);
  const [adminMarkerAddingEnabled, setAdminMarkerAddingEnabled] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem('empati_last_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [locationAccuracy, setLocationAccuracy] = useState<number>(Infinity);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() => {
    const savedStatus = localStorage.getItem('empati_location_status') as LocationStatus;
    return savedStatus || 'searching';
  });
  const [useHighAccuracy, setUseHighAccuracy] = useState(true);
  const [locationErrorCount, setLocationErrorCount] = useState(0);
  const [language, setLanguage] = useState<LanguageCode>('tr');
  const [notificationSetting, setNotificationSetting] = useState<NotificationSetting>(() => {
    return (localStorage.getItem('empati_notif_setting') as NotificationSetting) || 'mine';
  });
  const [notifications, setNotifications] = useState<{id: string, type: string}[]>([]);
  const notifiedMarkersRef = useRef<Set<string>>(new Set());

  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);
  const [suggestedLang, setSuggestedLang] = useState<LanguageCode | null>(null);
  const languageCheckDoneRef = useRef(false);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Tamam',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' = 'info', onConfirm?: () => void) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      confirmText: 'Tamam',
      type,
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'warning') => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      confirmText: 'Evet',
      cancelText: 'Hayır',
      type,
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

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

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    setLocationStatus('searching');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newLoc: [number, number] = [latitude, longitude];
        localStorage.setItem('empati_last_location', JSON.stringify(newLoc));
        localStorage.setItem('empati_location_status', accuracy < 100 ? 'precise' : 'approximate');
        setUserLocation(newLoc);
        setLocationAccuracy(accuracy);
        setLocationStatus(accuracy < 100 ? 'precise' : 'approximate');
      },
      (err) => {
        console.error("Manual location request error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('denied');
          localStorage.setItem('empati_location_status', 'denied');
        } else {
          setLocationStatus('error');
          localStorage.setItem('empati_location_status', 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      timeout: 30000, 
      maximumAge: 5000 
    };

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      
      // Ignore extremely poor accuracy (over 10km for PCs/Mobile)
      if (accuracy > 10000) {
        return;
      }

      const newLoc: [number, number] = [latitude, longitude];
      localStorage.setItem('empati_last_location', JSON.stringify(newLoc));
      localStorage.setItem('empati_location_status', accuracy < 100 ? 'precise' : 'approximate');

      setUserLocation(prevLoc => {
        if (!prevLoc) {
          setLocationAccuracy(accuracy);
          setLocationStatus(accuracy < 100 ? 'precise' : 'approximate');
          return newLoc;
        }

        const dist = calculateDistance(latitude, longitude, prevLoc[0], prevLoc[1]);
        const now = Date.now();
        
        // Update if:
        // 1. Accuracy is significantly better (10% improvement)
        // 2. User moved more than 5 meters
        // 3. It's been more than 5 seconds since last update
        if (accuracy < locationAccuracy * 0.9 || dist > 5 || (now - lastUpdateRef.current > 5000)) {
          setLocationAccuracy(accuracy);
          setLocationStatus(accuracy < 100 ? 'precise' : 'approximate');
          lastUpdateRef.current = now;
          return newLoc;
        }

        return prevLoc;
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      // Only log if it's not a timeout (to reduce noise) or if it's a permanent error
      if (err.code !== err.TIMEOUT) {
        console.warn("Geolocation error:", err.message);
      }

      setLocationErrorCount(prev => prev + 1);

      if (err.code === err.PERMISSION_DENIED) {
        setLocationStatus('denied');
        localStorage.setItem('empati_location_status', 'denied');
      } else if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        // If high accuracy fails, switch to low accuracy
        if (useHighAccuracy) {
          console.log("Switching to low accuracy location mode...");
          setUseHighAccuracy(false);
        } else if (locationStatus === 'searching') {
          setLocationStatus('error');
          localStorage.setItem('empati_location_status', 'error');
        }
      }
    };

    // Continuous watching
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);
    
    // Check permissions and request if needed
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'prompt') {
          requestLocationPermission();
        }
        result.onchange = () => {
          if (result.state === 'granted') {
            requestLocationPermission();
          } else if (result.state === 'denied') {
            setLocationStatus('denied');
            localStorage.setItem('empati_location_status', 'denied');
          }
        };
      });
    } else if (locationStatus === 'denied' || locationStatus === 'error' || locationStatus === 'searching') {
      // Fallback for browsers without Permissions API
      requestLocationPermission();
    }

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

    // Initialize admins
    const initAdmins = async () => {
      if (!db) return;
      
      // Clear legacy ban data as requested
      const bansRef = ref(db, 'bans');
      remove(bansRef).catch(() => {});

      const initializedRef = ref(db, 'adminsInitialized');
      const snapshot = await get(initializedRef);
      if (!snapshot.exists()) {
        const adminsRef = ref(db, 'admins');
        await remove(adminsRef);
        const newAdminRef = ref(db, `admins/eralpergun`);
        const hashedPassword = await hashPassword('eralp');
        await set(newAdminRef, { name: 'Eralp Ergün', username: 'eralpergun', password: hashedPassword, isSuperAdmin: true });
        await set(initializedRef, true);
      }
    };
    initAdmins();
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
    const fresh = nearbyMarkers.filter(m => (now - m.timestamp) / (1000 * 60 * 60) < 4);
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
    setNotifications([]);
    localStorage.removeItem('empati_user');
  };

  // Check for account deletion in real-time
  useEffect(() => {
    if (!isConfigured || !db) return;

    const settingsRef = ref(db, 'settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (typeof data.markerAddingEnabled === 'boolean') {
          setMarkerAddingEnabled(data.markerAddingEnabled);
        }
        if (typeof data.adminMarkerAddingEnabled === 'boolean') {
          setAdminMarkerAddingEnabled(data.adminMarkerAddingEnabled);
        }
        if (typeof data.registrationEnabled === 'boolean') {
          setRegistrationEnabled(data.registrationEnabled);
        }
      }
    });

    return () => unsubscribe();
  }, [isConfigured, db]);

  // Check for account deletion in real-time
  useEffect(() => {
    if (!isConfigured || !db || !user || user.name === '@@ANONYMOUS@@') return;

    const safeUsername = (user.username || user.name).trim().replace(/[.#$\[\]\/]/g, '_');
    const userRef = ref(db, `users/${safeUsername}`);
    const adminRef = ref(db, `admins/${safeUsername}`);
    
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      if (!user.isAdmin && user.username && !snapshot.exists()) {
        showAlert("Bilgi", "Hesabınız silindi.", 'info', handleLogout);
      }
    });

    const unsubscribeAdmin = onValue(adminRef, (snapshot) => {
      if (user.isAdmin && user.username && !snapshot.exists()) {
        showAlert("Bilgi", "Yönetici hesabınız silindi.", 'info', handleLogout);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeAdmin();
    };
  }, [isConfigured, db, user]);

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem('empati_lang', lang);
  };

  const handleNotificationSettingChange = (setting: NotificationSetting) => {
    setNotificationSetting(setting);
    localStorage.setItem('empati_notif_setting', setting);
  };

  const handleToggleMarkerAdding = async (enabled: boolean) => {
    if (!db || !user?.isSuperAdmin) return;
    try {
      await set(ref(db, 'settings/markerAddingEnabled'), enabled);
    } catch (error) {
      console.error("Error toggling marker adding:", error);
    }
  };

  const handleToggleAdminMarkerAdding = async (enabled: boolean) => {
    if (!db || !user?.isSuperAdmin) return;
    try {
      await set(ref(db, 'settings/adminMarkerAddingEnabled'), enabled);
    } catch (error) {
      console.error("Error toggling admin marker adding:", error);
    }
  };

  const handleToggleRegistration = async (enabled: boolean) => {
    if (!db || !user?.isSuperAdmin) return;
    try {
      await set(ref(db, 'settings/registrationEnabled'), enabled);
    } catch (error) {
      console.error("Error toggling registration:", error);
    }
  };

  const markerTimestampsRef = useRef<number[]>([]);

  const addMarker = async (lat: number, lng: number, type: 'cat' | 'dog' | 'both') => {
    if (!user) return;

    const proceedAddMarker = async () => {
      const newMarker: Omit<FoodMarker, 'id'> = {
        lat,
        lng,
        addedBy: user.name,
        isSuperAdmin: !!user.isSuperAdmin,
        timestamp: Date.now(),
        type: type 
      };

      // Optimistically update local state immediately
      const tempId = `temp_${Date.now()}`;
      setMarkers(prev => [...prev, { ...newMarker, id: tempId }]);

      if (isConfigured && db) {
        try {
          // Double check if user still exists before adding marker
          if (user.name !== '@@ANONYMOUS@@' && !user.isAdmin) {
            const safeUsername = user.name.trim().replace(/[.#$\[\]\/]/g, '_');
            const userCheck = await get(ref(db, `users/${safeUsername}`));
            if (!userCheck.exists()) {
              setMarkers(prev => prev.filter(m => m.id !== tempId));
              showAlert("Hata", "Hesabınız silindiği için mama ekleyemezsiniz.", 'danger');
              handleLogout();
              return;
            }
          }

          const markersRef = ref(db, 'markers');
          const newMarkerRef = await push(markersRef, newMarker);
          const actualId = newMarkerRef.key;

          // Update local state with actual ID
          setMarkers(prev => prev.map(m => m.id === tempId ? { ...m, id: actualId || tempId } : m));
          
          // Update user's last activity if not anonymous
          if (user.name !== '@@ANONYMOUS@@' && !user.isAdmin) {
            const safeUsername = user.name.trim().replace(/[.#$\[\]\/]/g, '_');
            const lastActivityRef = ref(db, `users/${safeUsername}/lastActivity`);
            set(lastActivityRef, Date.now()).catch(err => console.error("Activity update error", err));
          }
        } catch (e) {
          console.error("Marker addition error: ", e);
          showAlert("Hata", "Mama eklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.", 'danger');
          setMarkers(prev => prev.filter(m => m.id !== tempId));
        }
      }
    };

    if (!markerAddingEnabled && !user.isAdmin) {
      showAlert("Bilgi", "Mama ekleme geçici bir süre boyunca kapalıdır.", 'info');
      return;
    }

    if (user.isAdmin && !adminMarkerAddingEnabled && !user.isSuperAdmin) {
      showAlert("Bilgi", "Yöneticiler için mama ekleme şu an kapalıdır.", 'info');
      return;
    }
    
    const now = Date.now();
    const recentTimestamps = markerTimestampsRef.current.filter(t => now - t < 10000);
    
    if (recentTimestamps.length >= 5 && !user.isAdmin) {
      showConfirm("Emin misiniz?", "Kısa sürede çok fazla mama eklediniz. Yine de eklemek istiyor musunuz?", () => {
        markerTimestampsRef.current = [...recentTimestamps, Date.now()];
        proceedAddMarker();
      });
      return;
    }

    markerTimestampsRef.current = [...recentTimestamps, Date.now()];
    proceedAddMarker();
  };

  const handleDeleteAllMarkers = async () => {
    if (!isConfigured || !db || !user?.isSuperAdmin) return;

    try {
      const markersRef = ref(db, 'markers');
      await remove(markersRef);
      setMarkers([]);
      showAlert("Başarılı", "Tüm mamalar başarıyla silindi.", 'success');
    } catch (error) {
      console.error("Error deleting markers:", error);
      showAlert("Hata", "Mamalar silinirken bir hata oluştu.", 'danger');
    }
  };

  const handleDeleteMarker = async (id: string) => {
    if (!isConfigured || !db || !user) return;

    const markerToDelete = markers.find(m => m.id === id);
    if (!markerToDelete) return;

    // Allow if super admin
    // OR if normal admin AND marker is not from a super admin
    // OR if the user is the owner
    if (user.isSuperAdmin) {
      // Super admin can delete anything
    } else if (user.isAdmin) {
      if (markerToDelete.isSuperAdmin) {
        showAlert("Hata", "Süper yöneticilerin mamasını silme yetkiniz yok.", 'danger');
        return;
      }
    } else if (markerToDelete.addedBy !== user.name) {
      showAlert("Hata", "Bu mamayı silme yetkiniz yok.", 'danger');
      return;
    }

    try {
      if (!id.startsWith('temp_')) {
        const markerRef = ref(db, `markers/${id}`);
        await remove(markerRef);
      }
      setMarkers(prev => prev.filter(m => m.id !== id));
      showAlert("Başarılı", "Mama başarıyla silindi.", 'success');
    } catch (error) {
      console.error("Error deleting marker:", error);
      showAlert("Hata", "Mama silinirken bir hata oluştu.", 'danger');
    }
  };

  const handleLoginAsUser = (username: string) => {
    setUser({ name: username, isAdmin: false });
    setView('menu');
  };

  const handleDeleteAccount = async (username: string) => {
    if (!db) return;
    
    showConfirm(
      "Hesabı Sil",
      `"${username}" kullanıcısını silmek istediğinize emin misiniz?`,
      async () => {
        try {
          const safeUsername = username.trim().replace(/[.#$\[\]\/]/g, '_');
          
          // Check if it's an admin or user
          const userRef = ref(db, `users/${safeUsername}`);
          const adminRef = ref(db, `admins/${safeUsername}`);
          
          const userSnap = await get(userRef);
          const adminSnap = await get(adminRef);

          if (adminSnap.exists()) {
            const adminData = adminSnap.val();
            if (adminData.isSuperAdmin) {
              showAlert("Hata", "Süper yönetici hesabı silinemez.", 'danger');
              return;
            }
          }

          if (userSnap.exists()) {
            await remove(userRef);
          }
          if (adminSnap.exists()) {
            await remove(adminRef);
          }
          
          if (user?.name === username) {
            showAlert("Bilgi", "Hesabınız silindi.", 'info', handleLogout);
          } else {
            showAlert("Başarılı", "Hesap silindi.", 'success');
          }
        } catch (error) {
          console.error("Account deletion error:", error);
          showAlert("Hata", "Hesap silinirken bir hata oluştu.", 'danger');
        }
      },
      'danger'
    );
  };

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden bg-slate-50">
      {(!user || view === 'login') ? (
        <Login 
          onLogin={handleLogin} 
          currentLang={language} 
          registrationEnabled={registrationEnabled}
        />
      ) : (
        <>
          <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-4 px-6 flex justify-between items-center z-[3000] shadow-sm">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setView('menu')}>
              <Logo size={48} />
              <h1 className="text-xl font-black text-[#654e96] tracking-tight">emPATİ</h1>
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
                userName={resolveName(user?.name || '')} 
                currentLang={language} 
                isAdmin={user?.isAdmin}
                isSuperAdmin={user?.isSuperAdmin}
                onDeleteAll={handleDeleteAllMarkers}
                showAlert={showAlert}
                showConfirm={showConfirm}
                onRequestLocation={requestLocationPermission}
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
                isAnonymous={user?.name === '@@ANONYMOUS@@'}
                isAdmin={!!user?.isAdmin}
                isSuperAdmin={!!user?.isSuperAdmin}
                userName={user?.name || ''}
                onLoginAsUser={handleLoginAsUser}
                markerAddingEnabled={markerAddingEnabled}
                onToggleMarkerAdding={handleToggleMarkerAdding}
                adminMarkerAddingEnabled={adminMarkerAddingEnabled}
                onToggleAdminMarkerAdding={handleToggleAdminMarkerAdding}
                registrationEnabled={registrationEnabled}
                onToggleRegistration={handleToggleRegistration}
                showAlert={showAlert}
                showConfirm={showConfirm}
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
                isAdmin={user?.isAdmin}
                onDeleteMarker={handleDeleteMarker}
                currentUserName={user?.name || ''}
                showAlert={showAlert}
                showConfirm={showConfirm}
                onRequestLocation={requestLocationPermission}
              />
            </div>
          </main>
          <BottomNav currentView={view as any} onViewChange={(v) => setView(v as View)} currentLang={language} />
        </>
      )}

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
        <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-black/20 backdrop-blur-sm">
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
      {/* Global Alert/Confirm Modal */}
      <ConfirmModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        type={alertConfig.type}
      />

      {/* Account Deleted Modal */}
      {/* Removed */}
    </div>
  );
};

export default App;
