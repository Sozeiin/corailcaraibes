import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChecklistCategory } from './ChecklistCategory';
import type { ChecklistItem } from '@/hooks/useChecklistData';
import { MessageSquare, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

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
  // Group items by category
  const categorizedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

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

  return (
    <div className="space-y-6">
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
      {Object.entries(categorizedItems).map(([category, items]) => (
        <ChecklistCategory
          key={category}
          category={category}
          items={items}
          onItemStatusChange={onItemStatusChange}
          onItemNotesChange={onItemNotesChange}
        />
      ))}

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