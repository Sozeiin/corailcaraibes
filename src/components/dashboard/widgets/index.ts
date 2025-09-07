import { Widget } from '@/types/widget';
import { StatisticsWidget } from './StatisticsWidget';
import { AlertsWidget } from './AlertsWidget';
import { MaintenanceWidget } from './MaintenanceWidget';
import { QuickActionsWidget } from './QuickActionsWidget';
import { AnalyticsWidget } from './AnalyticsWidget';

export const AVAILABLE_WIDGETS: Widget[] = [
  {
    id: 'statistics',
    type: 'statistics',
    title: 'Statistiques',
    description: 'Affiche les statistiques principales selon votre rôle',
    icon: 'BarChart3',
    component: StatisticsWidget,
    defaultSize: 'medium',
    supportedRoles: ['direction', 'chef_base', 'technicien'],
    category: 'statistics',
  },
  {
    id: 'alerts',
    type: 'alerts',
    title: 'Alertes Récentes',
    description: 'Affiche les dernières alertes non lues',
    icon: 'Bell',
    component: AlertsWidget,
    defaultSize: 'medium',
    supportedRoles: ['direction', 'chef_base', 'technicien'],
    category: 'alerts',
  },
  {
    id: 'maintenance',
    type: 'maintenance',
    title: 'Maintenance à Venir',
    description: 'Affiche les prochaines interventions de maintenance',
    icon: 'Wrench',
    component: MaintenanceWidget,
    defaultSize: 'medium',
    supportedRoles: ['chef_base', 'technicien'],
    category: 'maintenance',
  },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Actions Rapides',
    description: 'Boutons d\'accès rapide aux fonctionnalités principales',
    icon: 'Zap',
    component: QuickActionsWidget,
    defaultSize: 'small',
    supportedRoles: ['direction', 'chef_base', 'technicien'],
    category: 'actions',
  },
  {
    id: 'analytics',
    type: 'analytics',
    title: 'Analytiques Globales',
    description: 'Graphiques et métriques pour vue d\'ensemble',
    icon: 'TrendingUp',
    component: AnalyticsWidget,
    defaultSize: 'large',
    supportedRoles: ['direction'],
    category: 'analytics',
  },
];

export const getWidgetByType = (type: string): Widget | undefined => {
  return AVAILABLE_WIDGETS.find(widget => widget.type === type);
};

export const getWidgetsForRole = (role: string): Widget[] => {
  return AVAILABLE_WIDGETS.filter(widget => 
    widget.supportedRoles.includes(role as any)
  );
};