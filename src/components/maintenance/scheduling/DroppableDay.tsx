import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CloudRain, Sun, Cloud, Wind } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DraggableIntervention } from './DraggableIntervention';

interface WeatherData {
  weather_condition: string;
  temperature_min: number;
  temperature_max: number;
  wind_speed?: number;
  precipitation?: number;
}

interface WeatherEvaluation {
  suitable: boolean;
  weather_data?: WeatherData;
  violated_rules?: Array<{
    rule_name: string;
    action: string;
    reason: string;
  }>;
}

interface Intervention {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  status: string;
  intervention_type: string;
  boat: {
    name: string;
  };
  technician?: {
    name: string;
  };
}

interface DroppableDayProps {
  date: Date;
  interventions: Intervention[];
  weatherEvaluation?: WeatherEvaluation;
}

const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes('rain') || lower.includes('pluie')) return CloudRain;
  if (lower.includes('cloud') || lower.includes('nuage')) return Cloud;
  if (lower.includes('wind') || lower.includes('vent')) return Wind;
  return Sun;
};

const getWeatherSeverity = (evaluation?: WeatherEvaluation) => {
  if (!evaluation || evaluation.suitable) return 'suitable';
  
  const violatedRules = evaluation.violated_rules || [];
  if (violatedRules.some(rule => rule.action === 'block')) return 'blocked';
  if (violatedRules.some(rule => rule.action === 'reschedule')) return 'warning';
  return 'suitable';
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'blocked': return 'bg-red-50 border-red-200 text-red-700';
    case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    default: return 'bg-green-50 border-green-200 text-green-700';
  }
};

export function DroppableDay({ date, interventions, weatherEvaluation }: DroppableDayProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: format(date, 'yyyy-MM-dd'),
  });

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const weatherSeverity = getWeatherSeverity(weatherEvaluation);
  const WeatherIcon = getWeatherIcon(weatherEvaluation?.weather_data?.weather_condition || '');

  return (
    <Card
      ref={setNodeRef}
      className={`
        h-full min-h-[200px] transition-all duration-200
        ${isOver ? 'ring-2 ring-primary bg-primary/5' : ''}
        ${isToday ? 'ring-1 ring-blue-300 bg-blue-50/30' : ''}
      `}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className={isToday ? 'text-blue-600 font-semibold' : ''}>
              {format(date, 'EEEE d', { locale: fr })}
            </span>
          </div>
          
          {weatherEvaluation && (
            <div className="flex items-center gap-1">
              <WeatherIcon className="w-4 h-4" />
              <Badge 
                variant="outline" 
                className={`text-xs ${getSeverityColor(weatherSeverity)}`}
              >
                {weatherEvaluation.weather_data && (
                  <span>
                    {Math.round(weatherEvaluation.weather_data.temperature_min)}°-
                    {Math.round(weatherEvaluation.weather_data.temperature_max)}°
                  </span>
                )}
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 p-3 pt-0">
        {weatherEvaluation && !weatherEvaluation.suitable && (
          <div className={`p-2 rounded text-xs ${getSeverityColor(weatherSeverity)}`}>
            {weatherEvaluation.violated_rules?.[0]?.rule_name || 'Conditions météo défavorables'}
          </div>
        )}

        <div className="space-y-2">
          {interventions.map((intervention) => (
            <DraggableIntervention 
              key={intervention.id} 
              intervention={intervention} 
            />
          ))}
        </div>

        {isOver && (
          <div className="border-2 border-dashed border-primary/50 rounded p-4 text-center text-sm text-muted-foreground">
            Déposer l'intervention ici
          </div>
        )}
      </CardContent>
    </Card>
  );
}