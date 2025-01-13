export interface Distributor {
  id: string;
  name: string;
  city: string;
  state: string;
  phoneNumber: string;
  catalogs: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
} 