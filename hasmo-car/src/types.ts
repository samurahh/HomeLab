export interface Car {
  id: number;
  alias: string;
  make: string;
  model: string;
  year: string;
  license_plate: string;
  fuel_type: string;
  picture: string;
  created_at: string;
}

export interface FuelRecord {
  id: number;
  car_id: number;
  date: string;
  odometer: number | null;
  fuel_quantity: number;
  total_cost: number;
  created_at: string;
}

export interface ServiceRecord {
  id: number;
  car_id: number;
  date: string;
  odometer: number | null;
  description: string;
  cost: number;
  notes: string;
  created_at: string;
}

export interface ReminderRecord {
  id: number;
  car_id: number;
  description: string;
  notes: string;
  urgency: string;
  remind_type: string; // "date" | "odometer" | "whichever"
  remind_date: string | null;
  remind_odometer: number | null;
  created_at: string;
}

export interface InsuranceRecord {
  id: number;
  car_id: number;
  start_date: string;
  end_date: string;
  odometer: number | null;
  price: number;
  type: string;
  notes: string;
  created_at: string;
}

export type Tab =
  | "dashboard"
  | "fuel"
  | "service"
  | "reminders"
  | "vignette"
  | "insurance"
  | "notes"
  | "others";
