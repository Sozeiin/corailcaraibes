import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoatInterventionHistory } from './BoatInterventionHistory';
import { BoatChecklistHistory } from './BoatChecklistHistory';

interface BoatHistoryContentProps {
  boatId: string;
}

export const BoatHistoryContent = ({ boatId }: BoatHistoryContentProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Historique</h2>
      
      <Tabs defaultValue="interventions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="checklists">Check-in/Check-out</TabsTrigger>
        </TabsList>
        
        <TabsContent value="interventions" className="mt-6">
          <BoatInterventionHistory boatId={boatId} />
        </TabsContent>
        
        <TabsContent value="checklists" className="mt-6">
          <BoatChecklistHistory boatId={boatId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};