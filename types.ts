
export interface User {
  name: string;
  username?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  adminKey?: string;
}

export interface FoodMarker {
  id: string;
  lat: number;
  lng: number;
  addedBy: string;
  isSuperAdmin?: boolean;
  timestamp: number;
  type: 'cat' | 'dog' | 'both';
}

export interface ShopLocation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  uri: string;
  type: 'petshop' | 'market';
}

export type MarkerColor = 'green' | 'yellow' | 'red';

export type LanguageCode = 'tr' | 'en' | 'it' | 'fr' | 'de' | 'es' | 'pt' | 'ru' | 'jp' | 'ar';

export type NotificationSetting = 'all' | '5km' | '1km' | 'mine' | 'none';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}
