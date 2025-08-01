import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { Wrench, Calendar, Ship, AlertCircle, TrendingUp } from 'lucide-react';
import { UsageHistoryItem } from '@/types';

interface UsageAnalysisProps {
  stockItemId: string;
}

export function UsageAnalysis({ stockItemId }: UsageAnalysisProps) {
  const { data: usageData, isLoading } = useQuery({
    queryKey: ['usage-analysis', stockItemId],
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervention_parts')
        .select(`
          id,
          quantity,
          unit_cost,
          total_cost,
          used_at,
          notes,
          interventions (
            id,
            title,
            scheduled_date,
            completed_date,
            boats (
              name
            )
          )
        `)
        .eq('stock_item_id', stockItemId)
        .order('used_at', { ascending: false });

      if (error) throw error;

      const usageHistory = data.map(item => ({
        id: item.id,
        interventionTitle: item.interventions?.title || 'Intervention inconnue',
        boatName: item.interventions?.boats?.name || 'Bateau inconnu',
        usedAt: item.used_at || item.interventions?.completed_date || item.interventions?.scheduled_date || new Date().toISOString(),
        quantity: item.quantity,
        unitCost: item.unit_cost,
        totalCost: item.total_cost,
        notes: item.notes
      })) as UsageHistoryItem[];

      // Calculate usage statistics
      const totalUsed = usageHistory.reduce((sum, item) => sum + item.quantity, 0);
      const totalCost = usageHistory.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const uniqueBoats = new Set(usageHistory.map(item => item.boatName)).size;
      const uniqueInterventions = usageHistory.length;

      // Monthly usage analysis
      const monthlyUsage = new Map();
      usageHistory.forEach(item => {
        const month = new Date(item.usedAt).toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyUsage.has(month)) {
          monthlyUsage.set(month, { quantity: 0, cost: 0, interventions: 0 });
        }
        const monthly = monthlyUsage.get(month);
        monthly.quantity += item.quantity;
        monthly.cost += item.totalCost || 0;
        monthly.interventions += 1;
      });

      // Calculate average monthly usage (last 6 months)
      const now = new Date();
      let avgMonthlyUsage = 0;
      let monthsWithUsage = 0;
      
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().substring(0, 7);
        if (monthlyUsage.has(monthKey)) {
          avgMonthlyUsage += monthlyUsage.get(monthKey).quantity;
          monthsWithUsage++;
        }
      }
      
      if (monthsWithUsage > 0) {
        avgMonthlyUsage = avgMonthlyUsage / monthsWithUsage;
      }

      return {
        usageHistory,
        totalUsed,
        totalCost,
        uniqueBoats,
        uniqueInterventions,
        avgMonthlyUsage,
        monthlyUsage: Array.from(monthlyUsage.entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 6)
      };
    }
  });

  if (isLoading) {
    return <OptimizedSkeleton type="grid" count={4} />;
  }

  if (!usageData || usageData.usageHistory.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-center mb-2">
            Aucune utilisation enregistrée
          </h3>
          <p className="text-muted-foreground text-center">
            Cet article n'a pas encore été utilisé dans des interventions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Quantité utilisée</span>
            </div>
            <div className="text-xl font-bold">{usageData.totalUsed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Interventions</span>
            </div>
            <div className="text-xl font-bold">{usageData.uniqueInterventions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ship className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bateaux</span>
            </div>
            <div className="text-xl font-bold">{usageData.uniqueBoats}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Usage/mois</span>
            </div>
            <div className="text-xl font-bold">
              {usageData.avgMonthlyUsage.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            {usageData.monthlyUsage.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Aucune donnée mensuelle disponible
              </div>
            ) : (
              <div className="space-y-3">
                {usageData.monthlyUsage.map(([month, data]) => (
                  <div key={month} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">
                        {new Date(month + '-01').toLocaleDateString('fr-FR', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {data.interventions} intervention(s)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{data.quantity} unités</div>
                      {data.cost > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {data.cost.toFixed(2)} €
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières utilisations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageData.usageHistory.slice(0, 5).map((usage) => (
                <div key={usage.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {usage.interventionTitle}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {usage.boatName}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Qté: {usage.quantity}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(usage.usedAt).toLocaleDateString('fr-FR')}
                    </span>
                    {usage.totalCost && (
                      <>
                        <span>•</span>
                        <span>{usage.totalCost.toFixed(2)} €</span>
                      </>
                    )}
                  </div>

                  {usage.notes && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      {usage.notes}
                    </p>
                  )}
                </div>
              ))}
              {usageData.usageHistory.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  ... et {usageData.usageHistory.length - 5} autre(s) utilisation(s)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {usageData.totalCost > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analyse des coûts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {usageData.totalCost.toFixed(2)} €
                </div>
                <div className="text-sm text-muted-foreground">Coût total d'utilisation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(usageData.totalCost / usageData.totalUsed).toFixed(2)} €
                </div>
                <div className="text-sm text-muted-foreground">Coût moyen par unité</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(usageData.totalCost / usageData.uniqueInterventions).toFixed(2)} €
                </div>
                <div className="text-sm text-muted-foreground">Coût moyen par intervention</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}