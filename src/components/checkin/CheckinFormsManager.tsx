import React from 'react';
import { ClientFormsPool } from '@/components/customers/ClientFormsPool';
import { ReadyFormsSection } from './ReadyFormsSection';
import { CreateCheckinFormSimple } from './CreateCheckinFormSimple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function CheckinFormsManager() {
  return (
    <div className="space-y-6">
      {/* Section 1: Pool de fiches en attente */}
      <Card>
        <CardHeader>
          <CardTitle>Fiches en attente d'assignation</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientFormsPool />
        </CardContent>
      </Card>

      <Separator />

      {/* Section 2: Fiches prêtes pour check-in */}
      <ReadyFormsSection />

      <Separator />

      {/* Section 3: Créer une nouvelle fiche */}
      <Card>
        <CardHeader>
          <CardTitle>Créer une nouvelle fiche client</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateCheckinFormSimple />
        </CardContent>
      </Card>
    </div>
  );
}
