import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  User,
  Calendar,
  FileText
} from 'lucide-react';

interface ChecklistDetailsModalProps {
  checklistId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ChecklistDetailsModal = ({ 
  checklistId, 
  isOpen, 
  onClose 
}: ChecklistDetailsModalProps) => {
  const { data: checklist, isLoading } = useQuery({
    queryKey: ['checklist-details', checklistId],
    queryFn: async () => {
      // Get checklist data
      const { data: checklistData, error: checklistError } = await supabase
        .from('boat_checklists')
        .select(`
          *,
          boats(name, model, year),
          technician:profiles!boat_checklists_technician_id_fkey(name, email),
          boat_checklist_items(
            *,
            checklist_items(name, category, is_required)
          )
        `)
        .eq('id', checklistId)
        .single();

      if (checklistError) throw checklistError;

      // Get potential rental data
      const { data: rentalData } = await supabase
        .from('boat_rentals')
        .select('customer_name, customer_email, start_date, end_date')
        .eq('boat_id', checklistData.boat_id)
        .gte('end_date', new Date(checklistData.checklist_date).toISOString().split('T')[0])
        .lte('start_date', new Date(checklistData.checklist_date).toISOString().split('T')[0])
        .maybeSingle();

      return {
        ...checklistData,
        rental: rentalData
      };
    },
    enabled: isOpen && !!checklistId
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'needs_repair':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'not_checked':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case 'needs_repair':
        return <Badge className="bg-yellow-100 text-yellow-800">À réparer</Badge>;
      case 'not_checked':
        return <Badge variant="outline">Non vérifié</Badge>;
      default:
        return <Badge variant="destructive">Problème</Badge>;
    }
  };

  const getGlobalStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case 'needs_attention':
        return <Badge className="bg-yellow-100 text-yellow-800">Attention requise</Badge>;
      case 'major_issues':
        return <Badge className="bg-red-100 text-red-800">Problèmes majeurs</Badge>;
      default:
        return <Badge variant="outline">Statut inconnu</Badge>;
    }
  };

  // Grouper les items par catégorie
  const itemsByCategory = checklist?.boat_checklist_items?.reduce((acc, item) => {
    const category = item.checklist_items?.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la checklist</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 text-center">Chargement des détails...</div>
        ) : !checklist ? (
          <div className="p-6 text-center text-muted-foreground">
            Checklist non trouvée
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Informations générales
                  {getGlobalStatusBadge(checklist.overall_status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Date</span>
                    </div>
                    <p className="text-sm">
                      {new Date(checklist.checklist_date).toLocaleDateString()}
                    </p>
                  </div>

                  {checklist.technician && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Technicien</span>
                      </div>
                      <p className="text-sm">{checklist.technician.name}</p>
                    </div>
                  )}

                  {checklist.boats && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium">Bateau</span>
                      </div>
                      <p className="text-sm">
                        {checklist.boats.name} - {checklist.boats.model} ({checklist.boats.year})
                      </p>
                    </div>
                  )}

                  {checklist.rental && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Client</span>
                      </div>
                      <p className="text-sm">{checklist.rental.customer_name}</p>
                    </div>
                  )}
                </div>

                {checklist.general_notes && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Notes générales</span>
                    </div>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                      {checklist.general_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Détail par catégorie */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Détail de l'inspection</h3>
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-base">{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(item.status)}
                              <span className="text-sm">
                                {item.checklist_items?.name}
                                {item.checklist_items?.is_required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </span>
                            </div>
                            {getStatusBadge(item.status)}
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 ml-7">
                              {item.notes}
                            </p>
                          )}
                          {index < items.length - 1 && <Separator className="mt-3" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Signatures */}
            {(checklist.technician_signature || checklist.customer_signature) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Signatures</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {checklist.technician_signature && (
                      <div>
                        <p className="text-sm font-medium mb-2">Technicien</p>
                        <div className="border rounded p-2 h-20 bg-gray-50 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Signature numérique</span>
                        </div>
                      </div>
                    )}
                    {checklist.customer_signature && (
                      <div>
                        <p className="text-sm font-medium mb-2">Client</p>
                        <div className="border rounded p-2 h-20 bg-gray-50 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Signature numérique</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {checklist.signature_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Signé le {new Date(checklist.signature_date).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};