
import React from 'react';
import { Edit, Trash2, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Supplier } from '@/types';

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
  onViewDetails?: (supplier: Supplier) => void;
  canManage: boolean;
}

export function SupplierTable({ suppliers, onEdit, onDelete, onViewDetails, canManage }: SupplierTableProps) {
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

  if (suppliers.length === 0) {
    return (
      <CardContent className="text-center py-8">
        <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun fournisseur</h3>
        <p className="text-gray-500">
          {canManage 
            ? "Commencez par ajouter votre premier fournisseur."
            : "Aucun fournisseur n'est disponible pour le moment."
          }
        </p>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Adresse</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow 
                key={supplier.id}
                className={onViewDetails ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={() => onViewDetails?.(supplier)}
              >
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold text-gray-900">{supplier.name}</div>
                    <div className="text-sm text-gray-500">
                      Créé le {new Date(supplier.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  {supplier.category ? (
                    <Badge className={getCategoryColor(supplier.category)}>
                      {supplier.category}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">Non définie</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    {supplier.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-1" />
                        <a 
                          href={`mailto:${supplier.email}`}
                          className="hover:text-marine-600 hover:underline"
                        >
                          {supplier.email}
                        </a>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-3 w-3 mr-1" />
                        <a 
                          href={`tel:${supplier.phone}`}
                          className="hover:text-marine-600 hover:underline"
                        >
                          {supplier.phone}
                        </a>
                      </div>
                    )}
                    {!supplier.email && !supplier.phone && (
                      <span className="text-gray-400 text-sm">Aucun contact</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {supplier.baseId ? (
                    <div className="flex items-center text-sm">
                      <Building2 className="h-3 w-3 mr-1 text-gray-400" />
                      <span>Base assignée</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Toutes les bases</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {supplier.address ? (
                    <div className="flex items-start text-sm text-gray-600 max-w-xs">
                      <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Non renseignée</span>
                  )}
                </TableCell>
                
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(supplier)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer le fournisseur</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer le fournisseur "{supplier.name}" ?
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(supplier.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  );
}
