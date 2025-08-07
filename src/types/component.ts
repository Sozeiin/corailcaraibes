export interface BoatSubComponent {
  id: string;
  parent_component_id: string;
  sub_component_name: string;
  sub_component_type?: string;
  manufacturer?: string;
  model?: string;
  hin?: string;
  installation_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  maintenance_interval_days: number;
  status: string;
  position_in_component?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentStockLink {
  id: string;
  component_id?: string;
  sub_component_id?: string;
  stock_item_id: string;
  quantity_required: number;
  replacement_priority: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  stock_item?: {
    id: string;
    name: string;
    reference?: string;
    quantity: number;
    unit: string;
  };
}

export interface ComponentPurchaseHistory {
  id: string;
  component_id?: string;
  sub_component_id?: string;
  stock_item_id?: string;
  supplier_id?: string;
  order_id?: string;
  purchase_date: string;
  unit_cost: number;
  quantity: number;
  total_cost: number;
  warranty_months: number;
  invoice_reference?: string;
  installation_date?: string;
  notes?: string;
  created_at: string;
  supplier?: {
    name: string;
  };
  stock_item?: {
    name: string;
    reference?: string;
  };
}

export interface ComponentSupplierReference {
  id: string;
  component_id?: string;
  sub_component_id?: string;
  supplier_id: string;
  supplier_part_number?: string;
  catalog_reference?: string;
  last_quoted_price?: number;
  last_quote_date?: string;
  lead_time_days?: number;
  minimum_order_quantity: number;
  preferred_supplier: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  supplier: {
    name: string;
  };
}

export interface SubComponentFormData {
  subComponentName: string;
  subComponentType: string;
  manufacturer: string;
  model: string;
  hin: string;
  installationDate: string;
  maintenanceIntervalDays: number;
  status: string;
  positionInComponent: string;
  notes: string;
}

export interface StockLinkFormData {
  stockItemId: string;
  quantityRequired: number;
  replacementPriority: string;
  notes: string;
}