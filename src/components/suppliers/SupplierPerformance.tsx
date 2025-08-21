import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Star, 
  TrendingUp, 
  Plus,
  Clock,
  DollarSign,
  Package,
  Award,
  Target,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SupplierPerformanceProps {
  baseId?: string;
}

export function SupplierPerformance({ baseId }: SupplierPerformanceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState({
    quality_score: 5,
    delivery_score: 5,
    price_score: 5,
    service_score: 5,
    notes: ''
  });

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['supplier-performance', baseId],
    queryFn: async () => {
      // Récupérer les fournisseurs avec leurs statistiques
      let suppliersQuery = supabase
        .from('suppliers')
        .select(`
          *,
          supplier_evaluations(*, profiles!evaluator_id(name)),
          supplier_contracts(*)
        `);

      if (baseId) {
        suppliersQuery = suppliersQuery.eq('base_id', baseId);
      }

      const { data: suppliers, error: suppliersError } = await suppliersQuery;
      if (suppliersError) throw suppliersError;

      // Récupérer les statistiques de commandes pour chaque fournisseur
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          supplier_id,
          created_at,
          delivery_date,
          status,
          order_items(quantity, unit_price)
        `)
        .in('status', ['delivered', 'completed']);

      if (ordersError) throw ordersError;

      // Calculer les métriques de performance pour chaque fournisseur
      const enrichedSuppliers = suppliers.map((supplier: any) => {
        const supplierOrders = orders.filter(o => o.supplier_id === supplier.id);
        
        // Calculer les métriques
        const totalOrders = supplierOrders.length;
        const totalValue = supplierOrders.reduce((sum, order) => {
          const orderValue = order.order_items.reduce((itemSum: number, item: any) => 
            itemSum + (item.quantity * item.unit_price), 0);
          return sum + orderValue;
        }, 0);

        const deliveryTimes = supplierOrders
          .filter(o => o.created_at && (o.delivery_date || o.created_at))
          .map(o => {
            const deliveryDate = o.delivery_date || o.created_at;
            return Math.floor(
              (new Date(deliveryDate).getTime() - new Date(o.created_at).getTime()) / 
              (1000 * 60 * 60 * 24)
            );
          });

        const avgDeliveryTime = deliveryTimes.length > 0 
          ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
          : 0;

        const onTimeDeliveries = deliveryTimes.filter(time => time <= 14).length;
        const onTimePercentage = totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 0;

        // Calculer la note moyenne des évaluations
        const avgEvaluation = supplier.supplier_evaluations.length > 0
          ? supplier.supplier_evaluations.reduce((sum: number, evaluation: any) => sum + parseFloat(evaluation.overall_score), 0) / supplier.supplier_evaluations.length
          : 0;

        // Score de performance global (sur 100)
        const performanceScore = calculatePerformanceScore({
          onTimePercentage,
          avgDeliveryTime,
          avgEvaluation,
          totalOrders,
          consistency: calculateConsistency(deliveryTimes)
        });

        return {
          ...supplier,
          metrics: {
            totalOrders,
            totalValue,
            avgDeliveryTime,
            onTimePercentage,
            avgEvaluation,
            performanceScore,
            lastOrderDate: supplierOrders.length > 0 
              ? Math.max(...supplierOrders.map(o => new Date(o.delivery_date || o.created_at).getTime()))
              : null
          }
        };
      });

      return enrichedSuppliers.sort((a, b) => b.metrics.performanceScore - a.metrics.performanceScore);
    },
  });

  const evaluationMutation = useMutation({
    mutationFn: async (evaluation: any) => {
      const { error } = await supabase
        .from('supplier_evaluations')
        .insert({
          ...evaluation,
          supplier_id: selectedSupplier.id,
          evaluator_id: user?.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Évaluation enregistrée",
        description: "L'évaluation du fournisseur a été enregistrée avec succès."
      });
      setIsEvaluationDialogOpen(false);
      setEvaluationForm({
        quality_score: 5,
        delivery_score: 5,
        price_score: 5,
        service_score: 5,
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['supplier-performance'] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'évaluation.",
        variant: "destructive"
      });
    }
  });

  const handleEvaluate = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsEvaluationDialogOpen(true);
  };

  const handleSubmitEvaluation = () => {
    evaluationMutation.mutate(evaluationForm);
  };

  const renderStars = (score: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(score) 
                ? 'text-yellow-400 fill-current' 
                : i === Math.floor(score) && score % 1 >= 0.5
                  ? 'text-yellow-400 fill-current opacity-50'
                  : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {score.toFixed(1)}
        </span>
      </div>
    );
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-800">Très Bon</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Bon</Badge>;
    if (score >= 60) return <Badge className="bg-orange-100 text-orange-800">Moyen</Badge>;
    return <Badge variant="destructive">Faible</Badge>;
  };

  if (isLoading) {
    return <OptimizedSkeleton type="table" count={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fournisseurs Évalués</p>
                <p className="text-2xl font-bold">
                  {performanceData?.filter(s => s.supplier_evaluations.length > 0).length || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Moyen</p>
                <p className="text-2xl font-bold">
                  {performanceData?.length > 0
                    ? (performanceData.reduce((sum, s) => sum + s.metrics.performanceScore, 0) / performanceData.length).toFixed(0)
                    : 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold truncate">
                  {performanceData?.[0]?.name || 'N/A'}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ponctualité Globale</p>
                <p className="text-2xl font-bold">
                  {performanceData?.length > 0
                    ? (performanceData.reduce((sum, s) => sum + s.metrics.onTimePercentage, 0) / performanceData.length).toFixed(0)
                    : 0}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau de performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance des Fournisseurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Score Global</TableHead>
                <TableHead>Évaluation Moyenne</TableHead>
                <TableHead>Commandes</TableHead>
                <TableHead>Valeur Totale</TableHead>
                <TableHead>Ponctualité</TableHead>
                <TableHead>Délai Moyen</TableHead>
                <TableHead>Dernière Commande</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceData?.map((supplier: any) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {supplier.category || 'Non catégorisé'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPerformanceBadge(supplier.metrics.performanceScore)}
                      <span className="text-sm text-muted-foreground">
                        {supplier.metrics.performanceScore.toFixed(0)}/100
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.metrics.avgEvaluation > 0 
                      ? renderStars(supplier.metrics.avgEvaluation)
                      : <span className="text-muted-foreground">Non évalué</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.metrics.totalOrders}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.metrics.totalValue.toLocaleString('fr-FR')} €</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${
                        supplier.metrics.onTimePercentage >= 90 ? 'bg-green-500' :
                        supplier.metrics.onTimePercentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span>{supplier.metrics.onTimePercentage.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.metrics.avgDeliveryTime.toFixed(0)} jours</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.metrics.lastOrderDate ? (
                      <span className="text-sm">
                        {new Date(supplier.metrics.lastOrderDate).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Aucune</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEvaluate(supplier)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Évaluer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog d'évaluation */}
      <Dialog open={isEvaluationDialogOpen} onOpenChange={setIsEvaluationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Évaluer {selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { key: 'quality_score', label: 'Qualité des produits', icon: Package },
              { key: 'delivery_score', label: 'Respect des délais', icon: Clock },
              { key: 'price_score', label: 'Compétitivité des prix', icon: DollarSign },
              { key: 'service_score', label: 'Service client', icon: Star }
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setEvaluationForm(prev => ({ ...prev, [key]: rating }))}
                      className="p-1"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          rating <= Number(evaluationForm[key as keyof typeof evaluationForm] || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {evaluationForm[key as keyof typeof evaluationForm]}/5
                  </span>
                </div>
              </div>
            ))}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                value={evaluationForm.notes}
                onChange={(e) => setEvaluationForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Commentaires sur la performance du fournisseur..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEvaluationDialogOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSubmitEvaluation}
                disabled={evaluationMutation.isPending}
                className="flex-1"
              >
                {evaluationMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Fonction utilitaire pour calculer le score de performance
function calculatePerformanceScore({ 
  onTimePercentage, 
  avgDeliveryTime, 
  avgEvaluation, 
  totalOrders,
  consistency 
}: {
  onTimePercentage: number;
  avgDeliveryTime: number;
  avgEvaluation: number;
  totalOrders: number;
  consistency: number;
}) {
  let score = 0;
  
  // Ponctualité (35 points)
  score += Math.min(35, (onTimePercentage / 100) * 35);
  
  // Délais de livraison (25 points)
  const deliveryScore = Math.max(0, 25 - Math.max(0, avgDeliveryTime - 7) * 2);
  score += deliveryScore;
  
  // Évaluation moyenne (25 points)
  if (avgEvaluation > 0) {
    score += (avgEvaluation / 5) * 25;
  } else {
    score += 15; // Score par défaut si pas d'évaluation
  }
  
  // Volume de commandes (10 points)
  score += Math.min(10, Number(totalOrders) * 0.5);
  
  // Consistance (5 points)
  score += Number(consistency) * 5;
  
  return Math.min(100, Math.max(0, score));
}

// Fonction utilitaire pour calculer la consistance des délais
function calculateConsistency(deliveryTimes: number[]) {
  if (deliveryTimes.length < 2) return 1;
  
  const mean = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
  const variance = deliveryTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / deliveryTimes.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Plus la déviation standard est faible, plus la consistance est élevée
  return Math.max(0, 1 - (standardDeviation / mean));
}