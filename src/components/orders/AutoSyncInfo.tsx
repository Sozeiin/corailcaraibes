import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight } from 'lucide-react';

export function AutoSyncInfo() {
  return (
    <Card className="mb-6 border-green-200 bg-green-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-green-800 mb-2">
                🚀 Système de commandes automatisé
              </h3>
              <p className="text-sm text-green-700 mb-3">
                Le système synchronise maintenant automatiquement les commandes avec le stock.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <Badge variant="outline" className="text-green-700 border-green-300">
                Commande créée
              </Badge>
              <ArrowRight className="w-3 h-3 text-green-600" />
              <Badge variant="outline" className="text-green-700 border-green-300">
                Livrée
              </Badge>
              <ArrowRight className="w-3 h-3 text-green-600" />
              <Badge variant="outline" className="text-green-700 border-green-300">
                Stock mis à jour
              </Badge>
              <ArrowRight className="w-3 h-3 text-green-600" />
              <Badge variant="outline" className="text-green-700 border-green-300">
                Historique d'achat
              </Badge>
            </div>
            
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="text-xs text-green-700">
                <strong>✅ Automatique :</strong> Quand une commande passe au statut "Livrée", 
                les articles sont automatiquement ajoutés au stock avec leurs informations 
                (fournisseur, prix, date d'achat) dans l'historique.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}