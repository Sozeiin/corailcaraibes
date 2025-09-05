import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChecklistCategory } from './ChecklistCategory';
import type { ChecklistItem } from '@/hooks/useChecklistData';
import { useCategoriesOrder } from '@/hooks/useCategoriesOrder';
import { MessageSquare, AlertTriangle, CheckCircle, Clock, TestTube, ChevronDown } from 'lucide-react';

interface ChecklistInspectionProps {
  checklistItems: ChecklistItem[];
  onItemStatusChange: (itemId: string, status: 'ok' | 'needs_repair' | 'not_checked', notes?: string) => void;
  onItemNotesChange: (itemId: string, notes: string) => void;
  generalNotes: string;
  onGeneralNotesChange: (notes: string) => void;
  overallStatus: 'ok' | 'needs_attention' | 'major_issues';
  isComplete: boolean;
}

export function ChecklistInspection({
  checklistItems,
  onItemStatusChange,
  onItemNotesChange,
  generalNotes,
  onGeneralNotesChange,
  overallStatus,
  isComplete,
}: ChecklistInspectionProps) {
  const { sortCategories } = useCategoriesOrder();
  
  // Group items by category
  const categorizedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);
  
  // Get categories in the correct order
  const categories = [...new Set(checklistItems.map(item => item.category).filter(Boolean))];
  const orderedCategories = sortCategories(categories);

  const getStatusBadge = () => {
    const statusConfig = {
      ok: {
        variant: 'default' as const,
        icon: CheckCircle,
        text: 'Aucun problème',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      needs_attention: {
        variant: 'secondary' as const,
        icon: AlertTriangle,
        text: 'Attention requise',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
      },
      major_issues: {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        text: 'Problèmes majeurs',
        className: 'bg-red-100 text-red-800 border-red-200',
      },
    };

    const config = statusConfig[overallStatus];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getCompletionStats = () => {
    const total = checklistItems.length;
    const checked = checklistItems.filter(item => item.status !== 'not_checked').length;
    const needsRepair = checklistItems.filter(item => item.status === 'needs_repair').length;
    
    return { total, checked, needsRepair };
  };

  const stats = getCompletionStats();

  // Auto-fill test functions
  const handleFillAllOK = () => {
    checklistItems.forEach((item, index) => {
      onItemStatusChange(item.id, 'ok', `Test note ${index + 1} - Element vérifié automatiquement`);
    });
    onGeneralNotesChange('Test rempli automatiquement - Tous les éléments sont conformes. Inspection réalisée pour test de fonctionnalité.');
  };

  const handleFillWithIssues = () => {
    checklistItems.forEach((item, index) => {
      if (index % 3 === 0) {
        // Marque 1 élément sur 3 comme ayant besoin de réparation
        onItemStatusChange(item.id, 'needs_repair', `Test - Problème détecté sur cet élément`);
      } else {
        onItemStatusChange(item.id, 'ok', `Test - Element vérifié OK`);
      }
    });
    onGeneralNotesChange('Test avec problèmes - Certains éléments nécessitent une attention particulière. Voir détails par élément.');
  };

  const handleClearAll = () => {
    checklistItems.forEach(item => {
      onItemStatusChange(item.id, 'not_checked');
      onItemNotesChange(item.id, '');
    });
    onGeneralNotesChange('');
  };

  return (
    <div className="space-y-6">
      {/* Auto-fill Test Button */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Mode Test</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  <TestTube className="h-4 w-4 mr-2" />
                  Auto-fill pour test
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleFillAllOK}>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Tout OK
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFillWithIssues}>
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                  Avec problèmes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearAll}>
                  <Clock className="h-4 w-4 mr-2 text-gray-600" />
                  Vider tout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Status and Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              État de l'inspection
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{stats.checked}</div>
              <div className="text-sm text-muted-foreground">Vérifiés</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.needsRepair}</div>
              <div className="text-sm text-muted-foreground">À réparer</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-muted-foreground">{stats.total - stats.checked}</div>
              <div className="text-sm text-muted-foreground">Restants</div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progression</span>
              <span>{Math.round((stats.checked / stats.total) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stats.checked / stats.total) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items by Category */}
      {orderedCategories.map((category) => {
        const items = categorizedItems[category] || [];
        return (
          <ChecklistCategory
            key={category}
            category={category}
            items={items}
            onItemStatusChange={onItemStatusChange}
            onItemNotesChange={onItemNotesChange}
          />
        );
      })}

      {/* General Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notes générales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="general-notes">
              Observations et commentaires généraux
            </Label>
            <Textarea
              id="general-notes"
              value={generalNotes}
              onChange={(e) => onGeneralNotesChange(e.target.value)}
              placeholder="Ajoutez vos observations générales ici..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Completion Warning */}
      {!isComplete && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Veuillez vérifier tous les éléments avant de passer à l'étape suivante.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}