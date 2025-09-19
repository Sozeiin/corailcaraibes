import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreHorizontal, UserPlus, Trash2, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PreparationOrder } from '@/hooks/usePreparationOrders';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PreparationOrdersTableProps {
  orders: PreparationOrder[];
  onDeleteOrder: (orderId: string) => void;
  onAssignTechnician: (orderId: string, technicianId: string) => void;
  isDeleting: boolean;
  isAssigning: boolean;
}

export function PreparationOrdersTable({ 
  orders, 
  onDeleteOrder, 
  onAssignTechnician, 
  isDeleting, 
  isAssigning 
}: PreparationOrdersTableProps) {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Fetch technicians for assignment
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', user?.baseId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'technicien');

      if (user?.role !== 'direction') {
        query = query.eq('base_id', user?.baseId);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string, anomaliesCount: number = 0) => {
    if (anomaliesCount > 0 && status === 'completed') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Anomalie ({anomaliesCount})
        </Badge>
      );
    }

    switch (status) {
      case 'planned':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Planifié
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            En cours
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Terminé
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3" />
            Annulé
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Haute</Badge>;
      case 'medium':
        return <Badge variant="secondary">Moyenne</Badge>;
      case 'low':
        return <Badge variant="outline">Basse</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const handleAssignTechnician = (technicianId: string) => {
    if (selectedOrder) {
      onAssignTechnician(selectedOrder, technicianId);
      setIsAssignDialogOpen(false);
      setSelectedOrder(null);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Aucun ordre de préparation</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bateau</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Technicien</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Planification</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{order.boat.name}</div>
                    <div className="text-sm text-muted-foreground">{order.boat.model}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(order.status, order.anomalies_count)}
                </TableCell>
                <TableCell>
                  {order.technician ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {order.technician.name}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      Non assigné
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {order.planning_activity?.priority ? 
                    getPriorityBadge(order.planning_activity.priority) : 
                    <span className="text-muted-foreground">-</span>
                  }
                </TableCell>
                <TableCell>
                  {order.planning_activity?.scheduled_start ? (
                    <div className="text-sm">
                      <div>{format(new Date(order.planning_activity.scheduled_start), 'dd/MM/yyyy', { locale: fr })}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(order.planning_activity.scheduled_start), 'HH:mm', { locale: fr })} - 
                        {order.planning_activity.scheduled_end && format(new Date(order.planning_activity.scheduled_end), 'HH:mm', { locale: fr })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Non planifié</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {order.template?.name || 'Aucun modèle'}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => console.log('View details:', order.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir détails
                      </DropdownMenuItem>
                      {!order.technician && (
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedOrder(order.id);
                            setIsAssignDialogOpen(true);
                          }}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assigner technicien
                        </DropdownMenuItem>
                      )}
                      {order.status === 'planned' && (
                        <DropdownMenuItem 
                          onClick={() => onDeleteOrder(order.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Assign Technician Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un technicien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un technicien pour cette préparation de bateau.
            </p>
            <Select onValueChange={handleAssignTechnician}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un technicien" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}