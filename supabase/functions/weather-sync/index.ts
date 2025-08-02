import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openWeatherApiKey = Deno.env.get('OPENWEATHER_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WeatherData {
  dt: number;
  main: {
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  weather: Array<{
    main: string;
    description: string;
    id: number;
  }>;
  rain?: {
    '3h': number;
  };
  snow?: {
    '3h': number;
  };
}

interface Base {
  id: string;
  location: string;
  name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weather sync process...');

    if (!openWeatherApiKey) {
      console.error('OpenWeather API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenWeather API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get all bases
    const { data: bases, error: basesError } = await supabase
      .from('bases')
      .select('id, location, name');

    if (basesError) {
      console.error('Error fetching bases:', basesError);
      throw basesError;
    }

    console.log(`Found ${bases.length} bases to update weather for`);

    const results = [];

    for (const base of bases as Base[]) {
      try {
        console.log(`Fetching weather for base: ${base.name} (${base.location})`);
        
        // Get coordinates for the location (using geocoding)
        const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(base.location)}&limit=1&appid=${openWeatherApiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        
        if (!geocodeResponse.ok) {
          console.error(`Geocoding failed for ${base.location}:`, geocodeResponse.statusText);
          continue;
        }
        
        const geocodeData = await geocodeResponse.json();
        
        if (!geocodeData || geocodeData.length === 0) {
          console.error(`No coordinates found for location: ${base.location}`);
          continue;
        }
        
        const { lat, lon } = geocodeData[0];
        
        // Get 5-day weather forecast
        const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=metric`;
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
          console.error(`Weather API failed for ${base.location}:`, weatherResponse.statusText);
          continue;
        }
        
        const weatherData = await weatherResponse.json();
        
        if (!weatherData.list) {
          console.error(`Invalid weather data format for ${base.location}`);
          continue;
        }

        // Process daily forecasts (group by date)
        const dailyForecasts = new Map();
        
        weatherData.list.forEach((item: WeatherData) => {
          const date = new Date(item.dt * 1000).toISOString().split('T')[0];
          
          if (!dailyForecasts.has(date)) {
            dailyForecasts.set(date, {
              date,
              temp_min: item.main.temp_min,
              temp_max: item.main.temp_max,
              humidity: item.main.humidity,
              wind_speed: item.wind.speed,
              precipitation: (item.rain?.['3h'] || 0) + (item.snow?.['3h'] || 0),
              weather_condition: item.weather[0].main,
              weather_description: item.weather[0].description,
              weather_code: item.weather[0].id.toString(),
              count: 1
            });
          } else {
            const existing = dailyForecasts.get(date);
            existing.temp_min = Math.min(existing.temp_min, item.main.temp_min);
            existing.temp_max = Math.max(existing.temp_max, item.main.temp_max);
            existing.humidity = (existing.humidity * existing.count + item.main.humidity) / (existing.count + 1);
            existing.wind_speed = Math.max(existing.wind_speed, item.wind.speed);
            existing.precipitation += (item.rain?.['3h'] || 0) + (item.snow?.['3h'] || 0);
            existing.count++;
          }
        });

        // Insert/update weather forecasts
        const forecastsToInsert = Array.from(dailyForecasts.values()).map(forecast => ({
          base_id: base.id,
          forecast_date: forecast.date,
          temperature_min: forecast.temp_min,
          temperature_max: forecast.temp_max,
          humidity: forecast.humidity,
          wind_speed: forecast.wind_speed,
          precipitation: forecast.precipitation,
          weather_condition: forecast.weather_description,
          weather_code: forecast.weather_code
        }));

        const { error: insertError } = await supabase
          .from('weather_forecasts')
          .upsert(forecastsToInsert, { 
            onConflict: 'base_id,forecast_date',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.error(`Error inserting weather data for ${base.name}:`, insertError);
          continue;
        }

        console.log(`Successfully updated weather for ${base.name}: ${forecastsToInsert.length} forecasts`);
        results.push({
          base_id: base.id,
          base_name: base.name,
          forecasts_updated: forecastsToInsert.length,
          success: true
        });

        // Check for weather-based maintenance adjustments
        await checkWeatherBasedAdjustments(base.id, forecastsToInsert);

      } catch (error) {
        console.error(`Error processing weather for base ${base.name}:`, error);
        results.push({
          base_id: base.id,
          base_name: base.name,
          success: false,
          error: error.message
        });
      }
    }

    console.log('Weather sync completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weather sync completed',
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in weather-sync function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function checkWeatherBasedAdjustments(baseId: string, forecasts: any[]) {
  try {
    // Get active weather adjustment rules for this base
    const { data: rules, error: rulesError } = await supabase
      .from('weather_adjustment_rules')
      .select('*')
      .or(`base_id.eq.${baseId},base_id.is.null`)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching weather rules:', rulesError);
      return;
    }

    if (!rules || rules.length === 0) {
      return;
    }

    // Get upcoming scheduled maintenance for this base
    const { data: maintenances, error: maintenanceError } = await supabase
      .from('scheduled_maintenance')
      .select(`
        *,
        boats!inner(base_id)
      `)
      .eq('boats.base_id', baseId)
      .eq('status', 'pending')
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .lte('scheduled_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (maintenanceError) {
      console.error('Error fetching scheduled maintenance:', maintenanceError);
      return;
    }

    if (!maintenances || maintenances.length === 0) {
      return;
    }

    // Check each maintenance against weather conditions
    for (const maintenance of maintenances) {
      const maintenanceDate = maintenance.scheduled_date;
      const forecast = forecasts.find(f => f.forecast_date === maintenanceDate);
      
      if (!forecast) continue;

      // Check against each rule
      for (const rule of rules) {
        let shouldAdjust = false;
        let adjustmentReason = '';

        // Check weather condition match
        if (forecast.weather_condition.toLowerCase().includes(rule.weather_condition.toLowerCase())) {
          shouldAdjust = true;
          adjustmentReason = `Weather condition: ${forecast.weather_condition}`;
        }

        // Check temperature limits
        if (rule.min_temperature && forecast.temperature_min < rule.min_temperature) {
          shouldAdjust = true;
          adjustmentReason = `Temperature too low: ${forecast.temperature_min}°C (min: ${rule.min_temperature}°C)`;
        }

        if (rule.max_temperature && forecast.temperature_max > rule.max_temperature) {
          shouldAdjust = true;
          adjustmentReason = `Temperature too high: ${forecast.temperature_max}°C (max: ${rule.max_temperature}°C)`;
        }

        // Check wind speed
        if (rule.max_wind_speed && forecast.wind_speed > rule.max_wind_speed) {
          shouldAdjust = true;
          adjustmentReason = `Wind too strong: ${forecast.wind_speed} m/s (max: ${rule.max_wind_speed} m/s)`;
        }

        // Check precipitation
        if (rule.max_precipitation && forecast.precipitation > rule.max_precipitation) {
          shouldAdjust = true;
          adjustmentReason = `Too much precipitation: ${forecast.precipitation}mm (max: ${rule.max_precipitation}mm)`;
        }

        if (shouldAdjust) {
          // Create weather notification
          await supabase
            .from('weather_notifications')
            .insert({
              base_id: baseId,
              maintenance_id: maintenance.id,
              weather_condition: forecast.weather_condition,
              notification_type: 'schedule_adjustment',
              message: `Maintenance "${maintenance.task_name}" scheduled for ${maintenanceDate} may need adjustment due to weather. ${adjustmentReason}`,
              severity: rule.action === 'postpone' ? 'warning' : 'info',
              scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Send tomorrow
            });

          console.log(`Created weather adjustment notification for maintenance ${maintenance.id}: ${adjustmentReason}`);
          break; // Only trigger once per maintenance
        }
      }
    }

  } catch (error) {
    console.error('Error checking weather-based adjustments:', error);
  }
}