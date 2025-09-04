import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange } from '@/components/ui/date-range-picker';
import { useEffect } from 'react';

export interface ReportsData {
  maintenance: MaintenanceReportData;
  checklists: ChecklistReportData;
  incidents: IncidentReportData;
  operational: OperationalReportData;
}

export interface MaintenanceReportData {
  totalInterventions: number;
  completedInterventions: number;
  inProgressInterventions: number;
  pendingInterventions: number;
  completionRate: number;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyTrend: Array<{ month: string; interventions: number }>;
  technicianPerformance: Array<{
    name: string;
    totalInterventions: number;
    completedInterventions: number;
    averageDuration: number;
    completionRate: number;
  }>;
}

export interface ChecklistReportData {
  totalChecklists: number;
  completedChecklists: number;
  checkInCount: number;
  checkOutCount: number;
  averageTime: number;
  completionRate: number;
  boatUtilization: Array<{
    boatName: string;
    checkIns: number;
    checkOuts: number;
    hours: number;
    balance: 'equilibre' | 'desequilibre';
  }>;
  monthlyTrend: Array<{ month: string; checkIns: number; checkOuts: number }>;
}

export interface IncidentReportData {
  totalIncidents: number;
  resolvedIncidents: number;
  pendingIncidents: number;
  totalBoats: number;
  availableBoats: number;
  maintenanceBoats: number;
  severityData: Array<{ name: string; value: number; color: string }>;
  incidentTypes: Array<{ type: string; count: number }>;
  recentIncidents: Array<{
    id: string;
    title: string;
    boat: string;
    date: string;
    status: string;
    priority: string;
  }>;
}

export interface OperationalReportData {
  totalStockValue: number;
  lowStockItems: number;
  totalOrders: number;
  orderValue: number;
  stockByCategory: Array<{ category: string; value: number; count: number }>;
  boatStatusDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyOrderTrend: Array<{ month: string; orders: number; value: number }>;
  lowStockList: Array<{
    name: string;
    current: number;
    minimum: number;
    category: string;
  }>;
}

