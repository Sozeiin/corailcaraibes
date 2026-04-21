import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Wrench, Calendar, Clock, User, Package, 
  FileText, Gauge 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateSafe, formatDateTimeInTimezone } from '@/lib/dateUtils';

interface InterventionDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  interventionId: string;
}

export const InterventionDetailsDialog = ({ 
  isOpen, 
  onClose, 
  interventionId 
}: InterventionDetailsDialogProps) => {
  const { user } = useAuth();
  const tz = user?.timezone;

  const { data: intervention, isLoading } = useQuery({
    queryKey: ['intervention-details', interventionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          boats (name, model),
          profiles!technician_id (name)
        `)
        .eq('id', interventionId)
        .single();
      
      if (error) throw error;

      // Fetch intervention parts separately with better query
      const { data: parts, error: partsError } = await supabase
        .from('intervention_parts')
        .select(`
          *,
          stock_items:stock_item_id (
            name,
            reference,
            unit
          )
        `)
        .eq('intervention_id', interventionId);

      if (partsError) console.error('Error fetching parts:', partsError);

      return {
        ...data,
        intervention_parts: parts || []
      };
    },
    enabled: isOpen && !!interventionId
  });

  if (!isOpen) return null;

  const calculateDuration = () => {
    if (!intervention?.scheduled_date || !intervention?.completed_date) return null;
    
    const days = Math.ceil(
      (new Date(intervention.completed_date).getTime() - 
       new Date(intervention.scheduled_date).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const totalPartsCost = intervention?.intervention_parts
    ? intervention.intervention_parts.reduce((sum, part) => sum + (part.total_cost || 0), 0)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{intervention?.title}</DialogTitle>
            <Badge className={
              intervention?.status === 'completed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }>
              {intervention?.status === 'completed' ? 'Terminée' : intervention?.status === 'cancelled' ? 'Annulée' : 'En cours'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="h-4 w-4" />
            <span>{intervention?.intervention_type}</span>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Bateau</p>
                    <p className="text-sm text-muted-foreground">
                      {intervention?.boats?.name} ({intervention?.boats?.model})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Technicien</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {intervention?.profiles?.name || 'Non assigné'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date programmée</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {intervention?.scheduled_date 
                        ? formatDateSafe(intervention.scheduled_date, tz)
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date de finalisation</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {intervention?.completed_date 
                        ? formatDateSafe(intervention.completed_date, tz)
                        : 'N/A'
                      }
                    </p>
                  </div>
                  {calculateDuration() !== null && (
                    <div>
                      <p className="text-sm font-medium">Durée</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {calculateDuration()} jour(s)
                      </p>
                    </div>
                  )}
                </div>
                
                {intervention?.description && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {intervention.description}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Heures moteur */}
            {(intervention?.engine_hours_end_starboard || intervention?.engine_hours_end_port || intervention?.engine_hours_end) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Heures moteur
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {intervention.engine_hours_end_starboard && (
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Moteur Tribord</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>Début: {intervention.engine_hours_start_starboard || 'N/A'}h</span>
                            <span>Fin: {intervention.engine_hours_end_starboard}h</span>
                          </div>
                        </div>
                        {intervention.is_oil_change && (
                          <Badge variant="outline" className="bg-blue-50">
                            🛢️ Vidange effectuée
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {intervention.engine_hours_end_port && (
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Moteur Bâbord</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>Début: {intervention.engine_hours_start_port || 'N/A'}h</span>
                            <span>Fin: {intervention.engine_hours_end_port}h</span>
                          </div>
                        </div>
                        {intervention.is_oil_change && (
                          <Badge variant="outline" className="bg-blue-50">
                            🛢️ Vidange effectuée
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Legacy single engine hours */}
                  {intervention.engine_hours_end && !intervention.engine_hours_end_starboard && !intervention.engine_hours_end_port && (
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Heures moteur</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>Début: {intervention.engine_hours_start || 'N/A'}h</span>
                            <span>Fin: {intervention.engine_hours_end}h</span>
                          </div>
                        </div>
                        {intervention.is_oil_change && (
                          <Badge variant="outline" className="bg-blue-50">
                            🛢️ Vidange effectuée
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pièces utilisées */}
            {intervention?.intervention_parts && intervention.intervention_parts.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Pièces utilisées
                    </CardTitle>
                    <Badge variant="outline">
                      {intervention.intervention_parts.length} pièce(s)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pièce</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead className="text-right">Quantité</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {intervention.intervention_parts.map((part, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {part.stock_items?.name || part.part_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {part.stock_items?.reference || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {part.quantity} {part.stock_items?.unit || 'pcs'}
                          </TableCell>
                          <TableCell className="text-right">
                            {part.unit_cost?.toFixed(2) || '0.00'}€
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {part.total_cost?.toFixed(2) || '0.00'}€
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} className="text-right font-semibold">
                          Coût total des pièces
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {totalPartsCost.toFixed(2)}€
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Notes de finalisation */}
            {intervention?.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notes de finalisation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {intervention.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
