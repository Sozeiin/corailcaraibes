import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Clock, User, Wrench, TrendingUp, CheckCircle, X } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AISuggestion {
  id: string;
  type: 'schedule_optimization' | 'resource_allocation' | 'maintenance_prediction' | 'conflict_resolution';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  data: {
    activityId?: string;
    technicianId?: string;
    suggestedDate?: string;
    estimatedSavings?: number;
    reasoning: string;
  };
}

interface AISuggestionsProps {
  baseId: string;
  onApplySuggestion: (suggestion: AISuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

export function AISuggestions({ baseId, onApplySuggestion, onDismissSuggestion }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch planning data for AI analysis
  const { data: planningData } = useQuery({
    queryKey: ['planning-data-for-ai', baseId],
    queryFn: async () => {
      const [activitiesResult, techniciansResult, conflictsResult] = await Promise.all([
        supabase
          .from('planning_activities')
          .select('*')
          .eq('base_id', baseId)
          .gte('scheduled_start', new Date().toISOString()),
        
        supabase
          .from('profiles')
          .select('id, name, role')
          .eq('role', 'technicien'),
        
        supabase
          .from('planning_conflicts')
          .select('*')
          .eq('resolved', false)
      ]);

      return {
        activities: activitiesResult.data || [],
        technicians: techniciansResult.data || [],
        conflicts: conflictsResult.data || []
      };
    }
  });

  const generateAISuggestions = async () => {
    if (!planningData) return;
    
    setIsGenerating(true);
    
    try {
      // Simulate AI analysis - in a real implementation, this would call an AI service
      const newSuggestions: AISuggestion[] = [];

      // Schedule optimization suggestions
      const unassignedActivities = planningData.activities.filter(a => !a.technician_id);
      if (unassignedActivities.length > 0) {
        newSuggestions.push({
          id: `suggestion-${Date.now()}-1`,
          type: 'schedule_optimization',
          title: 'Optimiser l\'attribution des tâches',
          description: `${unassignedActivities.length} activités non assignées pourraient être optimisées`,
          confidence: 85,
          impact: 'high',
          data: {
            estimatedSavings: unassignedActivities.length * 30,
            reasoning: 'Attribution automatique basée sur les compétences et la disponibilité des techniciens'
          }
        });
      }

      // Resource allocation suggestions
      const technicianWorkload = planningData.technicians.map(tech => {
        const assignedActivities = planningData.activities.filter(a => a.technician_id === tech.id);
        return {
          technicianId: tech.id,
          name: tech.name,
          workload: assignedActivities.length
        };
      });

      const overloadedTechnicians = technicianWorkload.filter(t => t.workload > 5);
      const underloadedTechnicians = technicianWorkload.filter(t => t.workload < 2);

      if (overloadedTechnicians.length > 0 && underloadedTechnicians.length > 0) {
        newSuggestions.push({
          id: `suggestion-${Date.now()}-2`,
          type: 'resource_allocation',
          title: 'Rééquilibrer la charge de travail',
          description: 'Redistribuer les tâches entre les techniciens pour optimiser l\'efficacité',
          confidence: 78,
          impact: 'medium',
          data: {
            estimatedSavings: 45,
            reasoning: `${overloadedTechnicians.length} techniciens surchargés, ${underloadedTechnicians.length} sous-utilisés`
          }
        });
      }

      // Conflict resolution suggestions
      if (planningData.conflicts.length > 0) {
        newSuggestions.push({
          id: `suggestion-${Date.now()}-3`,
          type: 'conflict_resolution',
          title: 'Résoudre les conflits de planification',
          description: `${planningData.conflicts.length} conflits détectés nécessitent une résolution`,
          confidence: 92,
          impact: 'high',
          data: {
            estimatedSavings: planningData.conflicts.length * 20,
            reasoning: 'Ajustement automatique des créneaux pour éviter les chevauchements'
          }
        });
      }

      // Maintenance prediction suggestions
      const upcomingMaintenance = planningData.activities.filter(a => 
        a.activity_type === 'maintenance' && 
        new Date(a.scheduled_start) > addDays(new Date(), 7)
      );

      if (upcomingMaintenance.length > 0) {
        newSuggestions.push({
          id: `suggestion-${Date.now()}-4`,
          type: 'maintenance_prediction',
          title: 'Anticiper la maintenance préventive',
          description: 'Planifier les maintenances préventives avant les pannes',
          confidence: 71,
          impact: 'medium',
          data: {
            estimatedSavings: 120,
            reasoning: 'Analyse prédictive basée sur l\'historique des interventions'
          }
        });
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Erreur lors de la génération des suggestions IA:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (planningData) {
      generateAISuggestions();
    }
  }, [planningData]);

  const getSuggestionIcon = (type: AISuggestion['type']) => {
    switch (type) {
      case 'schedule_optimization': return <Clock className="w-4 h-4" />;
      case 'resource_allocation': return <User className="w-4 h-4" />;
      case 'maintenance_prediction': return <Wrench className="w-4 h-4" />;
      case 'conflict_resolution': return <TrendingUp className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getImpactColor = (impact: AISuggestion['impact']) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!planningData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Suggestions IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Chargement des données de planification...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Suggestions IA
          </CardTitle>
          <Button 
            onClick={generateAISuggestions} 
            disabled={isGenerating}
            size="sm"
            variant="outline"
          >
            {isGenerating ? 'Analyse...' : 'Actualiser'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune suggestion d'optimisation disponible</p>
            <p className="text-sm">Votre planification semble déjà optimisée !</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSuggestionIcon(suggestion.type)}
                      <h4 className="font-medium">{suggestion.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getImpactColor(suggestion.impact)}>
                        {suggestion.impact}
                      </Badge>
                      <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                        {suggestion.confidence}%
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {suggestion.description}
                  </p>
                  
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Raisonnement :</strong> {suggestion.data.reasoning}</p>
                    {suggestion.data.estimatedSavings && (
                      <p><strong>Économie estimée :</strong> {suggestion.data.estimatedSavings} minutes</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => onApplySuggestion(suggestion)}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Appliquer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDismissSuggestion(suggestion.id)}
                      className="flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Ignorer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}