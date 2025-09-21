import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoatInterventionHistory } from './BoatInterventionHistory';
import { BoatChecklistHistory } from './BoatChecklistHistory';
import { BoatPreparationHistory } from './BoatPreparationHistory';

interface BoatHistoryContentProps {
  boatId: string;
}

export const BoatHistoryContent = ({ boatId }: BoatHistoryContentProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Historique</h2>
      
      <Tabs defaultValue="interventions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="checklists">Check-in/Check-out</TabsTrigger>
          <TabsTrigger value="preparations">Préparations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="interventions" className="mt-6">
          <BoatInterventionHistory boatId={boatId} />
        </TabsContent>
        
        <TabsContent value="checklists" className="mt-6">
          <BoatChecklistHistory boatId={boatId} />
        </TabsContent>
        
        <TabsContent value="preparations" className="mt-6">
          <BoatPreparationHistory boatId={boatId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};