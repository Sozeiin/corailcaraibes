-- Create weather forecasts table
CREATE TABLE public.weather_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL,
  forecast_date DATE NOT NULL,
  temperature_min NUMERIC NOT NULL,
  temperature_max NUMERIC NOT NULL,
  humidity NUMERIC,
  wind_speed NUMERIC,
  precipitation NUMERIC DEFAULT 0,
  weather_condition TEXT NOT NULL,
  weather_code TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_id, forecast_date)
);

-- Create weather adjustment rules table
CREATE TABLE public.weather_adjustment_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID,
  rule_name TEXT NOT NULL,
  weather_condition TEXT NOT NULL,
  min_temperature NUMERIC,
  max_temperature NUMERIC,
  max_wind_speed NUMERIC,
  max_precipitation NUMERIC,
  action TEXT NOT NULL CHECK (action IN ('postpone', 'advance', 'reschedule')),
  adjustment_days INTEGER DEFAULT 0,
  priority_adjustment INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather notifications table
CREATE TABLE public.weather_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL,
  maintenance_id UUID,
  weather_condition TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('weather_warning', 'schedule_adjustment', 'weather_alert')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_sent BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.weather_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_adjustment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for weather_forecasts
CREATE POLICY "Users can view weather forecasts for their base"
ON public.weather_forecasts
FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR 
  base_id = get_user_base_id()
);

CREATE POLICY "Direction and chef_base can manage weather forecasts"
ON public.weather_forecasts
FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR base_id = get_user_base_id())
);

-- RLS policies for weather_adjustment_rules
CREATE POLICY "Users can view weather rules for their base"
ON public.weather_adjustment_rules
FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR 
  base_id = get_user_base_id() OR
  base_id IS NULL
);

CREATE POLICY "Direction and chef_base can manage weather rules"
ON public.weather_adjustment_rules
FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR base_id = get_user_base_id() OR base_id IS NULL)
);

-- RLS policies for weather_notifications
CREATE POLICY "Users can view weather notifications for their base"
ON public.weather_notifications
FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR 
  base_id = get_user_base_id()
);

CREATE POLICY "Direction and chef_base can manage weather notifications"
ON public.weather_notifications
FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR base_id = get_user_base_id())
);

-- Add updated_at trigger for weather_adjustment_rules
CREATE TRIGGER update_weather_adjustment_rules_updated_at
  BEFORE UPDATE ON public.weather_adjustment_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to evaluate weather conditions for maintenance
CREATE OR REPLACE FUNCTION public.evaluate_weather_for_maintenance(
  maintenance_date DATE,
  base_id_param UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  weather_data RECORD;
  rules_violated JSONB;
  result JSONB;
BEGIN
  -- Get weather forecast for the date
  SELECT * INTO weather_data 
  FROM weather_forecasts 
  WHERE base_id = base_id_param 
  AND forecast_date = maintenance_date;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'suitable', true,
      'reason', 'no_weather_data',
      'recommendations', '[]'::jsonb
    );
  END IF;
  
  -- Check against weather rules
  SELECT jsonb_agg(
    jsonb_build_object(
      'rule_name', rule_name,
      'action', action,
      'adjustment_days', adjustment_days,
      'reason', 
        CASE 
          WHEN weather_data.temperature_min < COALESCE(min_temperature, -999) THEN 'temperature_too_low'
          WHEN weather_data.temperature_max > COALESCE(max_temperature, 999) THEN 'temperature_too_high'
          WHEN weather_data.wind_speed > COALESCE(max_wind_speed, 999) THEN 'wind_too_strong'
          WHEN weather_data.precipitation > COALESCE(max_precipitation, 999) THEN 'precipitation_too_high'
          ELSE 'weather_condition_match'
        END
    )
  ) INTO rules_violated
  FROM weather_adjustment_rules
  WHERE is_active = true
  AND (base_id IS NULL OR base_id = base_id_param)
  AND (
    weather_data.weather_condition ILIKE '%' || weather_condition || '%'
    OR weather_data.temperature_min < COALESCE(min_temperature, -999)
    OR weather_data.temperature_max > COALESCE(max_temperature, 999)
    OR weather_data.wind_speed > COALESCE(max_wind_speed, 999)
    OR weather_data.precipitation > COALESCE(max_precipitation, 999)
  );
  
  -- Build result
  result := jsonb_build_object(
    'suitable', CASE WHEN rules_violated IS NULL THEN true ELSE false END,
    'weather_data', row_to_json(weather_data)::jsonb,
    'violated_rules', COALESCE(rules_violated, '[]'::jsonb),
    'recommendations', COALESCE(rules_violated, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$;