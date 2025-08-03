import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, Cloud, Sun, CloudRain, Snowflake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    condition: string;
  }>;
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<string>('');
  const { toast } = useToast();

  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    }
    if (lowerCondition.includes('snow')) {
      return <Snowflake className="h-8 w-8 text-blue-200" />;
    }
    if (lowerCondition.includes('cloud')) {
      return <Cloud className="h-8 w-8 text-gray-500" />;
    }
    return <Sun className="h-8 w-8 text-yellow-500" />;
  };

  const getLocationAndWeather = async () => {
    setLoading(true);
    try {
      // Essayer d'obtenir la géolocalisation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeatherByCoords(latitude, longitude);
          },
          async (error) => {
            console.log('Geolocation error:', error);
            // Fallback vers une localisation par défaut (Paris)
            await fetchWeatherByCoords(48.8566, 2.3522);
            setLocation('Paris, France (par défaut)');
          }
        );
      } else {
        // Fallback vers une localisation par défaut
        await fetchWeatherByCoords(48.8566, 2.3522);
        setLocation('Paris, France (par défaut)');
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast({
        title: "Erreur météo",
        description: "Impossible de récupérer les données météo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    try {
      // Récupérer le nom de la localisation
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'WeatherWidget/1.0 (maintenance-app)'
          }
        }
      );
      
      let locationName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.display_name) {
          const parts = geocodeData.display_name.split(',');
          locationName = parts.slice(0, 2).join(',').trim();
        }
      }

      // Récupérer les données météo
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3`
      );

      if (!weatherResponse.ok) {
        throw new Error('Weather API error');
      }

      const weatherData = await weatherResponse.json();
      
      const weatherConditions: { [key: number]: string } = {
        0: 'Ciel clair',
        1: 'Principalement clair',
        2: 'Partiellement nuageux',
        3: 'Couvert',
        45: 'Brouillard',
        48: 'Brouillard givrant',
        51: 'Bruine légère',
        53: 'Bruine modérée',
        55: 'Bruine dense',
        61: 'Pluie légère',
        63: 'Pluie modérée',
        65: 'Pluie forte',
        71: 'Neige légère',
        73: 'Neige modérée',
        75: 'Neige forte',
        80: 'Averses légères',
        81: 'Averses modérées',
        82: 'Averses violentes',
        95: 'Orage'
      };

      setWeather({
        location: locationName,
        temperature: Math.round(weatherData.current.temperature_2m),
        condition: weatherConditions[weatherData.current.weather_code] || 'Inconnu',
        humidity: weatherData.current.relative_humidity_2m,
        windSpeed: weatherData.current.wind_speed_10m,
        forecast: weatherData.daily.time.slice(0, 3).map((date: string, index: number) => ({
          date: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
          temp_max: Math.round(weatherData.daily.temperature_2m_max[index]),
          temp_min: Math.round(weatherData.daily.temperature_2m_min[index]),
          condition: weatherConditions[weatherData.daily.weather_code[index]] || 'Inconnu'
        }))
      });
      setLocation(locationName);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    getLocationAndWeather();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Météo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">Données non disponibles</p>
            <Button onClick={getLocationAndWeather} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getWeatherIcon(weather.condition)}
            Météo
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={getLocationAndWeather}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {location}
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{weather.temperature}°C</div>
            <div className="text-sm text-muted-foreground">{weather.condition}</div>
          </div>
          <div className="text-right text-sm space-y-1">
            <div>Humidité: {weather.humidity}%</div>
            <div>Vent: {weather.windSpeed} km/h</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-2">Prévisions 3 jours</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {weather.forecast.map((day, index) => (
              <div key={index} className="text-center p-2 bg-muted rounded">
                <div className="font-medium">{day.date}</div>
                <div className="my-1">{getWeatherIcon(day.condition)}</div>
                <div>{day.temp_max}°/{day.temp_min}°</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;