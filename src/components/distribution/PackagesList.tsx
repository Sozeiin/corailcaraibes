import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemsList } from '@/components/distribution/ItemsList';
import { Package } from 'lucide-react';

interface ShipmentPackage {
  id: string;
  package_code: string;
}

interface ShipmentItem {
  id: string;
  sku: string;
  product_label: string;
  qty: number;
  package_id?: string;
  received_qty?: number;
}

interface PackagesListProps {
  packages: ShipmentPackage[];
  items: ShipmentItem[];
}

export function PackagesList({ packages, items }: PackagesListProps) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Aucun colis créé pour l'expédition</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {packages.map((pkg) => (
        <Card key={pkg.id}>
          <CardHeader>
            <CardTitle>Colis {pkg.package_code}</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemsList
              items={items.filter((it) => it.package_id === pkg.id)}
              readOnly
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
