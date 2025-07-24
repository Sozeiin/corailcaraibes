import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CampaignAnalysisTabProps {
  campaignId: string;
}

export const CampaignAnalysisTab: React.FC<CampaignAnalysisTabProps> = ({ campaignId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: analysisData, isLoading } = useQuery({
    queryKey: ['campaign-analysis', campaignId],
    queryFn: async () => {
      // Get all quotes for this campaign
      const { data: quotes, error: quotesError } = await supabase
        .from('supplier_quotes')
        .select(`
          *,
          campaign_items!inner(
            campaign_id,
            product_name,
            total_quantity,
            estimated_unit_price
          ),
          suppliers(name)
        `)
        .eq('campaign_items.campaign_id', campaignId);

      if (quotesError) throw quotesError;

      // Get existing analysis
      const { data: analysis, error: analysisError } = await supabase
        .from('quote_analysis')
        .select('*')
        .eq('campaign_item_id', campaignId);

      if (analysisError) throw analysisError;

      return { quotes: quotes || [], analysis: analysis || [] };
    },
  });

  const generateAnalysisMutation = useMutation({
    mutationFn: async () => {
      if (!analysisData?.quotes) return;

      // Group quotes by item
      const quotesByItem = analysisData.quotes.reduce((acc, quote) => {
        const itemId = quote.campaign_item_id;
        if (!acc[itemId]) {
          acc[itemId] = [];
        }
        acc[itemId].push(quote);
        return acc;
      }, {} as Record<string, any[]>);

      // Generate analysis for each item
      for (const [itemId, itemQuotes] of Object.entries(quotesByItem)) {
        if (itemQuotes.length === 0) continue;

        // Find best quotes
        const bestPrice = itemQuotes.reduce((best, current) => 
          current.unit_price < best.unit_price ? current : best
        );
        
        const bestQuality = itemQuotes.reduce((best, current) => 
          current.quality_rating > best.quality_rating ? current : best
        );

        // Calculate value score (price/quality ratio)
        const quotesWithValue = itemQuotes.map(quote => ({
          ...quote,
          valueScore: quote.quality_rating / quote.unit_price
        }));
        
        const bestValue = quotesWithValue.reduce((best, current) => 
          current.valueScore > best.valueScore ? current : best
        );

        // Generate analysis data
        const analysisContent = {
          totalQuotes: itemQuotes.length,
          priceRange: {
            min: Math.min(...itemQuotes.map(q => q.unit_price)),
            max: Math.max(...itemQuotes.map(q => q.unit_price)),
            average: itemQuotes.reduce((sum, q) => sum + q.unit_price, 0) / itemQuotes.length
          },
          qualityRange: {
            min: Math.min(...itemQuotes.map(q => q.quality_rating)),
            max: Math.max(...itemQuotes.map(q => q.quality_rating)),
            average: itemQuotes.reduce((sum, q) => sum + q.quality_rating, 0) / itemQuotes.length
          },
          deliveryRange: {
            min: Math.min(...itemQuotes.map(q => q.delivery_time_days)),
            max: Math.max(...itemQuotes.map(q => q.delivery_time_days)),
            average: itemQuotes.reduce((sum, q) => sum + q.delivery_time_days, 0) / itemQuotes.length
          },
          recommendations: [
            `Prix le plus bas: ${bestPrice.suppliers?.name} (${bestPrice.unit_price}€)`,
            `Meilleure qualité: ${bestQuality.suppliers?.name} (${bestQuality.quality_rating}/5)`,
            `Meilleur rapport qualité/prix: ${bestValue.suppliers?.name}`
          ]
        };

        // Save analysis
        await supabase
          .from('quote_analysis')
          .upsert({
            campaign_item_id: itemId,
            analysis_data: analysisContent,
            best_price_quote_id: bestPrice.id,
            best_quality_quote_id: bestQuality.id,
            best_value_quote_id: bestValue.id,
            recommendation: `Recommandation: ${bestValue.suppliers?.name} pour le meilleur rapport qualité/prix`,
            analysis_date: new Date().toISOString()
          });
      }
    },
    onSuccess: () => {
      toast({
        title: "Analyse générée",
        description: "L'analyse comparative des devis a été générée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-analysis', campaignId] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de générer l'analyse.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!analysisData?.quotes || analysisData.quotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Analyse non disponible</h3>
            <p className="text-muted-foreground mb-4">
              Aucun devis disponible pour générer une analyse comparative.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group quotes by item for display
  const quotesByItem = analysisData.quotes.reduce((acc, quote) => {
    const itemName = quote.campaign_items?.product_name;
    if (!acc[itemName]) {
      acc[itemName] = [];
    }
    acc[itemName].push(quote);
    return acc;
  }, {} as Record<string, any[]>);

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'best_price': return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'best_quality': return <Award className="h-4 w-4 text-blue-600" />;
      case 'best_value': return <TrendingUp className="h-4 w-4 text-purple-600" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Analyse Comparative des Devis</h3>
          <p className="text-sm text-muted-foreground">
            Comparez les offres des fournisseurs et obtenez des recommandations
          </p>
        </div>
        <Button onClick={() => generateAnalysisMutation.mutate()}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Générer l'analyse
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles analysés</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(quotesByItem).length}</div>
            <p className="text-xs text-muted-foreground">
              Sur {analysisData.quotes.length} devis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Économies potentielles</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(() => {
                const totalEstimated = analysisData.quotes.reduce((sum, quote) => 
                  sum + (quote.campaign_items?.estimated_unit_price * quote.campaign_items?.total_quantity || 0), 0
                );
                const totalBestPrice = Object.values(quotesByItem).reduce((sum, itemQuotes) => {
                  const bestPrice = itemQuotes.reduce((best, current) => 
                    current.unit_price < best.unit_price ? current : best
                  );
                  return sum + (bestPrice.unit_price * bestPrice.campaign_items?.total_quantity || 0);
                }, 0);
                const savings = totalEstimated - totalBestPrice;
                return savings > 0 ? `${savings.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : '0€';
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Par rapport aux estimations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualité moyenne</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analysisData.quotes.reduce((sum, quote) => sum + quote.quality_rating, 0) / analysisData.quotes.length).toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              Note qualité générale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Délai moyen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analysisData.quotes.reduce((sum, quote) => sum + quote.delivery_time_days, 0) / analysisData.quotes.length)}j
            </div>
            <p className="text-xs text-muted-foreground">
              Livraison moyenne
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis by Item */}
      <div className="space-y-4">
        {Object.entries(quotesByItem).map(([itemName, itemQuotes]) => {
          const bestPrice = itemQuotes.reduce((best, current) => 
            current.unit_price < best.unit_price ? current : best
          );
          const bestQuality = itemQuotes.reduce((best, current) => 
            current.quality_rating > best.quality_rating ? current : best
          );
          const bestValue = itemQuotes.map(quote => ({
            ...quote,
            valueScore: quote.quality_rating / quote.unit_price
          })).reduce((best, current) => 
            current.valueScore > best.valueScore ? current : best
          );

          return (
            <Card key={itemName}>
              <CardHeader>
                <CardTitle className="text-lg">{itemName}</CardTitle>
                <div className="flex space-x-4 text-sm text-muted-foreground">
                  <span>{itemQuotes.length} devis reçus</span>
                  <span>Prix: {Math.min(...itemQuotes.map(q => q.unit_price))}€ - {Math.max(...itemQuotes.map(q => q.unit_price))}€</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium text-green-900">Meilleur prix</div>
                        <div className="text-sm text-green-700">
                          {bestPrice.suppliers?.name} - {bestPrice.unit_price}€
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <Award className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-900">Meilleure qualité</div>
                        <div className="text-sm text-blue-700">
                          {bestQuality.suppliers?.name} - {bestQuality.quality_rating}/5
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium text-purple-900">Meilleur rapport</div>
                        <div className="text-sm text-purple-700">
                          {bestValue.suppliers?.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quotes Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Qualité</TableHead>
                        <TableHead>Délai</TableHead>
                        <TableHead>Garantie</TableHead>
                        <TableHead>Recommandation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemQuotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-medium">
                            {quote.suppliers?.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{quote.unit_price}€</span>
                              {quote.id === bestPrice.id && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Meilleur prix
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{quote.quality_rating}/5</span>
                              {quote.id === bestQuality.id && (
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  Meilleure qualité
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{quote.delivery_time_days}j</TableCell>
                          <TableCell>{quote.warranty_months}m</TableCell>
                          <TableCell>
                            {quote.id === bestValue.id && (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                Recommandé
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};