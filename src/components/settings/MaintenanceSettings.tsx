import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, FileText, Calendar, AlertTriangle } from 'lucide-react';
import { AutomaticSchedulingSettings } from '../maintenance/AutomaticSchedulingSettings';

export function MaintenanceSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Configuration de la maintenance</h3>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manuels de maintenance
            </CardTitle>
            <CardDescription>
              Gérez les manuels de maintenance et les tâches programmées pour chaque modèle de bateau
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Les manuels de maintenance permettent de définir les tâches récurrentes à effectuer sur les bateaux selon leur modèle et leur usage.
              </p>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Gérer les manuels
              </Button>
            </div>
          </CardContent>
        </Card>

        <AutomaticSchedulingSettings />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Notifications et alertes
            </CardTitle>
            <CardDescription>
              Configuration des notifications pour les maintenances à venir et en retard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Définissez quand et comment les notifications de maintenance doivent être envoyées aux techniciens et responsables.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h5 className="font-medium">Notification avant échéance</h5>
                    <p className="text-sm text-muted-foreground">7 jours avant la date prévue</p>
                  </div>
                  <Button variant="outline" size="sm">Configurer</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h5 className="font-medium">Notification de retard</h5>
                    <p className="text-sm text-muted-foreground">Quotidienne pour les maintenances en retard</p>
                  </div>
                  <Button variant="outline" size="sm">Configurer</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}