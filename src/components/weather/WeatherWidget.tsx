import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, Cloud, Sun, CloudRain, Snowflake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    console.log('WeatherWidget: fetchWeatherByCoords called with', lat, lon);
    try {
      console.log('WeatherWidget: Calling Supabase edge function...');
      
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { lat, lon }
      });

      if (error) {
        console.error('WeatherWidget: Supabase function error:', error);
        throw error;
      }

      if (data) {
        console.log('WeatherWidget: Weather data received:', data);
        setWeather(data);
        setLocation(data.location);
      } else {
        throw new Error('No data received from weather function');
      }
    } catch (error) {
      console.error('WeatherWidget: Error in fetchWeatherByCoords:', error);
      // En cas d'erreur, utiliser des données statiques
      console.log('WeatherWidget: Error occurred, falling back to static data');
      const staticWeather = {
        location: 'Paris, France',
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
      setWeather(staticWeather);
      setLocation('Données de démonstration');
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