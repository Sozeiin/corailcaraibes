-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule weather sync to run every 6 hours
SELECT cron.schedule(
  'weather-sync-every-6-hours',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT
    net.http_post(
        url:='https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/weather-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkaGlpeW5tbG9rb2NlbGtxc2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjkwMjgsImV4cCI6MjA2MzQwNTAyOH0.6joVgEi8tq2q45G0xQZjv5OLyjCFMwQpUrwf76Y8eig"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule daily cleanup of old weather data (keep only 30 days)
SELECT cron.schedule(
  'weather-cleanup-daily',
  '0 2 * * *', -- Every day at 2 AM
  $$
  DELETE FROM public.weather_forecasts 
  WHERE forecast_date < CURRENT_DATE - INTERVAL '30 days';
  
  DELETE FROM public.weather_notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
  $$
);