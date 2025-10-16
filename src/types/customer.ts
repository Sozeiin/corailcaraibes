export interface Customer {
  id: string;
  base_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  customer_type: 'individual' | 'company';
  company_name?: string;
  id_number?: string;
  id_type?: 'passport' | 'driver_license' | 'id_card';
  notes?: string;
  vip_status: boolean;
  preferred_language: string;
  total_rentals: number;
  last_rental_date?: string;
  first_rental_date?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
}
