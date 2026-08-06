export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year_manufacture?: number;
  year_model: number;
  km: number;
  price: number;
  fuel: string;
  transmission: string;
  city: string;
  state: string;
  image: string | null;
  condition: string;
  active?: boolean;
  colors: { name: string; quantity: number }[];
  media?: { vehicle_id: string; url: string; kind: string; position: number; is_main: boolean }[];
};