export function useReportsData(dateRange: DateRange | undefined) {
  const { user } = useAuth();

  const queryResult = useQuery({
    queryKey: ['reports-data', dateRange, user?.baseId],
    queryFn: async (): Promise<ReportsData> => {
      const from = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = dateRange?.to?.toISOString() || new Date().toISOString();

      // Build queries based on user role
      const baseFilter = user?.role === 'direction' ? {} : { base_id: user?.baseId };

      // Helper to build queries with role-based filtering
      const buildQuery = (query: any) => {
        return user?.role === 'direction' ? query : query.eq('base_id', user?.baseId!);
      };

      // Parallel data fetching for all report types
      const [
        interventionsData,
        checklistsData,
        boatsData,
        stockData,
        ordersData,
        profilesData
      ] = await Promise.all([
        // Maintenance data
        buildQuery(
          supabase
            .from('interventions')
            .select(`
              id, status, priority, created_at, completed_at, 
              boat_id, technician_id, title, description,
              boats(name, base_id),
              profiles!interventions_technician_id_fkey(name)
            `)
            .gte('created_at', from)
            .lte('created_at', to)
        ),

        // Planning activities data (for check-in/check-out)
        user?.role === 'direction' 
          ? supabase
              .from('planning_activities')
              .select(`
                id, activity_type, status, scheduled_start, scheduled_end,
                actual_start, actual_end, boat_id, base_id,
                boats(name, base_id)
              `)
              .gte('scheduled_start', from)
              .lte('scheduled_start', to)
          : supabase
              .from('planning_activities')
              .select(`
                id, activity_type, status, scheduled_start, scheduled_end,
                actual_start, actual_end, boat_id, base_id,
                boats!inner(name, base_id)
              `)
              .gte('scheduled_start', from)
              .lte('scheduled_start', to)
              .eq('base_id', user?.baseId!),

        // Boats data
        buildQuery(
          supabase
            .from('boats')
            .select('id, name, status, base_id')
        ),

        // Stock data
        buildQuery(
          supabase
            .from('stock_items')
            .select('id, name, category, quantity, min_threshold, unit_price, last_updated')
        ),

        // Orders data
        buildQuery(
          supabase
            .from('orders')
            .select(`
              id, order_number, status, created_at, total_amount,
              order_items(quantity, unit_price, total_price)
            `)
            .gte('created_at', from)
            .lte('created_at', to)
        ),

        // Technicians data
        buildQuery(
          supabase
            .from('profiles')
            .select('id, name, role')
            .eq('role', 'technicien')
        )
      ]);

      return {
        maintenance: processMaintenanceData(interventionsData.data || [], profilesData.data || []),
        checklists: processChecklistData(checklistsData.data || [], boatsData.data || []),
        incidents: processIncidentData(interventionsData.data || [], boatsData.data || []),
        operational: processOperationalData(stockData.data || [], ordersData.data || [], boatsData.data || [])
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels = [
      supabase
        .channel('interventions-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'interventions' },
          () => queryResult.refetch()
        ),
      supabase
        .channel('checklists-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'boat_checklists' },
          () => queryResult.refetch()
        ),
      supabase
        .channel('stock-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'stock_items' },
          () => queryResult.refetch()
        ),
      supabase
        .channel('orders-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'orders' },
          () => queryResult.refetch()
        )
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, queryResult.refetch]);

  return queryResult;
}

function processMaintenanceData(interventions: any[], technicians: any[]): MaintenanceReportData {
  const total = interventions.length;
  const completed = interventions.filter(i => i.status === 'completed').length;
  const inProgress = interventions.filter(i => i.status === 'in_progress').length;
  const pending = interventions.filter(i => i.status === 'pending').length;

  const statusDistribution = [
    { name: 'Terminées', value: completed, color: 'hsl(var(--success))' },
    { name: 'En cours', value: inProgress, color: 'hsl(var(--warning))' },
    { name: 'En attente', value: pending, color: 'hsl(var(--muted))' }
  ];

  // Monthly trend calculation
  const monthlyData = new Map();
  interventions.forEach(intervention => {
    const month = new Date(intervention.created_at).toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'short' 
    });
    monthlyData.set(month, (monthlyData.get(month) || 0) + 1);
  });

  const monthlyTrend = Array.from(monthlyData.entries()).map(([month, interventions]) => ({
    month,
    interventions: interventions as number
  }));

  // Technician performance - only calculate if we have technicians data
  const technicianPerformance = technicians.map(tech => {
    const techInterventions = interventions.filter(i => i.technician_id === tech.id);
    const techCompleted = techInterventions.filter(i => i.status === 'completed');
    
    // Calculate average duration from created_at to completed_at
    const avgDuration = techCompleted.length > 0 
      ? techCompleted.reduce((sum, i) => {
          if (i.completed_at && i.created_at) {
            const duration = new Date(i.completed_at).getTime() - new Date(i.created_at).getTime();
            return sum + (duration / (1000 * 60 * 60)); // Convert to hours
          }
          return sum;
        }, 0) / techCompleted.length 
      : 0;

    return {
      name: tech.name || 'Technicien inconnu',
      totalInterventions: techInterventions.length,
      completedInterventions: techCompleted.length,
      averageDuration: Math.round(avgDuration * 10) / 10, // Round to 1 decimal
      completionRate: techInterventions.length > 0 ? Math.round((techCompleted.length / techInterventions.length) * 100) : 0
    };
  }).filter(tech => tech.totalInterventions > 0); // Only show technicians with interventions

  return {
    totalInterventions: total,
    completedInterventions: completed,
    inProgressInterventions: inProgress,
    pendingInterventions: pending,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    statusDistribution,
    monthlyTrend,
    technicianPerformance
  };
}

function processChecklistData(activities: any[], boats: any[]): ChecklistReportData {
  // Filter only rental activities for check-in/check-out data
  const rentalActivities = activities.filter(a => a.activity_type === 'rental');
  
  const total = rentalActivities.length;
  const completed = rentalActivities.filter(a => a.status === 'completed').length;
  
  // Check-ins: activities that have started
  const checkIns = rentalActivities.filter(a => a.actual_start || a.status === 'in_progress').length;
  // Check-outs: activities that have ended
  const checkOuts = rentalActivities.filter(a => a.actual_end || a.status === 'completed').length;

  // Calculate average time based on actual duration
  const completedRentals = rentalActivities.filter(a => a.actual_start && a.actual_end);
  const averageTime = completedRentals.length > 0 
    ? completedRentals.reduce((sum, a) => {
        const start = new Date(a.actual_start);
        const end = new Date(a.actual_end);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
        return sum + duration;
      }, 0) / completedRentals.length 
    : 0;

  // Boat utilization based on real rental data
  const boatUsage = new Map();
  rentalActivities.forEach(activity => {
    const boatId = activity.boat_id;
    const boatName = activity.boats?.name || 'Bateau inconnu';
    
    if (!boatUsage.has(boatId)) {
      boatUsage.set(boatId, {
        boatName,
        checkIns: 0,
        checkOuts: 0,
        hours: 0
      });
    }
    
    const usage = boatUsage.get(boatId);
    
    if (activity.actual_start) {
      usage.checkIns++;
    }
    
    if (activity.actual_end) {
      usage.checkOuts++;
      // Calculate hours based on actual rental duration
      const start = new Date(activity.actual_start || activity.scheduled_start);
      const end = new Date(activity.actual_end);
      const hours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
      usage.hours += Math.round(hours * 10) / 10;
    }
  });

  const boatUtilization = Array.from(boatUsage.values()).map(boat => ({
    ...boat,
    balance: Math.abs(boat.checkIns - boat.checkOuts) <= 1 ? 'equilibre' as const : 'desequilibre' as const
  }));

  // Monthly trend
  const monthlyData = new Map();
  rentalActivities.forEach(activity => {
    const month = new Date(activity.scheduled_start).toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'short' 
    });
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { checkIns: 0, checkOuts: 0 });
    }
    const data = monthlyData.get(month);
    
    if (activity.actual_start || activity.status === 'in_progress') {
      data.checkIns++;
    }
    if (activity.actual_end || activity.status === 'completed') {
      data.checkOuts++;
    }
  });

  const monthlyTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    checkIns: data.checkIns,
    checkOuts: data.checkOuts
  }));

  return {
    totalChecklists: total,
    completedChecklists: completed,
    checkInCount: checkIns,
    checkOutCount: checkOuts,
    averageTime: Math.round(averageTime),
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    boatUtilization,
    monthlyTrend
  };
}

