import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateFileUploadEnhanced, optimizeImage, withTimeout } from "@/lib/securityEnhancements";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EnhancedPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  disabled?: boolean;
  maxPhotos?: number;
  bucketName?: string;
  folder?: string;
}

export function EnhancedPhotoUpload({
  photos,
  onPhotosChange,
  disabled = false,
  maxPhotos = 5,
  bucketName = "stock-photos",
  folder = "uploads"
}: EnhancedPhotoUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);

  const uploadPhoto = async (file: File): Promise<void> => {
    if (!user) {
      throw new Error("Vous devez être connecté pour uploader des photos");
    }

    setSecurityWarnings([]);

    // Enhanced security validation
    const validation = validateFileUploadEnhanced(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    try {
      // Optimize image if it's an image file
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        try {
          processedFile = await optimizeImage(file);
          toast({
            title: "Image optimisée",
            description: "L'image a été automatiquement optimisée pour de meilleures performances.",
          });
        } catch (optimizationError) {
          console.warn("Image optimization failed, using original:", optimizationError);
          setSecurityWarnings(prev => [...prev, "L'optimisation de l'image a échoué, fichier original utilisé"]);
        }
      }

      // Generate secure filename
      const timestamp = Date.now();
      const fileExtension = processedFile.name.split('.').pop();
      const secureFileName = `${user.id}_${timestamp}.${fileExtension}`;
      const filePath = `${folder}/${secureFileName}`;

      // Upload with timeout
      const { data, error } = await withTimeout(
        supabase.storage
          .from(bucketName)
          .upload(filePath, processedFile, {
            cacheControl: "3600",
            upsert: false,
          }),
        15000 // 15 second timeout
      );

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const newPhotos = [...photos, urlData.publicUrl];
      onPhotosChange(newPhotos);

      toast({
        title: "Photo uploadée",
        description: "La photo a été uploadée avec succès.",
      });

    } catch (error: any) {
      console.error("Error uploading photo:", error);
      throw error;
    }
  };

  const removePhoto = async (photoUrl: string, index: number): Promise<void> => {
    if (!user) {
      throw new Error("Vous devez être connecté pour supprimer des photos");
    }

    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${folder}/${fileName}`;

      // Only allow deletion of files uploaded by current user (security check)
      if (!fileName.startsWith(user.id)) {
        throw new Error("Vous ne pouvez supprimer que vos propres photos");
      }

      const { error } = await withTimeout(
        supabase.storage.from(bucketName).remove([filePath]),
        10000 // 10 second timeout
      );

      if (error) {
        console.error("Error removing from storage:", error);
        // Continue with UI update even if storage deletion fails
      }

      const newPhotos = photos.filter((_, i) => i !== index);
      onPhotosChange(newPhotos);

      toast({
        title: "Photo supprimée",
        description: "La photo a été supprimée avec succès.",
      });

    } catch (error: any) {
      console.error("Error removing photo:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression de la photo",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (photos.length + files.length > maxPhotos) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez pas uploader plus de ${maxPhotos} photos.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of files) {
        await uploadPhoto(file);
      }
    } catch (error: any) {
      toast({
        title: "Erreur d'upload",
        description: error.message || "Erreur lors de l'upload de la photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Clear the input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {securityWarnings.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <ul className="list-disc list-inside space-y-1">
              {securityWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading || photos.length >= maxPhotos}
          className="relative"
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={disabled || uploading}
          />
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Upload en cours..." : "Galerie"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading || photos.length >= maxPhotos}
          className="relative"
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={disabled || uploading}
          />
          <Camera className="w-4 h-4 mr-2" />
          Appareil photo
        </Button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removePhoto(photo, index)}
                disabled={disabled || uploading}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Aucune photo uploadée</p>
          <p className="text-sm">
            Utilisez les boutons ci-dessus pour ajouter des photos ({maxPhotos} max)
          </p>
        </div>
      )}
    </div>
  );
}