import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Phone, MapPin, Calendar, Package } from 'lucide-react';
import { Supplier } from '@/types';
import { SupplierQuotesHistory } from './SupplierQuotesHistory';

interface SupplierDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierDetailsDialog({ isOpen, onClose, supplier }: SupplierDetailsDialogProps) {
  if (!supplier) return null;

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    
    const colors: Record<string, string> = {
      'Maintenance': 'bg-blue-100 text-blue-800',
      'Carburant': 'bg-orange-100 text-orange-800',
      'Équipement': 'bg-green-100 text-green-800',
      'Alimentation': 'bg-purple-100 text-purple-800',
      'Nettoyage': 'bg-cyan-100 text-cyan-800',
      'Sécurité': 'bg-red-100 text-red-800',
      'Électronique': 'bg-indigo-100 text-indigo-800',
      'Voilerie': 'bg-teal-100 text-teal-800',
      'Moteur': 'bg-yellow-100 text-yellow-800',
    };
    
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Détails du fournisseur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations du fournisseur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{supplier.name}</span>
                {supplier.category && (
                  <Badge className={getCategoryColor(supplier.category)}>
                    {supplier.category}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact
                  </h4>
                  <div className="space-y-2">
                    {supplier.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 mr-2" />
                        <a 
                          href={`mailto:${supplier.email}`}
                          className="hover:text-primary hover:underline"
                        >
                          {supplier.email}
                        </a>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 mr-2" />
                        <a 
                          href={`tel:${supplier.phone}`}
                          className="hover:text-primary hover:underline"
                        >
                          {supplier.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Adresse */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adresse
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {supplier.address || 'Non renseignée'}
                  </div>
                </div>

                {/* Informations système */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Informations
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      Créé le {new Date(supplier.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center">
                      <Building2 className="h-3 w-3 mr-2" />
                      {supplier.baseId ? 'Base assignée' : 'Toutes les bases'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historique des devis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Historique des devis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SupplierQuotesHistory supplier={supplier} />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}