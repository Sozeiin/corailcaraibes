import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  AlertCircle,
  Handshake,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Shield,
  Book
} from 'lucide-react';

interface SupplierRelationshipProps {
  baseId?: string;
}

export function SupplierRelationship({ baseId }: SupplierRelationshipProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'call',
    subject: '',
    description: '',
    follow_up_required: false,
    follow_up_date: ''
  });
  const [documentForm, setDocumentForm] = useState({
    document_type: 'contract',
    document_name: '',
    expiry_date: ''
  });

  const { data: relationshipData, isLoading } = useQuery({
    queryKey: ['supplier-relationships', baseId],
    queryFn: async () => {
      // Récupérer les fournisseurs avec leurs interactions et documents
      let suppliersQuery = supabase
        .from('suppliers')
        .select(`
          *,
          supplier_interactions(*, profiles!user_id(name)),
          supplier_documents(*),
          supplier_contracts(*)
        `)
        .order('name');

      if (baseId) {
        suppliersQuery = suppliersQuery.eq('base_id', baseId);
      }

      const { data: suppliers, error } = await suppliersQuery;
      if (error) throw error;

      return suppliers.map((supplier: any) => ({
        ...supplier,
        lastInteraction: supplier.supplier_interactions.length > 0
          ? supplier.supplier_interactions.sort((a: any, b: any) => 
              new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime()
            )[0]
          : null,
        pendingFollowUps: supplier.supplier_interactions.filter(
          (interaction: any) => interaction.follow_up_required && !interaction.follow_up_date
        ).length,
        expiringDocuments: supplier.supplier_documents.filter((doc: any) => {
          if (!doc.expiry_date) return false;
          const expiryDate = new Date(doc.expiry_date);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiryDate <= thirtyDaysFromNow;
        }).length
      }));
    },
  });

  const interactionMutation = useMutation({
    mutationFn: async (interaction: any) => {
      const { error } = await supabase
        .from('supplier_interactions')
        .insert({
          ...interaction,
          supplier_id: selectedSupplier.id,
          user_id: user?.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Interaction enregistrée",
        description: "L'interaction avec le fournisseur a été enregistrée."
      });
      setIsInteractionDialogOpen(false);
      resetInteractionForm();
      queryClient.invalidateQueries({ queryKey: ['supplier-relationships'] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'interaction.",
        variant: "destructive"
      });
    }
  });

  const documentMutation = useMutation({
    mutationFn: async (document: any) => {
      const { error } = await supabase
        .from('supplier_documents')
        .insert({
          ...document,
          supplier_id: selectedSupplier.id,
          uploaded_by: user?.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Document ajouté",
        description: "Le document a été ajouté au fournisseur."
      });
      setIsDocumentDialogOpen(false);
      resetDocumentForm();
      queryClient.invalidateQueries({ queryKey: ['supplier-relationships'] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le document.",
        variant: "destructive"
      });
    }
  });

  const resetInteractionForm = () => {
    setInteractionForm({
      interaction_type: 'call',
      subject: '',
      description: '',
      follow_up_required: false,
      follow_up_date: ''
    });
  };

  const resetDocumentForm = () => {
    setDocumentForm({
      document_type: 'contract',
      document_name: '',
      expiry_date: ''
    });
  };

  const handleAddInteraction = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsInteractionDialogOpen(true);
  };

  const handleAddDocument = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsDocumentDialogOpen(true);
  };

  const handleSubmitInteraction = () => {
    if (!interactionForm.subject.trim()) {
      toast({
        title: "Erreur",
        description: "Le sujet de l'interaction est requis.",
        variant: "destructive"
      });
      return;
    }
    interactionMutation.mutate(interactionForm);
  };

  const handleSubmitDocument = () => {
    if (!documentForm.document_name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du document est requis.",
        variant: "destructive"
      });
      return;
    }
    documentMutation.mutate(documentForm);
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'negotiation': return <Handshake className="h-4 w-4" />;
      case 'complaint': return <AlertCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'contract': return <FileText className="h-4 w-4" />;
      case 'certificate': return <Badge className="h-4 w-4" />;
      case 'insurance': return <Shield className="h-4 w-4" />;
      case 'catalog': return <Book className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <OptimizedSkeleton type="table" count={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble des relations */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interactions ce mois</p>
                <p className="text-2xl font-bold">
                  {relationshipData?.reduce((sum: number, supplier: any) => {
                    const thisMonth = supplier.supplier_interactions.filter((interaction: any) => {
                      const interactionDate = new Date(interaction.interaction_date);
                      const now = new Date();
                      return interactionDate.getMonth() === now.getMonth() && 
                             interactionDate.getFullYear() === now.getFullYear();
                    }).length;
                    return sum + thisMonth;
                  }, 0) || 0}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suivis en attente</p>
                <p className="text-2xl font-bold">
                  {relationshipData?.reduce((sum: number, supplier: any) => sum + supplier.pendingFollowUps, 0) || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents à expirer</p>
                <p className="text-2xl font-bold">
                  {relationshipData?.reduce((sum: number, supplier: any) => sum + supplier.expiringDocuments, 0) || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contrats actifs</p>
                <p className="text-2xl font-bold">
                  {relationshipData?.reduce((sum: number, supplier: any) => {
                    const activeContracts = supplier.supplier_contracts.filter((contract: any) => {
                      if (!contract.end_date) return true;
                      return new Date(contract.end_date) > new Date();
                    }).length;
                    return sum + activeContracts;
                  }, 0) || 0}
                </p>
              </div>
              <Handshake className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des relations fournisseurs */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Relations Fournisseurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Dernière Interaction</TableHead>
                <TableHead>Interactions Totales</TableHead>
                <TableHead>Suivis en Attente</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relationshipData?.map((supplier: any) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {supplier.category || 'Non catégorisé'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.lastInteraction ? (
                      <div className="flex items-center gap-2">
                        {getInteractionIcon(supplier.lastInteraction.interaction_type)}
                        <div>
                          <p className="text-sm font-medium">{supplier.lastInteraction.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(supplier.lastInteraction.interaction_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Aucune interaction</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {supplier.supplier_interactions.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {supplier.pendingFollowUps > 0 ? (
                      <Badge variant="destructive">
                        {supplier.pendingFollowUps}
                      </Badge>
                    ) : (
                      <Badge variant="outline">0</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {supplier.supplier_documents.length} docs
                      </Badge>
                      {supplier.expiringDocuments > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {supplier.expiringDocuments} expirent
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddInteraction(supplier)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddDocument(supplier)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog d'ajout d'interaction */}
      <Dialog open={isInteractionDialogOpen} onOpenChange={setIsInteractionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle Interaction - {selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type d'interaction</label>
              <Select
                value={interactionForm.interaction_type}
                onValueChange={(value) => setInteractionForm(prev => ({ ...prev, interaction_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Appel téléphonique</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Réunion</SelectItem>
                  <SelectItem value="negotiation">Négociation</SelectItem>
                  <SelectItem value="complaint">Réclamation</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sujet *</label>
              <Input
                value={interactionForm.subject}
                onChange={(e) => setInteractionForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Sujet de l'interaction..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={interactionForm.description}
                onChange={(e) => setInteractionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Détails de l'interaction..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="follow_up"
                checked={interactionForm.follow_up_required}
                onChange={(e) => setInteractionForm(prev => ({ ...prev, follow_up_required: e.target.checked }))}
              />
              <label htmlFor="follow_up" className="text-sm">Suivi requis</label>
            </div>

            {interactionForm.follow_up_required && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Date de suivi</label>
                <Input
                  type="date"
                  value={interactionForm.follow_up_date}
                  onChange={(e) => setInteractionForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsInteractionDialogOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSubmitInteraction}
                disabled={interactionMutation.isPending}
                className="flex-1"
              >
                {interactionMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog d'ajout de document */}
      <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau Document - {selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de document</label>
              <Select
                value={documentForm.document_type}
                onValueChange={(value) => setDocumentForm(prev => ({ ...prev, document_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contrat</SelectItem>
                  <SelectItem value="certificate">Certificat</SelectItem>
                  <SelectItem value="insurance">Assurance</SelectItem>
                  <SelectItem value="catalog">Catalogue</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nom du document *</label>
              <Input
                value={documentForm.document_name}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, document_name: e.target.value }))}
                placeholder="Nom du document..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date d'expiration (optionnel)</label>
              <Input
                type="date"
                value={documentForm.expiry_date}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDocumentDialogOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSubmitDocument}
                disabled={documentMutation.isPending}
                className="flex-1"
              >
                {documentMutation.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}