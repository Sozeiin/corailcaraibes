export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  description?: string;
  size: 'small' | 'medium' | 'large';
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  data?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  description?: string;
  icon: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize: 'small' | 'medium' | 'large';
  supportedRoles: ('direction' | 'chef_base' | 'technicien')[];
  category: 'statistics' | 'alerts' | 'maintenance' | 'actions' | 'analytics';
}

export interface WidgetProps {
  config: WidgetConfig;
  isEditing?: boolean;
  onConfigChange?: (config: WidgetConfig) => void;
  onRemove?: () => void;
}

export interface DashboardLayout {
  widgets: WidgetConfig[];
}