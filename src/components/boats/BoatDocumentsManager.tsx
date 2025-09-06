import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Trash2, Camera, Search, Plus, Eye } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { safeRemoveChild, safeAppendChild } from '@/lib/domUtils';

interface BoatDocument {
  id: string;
  boat_id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
  category: string;
}

interface BoatDocumentsManagerProps {
  boatId: string;
  boatName: string;
}

const DOCUMENT_CATEGORIES = [
  { value: 'general', label: 'Général' },
  { value: 'technical', label: 'Technique' },
  { value: 'administrative', label: 'Administratif' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'warranty', label: 'Garantie' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'certification', label: 'Certification' }
];

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt';

export const BoatDocumentsManager: React.FC<BoatDocumentsManagerProps> = ({ boatId, boatName }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [newDocument, setNewDocument] = useState({
    category: 'general',
    description: ''
  });

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['boat-documents', boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_documents')
        .select('*')
        .eq('boat_id', boatId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as BoatDocument[];
    }
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${boatId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('boat-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { data, error: dbError } = await supabase
        .from('boat_documents')
        .insert({
          boat_id: boatId,
          file_name: fileName,
          original_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
          description: newDocument.description || null,
          category: newDocument.category
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boat-documents', boatId] });
      toast({
        title: 'Document téléversé',
        description: 'Le document a été ajouté avec succès.'
      });
      setNewDocument({ category: 'general', description: '' });
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur de téléversement',
        description: error.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (document: BoatDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('boat-documents')
        .remove([document.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('boat_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boat-documents', boatId] });
      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur de suppression',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleDownload = async (document: BoatDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('boat-documents')
        .download(document.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.original_name;
      
      try {
        const cleanup = safeAppendChild(window.document.body, a);
        a.click();
        cleanup();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
        URL.revokeObjectURL(url);
        throw error;
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de téléchargement',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = (document: BoatDocument) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${document.original_name}" ?`)) {
      deleteMutation.mutate(document);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraOpen(true);
    } catch (error) {
      toast({
        title: 'Erreur d\'accès à la caméra',
        description: 'Impossible d\'accéder à la caméra',
        variant: 'destructive'
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, {
              type: 'image/jpeg'
            });
            uploadMutation.mutate(file);
            closeCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('doc')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    return '📄';
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Documents - {boatName}</h2>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Catégorie</Label>
                  <Select 
                    value={newDocument.category} 
                    onValueChange={(value) => setNewDocument(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea
                    id="description"
                    value={newDocument.description}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description du document..."
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choisir un fichier
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={startCamera}
                    disabled={isUploading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Photo
                  </Button>
                </div>

                {isUploading && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {DOCUMENT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((document) => (
          <Card key={document.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getFileIcon(document.file_type)}</span>
                  <div>
                    <h3 className="font-medium text-sm truncate max-w-[150px]" title={document.original_name}>
                      {document.original_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_CATEGORIES.find(cat => cat.value === document.category)?.label}
                    </p>
                  </div>
                </div>
              </div>
              
              {document.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {document.description}
                </p>
              )}
              
              <div className="text-xs text-muted-foreground mb-3">
                <p>Taille: {formatFileSize(document.file_size)}</p>
                <p>Ajouté: {new Date(document.uploaded_at).toLocaleDateString()}</p>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(document)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(document)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucun document trouvé</h3>
            <p className="text-muted-foreground">
              {searchTerm || categoryFilter !== 'all' 
                ? "Aucun document ne correspond aux critères de recherche."
                : "Aucun document n'a encore été ajouté pour ce bateau."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
      />

      {/* Camera Modal */}
      {isCameraOpen && (
        <Dialog open={isCameraOpen} onOpenChange={closeCamera}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Prendre une photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="flex space-x-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Capturer
                </Button>
                <Button variant="outline" onClick={closeCamera}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};