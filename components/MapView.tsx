
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FoodMarker, LanguageCode } from '../types';
import Logo from './Logo';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS, it, fr, de, es, pt, ru, ja, arSA } from 'date-fns/locale';
import { User, Clock, Navigation2, MapPin, AlertCircle, ArrowRight, Trash2, Search, X, Loader2 } from 'lucide-react';
import { translations } from '../constants/translations';
import ConfirmModal from './ConfirmModal';

interface MapViewProps {
  markers: FoodMarker[];
  userLocation: [number, number] | null;
  locationAccuracy: number;
  onAddMarker: (lat: number, lng: number, type: 'cat' | 'dog' | 'both') => void;
  onBack: () => void;
  currentLang: LanguageCode;
  isVisible?: boolean;
  isAdmin?: boolean;
  onDeleteMarker?: (id: string) => void;
  currentUserName?: string;
  locationAccuracyLevel: 'high' | 'medium' | 'low' | 'none';
  showAlert: (title: string, message: string, type?: 'danger' | 'warning' | 'info' | 'success', onConfirm?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
  onRequestLocation: () => void;
}

const locales: Record<LanguageCode, any> = {
  tr, en: enUS, it, fr, de, es, pt, ru, jp: ja, ar: arSA
};

// GOOGLE MAPS TILES - Fastest & Most Reliable
// lyrs=m (Streets), s (Satellite), y (Hybrid), p (Terrain)
const TILE_URL = "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
const SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];

const CAT_PNG = "https://cdn-icons-png.flaticon.com/512/1864/1864514.png";
const DOG_PNG = "https://cdn-icons-png.flaticon.com/512/1998/1998627.png";

