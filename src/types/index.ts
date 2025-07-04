
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'direction' | 'chef_base' | 'technicien';
  baseId?: string;
  createdAt: string;
}

export interface Base {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  manager: string;
  createdAt: string;
}

export interface Boat {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  year: number;
  status: 'available' | 'rented' | 'maintenance' | 'out_of_service';
  baseId: string;
  documents: string[];
  nextMaintenance: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  baseId: string;
  createdAt: string;
}

export interface Order {
  id: string;
  supplierId: string;
  baseId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  totalAmount: number;
  orderDate: string;
  deliveryDate?: string;
  items: OrderItem[];
  documents: string[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  reference?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface StockItem {
  id: string;
  name: string;
  reference: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  location: string;
  baseId: string;
  lastUpdated: string;
}

export interface MaintenanceTask {
  id: string;
  boatId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  estimatedDuration: number;
  actualDuration?: number;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface Intervention {
  id: string;
  boatId: string;
  technicianId: string;
  title: string;
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedDate?: string;
  tasks: MaintenanceTask[];
  baseId: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  isRequired: boolean;
  status: 'ok' | 'needs_repair' | 'not_checked';
  notes?: string;
}

export interface BoatChecklist {
  id: string;
  boatId: string;
  checklistDate: string;
  technicianId: string;
  items: ChecklistItem[];
  overallStatus: 'ok' | 'needs_attention' | 'major_issues';
  createdAt: string;
}

export interface Alert {
  id: string;
  type: 'stock' | 'maintenance' | 'document' | 'system';
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  baseId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalBoats: number;
  availableBoats: number;
  boatsInMaintenance: number;
  lowStockItems: number;
  pendingInterventions: number;
  monthlyRevenue: number;
  maintenanceCosts: number;
}
