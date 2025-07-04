import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function WorkflowManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['purchasing-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchasing_workflows')
        .select(`
          *,
          orders (
            order_number,
            total_amount,
            suppliers (name)
          ),
          profiles!purchasing_workflows_created_by_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      return workflows.filter(w => 
        w.current_step === 'manager_review' || 
        w.current_step === 'finance_review'
      );
    },
    enabled: workflows.length > 0
  });

  const updateWorkflowStep = async (workflowId: string, newStep: string, approved: boolean) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      const approvalEntry = {
        step: workflow.current_step,
        approved,
        approver: user?.name,
        timestamp: new Date().toISOString(),
        comments: approved ? 'Approuvé' : 'Rejeté'
      };

      const updatedHistory = [...((workflow.approval_history as any[]) || []), approvalEntry];

      const { error } = await supabase
        .from('purchasing_workflows')
        .update({
          current_step: newStep,
          approval_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);

      if (error) throw error;

      toast({
        title: approved ? 'Commande approuvée' : 'Commande rejetée',
        description: `Le workflow a été mis à jour avec succès.`
      });

      queryClient.invalidateQueries({ queryKey: ['purchasing-workflows'] });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le workflow.',
        variant: 'destructive'
      });
    }
  };

  const getStepIcon = (step: string) => {
    const icons = {
      'created': Clock,
      'manager_review': User,
      'finance_review': DollarSign,
      'approved': CheckCircle2,
      'rejected': XCircle
    };
    const Icon = icons[step] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const getStepColor = (step: string) => {
    const colors = {
      'created': 'bg-blue-100 text-blue-800',
      'manager_review': 'bg-yellow-100 text-yellow-800',
      'finance_review': 'bg-orange-100 text-orange-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[step] || 'bg-gray-100 text-gray-800';
  };

  const getStepLabel = (step: string) => {
    const labels = {
      'created': 'Créée',
      'manager_review': 'Validation Manager',
      'finance_review': 'Validation Finance',
      'approved': 'Approuvée',
      'rejected': 'Rejetée'
    };
    return labels[step] || step;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Workflows</h2>
          <p className="text-muted-foreground">
            Système d'approbation avancé pour les commandes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-orange-600">
            {pendingApprovals.length} en attente
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">En Attente ({pendingApprovals.length})</TabsTrigger>
          <TabsTrigger value="all">Tous les Workflows</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Validation Manager
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {workflows.filter(w => w.current_step === 'manager_review').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Validation Finance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {workflows.filter(w => w.current_step === 'finance_review').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Montant Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    pendingApprovals.reduce((sum, w) => sum + (w.orders?.total_amount || 0), 0)
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Délai Moyen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.5j</div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Workflows */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune approbation en attente</h3>
                  <p className="text-muted-foreground">
                    Toutes les commandes ont été traitées
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingApprovals.map((workflow) => (
                <Card key={workflow.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold">
                            Commande {workflow.orders?.order_number}
                          </h3>
                          <Badge className={getStepColor(workflow.current_step)}>
                            {getStepIcon(workflow.current_step)}
                            <span className="ml-1">{getStepLabel(workflow.current_step)}</span>
                          </Badge>
                          <Badge variant="outline">{workflow.workflow_type}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Créé par: {workflow.profiles?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {new Date(workflow.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{formatCurrency(workflow.orders?.total_amount || 0)}</span>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <strong>Fournisseur:</strong> {workflow.orders?.suppliers?.name || 'Non spécifié'}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateWorkflowStep(
                            workflow.id, 
                            'rejected', 
                            false
                          )}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => updateWorkflowStep(
                            workflow.id,
                            workflow.current_step === 'manager_review' ? 'finance_review' : 'approved',
                            true
                          )}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          Commande {workflow.orders?.order_number}
                        </h3>
                        <Badge className={getStepColor(workflow.current_step)}>
                          {getStepIcon(workflow.current_step)}
                          <span className="ml-1">{getStepLabel(workflow.current_step)}</span>
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Créé le {new Date(workflow.created_at).toLocaleDateString('fr-FR')} • 
                        {formatCurrency(workflow.orders?.total_amount || 0)}
                      </div>

                      {/* Approval History */}
                      {(workflow.approval_history as any[]) && (workflow.approval_history as any[]).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-medium mb-2">Historique des approbations:</div>
                          <div className="space-y-1">
                            {(workflow.approval_history as any[]).map((approval: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                {approval.approved ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span>
                                  {approval.approver} - {getStepLabel(approval.step)} - 
                                  {new Date(approval.timestamp).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Button variant="outline" size="sm">
                      Détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Temps de Traitement Moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Validation Manager</span>
                    <span className="font-medium">1.2 jours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Validation Finance</span>
                    <span className="font-medium">1.8 jours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Processus Complet</span>
                    <span className="font-medium">3.0 jours</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taux d'Approbation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Commandes Standard</span>
                    <span className="font-medium text-green-600">94%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Achats Groupés</span>
                    <span className="font-medium text-green-600">98%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Commandes Urgentes</span>
                    <span className="font-medium text-yellow-600">87%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}