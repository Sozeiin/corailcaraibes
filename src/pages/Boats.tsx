
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Ship, 
  Calendar, 
  MapPin,
  FileText,
  Settings
} from 'lucide-react';
import { Boat } from '@/types';

const mockBoats: Boat[] = [
  {
    id: '1',
    name: 'Évasion',
    model: 'Lagoon 380',
    serialNumber: 'LAG380-2020-001',
    year: 2020,
    status: 'available',
    baseId: 'base-1',
    documents: ['certificate.pdf', 'insurance.pdf'],
    nextMaintenance: '2024-07-15',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Neptune',
    model: 'Fountaine Pajot Saona 47',
    serialNumber: 'FP47-2019-002',
    year: 2019,
    status: 'rented',
    baseId: 'base-1',
    documents: ['certificate.pdf'],
    nextMaintenance: '2024-08-20',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T00:00:00Z'
  },
  {
    id: '3',
    name: 'Odyssée',
    model: 'Catana 53',
    serialNumber: 'CAT53-2021-003',
    year: 2021,
    status: 'maintenance',
    baseId: 'base-1',
    documents: ['certificate.pdf', 'insurance.pdf', 'maintenance_log.pdf'],
    nextMaintenance: '2024-07-30',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-20T00:00:00Z'
  }
];

const getStatusBadge = (status: string) => {
  const statusConfig = {
    available: { label: 'Disponible', class: 'status-active' },
    rented: { label: 'En location', class: 'bg-blue-100 text-blue-800' },
    maintenance: { label: 'Maintenance', class: 'status-maintenance' },
    out_of_service: { label: 'Hors service', class: 'status-inactive' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  return <Badge className={`status-badge ${config.class}`}>{config.label}</Badge>;
};

const BoatCard = ({ boat }: { boat: Boat }) => (
  <Card className="card-hover">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Ship className="h-5 w-5 text-marine-600" />
          {boat.name}
        </CardTitle>
        {getStatusBadge(boat.status)}
      </div>
      <p className="text-sm text-gray-600">{boat.model} • {boat.year}</p>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>Base Martinique</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>Prochaine maintenance: {new Date(boat.nextMaintenance).toLocaleDateString('fr-FR')}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <span>{boat.documents.length} document(s)</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          Détails
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function Boats() {
  const [searchTerm, setSearchTerm] = useState('');
  const [boats] = useState<Boat[]>(mockBoats);

  const filteredBoats = boats.filter(boat =>
    boat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    boat.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Bateaux</h1>
          <p className="text-gray-600">Gérez votre flotte de catamarans</p>
        </div>
        <Button className="btn-ocean">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bateau
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par nom ou modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">18</div>
            <div className="text-sm text-gray-600">Disponibles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">3</div>
            <div className="text-sm text-gray-600">En location</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">2</div>
            <div className="text-sm text-gray-600">En maintenance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">1</div>
            <div className="text-sm text-gray-600">Hors service</div>
          </CardContent>
        </Card>
      </div>

      {/* Boats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBoats.map((boat) => (
          <BoatCard key={boat.id} boat={boat} />
        ))}
      </div>

      {filteredBoats.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Ship className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bateau trouvé</h3>
            <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
