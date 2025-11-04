import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClientFormsPool } from '@/components/customers/ClientFormsPool';
import { ReadyFormsSection } from './ReadyFormsSection';
import { AdministrativeCheckinFormNew } from '@/components/administrative/AdministrativeCheckinFormNew';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, Plus } from 'lucide-react';
import { invalidateAdministrativeQueries } from '@/lib/queryInvalidation';

export function CheckinFormsManager() {
  const queryClient = useQueryClient();

  const handleFormCreated = () => {
    invalidateAdministrativeQueries(queryClient);
  };

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="pending" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          En attente
        </TabsTrigger>
        <TabsTrigger value="ready" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Prêtes
        </TabsTrigger>
        <TabsTrigger value="new" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle fiche
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-6">
        <ClientFormsPool />
      </TabsContent>

      <TabsContent value="ready" className="mt-6">
        <ReadyFormsSection />
      </TabsContent>

      <TabsContent value="new" className="mt-6">
        <AdministrativeCheckinFormNew onFormCreated={handleFormCreated} />
      </TabsContent>
    </Tabs>
  );
}
