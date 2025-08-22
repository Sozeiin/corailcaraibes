import React, { useState } from 'react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Search, Calendar, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SafetyStatusIcon } from '@/components/boats/SafetyStatusIcon';
import { SafetyStatusLegend } from '@/components/boats/SafetyStatusLegend';

export const SafetyControls = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('all');

  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;

  const { data: boats = [], loading: isLoadingBoats } = useOfflineData<any>({
    table: 'boats',
    baseId,
    dependencies: [user?.role, user?.baseId]
  });

  const { data: bases = [] } = useOfflineData<any>({ table: 'bases' });

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-emerald-600' },
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-amber-600' },
      expired: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status === 'completed' && 'Effectué'}
        {status === 'pending' && 'En attente'}
        {status === 'expired' && 'Expiré'}
        {status === 'failed' && 'Échec'}
      </Badge>
    );
  };

  const filteredBoats = boats?.filter(boat => {
    const matchesSearch = !searchTerm || 
      boat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      boat.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
      boat.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (isLoadingBoats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Contrôles de Sécurité</h1>
            <p className="text-muted-foreground">Gestion des contrôles de sécurité pour tous les bateaux</p>
          </div>
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
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            placeholder="Rechercher par nom, modèle ou numéro de série..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-10" 
          />
        </div>
      </div>

      {filteredBoats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun bateau trouvé</h3>
            <p className="text-muted-foreground mb-4">
              {boats?.length === 0 ? "Aucun bateau disponible." : "Aucun bateau ne correspond à vos critères de recherche."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <SafetyStatusLegend />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoats.map(boat => {
              const base = bases.find((b: any) => b.id === boat.base_id);
              
              return (
                <Card key={boat.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{boat.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{boat.model} ({boat.year})</p>
                        <p className="text-xs text-muted-foreground">N° série: {boat.serial_number}</p>
                      </div>
                      <SafetyStatusIcon boatId={boat.id} size="md" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Base: {base?.name || 'Non assignée'}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => navigate(`/boats/${boat.id}/safety-controls`)}
                          className="w-full"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Gérer les contrôles
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};