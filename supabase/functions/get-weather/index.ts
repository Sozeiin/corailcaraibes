import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openWeatherApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, baseId } = await req.json();

    // Base-specific location configurations
    const baseLocations = {
      '550e8400-e29b-41d4-a716-446655440001': {
        lat: 14.4698,
        lon: -60.8725,
        displayName: 'Le Marin, Martinique'
      },
      '550e8400-e29b-41d4-a716-446655440002': {
        lat: 16.2304,
        lon: -61.5320,
        displayName: 'Pointe-à-Pitre, Guadeloupe'
      },
      // Default for Metropolitan base and others
      default: {
        lat: 48.8566,
        lon: 2.3522,
        displayName: 'Paris, France'
      }
    };

    // Determine location based on baseId if provided
    let finalLat = lat;
    let finalLon = lon;
    let locationDisplayName = null;

    if (baseId && baseLocations[baseId]) {
      finalLat = baseLocations[baseId].lat;
      finalLon = baseLocations[baseId].lon;
      locationDisplayName = baseLocations[baseId].displayName;
    } else if (baseId) {
      // Use default location for unknown baseIds
      finalLat = baseLocations.default.lat;
      finalLon = baseLocations.default.lon;
      locationDisplayName = baseLocations.default.displayName;
    }

    if (!openWeatherApiKey) {
      console.error('OpenWeatherMap API key not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching weather for coordinates: ${finalLat}, ${finalLon}${locationDisplayName ? ` (${locationDisplayName})` : ''}`);

    // Get current weather
    const currentWeatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${finalLat}&lon=${finalLon}&appid=${openWeatherApiKey}&units=metric&lang=fr`
    );

    if (!currentWeatherResponse.ok) {
      console.error('OpenWeatherMap current weather API error:', currentWeatherResponse.statusText);
      throw new Error('Failed to fetch current weather');
    }

    const currentWeather = await currentWeatherResponse.json();

    // Get 5-day forecast
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${finalLat}&lon=${finalLon}&appid=${openWeatherApiKey}&units=metric&lang=fr`
    );

    let forecast = [];
    if (forecastResponse.ok) {
      const forecastData = await forecastResponse.json();
      // Get daily forecasts (every 24 hours from the list)
      const dailyForecasts = forecastData.list.filter((_: any, index: number) => index % 8 === 0).slice(0, 3);
      
      forecast = dailyForecasts.map((item: any, index: number) => ({
        date: index === 0 ? 'Auj' : index === 1 ? 'Dem' : 'Mer',
        temp_max: Math.round(item.main.temp_max),
        temp_min: Math.round(item.main.temp_min),
        condition: item.weather[0].description
      }));
    } else {
      // Fallback forecast if 5-day forecast fails
      forecast = [
        {
          date: 'Auj',
          temp_max: Math.round(currentWeather.main.temp_max),
          temp_min: Math.round(currentWeather.main.temp_min),
          condition: currentWeather.weather[0].description
        },
        {
          date: 'Dem',
          temp_max: Math.round(currentWeather.main.temp_max + Math.random() * 4 - 2),
          temp_min: Math.round(currentWeather.main.temp_min + Math.random() * 4 - 2),
          condition: 'Partiellement nuageux'
        },
        {
          date: 'Mer',
          temp_max: Math.round(currentWeather.main.temp_max + Math.random() * 6 - 3),
          temp_min: Math.round(currentWeather.main.temp_min + Math.random() * 6 - 3),
          condition: 'Variable'
        }
      ];
    }

    const weatherData = {
      location: locationDisplayName || `${currentWeather.name}, ${currentWeather.sys.country}`,
      temperature: Math.round(currentWeather.main.temp),
      condition: currentWeather.weather[0].description,
      humidity: currentWeather.main.humidity,
      windSpeed: Math.round(currentWeather.wind.speed * 3.6), // m/s to km/h
      forecast: forecast
    };

    console.log('Weather data fetched successfully:', weatherData);

    return new Response(
      JSON.stringify(weatherData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-weather function:', error);
    
    // Return fallback weather data
    const fallbackData = {
      location: 'Paris, FR',
      temperature: 18,
      condition: 'Partiellement nuageux',
      humidity: 65,
      windSpeed: 12,
      forecast: [
        {
          date: 'Auj',
          temp_max: 22,
          temp_min: 14,
          condition: 'Nuageux'
        },
        {
          date: 'Dem',
          temp_max: 25,
          temp_min: 16,
          condition: 'Ensoleillé'
        },
        {
          date: 'Mer',
          temp_max: 19,
          temp_min: 13,
          condition: 'Pluie'
        }
      ]
    };

    return new Response(
      JSON.stringify(fallbackData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});