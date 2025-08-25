import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, Cloud, Sun, CloudRain, Snowflake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
interface WeatherWidgetData {
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
interface WeatherWidgetProps {
  compact?: boolean;
}
const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  compact = false
}) => {
  const [weather, setWeather] = useState<WeatherWidgetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<string>('');
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();

  // Base-specific location configurations
  const baseLocations = {
    '550e8400-e29b-41d4-a716-446655440001': 'Le Marin, Martinique',
    '550e8400-e29b-41d4-a716-446655440002': 'Pointe-à-Pitre, Guadeloupe',
    '1491c828-a935-491b-87bd-c402fc4cebc1': 'Paris, France (Métropole)',
    // Default for unknown bases
    default: 'Paris, France'
  };
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
      // Use base-specific location based on user's base
      const baseId = user?.baseId;
      console.log('WeatherWidget: Current user baseId:', baseId);
      console.log('WeatherWidget: Available base locations:', baseLocations);
      const expectedLocation = baseId && baseLocations[baseId] ? baseLocations[baseId] : baseLocations.default;
      console.log('WeatherWidget: Expected location:', expectedLocation);
      setLocation(expectedLocation);
      await fetchWeatherByBaseId(baseId);
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast({
        title: "Erreur météo",
        description: "Impossible de récupérer les données météo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchWeatherByBaseId = async (baseId?: string) => {
    console.log('WeatherWidget: fetchWeatherByBaseId called with baseId', baseId);
    try {
      console.log('WeatherWidget: Calling Supabase edge function with baseId...');
      const {
        data,
        error
      } = await supabase.functions.invoke('get-weather', {
        body: {
          baseId
        }
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
      console.error('WeatherWidget: Error in fetchWeatherByBaseId:', error);
      // En cas d'erreur, utiliser des données statiques adaptées à la base
      console.log('WeatherWidget: Error occurred, falling back to static data');
      const baseId = user?.baseId;
      const fallbackLocation = baseId && baseLocations[baseId] ? baseLocations[baseId] : baseLocations.default;
      const staticWeather = {
        location: fallbackLocation,
        temperature: 18,
        condition: 'Partiellement nuageux',
        humidity: 65,
        windSpeed: 12,
        forecast: [{
          date: 'Auj',
          temp_max: 22,
          temp_min: 14,
          condition: 'Nuageux'
        }, {
          date: 'Dem',
          temp_max: 25,
          temp_min: 16,
          condition: 'Ensoleillé'
        }, {
          date: 'Mer',
          temp_max: 19,
          temp_min: 13,
          condition: 'Pluie'
        }]
      };
      setWeather(staticWeather);
      setLocation('Données de démonstration - ' + fallbackLocation);
    }
  };
  useEffect(() => {
    console.log('WeatherWidget: useEffect triggered');
    console.log('WeatherWidget: Current user object:', user);
    getLocationAndWeather();
  }, [user]);
  if (loading) {
    if (compact) {
      return <Card className="h-16">
          <CardContent className="p-4 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Chargement météo...</span>
            </div>
          </CardContent>
        </Card>;
    }
    return <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>;
  }
  if (!weather) {
    if (compact) {
      return <Card className="h-16">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Données météo non disponibles</span>
            <Button onClick={getLocationAndWeather} size="sm" variant="ghost">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>;
    }
    return <Card>
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
      </Card>;
  }
  if (compact) {
    return <Card className="h-auto h-auto ">
        <CardContent className="p-4 flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getWeatherIcon(weather.condition)}
              <span className="text-sm font-medium">{weather.temperature}°C</span>
              <span className="text-xs text-muted-foreground">{weather.condition}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {location}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-xs">
              <span>Humidité: {weather.humidity}%</span>
              <span>Vent: {weather.windSpeed} km/h</span>
            </div>
            
            <div className="flex items-center gap-2">
              {weather?.forecast?.map((day, index) => {
              if (!day) return null;
              const icon = getWeatherIcon(day.condition || '');
              return <div key={index} className="text-center text-xs">
                    <div className="font-medium text-[10px]">{day.date || ''}</div>
                    <div className="flex justify-center my-1">
                      <div className="h-3 w-3">{getWeatherIcon(day.condition || '')}</div>
                    </div>
                    <div className="text-[10px]">{day.temp_max || 0}°/{day.temp_min || 0}°</div>
                  </div>;
            }) || []}
            </div>
            
            <Button variant="ghost" size="sm" onClick={getLocationAndWeather} disabled={loading} className="h-8 w-8 p-0">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getWeatherIcon(weather.condition)}
            Météo
          </span>
          <Button variant="ghost" size="sm" onClick={getLocationAndWeather} disabled={loading}>
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
            {weather?.forecast?.map((day, index) => {
            if (!day) return null;
            return <div key={index} className="text-center p-2 bg-muted rounded">
                  <div className="font-medium">{day.date || ''}</div>
                  <div className="my-1">{getWeatherIcon(day.condition || '')}</div>
                  <div>{day.temp_max || 0}°/{day.temp_min || 0}°</div>
                </div>;
          }) || []}
          </div>
        </div>
      </CardContent>
    </Card>;
};
export default WeatherWidget;