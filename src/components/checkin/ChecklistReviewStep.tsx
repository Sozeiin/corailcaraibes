import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, X, AlertTriangle, Star, Clock } from 'lucide-react';
import type { ChecklistItem } from '@/hooks/useChecklistData';

interface ChecklistReviewStepProps {
  checklistItems: ChecklistItem[];
  onItemStatusChange: (itemId: string, status: 'ok' | 'needs_repair' | 'not_checked', notes?: string) => void;
  onItemNotesChange: (itemId: string, notes: string) => void;
}

export function ChecklistReviewStep({
  checklistItems,
  onItemStatusChange,
  onItemNotesChange,
}: ChecklistReviewStepProps) {
  // Filtre uniquement les éléments non vérifiés
  const unverifiedItems = checklistItems.filter(item => item.status === 'not_checked');

  // Groupe par catégorie
  const categorizedItems = unverifiedItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const categories = Object.keys(categorizedItems);

  if (unverifiedItems.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Tous les éléments ont été vérifiés. Vous pouvez passer à l'étape suivante.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="border-amber-200 bg-amber-50">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="font-medium mb-2">Revérification requise</div>
          Certains éléments n'ont pas encore été vérifiés. Pour finaliser le processus, 
          vous devez marquer chaque élément comme "OK" ou "Problème". Les éléments marqués comme 
          "Non vérifié" ne peuvent pas rester dans cet état.
        </AlertDescription>
      </Alert>

      <div className="text-center mb-6">
        <div className="text-2xl font-bold text-amber-600">{unverifiedItems.length}</div>
        <div className="text-sm text-muted-foreground">
          élément(s) à vérifier avant finalisation
        </div>
      </div>

      {categories.map((category) => {
        const items = categorizedItems[category] || [];
        return (
          <Card key={category} className="border-amber-200">
            <CardHeader className="bg-amber-50">
              <CardTitle className="flex items-center justify-between text-amber-800">
                <span>{category}</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  {items.length} à vérifier
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 mt-4">
              {items.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-amber-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      {item.isRequired && (
                        <Star className="h-4 w-4 text-red-500 fill-red-500" />
                      )}
                      <span className="font-medium">{item.name}</span>
                      {item.isRequired && (
                        <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                          OBLIGATOIRE
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button
                      variant={item.status === 'ok' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onItemStatusChange(item.id, 'ok')}
                      className={`px-6 ${item.status === 'ok' ? 'bg-green-500 hover:bg-green-600' : 'hover:bg-green-50 hover:border-green-300'}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      OK
                    </Button>
                    <Button
                      variant={item.status === 'needs_repair' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => onItemStatusChange(item.id, 'needs_repair')}
                      className="px-6"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Problème
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      En attente de vérification
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="font-medium mb-1">Important :</div>
          Vous ne pourrez pas finaliser le checklist tant que tous les éléments 
          ne seront pas marqués comme "OK" ou "Problème".
        </AlertDescription>
      </Alert>
    </div>
  );
}