function processIncidentData(interventions: any[], boats: any[]): IncidentReportData {
  const urgentInterventions = interventions.filter(i => i.priority === 'urgent');
  const resolved = urgentInterventions.filter(i => i.status === 'completed').length;
  const pending = urgentInterventions.filter(i => i.status !== 'completed').length;

  const available = boats.filter(b => b.status === 'available').length;
  const maintenance = boats.filter(b => b.status === 'maintenance').length;

  const severityData = [
    { name: 'Résolus', value: resolved, color: 'hsl(var(--success))' },
    { name: 'En attente', value: pending, color: 'hsl(var(--destructive))' }
  ];

  const typeCount = new Map();
  urgentInterventions.forEach(intervention => {
    // Simple categorization based on common maintenance types
    const type = intervention.title?.includes('moteur') ? 'Moteur' :
                 intervention.title?.includes('électrique') ? 'Électrique' :
                 intervention.title?.includes('coque') ? 'Coque' : 'Autre';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);
  });

  const incidentTypes = Array.from(typeCount.entries()).map(([type, count]) => ({
    type,
    count
  }));

  const recentIncidents = urgentInterventions
    .slice(0, 5)
    .map(intervention => ({
      id: intervention.id,
      title: intervention.title || 'Intervention urgente',
      boat: intervention.boats?.name || 'Bateau inconnu',
      date: new Date(intervention.created_at).toLocaleDateString('fr-FR'),
      status: intervention.status,
      priority: intervention.priority
    }));

  return {
    totalIncidents: urgentInterventions.length,
    resolvedIncidents: resolved,
    pendingIncidents: pending,
    totalBoats: boats.length,
    availableBoats: available,
    maintenanceBoats: maintenance,
    severityData,
    incidentTypes,
    recentIncidents
  };
}

function processOperationalData(stock: any[], orders: any[], boats: any[]): OperationalReportData {
  const totalStockValue = stock.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
  const lowStockItems = stock.filter(item => item.quantity <= item.min_threshold).length;
  const totalOrders = orders.length;
  const orderValue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  // Stock by category
  const categoryData = new Map();
  stock.forEach(item => {
    const category = item.category || 'Autre';
    if (!categoryData.has(category)) {
      categoryData.set(category, { value: 0, count: 0 });
    }
    const data = categoryData.get(category);
    data.value += item.quantity * (item.unit_price || 0);
    data.count += item.quantity;
  });

  const stockByCategory = Array.from(categoryData.entries()).map(([category, data]) => ({
    category,
    value: data.value,
    count: data.count
  }));

  // Boat status distribution
  const statusCount = new Map();
  boats.forEach(boat => {
    statusCount.set(boat.status, (statusCount.get(boat.status) || 0) + 1);
  });

  const boatStatusDistribution = Array.from(statusCount.entries()).map(([status, value]) => ({
    name: status === 'available' ? 'Disponible' :
          status === 'maintenance' ? 'Maintenance' :
          status === 'rented' ? 'Loué' : 'Hors service',
    value,
    color: status === 'available' ? 'hsl(var(--success))' :
           status === 'maintenance' ? 'hsl(var(--warning))' :
           status === 'rented' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'
  }));

  // Monthly order trend
  const monthlyOrderData = new Map();
  orders.forEach(order => {
    const month = new Date(order.created_at).toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'short' 
    });
    if (!monthlyOrderData.has(month)) {
      monthlyOrderData.set(month, { orders: 0, value: 0 });
    }
    const data = monthlyOrderData.get(month);
    data.orders++;
    data.value += order.total_amount || 0;
  });

  const monthlyOrderTrend = Array.from(monthlyOrderData.entries()).map(([month, data]) => ({
    month,
    orders: data.orders,
    value: data.value
  }));

  const lowStockList = stock
    .filter(item => item.quantity <= item.min_threshold)
    .slice(0, 10)
    .map(item => ({
      name: item.name,
      current: item.quantity,
      minimum: item.min_threshold,
      category: item.category || 'Autre'
    }));

  return {
    totalStockValue,
    lowStockItems,
    totalOrders,
    orderValue,
    stockByCategory,
    boatStatusDistribution,
    monthlyOrderTrend,
    lowStockList
  };
}