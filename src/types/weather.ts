export interface WeatherData {
  id: string;
  base_id: string;
  forecast_date: string;
  temperature_min: number;
  temperature_max: number;
  humidity: number;
  wind_speed: number;
  precipitation: number;
  weather_condition: string;
  weather_code: string;
  fetched_at: string;
  created_at: string;
}

export interface WeatherAdjustmentRule {
  id: string;
  base_id?: string;
  rule_name: string;
  weather_condition: string;
  min_temperature?: number;
  max_temperature?: number;
  max_wind_speed?: number;
  max_precipitation?: number;
  action: 'postpone' | 'advance' | 'reschedule';
  adjustment_days: number;
  priority_adjustment: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeatherNotification {
  id: string;
  base_id: string;
  maintenance_id?: string;
  weather_condition: string;
  notification_type: 'weather_warning' | 'schedule_adjustment' | 'weather_alert';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  is_sent: boolean;
  scheduled_for?: string;
  sent_at?: string;
  created_at: string;
}

export interface WeatherEvaluation {
  suitable: boolean;
  weather_data?: WeatherData;
  violated_rules?: Array<{
    rule_name: string;
    action: string;
    adjustment_days: number;
    reason: string;
  }>;
  recommendations?: Array<{
    rule_name: string;
    action: string;
    adjustment_days: number;
    reason: string;
  }>;
  reason?: string;
}