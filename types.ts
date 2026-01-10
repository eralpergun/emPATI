
export interface User {
  name: string;
}

export interface FoodMarker {
  id: string;
  lat: number;
  lng: number;
  addedBy: string;
  timestamp: number;
  type: 'cat' | 'dog';
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

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}
