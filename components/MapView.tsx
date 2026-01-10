
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FoodMarker, LanguageCode } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS, it, fr, de, es, pt, ru, ja, arSA } from 'date-fns/locale';
import { User, Clock, Navigation2, MapPin, X } from 'lucide-react';
import { translations } from '../constants/translations';

interface MapViewProps {
  markers: FoodMarker[];
  userLocation: [number, number] | null;
  locationAccuracy: number;
  onAddMarker: (lat: number, lng: number, type: 'cat' | 'dog') => void;
  onBack: () => void;
  currentLang: LanguageCode;
}

const locales: Record<LanguageCode, any> = {
  tr, en: enUS, it, fr, de, es, pt, ru, jp: ja, ar: arSA
};

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

const MapView: React.FC<MapViewProps> = ({ markers, userLocation, locationAccuracy, onAddMarker, onBack, currentLang }) => {
  const mapRef = useRef<L.Map>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [initialCenterDone, setInitialCenterDone] = useState(false);
  const [tempMarker, setTempMarker] = useState<{lat: number, lng: number} | null>(null);
  
  const defaultPosition: [number, number] = [41.0082, 28.9784];
  const t = translations[currentLang];
  const locale = locales[currentLang] || tr;

  // High-Precision SVG Paths
  const catSvg = `
    <g shape-rendering="geometricPrecision">
      <path d="M30 30 L28 12 L42 28 C42 28 46 27 50 27 C54 27 58 28 58 28 L72 12 L70 30 C78 36 80 50 80 58 C80 78 66 88 50 88 C34 88 20 78 20 58 C20 50 22 36 30 30 Z" />
      <path d="M38 52 A4 4 0 1 0 46 52 A4 4 0 1 0 38 52 Z M54 52 A4 4 0 1 0 62 52 A4 4 0 1 0 54 52 Z" fill="currentColor" stroke="none" />
      <path d="M47 64 L50 67 L53 64" fill="currentColor" stroke="none" />
      <path d="M44 72 C44 78 50 78 50 78 C50 78 56 78 56 72" />
      <path d="M24 62 H12 M24 68 H12 M24 74 L14 80" />
      <path d="M76 62 H88 M76 68 H88 M76 74 L86 80" />
    </g>
  `;

  const dogSvg = `
    <g shape-rendering="geometricPrecision">
      <path d="M32 35 L28 10 L44 30 M68 35 L72 10 L56 30" />
      <path d="M32 35 C32 35 25 42 25 65 C25 88 35 95 50 95 C65 95 75 88 75 65 C75 42 68 35 68 35" />
      <path d="M38 28 C38 28 45 32 50 32 C55 32 62 28 62 28" />
      <circle cx="42" cy="55" r="4.5" fill="currentColor" stroke="none" />
      <circle cx="58" cy="55" r="4.5" fill="currentColor" stroke="none" />
      <path d="M46 72 Q50 68 54 72" />
      <path d="M42 78 Q50 88 58 78" />
    </g>
  `;

  const markerIcons = useMemo(() => {
    const states = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
    const icons: any = {};
    ['cat', 'dog'].forEach(type => {
      Object.entries(states).forEach(([status, color]) => {
        icons[`${status}-${type}`] = L.divIcon({
          html: `
            <div class="marker-container">
              <div class="marker-glow" style="background-color: ${color}"></div>
              <div class="marker-box" style="background-color: ${color}">
                <svg viewBox="0 0 100 100" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                  ${type === 'cat' ? catSvg : dogSvg}
                </svg>
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

  // Map Events Component
  const MapEvents = () => {
    useMapEvents({
      dblclick(e) {
        setTempMarker({ lat: e.latlng.lat, lng: e.latlng.lng });
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

  const confirmAdd = (type: 'cat' | 'dog') => {
    if (tempMarker) {
      onAddMarker(tempMarker.lat, tempMarker.lng, type);
      setTempMarker(null);
    }
  };

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

  if (!userLocation && !initialCenterDone) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-2xl animate-pulse">
          <MapPin size={40} />
        </div>
        <div className="text-center space-y-1">
          <p className="font-black text-slate-800 tracking-tight">{t.locSearching}</p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.locSearching}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#f8fafc]">
      <style>{`
        .custom-marker { 
          background: none !important; 
          border: none !important; 
          box-shadow: none !important;
          contain: content; 
          overflow: visible !important;
        }
        .marker-container { 
          position: relative; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          will-change: transform; 
          transform: translate3d(0,0,0);
        }
        .marker-glow { 
          position: absolute; 
          width: 56px; 
          height: 56px; 
          border-radius: 50%; 
          opacity: 0.2; 
          filter: blur(8px);
          animation: marker-pulse 2.5s infinite ease-in-out; 
        }
        .marker-box { 
          position: relative; 
          width: 48px; 
          height: 48px; 
          border-radius: 20px; 
          box-shadow: 
            0 8px 16px rgba(0,0,0,0.15),
            inset 0 2px 4px rgba(255,255,255,0.3);
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
          z-index: 2;
        }
        @keyframes marker-pulse { 
          0% { transform: scale(0.85); opacity: 0.25; } 
          50% { transform: scale(1.15); opacity: 0.08; } 
          100% { transform: scale(0.85); opacity: 0.25; } 
        }
        .leaflet-popup-content-wrapper { 
          border-radius: 32px; 
          padding: 0; 
          box-shadow: 0 30px 60px -15px rgba(0,0,0,0.25); 
          border: 1px solid rgba(255,255,255,0.8); 
          overflow: hidden; 
        }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .leaflet-fade-anim .leaflet-tile, .leaflet-zoom-anim .leaflet-tile { will-change: auto !important; }
      `}</style>

      {/* Floating Action Buttons */}
      <div className="absolute top-20 right-6 z-[2000] flex flex-col gap-4">
        <button 
          onClick={handleLocate}
          className={`p-5 rounded-[2.2rem] shadow-2xl border-2 transition-all active:scale-90 ${isFollowing ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
        >
          <Navigation2 size={30} fill={isFollowing ? "currentColor" : "none"} />
        </button>
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
          keepBuffer={4} 
          maxZoom={20} 
          detectRetina={true}
          updateWhenIdle={true}
          updateWhenZooming={false}
        />

        {userLocation && (
          <><Circle center={userLocation} radius={Math.max(locationAccuracy, 10)} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.08, color: '#3b82f6', weight: 1, dashArray: '8, 8' }} /><CircleMarker center={userLocation} radius={10} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: 'white', weight: 4 }}><Popup className="font-bold text-blue-600">{t.youAreHere}</Popup></CircleMarker></>
        )}

        {/* Temporary Marker for Selection */}
        {tempMarker && (
           <Popup position={[tempMarker.lat, tempMarker.lng]} closeButton={false} className="!overflow-visible">
              <div className="p-2 relative">
                <button 
                  onClick={() => setTempMarker(null)} 
                  className="absolute -top-3 -right-3 bg-slate-100 rounded-full p-1 text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors shadow-sm border border-slate-200"
                >
                  <X size={16} />
                </button>
                <p className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t.selectFoodType}</p>
                <div className="flex gap-3">
                  <button onClick={() => confirmAdd('cat')} className="flex flex-col items-center gap-2 p-3 bg-orange-50 hover:bg-orange-100 rounded-2xl transition-colors group">
                    <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
                      <svg viewBox="0 0 100 100" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                        ${catSvg}
                      </svg>
                    </div>
                    <span className="text-[10px] font-black text-orange-800 uppercase tracking-wider">{t.catFood}</span>
                  </button>
                  <button onClick={() => confirmAdd('dog')} className="flex flex-col items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-colors group">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                      <svg viewBox="0 0 100 100" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                        ${dogSvg}
                      </svg>
                    </div>
                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">{t.dogFood}</span>
                  </button>
                </div>
              </div>
           </Popup>
        )}

        {/* Feeding Markers */}
        {markers.map((marker) => {
          const hoursElapsed = (Date.now() - marker.timestamp) / (1000 * 60 * 60);
          const color = hoursElapsed < 6 ? 'green' : (hoursElapsed < 12 ? 'yellow' : 'red');
          const timeLabel = formatDistanceToNow(marker.timestamp, { addSuffix: true, locale } as any);
          const iconKey = `${color}-${marker.type || 'cat'}`;
          return (
            <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={markerIcons[iconKey]}>
              <Popup><div className="p-6 min-w-[240px]"><div className="flex items-center gap-5 mb-5 border-b pb-5"><div className="w-14 h-14 bg-slate-50 rounded-[1.2rem] flex items-center justify-center text-slate-400"><User size={28} /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.addedBy}</p><p className="text-lg font-black text-slate-800 leading-none">{marker.addedBy === '@@ANONYMOUS@@' ? t.anonymousUser : marker.addedBy}</p></div></div><div className="flex items-center gap-5"><div className="w-14 h-14 bg-slate-50 rounded-[1.2rem] flex items-center justify-center text-slate-400"><Clock size={28} /></div><div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.time}</p><p className="text-sm font-bold text-slate-600 leading-none">{timeLabel}</p></div></div><div className="mt-6 pt-5 border-t flex items-center justify-between"><div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full animate-pulse ${color === 'green' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : (color === 'yellow' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]')}`} /><span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{marker.type === 'cat' ? t.catFood : t.dogFood}</span></div></div></div></Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