const MapView: React.FC<MapViewProps> = ({ markers, userLocation, locationAccuracy, onAddMarker, onBack, currentLang, isVisible, isAdmin, onDeleteMarker, currentUserName, locationAccuracyLevel, showAlert, showConfirm, onRequestLocation }) => {
  const mapRef = useRef<L.Map>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [initialCenterDone, setInitialCenterDone] = useState(false);
  const [activeType, setActiveType] = useState<'cat' | 'dog'>('cat');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchMarker, setSearchMarker] = useState<[number, number] | null>(null);
  const searchTimeoutRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [forceOpen, setForceOpen] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    markerId: string | null;
  }>({
    isOpen: false,
    markerId: null
  });

  const defaultPosition: [number, number] = [41.0082, 28.9784];
  const t = translations[currentLang];
  const locale = locales[currentLang] || tr;

  const accuracyLabels = {
    high: { text: 'Yüksek Hassasiyet', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    medium: { text: 'Orta Hassasiyet', color: 'text-orange-500', bg: 'bg-orange-50' },
    low: { text: 'Düşük Hassasiyet', color: 'text-red-500', bg: 'bg-red-50' },
    none: { text: 'Konum Bekleniyor', color: 'text-slate-400', bg: 'bg-slate-50' }
  };

  // Ultimate fix for "Map not loading" / "Grey Box" issues
  useEffect(() => {
    if (!mapRef.current || !isVisible) return;
    
    const map = mapRef.current;
    
    const handleResize = () => {
       map.invalidateSize({ animate: false });
    };

    // 1. Force resize immediately
    handleResize();

    // 2. Use ResizeObserver to catch any container changes
    const resizeObserver = new ResizeObserver(() => {
       handleResize();
    });
    
    const container = map.getContainer();
    if (container) {
      resizeObserver.observe(container);
    }

    // 3. Failsafe timers (Kickstart) - Aggressive intervals
    const timers = [100, 300, 500, 1000, 2000].map(ms => 
      setTimeout(handleResize, ms)
    );

    // 4. Force resize on touch start (mobile fix)
    const onTouch = () => handleResize();
    container.addEventListener('touchstart', onTouch, { passive: true });

    return () => {
      resizeObserver.disconnect();
      timers.forEach(clearTimeout);
      container.removeEventListener('touchstart', onTouch);
    };
  }, [isVisible, forceOpen]);

  useEffect(() => {
    if (userLocation) return;
    const btnTimer = setTimeout(() => setShowSkipButton(true), 3000);
    const autoOpenTimer = setTimeout(() => setForceOpen(true), 7000);
    return () => {
      clearTimeout(btnTimer);
      clearTimeout(autoOpenTimer);
    };
  }, [userLocation]);

  const markerIcons = useMemo(() => {
    const states = { 
      fresh: '#10b981', // Green
      warning: '#f97316', // Orange
      stale: '#ef4444', // Red
      expired: '#64748b' // Gray/Slate for very old
    };
    const icons: any = {};
    ['cat', 'dog', 'both'].forEach(type => {
      Object.entries(states).forEach(([status, color]) => {
        let contentHtml = '';
        if (type === 'cat') {
          contentHtml = `<img src="${CAT_PNG}" class="w-8 h-8 object-contain drop-shadow-sm filter-enhanced" />`;
        } else if (type === 'dog') {
          contentHtml = `<img src="${DOG_PNG}" class="w-8 h-8 object-contain drop-shadow-sm filter-enhanced" />`;
        } else {
          contentHtml = `
            <div class="flex items-center justify-center -space-x-1">
               <img src="${CAT_PNG}" class="w-5 h-5 object-contain drop-shadow-sm" />
               <img src="${DOG_PNG}" class="w-5 h-5 object-contain drop-shadow-sm" />
            </div>
          `;
        }
        
        icons[`${status}-${type}`] = L.divIcon({
          html: `
            <div class="marker-container">
              <div class="marker-rings">
                <div class="ring ring-1" style="border-color: ${color};"></div>
                <div class="ring ring-2" style="border-color: ${color};"></div>
                <div class="ring ring-3" style="border-color: ${color};"></div>
              </div>
              <div class="marker-halo" style="background-color: ${color}; box-shadow: 0 0 30px ${color};"></div>
              <div class="marker-box" style="border: 2px solid ${color};">
                ${contentHtml}
              </div>
            </div>`,
          className: 'custom-marker', 
          iconSize: [64, 64], 
          iconAnchor: [32, 32], 
          popupAnchor: [0, -32],
        });
      });
    });
    return icons;
  }, [t]);

  const [currentZoom, setCurrentZoom] = useState(17);
  const MIN_ZOOM_LEVEL = 15;

  const MapEvents = () => {
    useMapEvents({
      dblclick(e) {
        onAddMarker(e.latlng.lat, e.latlng.lng, activeType);
      },
      dragstart() {
        setIsFollowing(false);
      },
      zoomend(e) {
        setCurrentZoom(e.target.getZoom());
      }
    });
    return null;
  };

  const handleLocate = useCallback(() => {
    if (userLocation && mapRef.current) {
      setIsFollowing(true);
      mapRef.current.flyTo(userLocation, 18, {
        animate: true,
        duration: 1.5 // Smooth zoom effect duration in seconds
      });
    }
  }, [userLocation]);

  const performSearch = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 500);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const selectLocation = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (mapRef.current) {
      setIsFollowing(false);
      mapRef.current.flyTo([lat, lon], 17, {
        animate: true,
        duration: 1.5
      });
    }
    
    setSearchMarker([lat, lon]);
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (userLocation && mapRef.current) {
      if (!initialCenterDone) {
        mapRef.current.setView(userLocation, 17, { animate: false });
        setInitialCenterDone(true);
        setIsFollowing(true);
      } else if (isFollowing) {
        mapRef.current.panTo(userLocation, { animate: true, duration: 0.3 });
      }
    }
  }, [userLocation, isFollowing, initialCenterDone]);

  if (!userLocation && !initialCenterDone && !forceOpen) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-slate-50 gap-6 p-6">
        <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl animate-pulse p-4">
          <Logo size="100%" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-black text-slate-800 tracking-tight text-lg">{t.locSearching}</p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.locDesc || "GPS Sinyali Bekleniyor..."}</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-[200px]">
          <button 
            onClick={onRequestLocation}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white shadow-xl shadow-blue-200 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all active:scale-95"
          >
            <Navigation2 size={18} fill="currentColor" />
            {t.retryLocation || "Konumu Yenile"}
          </button>
          
          <div className={`transition-all duration-500 ${showSkipButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <button onClick={() => setForceOpen(true)} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 shadow-lg rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
              {t.openMapAnyway || "Haritayı Yine de Aç"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#f1f5f9]">
      <style>{`
        .custom-marker { background: none !important; border: none !important; box-shadow: none !important; contain: content; overflow: visible !important; }
        .marker-container { position: relative; display: flex; align-items: center; justify-content: center; will-change: transform; transform: translate3d(0,0,0); }
        
        @keyframes marker-pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0.4; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }

        @keyframes ring-expand {
          0% { transform: scale(0.5); opacity: 0.8; border-width: 4px; }
          100% { transform: scale(2.5); opacity: 0; border-width: 1px; }
        }

        .marker-rings {
          position: absolute;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 0;
        }

        .ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid transparent;
          animation: ring-expand 3s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        }

        .ring-1 { animation-delay: 0s; }
        .ring-2 { animation-delay: 1s; }
        .ring-3 { animation-delay: 2s; }

        .marker-halo { 
          position: absolute; 
          width: 48px; 
          height: 48px; 
          border-radius: 50%; 
          z-index: 1;
          filter: blur(8px);
          animation: marker-pulse 2s infinite ease-in-out;
        }

        .marker-box { 
          position: relative; 
          width: 48px; 
          height: 48px; 
          border-radius: 50%; 
          background-color: white; 
          box-shadow: 0 8px 20px rgba(0,0,0,0.12); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
          z-index: 2; 
        }
        
        .filter-enhanced { filter: contrast(1.1) saturate(1.1); }

        .leaflet-popup-content-wrapper { border-radius: 2.5rem; padding: 0; box-shadow: 0 30px 60px -15px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.8); overflow: hidden; }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }

        /* Smoother fade in for tiles */
        .leaflet-tile {
          will-change: opacity;
          transition: opacity 0.2s ease-out;
        }
        
        /* Background color to mask loading tiles */
        .leaflet-container {
          background: #f1f5f9;
        }
      `}</style>

      <div className="absolute bottom-36 pb-[env(safe-area-inset-bottom)] left-0 right-0 z-[1000] px-6 flex items-center justify-center gap-4 pointer-events-none">
         <button 
           onClick={() => setActiveType('cat')} 
           className={`pointer-events-auto flex-1 p-4 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 border-b-4 ${activeType === 'cat' ? 'bg-orange-600 border-orange-800 text-white scale-105 shadow-orange-500/50' : 'bg-white border-slate-200 text-slate-400 opacity-90 hover:opacity-100 hover:bg-slate-50'}`}
         >
             <div className="w-8 h-8 transition-transform">
                <img src={CAT_PNG} className="w-full h-full object-contain" alt="Cat" />
             </div>
             <span className={`font-black uppercase tracking-wider text-sm ${activeType === 'cat' ? 'text-white' : 'text-slate-500'}`}>{t.catFood}</span>
         </button>
         <button 
           onClick={() => setActiveType('dog')} 
           className={`pointer-events-auto flex-1 p-4 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 border-b-4 ${activeType === 'dog' ? 'bg-blue-600 border-blue-800 text-white scale-105 shadow-blue-500/50' : 'bg-white border-slate-200 text-slate-400 opacity-90 hover:opacity-100 hover:bg-slate-50'}`}
         >
             <div className="w-8 h-8 transition-transform">
                <img src={DOG_PNG} className="w-full h-full object-contain" alt="Dog" />
             </div>
             <span className={`font-black uppercase tracking-wider text-sm ${activeType === 'dog' ? 'text-white' : 'text-slate-500'}`}>{t.dogFood}</span>
         </button>
      </div>

      {!userLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-2">
          <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce-slow">
            <AlertCircle size={16} />
            <span className="text-xs font-bold">{t.locNotActive || "Konum etkin değil"}</span>
          </div>
          <button 
            onClick={onRequestLocation}
            className="bg-white/90 backdrop-blur-md text-blue-600 px-4 py-2 rounded-full shadow-lg text-[10px] font-black uppercase tracking-wider border border-blue-100 active:scale-95"
          >
            {t.retryLocation || "Konumu Yenile"}
          </button>
        </div>
      )}

      <div className="absolute top-20 right-6 z-[2000] flex flex-col gap-4">
        {userLocation && (
          <>
            <button onClick={handleLocate} className={`p-5 rounded-[2.2rem] shadow-2xl border-2 transition-all active:scale-90 ${isFollowing ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
              <Navigation2 size={30} fill={isFollowing ? "currentColor" : "none"} />
            </button>
            <div className={`p-3 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center gap-1 transition-all ${accuracyLabels[locationAccuracyLevel].bg}`}>
               <div className={`w-2 h-2 rounded-full animate-pulse ${locationAccuracyLevel === 'high' ? 'bg-emerald-500' : locationAccuracyLevel === 'medium' ? 'bg-orange-500' : 'bg-red-500'}`} />
               <span className={`text-[8px] font-black uppercase tracking-tighter text-center leading-tight ${accuracyLabels[locationAccuracyLevel].color}`}>
                 {accuracyLabels[locationAccuracyLevel].text}
               </span>
               <button 
                 onClick={onRequestLocation}
                 className="mt-1 p-1.5 bg-white rounded-lg shadow-sm text-blue-600 hover:bg-blue-50 transition-colors"
                 title="Konumu İyileştir"
               >
                 <Navigation2 size={12} className="rotate-45" />
               </button>
            </div>
          </>
        )}
      </div>

      {/* Search Bar */}
      <div className="absolute top-6 left-6 right-6 z-[3000]" ref={searchContainerRef}>
        <div className="relative group">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-[2rem] -m-1 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-white/95 backdrop-blur-md border border-slate-200 rounded-[2rem] shadow-2xl flex items-center px-6 py-4 gap-4 transition-all duration-300 group-focus-within:ring-4 group-focus-within:ring-blue-500/10">
            <div className="text-slate-400">
              {isSearching ? <Loader2 size={24} className="animate-spin text-blue-500" /> : <Search size={24} />}
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 3 && setShowResults(true)}
              placeholder={t.searchPlaceholder || "Konum Ara..."}
              className="flex-1 bg-transparent border-none outline-none text-slate-800 font-bold placeholder:text-slate-400 text-lg"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowResults(false);
                  setSearchMarker(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300 max-h-[60vh] overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button 
                  key={idx}
                  onClick={() => selectLocation(result)}
                  className="w-full flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-none"
                >
                  <div className="mt-1 p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <MapPin size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate">{result.display_name.split(',')[0]}</p>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-0.5">{result.display_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {showResults && searchQuery.length >= 3 && !isSearching && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-[2.5rem] shadow-2xl p-8 text-center animate-in slide-in-from-top-4 duration-300">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Search size={32} />
              </div>
              <p className="font-black text-slate-800">{t.noResults || "Sonuç bulunamadı"}</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Tekrar deneyin</p>
            </div>
          )}
        </div>
      </div>

      <MapContainer 
        center={userLocation || defaultPosition} 
        zoom={17} 
        doubleClickZoom={false} 
        className="w-full h-full" 
        style={{ height: '100%', width: '100%', position: 'absolute' }}
        ref={mapRef} 
        zoomControl={false} 
        preferCanvas={true} 
        attributionControl={false}
        worldCopyJump={true}
      >
        <MapEvents />
        <TileLayer 
          url={TILE_URL}
          subdomains={SUBDOMAINS}
          detectRetina={false} 
          updateWhenIdle={false} 
          keepBuffer={3} 
          maxNativeZoom={21}
          maxZoom={22}
          minZoom={2}
          noWrap={false}
          crossOrigin="anonymous" 
        />

        {userLocation && (
          <>
            {/* Outer glow/accuracy ring - Fixed size in pixels to prevent screen covering on zoom */}
            <CircleMarker 
              center={userLocation} 
              radius={24} 
              pathOptions={{ 
                fillColor: '#3b82f6', 
                fillOpacity: 0.2, 
                color: '#3b82f6', 
                weight: 0 
              }} 
            />
            {/* Inner precise location dot */}
            <CircleMarker 
              center={userLocation} 
              radius={8} 
              pathOptions={{ 
                fillColor: '#3b82f6', 
                fillOpacity: 1, 
                color: 'white', 
                weight: 3 
              }}
            >
              <Popup className="font-bold text-blue-600">{t.youAreHere}</Popup>
            </CircleMarker>
          </>
        )}

        {searchMarker && (
          <Marker 
            position={searchMarker} 
            icon={L.divIcon({
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="absolute w-12 h-12 bg-red-500/20 rounded-full animate-ping"></div>
                  <div class="relative bg-red-600 text-white p-2 rounded-full shadow-2xl border-2 border-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                </div>
              `,
              className: '',
              iconSize: [48, 48],
              iconAnchor: [24, 24]
            })}
          >
            <Popup>
              <div className="p-2 text-center">
                <p className="font-black text-slate-800 text-sm mb-2">{searchQuery.split(',')[0]}</p>
                <button 
                  onClick={() => setSearchMarker(null)}
                  className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {currentZoom < MIN_ZOOM_LEVEL && !isAdmin ? (
           <div className="leaflet-top leaflet-left mt-20 ml-4 pointer-events-none z-[1000]">
             <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in zoom-in duration-300">
               <AlertCircle size={18} className="text-orange-500" />
               <span className="text-xs font-bold">Mamaları görmek için yaklaşın</span>
             </div>
           </div>
        ) : (
          markers.map((marker) => {
            const hoursElapsed = (Date.now() - marker.timestamp) / (1000 * 60 * 60);
            let status: 'fresh' | 'warning' | 'stale' | 'expired' = 'fresh';
            
            if (hoursElapsed < 6) status = 'fresh';
            else if (hoursElapsed < 12) status = 'warning';
            else if (hoursElapsed < 24) status = 'stale';
            else status = 'expired';

            const timeLabel = formatDistanceToNow(marker.timestamp, { addSuffix: true, locale } as any);
            const typeLabel = marker.type === 'cat' ? t.catFood : marker.type === 'dog' ? t.dogFood : t.bothFood;
            const iconKey = `${status}-${marker.type || 'cat'}`;
            
            const statusColors = {
              fresh: 'bg-emerald-500 shadow-[0_0_10px_#10b981]',
              warning: 'bg-orange-500 shadow-[0_0_10px_#f97316]',
              stale: 'bg-red-500 shadow-[0_0_10px_#ef4444]',
              expired: 'bg-slate-500 shadow-[0_0_10px_#64748b]'
            };

            return (
              <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={markerIcons[iconKey]}>
                <Popup>
                  <div className="p-6 min-w-[240px]">
                    <div className="flex items-center gap-5 mb-5 border-b pb-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
                        <User size={28} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.addedBy}</p>
                        <p className="text-lg font-black text-slate-800 leading-none">{(!marker.addedBy || marker.addedBy === '@@ANONYMOUS@@') ? t.anonymousUser : marker.addedBy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
                        <Clock size={28} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.time}</p>
                        <p className="text-sm font-bold text-slate-600 leading-none">{timeLabel}</p>
                      </div>
                    </div>
                    <div className="mt-6 pt-5 border-t flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${statusColors[status]}`} />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{typeLabel}</span>
                      </div>
                    </div>
                    {(isAdmin || marker.addedBy === currentUserName) && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                              isOpen: true,
                              markerId: marker.id
                            });
                          }}
                          className="w-full bg-red-500 text-white py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} />
                          {t.deleteMarker}
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}
      </MapContainer>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={t.deleteMarker || "Mamayı Sil"}
        message={t.deleteConfirm || "Bu mama işaretini silmek istediğinize emin misiniz?"}
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={() => {
          if (confirmModal.markerId) {
            onDeleteMarker?.(confirmModal.markerId);
          }
          setConfirmModal({ isOpen: false, markerId: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, markerId: null })}
        type="danger"
      />
    </div>
  );
};

export default MapView;
