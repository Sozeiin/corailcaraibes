import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, Plus, Calendar, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { BoatSafetyControlDialog } from './BoatSafetyControlDialog';
import { calculateControlStatus } from '@/utils/safetyControlUtils';

interface BoatSafetyControlHistoryProps {
  boatId: string;
}

export const BoatSafetyControlHistory = ({ boatId }: BoatSafetyControlHistoryProps) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<any>(null);

  const { data: safetyControls, isLoading } = useQuery({
    queryKey: ['boat-safety-controls', boatId, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_safety_controls')
        .select(`
          *,
          safety_control_categories(*),
          performed_by_profile:profiles!boat_safety_controls_performed_by_fkey(*),
          validated_by_profile:profiles!boat_safety_controls_validated_by_fkey(*),
          boat_safety_control_items(*)
        `)
        .eq('boat_id', boatId)
        .eq('control_year', selectedYear)
        .order('control_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['safety-control-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_control_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (control: any) => {
    // Calculate the real status using the shared utility
    const realStatus = calculateControlStatus(control);
    
    const variants = {
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-emerald-600' },
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-amber-600' },
      expired: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
    };

    const config = variants[realStatus as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {realStatus === 'completed' && 'Effectué'}
        {realStatus === 'pending' && 'En attente'}
        {realStatus === 'expired' && 'Expiré'}
        {realStatus === 'failed' && 'Échec'}
      </Badge>
    );
  };

  const handleEditControl = (control: any) => {
    setSelectedControl(control);
    setDialogOpen(true);
  };

  const handleCreateControl = () => {
    setSelectedControl(null);
    setDialogOpen(true);
  };

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">Contrôles de Sécurité</h3>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreateControl} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrôle
          </Button>
        </div>
      </div>

      {!safetyControls || safetyControls.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun contrôle de sécurité</h3>
            <p className="text-muted-foreground mb-4">
              Aucun contrôle de sécurité n'a été enregistré pour l'année {selectedYear}.
            </p>
            <Button onClick={handleCreateControl}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier contrôle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Contrôles {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type de contrôle</TableHead>
                  <TableHead>Date de contrôle</TableHead>
                  <TableHead>Prochaine échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Effectué par</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safetyControls.map((control) => (
                  <TableRow key={control.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: control.safety_control_categories?.color_code || '#3b82f6' }}
                        />
                        <span className="font-medium">{control.safety_control_categories?.name || 'Type non spécifié'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {control.control_date ? 
                        format(new Date(control.control_date), 'dd/MM/yyyy', { locale: fr }) 
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {control.next_control_date ? 
                        format(new Date(control.next_control_date), 'dd/MM/yyyy', { locale: fr })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(control)}
                    </TableCell>
                    <TableCell>
                      {control.performed_by_profile?.name || 'Non spécifié'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={control.notes}>
                        {control.notes || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditControl(control)}
                      >
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <BoatSafetyControlDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        boatId={boatId}
        control={selectedControl}
        categories={categories || []}
        year={selectedYear}
      />
    </div>
  );
};