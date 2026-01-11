
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Login from './components/Login';
import MapView from './components/MapView';
import Menu from './components/Menu';
import Settings from './components/Settings';
import BottomNav from './components/BottomNav';
import { User, FoodMarker, LanguageCode } from './types';
import { Cat, WifiOff } from 'lucide-react';
import { translations } from './constants/translations';
import { db, collection, addDoc, onSnapshot, query, orderBy, limit, isConfigured } from './lib/firebase';

type View = 'login' | 'menu' | 'map' | 'settings';
type LocationStatus = 'searching' | 'precise' | 'approximate' | 'denied' | 'error';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('login');
  const [markers, setMarkers] = useState<FoodMarker[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number>(0);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('searching');
  const [language, setLanguage] = useState<LanguageCode>('tr');

  const t = translations[language];

  const resolveName = (name: string) => {
    if (!name) return t.anonymousUser;
    return name === '@@ANONYMOUS@@' ? t.anonymousUser : name;
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
      enableHighAccuracy: true,
      timeout: 15000, 
      maximumAge: 0 
    };

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      
      // 1. Aşırı büyük hataları (baz istasyonu verisi gibi 5km+) direkt yoksay
      if (accuracy > 5000) return;

      setUserLocation(prevLoc => {
        // İlk konum ise direkt kabul et
        if (!prevLoc) {
          setLocationAccuracy(accuracy);
          setLocationStatus(accuracy < 40 ? 'precise' : 'approximate');
          return [latitude, longitude];
        }

        const dist = calculateDistance(latitude, longitude, prevLoc[0], prevLoc[1]);

        // YENİ VE DAHA HIZLI MANTIK:
        // 1. Yeni veri çok daha kaliteliyse (daha küçük accuracy) -> Kesin güncelle.
        // 2. Hareket edildiyse (> 10m) -> Kesin güncelle (Eski konumda takılmayı önler).
        // 3. Çok az hareket varsa (< 5m) VE yeni veri eskisinden daha kötü veya aynıysa -> Güncelleme (Jitter/Titreme önleme).
        
        // Bu mantık kullanıcının yürüdüğünü (mesafe > 10m) algıladığı an, sinyal kalitesi biraz düşse bile konumu günceller.
        // Böylece "konum yanlış yerde kaldı" sorunu çözülür.

        if (accuracy <= locationAccuracy || dist > 10) {
          setLocationAccuracy(accuracy);
          setLocationStatus(accuracy < 40 ? 'precise' : 'approximate');
          return [latitude, longitude];
        }

        // Yukarıdaki şartlar sağlanmadıysa (duruyoruz ve sinyal kötü), eski konumu koru (titremeyi engelle)
        return prevLoc;
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn("Konum hatası:", err.message);
      if (err.code === err.PERMISSION_DENIED) setLocationStatus('denied');
      else {
        // Watcher hata verirse tek seferlik deneme yap
        navigator.geolocation.getCurrentPosition(handleSuccess, () => setLocationStatus('error'), {
           enableHighAccuracy: true,
           timeout: 10000,
           maximumAge: 0
        });
      }
    };

    // Watcher başlat
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationAccuracy]); // locationAccuracy değişimi dependency olarak eklendi ki logic güncel kalsın

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

    const q = query(collection(db, "markers"));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (querySnapshot) => {
      const loadedMarkers: FoodMarker[] = [];
      const now = Date.now();
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FoodMarker;
        // Keep only markers from last 24h
        if (now - data.timestamp < 24 * 60 * 60 * 1000) {
           loadedMarkers.push({ ...data, id: doc.id });
        }
      });
      setMarkers(loadedMarkers);
    }, (error) => {
      console.error("Firestore connectivity issue:", error);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const nearbyMarkers = userLocation 
      ? markers.filter(m => calculateDistance(userLocation[0], userLocation[1], m.lat, m.lng) <= 10000)
      : markers;
    const fresh = nearbyMarkers.filter(m => (now - m.timestamp) / (1000 * 60 * 60) < 8);
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

  const addMarker = async (lat: number, lng: number, type: 'cat' | 'dog' | 'both') => {
    if (!user) return;
    
    const newMarker: Omit<FoodMarker, 'id'> = {
      lat,
      lng,
      addedBy: user.name,
      timestamp: Date.now(),
      type: type 
    };

    if (isConfigured && db) {
      try {
        await addDoc(collection(db, "markers"), newMarker);
      } catch (e) {
        console.error("Ekleme hatası: ", e);
      }
    } else {
      setMarkers(prev => [...prev, { ...newMarker, id: Math.random().toString() }]);
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
          <Menu stats={stats} onOpenMap={() => setView('map')} onOpenSettings={() => setView('settings')} userName={resolveName(user.name)} currentLang={language} />
        </div>
        <div className={`absolute inset-0 z-30 bg-slate-50 transition-opacity duration-300 ${view === 'settings' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <Settings currentLang={language} onLanguageChange={handleLanguageChange} onBack={() => setView('menu')} />
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
          />
        </div>
      </main>
      <BottomNav currentView={view as any} onViewChange={(v) => setView(v as View)} currentLang={language} />
    </div>
  );
};

export default App;
