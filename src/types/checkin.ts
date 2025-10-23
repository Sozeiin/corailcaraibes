import { Customer } from './customer';

export interface Boat {
  id: string;
  name: string;
  model: string;
  status: string;
  base_id: string;
}

export interface AdministrativeCheckinForm {
  id: string;
  base_id: string;
  customer_id: string;
  boat_id: string | null;
  suggested_boat_id: string | null;
  is_boat_assigned: boolean;
  planned_start_date: string;
  planned_end_date: string;
  rental_notes: string | null;
  special_instructions: string | null;
  status: 'draft' | 'ready' | 'used' | 'completed' | 'expired';
  created_by: string;
  used_by: string | null;
  created_at: string;
  updated_at: string;
  used_at: string | null;
  is_one_way: boolean;
  destination_base_id: string | null;
}

export interface AdministrativeCheckinFormWithRelations extends AdministrativeCheckinForm {
  customer: Customer;
  boat: Boat | null;
  suggested_boat?: Boat | null;
}
