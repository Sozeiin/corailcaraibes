import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud, CloudRain, Sun, Wind, Thermometer, Droplets, RefreshCw, AlertTriangle, Calendar, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WeatherForecast {
  id: string;
  forecast_date: string;
  temperature_min: number;
  temperature_max: number;
  humidity: number;
  wind_speed: number;
  precipitation: number;
  weather_condition: string;
  weather_code: string;
  fetched_at: string;
}

interface WeatherNotification {
  id: string;
  weather_condition: string;
  notification_type: string;
  message: string;
  severity: string;
  created_at: string;
  maintenance_id?: string;
}

interface WeatherDashboardProps {
  isEnabled: boolean;
}

export function WeatherDashboard({ isEnabled }: WeatherDashboardProps) {
  const { toast } = useToast();
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
  const [notifications, setNotifications] = useState<WeatherNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (isEnabled) {
      loadWeatherData();
      loadNotifications();
    }
  }, [isEnabled]);

  const loadWeatherData = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_forecasts')
        .select('*')
        .gte('forecast_date', new Date().toISOString().split('T')[0])
        .order('forecast_date', { ascending: true })
        .limit(7);

      if (error) throw error;

      setForecasts(data || []);
      if (data && data.length > 0) {
        setLastSync(data[0].fetched_at);
      }
    } catch (error) {
      console.error('Error loading weather data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données météo.",
        variant: "destructive"
      });
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading weather notifications:', error);
    }
  };

  const syncWeatherData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather-sync');
      
      if (error) throw error;

      toast({
        title: "Synchronisation terminée",
        description: "Les données météo ont été mises à jour avec succès."
      });

      await loadWeatherData();
      await loadNotifications();
    } catch (error) {
      console.error('Error syncing weather:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser les données météo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle')) return <CloudRain className="h-5 w-5" />;
    if (lower.includes('cloud')) return <Cloud className="h-5 w-5" />;
    if (lower.includes('clear') || lower.includes('sun')) return <Sun className="h-5 w-5" />;
    return <Cloud className="h-5 w-5" />;
  };

  const getWeatherColor = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('storm')) return 'destructive';
    if (lower.includes('cloud')) return 'secondary';
    return 'default';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isEnabled) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          La planification automatique doit être activée pour utiliser le dashboard météo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dashboard Météo</h3>
          <p className="text-sm text-muted-foreground">
            Prévisions météorologiques et impact sur la planification des maintenances
          </p>
          {lastSync && (
            <p className="text-xs text-muted-foreground mt-1">
              Dernière mise à jour: {new Date(lastSync).toLocaleString('fr-FR')}
            </p>
          )}
        </div>
        <Button onClick={syncWeatherData} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Synchroniser
        </Button>
      </div>

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">Prévisions</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="impact">Impact Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-4">
          {forecasts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {forecasts.map((forecast) => (
                <Card key={forecast.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {formatDate(forecast.forecast_date)}
                      </CardTitle>
                      <Badge variant={getWeatherColor(forecast.weather_condition)}>
                        {getWeatherIcon(forecast.weather_condition)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {Math.round(forecast.temperature_min)}° / {Math.round(forecast.temperature_max)}°
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Wind className="h-3 w-3" />
                          Vent
                        </span>
                        <span>{Math.round(forecast.wind_speed)} m/s</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Droplets className="h-3 w-3" />
                          Humidité
                        </span>
                        <span>{Math.round(forecast.humidity)}%</span>
                      </div>
                      
                      {forecast.precipitation > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <CloudRain className="h-3 w-3" />
                            Précipitations
                          </span>
                          <span>{Math.round(forecast.precipitation)}mm</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-medium text-center pt-2 border-t">
                      {forecast.weather_condition}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucune donnée météo disponible.
                  <br />
                  Cliquez sur "Synchroniser" pour récupérer les prévisions.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Alert key={notification.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <AlertDescription className="font-medium">
                        {notification.message}
                      </AlertDescription>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant={getSeverityColor(notification.severity)}>
                      {notification.severity}
                    </Badge>
                  </div>
                </Alert>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucune alerte météo en cours.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Impact sur la planification
              </CardTitle>
              <CardDescription>
                Analyse de l'impact des conditions météo sur les maintenances programmées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">2</div>
                  <p className="text-sm text-muted-foreground">Maintenances confirmées</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">1</div>
                  <p className="text-sm text-muted-foreground">Maintenances à risque</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <p className="text-sm text-muted-foreground">Maintenances reportées</p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le planning détaillé
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}