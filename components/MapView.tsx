
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FoodMarker, LanguageCode } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS, it, fr, de, es, pt, ru, ja, arSA } from 'date-fns/locale';
import { User, Clock, Navigation2, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import { translations } from '../constants/translations';

interface MapViewProps {
  markers: FoodMarker[];
  userLocation: [number, number] | null;
  locationAccuracy: number;
  onAddMarker: (lat: number, lng: number, type: 'cat' | 'dog' | 'both') => void;
  onBack: () => void;
  currentLang: LanguageCode;
  isVisible?: boolean;
}

const locales: Record<LanguageCode, any> = {
  tr, en: enUS, it, fr, de, es, pt, ru, jp: ja, ar: arSA
};

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const CAT_PNG = "https://cdn-icons-png.flaticon.com/512/616/616430.png";
const DOG_PNG = "https://cdn-icons-png.flaticon.com/512/616/616554.png";

const MapView: React.FC<MapViewProps> = ({ markers, userLocation, locationAccuracy, onAddMarker, onBack, currentLang, isVisible }) => {
  const mapRef = useRef<L.Map>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [initialCenterDone, setInitialCenterDone] = useState(false);
  const [activeType, setActiveType] = useState<'cat' | 'dog'>('cat');
  
  const [forceOpen, setForceOpen] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);

  const defaultPosition: [number, number] = [41.0082, 28.9784];
  const t = translations[currentLang];
  const locale = locales[currentLang] || tr;

  useEffect(() => {
    if (isVisible && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize({ animate: true });
      }, 400); 
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

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
    const states = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
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
              <div class="marker-halo" style="background-color: ${color}; box-shadow: 0 0 30px ${color};"></div>
              <div class="marker-box">
                ${contentHtml}
              </div>
            </div>`,
          className: 'custom-marker', 
          iconSize: [48, 48], 
          iconAnchor: [24, 24], 
          popupAnchor: [0, -24],
        });
      });
    });
    return icons;
  }, [t]);

  const MapEvents = () => {
    useMapEvents({
      dblclick(e) {
        onAddMarker(e.latlng.lat, e.latlng.lng, activeType);
      },
      dragstart() {
        setIsFollowing(false);
      }
    });
    return null;
  };

  const handleLocate = useCallback(() => {
    if (userLocation && mapRef.current) {
      setIsFollowing(true);
      mapRef.current.setView(userLocation, 18, { animate: true });
    }
  }, [userLocation]);

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
        <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-2xl animate-pulse">
          <MapPin size={40} />
        </div>
        <div className="text-center space-y-2">
          <p className="font-black text-slate-800 tracking-tight text-lg">{t.locSearching}</p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.locDesc || "GPS Sinyali Bekleniyor..."}</p>
        </div>
        <div className={`transition-all duration-500 ${showSkipButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <button onClick={() => setForceOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 shadow-lg rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
            {t.openMapAnyway || "Haritayı Yine de Aç"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#f8fafc]">
      <style>{`
        .custom-marker { background: none !important; border: none !important; box-shadow: none !important; contain: content; overflow: visible !important; }
        .marker-container { position: relative; display: flex; align-items: center; justify-content: center; will-change: transform; transform: translate3d(0,0,0); }
        
        @keyframes marker-pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(2.0); opacity: 0; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }

        .marker-halo { 
          position: absolute; 
          width: 48px; 
          height: 48px; 
          border-radius: 50%; /* Rounded boundary */
          z-index: 1;
          filter: blur(8px);
          animation: marker-pulse 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }

        .marker-box { 
          position: relative; 
          width: 48px; 
          height: 48px; 
          border-radius: 50%; /* Rounded marker box to match effect */
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
      `}</style>

      <div className="absolute bottom-28 left-0 right-0 z-[1000] px-6 flex items-center justify-center gap-4 pointer-events-none">
         <button 
           onClick={() => setActiveType('cat')} 
           className={`pointer-events-auto flex-1 p-4 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 border-b-4 ${activeType === 'cat' ? 'bg-orange-600 border-orange-800 text-white scale-105 shadow-orange-500/50' : 'bg-white border-slate-200 text-slate-400 opacity-90 hover:opacity-100 hover:bg-slate-50'}`}
         >
             <div className="w-8 h-8 transition-transform">
                <img src={CAT_PNG} className={`w-full h-full object-contain ${activeType === 'cat' ? 'brightness-0 invert' : ''}`} alt="Cat" />
             </div>
             <span className={`font-black uppercase tracking-wider text-sm ${activeType === 'cat' ? 'text-white' : 'text-slate-500'}`}>{t.catFood}</span>
         </button>
         <button 
           onClick={() => setActiveType('dog')} 
           className={`pointer-events-auto flex-1 p-4 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 border-b-4 ${activeType === 'dog' ? 'bg-blue-600 border-blue-800 text-white scale-105 shadow-blue-500/50' : 'bg-white border-slate-200 text-slate-400 opacity-90 hover:opacity-100 hover:bg-slate-50'}`}
         >
             <div className="w-8 h-8 transition-transform">
                <img src={DOG_PNG} className={`w-full h-full object-contain ${activeType === 'dog' ? 'brightness-0 invert' : ''}`} alt="Dog" />
             </div>
             <span className={`font-black uppercase tracking-wider text-sm ${activeType === 'dog' ? 'text-white' : 'text-slate-500'}`}>{t.dogFood}</span>
         </button>
      </div>

      {!userLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[2000] bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce-slow">
           <AlertCircle size={16} />
           <span className="text-xs font-bold">{t.locNotActive || "Konum etkin değil"}</span>
        </div>
      )}

      <div className="absolute top-20 right-6 z-[2000] flex flex-col gap-4">
        {userLocation && (
          <button onClick={handleLocate} className={`p-5 rounded-[2.2rem] shadow-2xl border-2 transition-all active:scale-90 ${isFollowing ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
            <Navigation2 size={30} fill={isFollowing ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      <MapContainer 
        center={userLocation || defaultPosition} 
        zoom={17} 
        doubleClickZoom={false} 
        className="w-full h-full" 
        ref={mapRef} 
        zoomControl={false} 
        preferCanvas={true} 
        attributionControl={false} 
      >
        <MapEvents />
        <TileLayer 
          url={TILE_URL} 
          keepBuffer={6} 
          maxZoom={20}
          updateWhenIdle={true}
        />

        {userLocation && (
          <><Circle center={userLocation} radius={Math.max(locationAccuracy, 10)} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.08, color: '#3b82f6', weight: 1, dashArray: '8, 8' }} /><CircleMarker center={userLocation} radius={10} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: 'white', weight: 4 }}><Popup className="font-bold text-blue-600">{t.youAreHere}</Popup></CircleMarker></>
        )}

        {markers.map((marker) => {
          const hoursElapsed = (Date.now() - marker.timestamp) / (1000 * 60 * 60);
          const color = hoursElapsed < 8 ? 'green' : (hoursElapsed < 16 ? 'yellow' : 'red');
          const timeLabel = formatDistanceToNow(marker.timestamp, { addSuffix: true, locale } as any);
          const typeLabel = marker.type === 'cat' ? t.catFood : marker.type === 'dog' ? t.dogFood : t.bothFood;
          const iconKey = `${color}-${marker.type || 'cat'}`;
          return (
            <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={markerIcons[iconKey]}>
              <Popup><div className="p-6 min-w-[240px]"><div className="flex items-center gap-5 mb-5 border-b pb-5"><div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100"><User size={28} /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.addedBy}</p><p className="text-lg font-black text-slate-800 leading-none">{marker.addedBy === '@@ANONYMOUS@@' ? t.anonymousUser : marker.addedBy}</p></div></div><div className="flex items-center gap-5"><div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100"><Clock size={28} /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.time}</p><p className="text-sm font-bold text-slate-600 leading-none">{timeLabel}</p></div></div><div className="mt-6 pt-5 border-t flex items-center justify-between"><div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full animate-pulse ${color === 'green' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : (color === 'yellow' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]')}`} /><span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{typeLabel}</span></div></div></div></Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
