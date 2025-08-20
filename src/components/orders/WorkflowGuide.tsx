import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Lightbulb, ArrowRight } from 'lucide-react';

export function WorkflowGuide() {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Lightbulb className="w-5 h-5" />
          Guide du workflow des commandes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-3">
            <p className="text-sm text-blue-800">
              <strong>Nouvelles commandes :</strong> Utilisez maintenant le workflow moderne qui permet un suivi complet du processus d'achat.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">Types de commandes :</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Brouillon</Badge>
                    <ArrowRight className="w-3 h-3" />
                    <span>Commande en préparation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Demande d'achat</Badge>
                    <ArrowRight className="w-3 h-3" />
                    <span>Nécessite approbation direction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Commande directe</Badge>
                    <ArrowRight className="w-3 h-3" />
                    <span>Directement en recherche fournisseur</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">Workflow automatique :</h4>
                <div className="text-sm space-y-1">
                  <p>• <strong>Approbation</strong> par la direction</p>
                  <p>• <strong>Recherche fournisseurs</strong> et négociation</p>
                  <p>• <strong>Commande confirmée</strong> avec prix</p>
                  <p>• <strong>Expédition</strong> vers les Antilles</p>
                  <p>• <strong>Réception automatique</strong> en stock</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Important :</strong> Quand une commande est marquée comme "Livrée", les articles entrent automatiquement dans le stock 
                et l'historique d'achat est mis à jour avec les prix et fournisseurs. Plus besoin de saisie manuelle !
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}