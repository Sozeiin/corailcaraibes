import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Clock, CheckCircle, XCircle, Truck, Eye } from 'lucide-react';
import { SupplyRequestDialog } from '@/components/supply/SupplyRequestDialog';
import { SupplyRequestDetailsDialog } from '@/components/supply/SupplyRequestDetailsDialog';
import { SupplyRequestFilters } from '@/components/supply/SupplyRequestFilters';
import { SupplyManagementDialog } from '@/components/supply/SupplyManagementDialog';

export interface SupplyRequest {
  id: string;
  request_number: string;
  requested_by: string;
  base_id: string;
  boat_id?: string;
  item_name: string;
  item_reference?: string;
  description?: string;
  quantity_needed: number;
  urgency_level: string; // Changed from union type to string
  photo_url?: string;
  status: string; // Changed from union type to string 
  validated_at?: string;
  validated_by?: string;
  rejection_reason?: string;
  purchase_price?: number;
  supplier_name?: string;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  completed_at?: string;
  stock_item_id?: string;
  created_at: string;
  updated_at: string;
  boat?: { name: string };
  requester?: { name: string };
}

export default function SupplyRequests() {
  const { user } = useAuth();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isManagementDialogOpen, setIsManagementDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch supply requests
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['supply-requests', user?.role, user?.baseId, statusFilter, urgencyFilter, searchTerm],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('supply_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (user?.role !== 'direction' && user?.baseId) {
        query = query.eq('base_id', user.baseId);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (urgencyFilter !== 'all') {
        query = query.eq('urgency_level', urgencyFilter);
      }

      if (searchTerm) {
        query = query.or(`item_name.ilike.%${searchTerm}%,request_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const requests = data || [];

      const requesterIds = Array.from(
        new Set(requests.map((r) => r.requested_by).filter(Boolean))
      );
      const boatIds = Array.from(
        new Set(requests.map((r) => r.boat_id).filter(Boolean))
      );

      const [profilesRes, boatsRes] = await Promise.all([
        requesterIds.length
          ? supabase.from('profiles').select('id, name').in('id', requesterIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        boatIds.length
          ? supabase.from('boats').select('id, name').in('id', boatIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const requesterMap: Record<string, string> = Object.fromEntries(
        (profilesRes.data || []).map((p: any) => [p.id, p.name])
      );
      const boatMap: Record<string, string> = Object.fromEntries(
        (boatsRes.data || []).map((b: any) => [b.id, b.name])
      );

      return requests.map((r: any) => ({
        ...r,
        requester: r.requested_by
          ? { name: requesterMap[r.requested_by] || '' }
          : undefined,
        boat: r.boat_id ? { name: boatMap[r.boat_id] || '' } : undefined,
      }));
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'ordered': return 'default';
      case 'shipped': return 'outline';
      case 'received': return 'outline';
      case 'completed': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'ordered': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'received': return <Package className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'text-green-600';
      case 'normal': return 'text-blue-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleViewDetails = (request: SupplyRequest) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  const handleManage = (request: SupplyRequest) => {
    setSelectedRequest(request);
    setIsManagementDialogOpen(true);
  };

  const canCreate = user?.role === 'chef_base' || user?.role === 'direction';
  const canManage = user?.role === 'direction';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demandes d'approvisionnement</h1>
          <p className="text-muted-foreground">
            Gérez toutes les demandes d'approvisionnement et suivez leur statut
          </p>
        </div>
        
        {canCreate && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
        )}
      </div>

      <SupplyRequestFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        urgencyFilter={urgencyFilter}
        onUrgencyFilterChange={setUrgencyFilter}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{request.request_number}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1">
                    {getStatusIcon(request.status)}
                    {request.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <span className={getUrgencyColor(request.urgency_level)}>
                    ●
                  </span>
                  {request.urgency_level} priority
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">{request.item_name}</h4>
                  {request.item_reference && (
                    <p className="text-sm text-muted-foreground">Réf: {request.item_reference}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Qté: {request.quantity_needed}</p>
                </div>

                {request.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {request.description}
                  </p>
                )}

                <div className="text-xs text-muted-foreground">
                  Demandé par: {request.requester?.name || 'N/A'}
                </div>

                <div className="text-xs text-muted-foreground">
                  {new Date(request.created_at).toLocaleDateString('fr-FR')}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(request)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Voir
                  </Button>
                  {canManage && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleManage(request)}
                      className="flex-1"
                    >
                      Gérer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {requests.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune demande trouvée</h3>
            <p className="text-muted-foreground mb-4">
              {canCreate ? "Créez votre première demande d'approvisionnement" : "Aucune demande ne correspond à vos critères"}
            </p>
            {canCreate && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <SupplyRequestDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={() => {
          refetch();
          setIsCreateDialogOpen(false);
        }}
      />

      <SupplyRequestDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        request={selectedRequest}
      />

      <SupplyManagementDialog
        isOpen={isManagementDialogOpen}
        onClose={() => setIsManagementDialogOpen(false)}
        request={selectedRequest}
        onSuccess={() => {
          refetch();
          setIsManagementDialogOpen(false);
        }}
      />
    </div>
  );
}