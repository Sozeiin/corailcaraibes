import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, Trash2, X } from 'lucide-react';

interface StockPhotoUploadProps {
  photoUrl?: string;
  onPhotoChange: (photoUrl: string | null) => void;
  disabled?: boolean;
}

export const StockPhotoUpload = ({ photoUrl, onPhotoChange, disabled = false }: StockPhotoUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadPhoto = async (file: File): Promise<void> => {
    if (!user) return;

    try {
      setIsUploading(true);

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La taille du fichier ne doit pas dépasser 5MB');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `stock-${timestamp}-${randomId}.${extension}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stock-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('stock-photos')
        .getPublicUrl(uploadData.path);

      onPhotoChange(urlData.publicUrl);

      toast({
        title: 'Photo ajoutée',
        description: 'La photo a été téléchargée avec succès.',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du téléchargement de la photo',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = async (): Promise<void> => {
    if (!photoUrl) return;

    try {
      setIsUploading(true);

      // Extract filename from URL
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // Remove from storage
      const { error } = await supabase.storage
        .from('stock-photos')
        .remove([fileName]);

      if (error) {
        console.error('Error removing file from storage:', error);
        // Continue anyway since the file might not exist
      }

      onPhotoChange(null);

      toast({
        title: 'Photo supprimée',
        description: 'La photo a été supprimée avec succès.',
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors de la suppression de la photo',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Utilise la caméra arrière sur mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'accéder à la caméra. Vérifiez les permissions.',
      });
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            uploadPhoto(file);
            closeCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => document.getElementById('stock-photo-upload')?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Ajouter une photo
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={startCamera}
        >
          <Camera className="h-4 w-4 mr-2" />
          Prendre une photo
        </Button>
      </div>

      <input
        id="stock-photo-upload"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Modal caméra */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prendre une photo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover rounded-lg bg-gray-800"
              />
            </div>
            
            <div className="flex justify-center gap-2">
              <Button
                onClick={capturePhoto}
                className="flex-1"
                disabled={isUploading}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturer
              </Button>
              <Button
                onClick={closeCamera}
                variant="outline"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />

      {photoUrl && (
        <div className="relative">
          <img
            src={photoUrl}
            alt="Article"
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={removePhoto}
            disabled={disabled || isUploading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isUploading && (
        <div className="text-center text-sm text-gray-500">
          Téléchargement en cours...
        </div>
      )}
    </div>
  );
};