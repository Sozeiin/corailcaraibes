import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
    relative_humidity_2m: number[];
    weathercode: number[];
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
    console.log('Starting weather sync process with Open-Meteo...');

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
        
        // Get coordinates for the location using Nominatim (free geocoding service)
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(base.location)}&format=json&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl, {
          headers: {
            'User-Agent': 'WeatherSync/1.0 (maintenance-app)'
          }
        });
        
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
        
        // Get 7-day weather forecast from Open-Meteo
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m,weathercode&timezone=auto&forecast_days=7`;
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
          console.error(`Open-Meteo API failed for ${base.location}:`, weatherResponse.statusText);
          continue;
        }
        
        const weatherData: OpenMeteoResponse = await weatherResponse.json();
        
        if (!weatherData.daily) {
          console.error(`Invalid weather data format for ${base.location}`);
          continue;
        }

        // Process daily forecasts
        const forecastsToInsert = weatherData.daily.time.map((date, index) => ({
          base_id: base.id,
          forecast_date: date,
          temperature_min: weatherData.daily.temperature_2m_min[index],
          temperature_max: weatherData.daily.temperature_2m_max[index],
          humidity: weatherData.daily.relative_humidity_2m[index],
          wind_speed: weatherData.daily.windspeed_10m_max[index],
          precipitation: weatherData.daily.precipitation_sum[index],
          weather_condition: getWeatherDescription(weatherData.daily.weathercode[index]),
          weather_code: weatherData.daily.weathercode[index].toString()
        }));

        // Insert/update weather forecasts
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
        message: 'Weather sync completed using Open-Meteo',
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

        // Check weather condition match (using Open-Meteo weather descriptions)
        const condition = forecast.weather_condition.toLowerCase();
        const ruleCondition = rule.weather_condition.toLowerCase();
        
        if (condition.includes(ruleCondition) || 
            (ruleCondition.includes('rain') && (condition.includes('rain') || condition.includes('drizzle'))) ||
            (ruleCondition.includes('snow') && condition.includes('snow')) ||
            (ruleCondition.includes('clear') && condition.includes('clear')) ||
            (ruleCondition.includes('cloud') && condition.includes('cloud'))) {
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

// Function to convert Open-Meteo weather codes to descriptions
function getWeatherDescription(code: number): string {
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  
  return weatherCodes[code] || 'Unknown';
}