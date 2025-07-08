import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, ImageIcon, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  disabled?: boolean;
}

export function PhotoUpload({ photos, onPhotosChange, disabled }: PhotoUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const uploadPhoto = async (file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('purchase-requests')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('purchase-requests')
        .getPublicUrl(fileName);

      onPhotosChange([...photos, publicUrl]);
      
      toast({
        title: "Photo ajoutée",
        description: "La photo a été téléchargée avec succès.",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la photo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photoUrl: string, index: number) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${user?.id}/${fileName}`;

      // Delete from storage
      const { error } = await supabase.storage
        .from('purchase-requests')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting photo from storage:', error);
      }

      // Remove from local state
      const newPhotos = photos.filter((_, i) => i !== index);
      onPhotosChange(newPhotos);
      
      toast({
        title: "Photo supprimée",
        description: "La photo a été supprimée avec succès.",
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Format invalide",
          description: "Veuillez sélectionner une image.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale autorisée est de 5MB.",
          variant: "destructive",
        });
        return;
      }

      uploadPhoto(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Buttons */}
      {!disabled && (
        <div className="flex gap-2 flex-wrap">
          {/* Upload from gallery */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="photo-upload"
            disabled={uploading}
          />
          <label htmlFor="photo-upload">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={uploading}
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Téléchargement...' : 'Galerie'}
              </span>
            </Button>
          </label>

          {/* Take photo with camera */}
          <input
            type="file"
            accept="image/*"
            capture
            onChange={handleFileSelect}
            className="hidden"
            id="camera-capture"
            disabled={uploading}
          />
          <label htmlFor="camera-capture">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={uploading}
              asChild
            >
              <span>
                <Camera className="h-4 w-4 mr-2" />
                {uploading ? 'Téléchargement...' : 'Prendre une photo'}
              </span>
            </Button>
          </label>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%236b7280">Image non disponible</text></svg>';
                    }}
                  />
                  
                  {!disabled && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(photo, index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {disabled ? 'Aucune photo ajoutée' : 'Ajoutez des photos des pièces demandées'}
            </p>
            {!disabled && (
              <p className="text-sm text-muted-foreground mt-2">
                Formats acceptés: JPG, PNG • Taille max: 5MB
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}