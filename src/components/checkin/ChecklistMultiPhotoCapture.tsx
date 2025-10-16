import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ImagePreview } from '@/components/ui/image-preview';
import {
  uploadChecklistPhoto,
  deleteChecklistPhoto,
  saveChecklistPhoto,
  deleteChecklistPhotoFromDB
} from '@/lib/checklistPhotoUtils';

interface ChecklistMultiPhotoCaptureProps {
  photos: Array<{ id?: string; url: string; displayOrder: number }>;
  onPhotosChange: (photos: Array<{ id?: string; url: string; displayOrder: number }>) => void;
  checklistId: string;
  itemId: string;
  maxPhotos?: number;
  disabled?: boolean;
}

export function ChecklistMultiPhotoCapture({
  photos = [],
  onPhotosChange,
  checklistId,
  itemId,
  maxPhotos = 5,
  disabled = false
}: ChecklistMultiPhotoCaptureProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Nettoyer le stream lors du démontage
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Connecter le stream à la vidéo quand il change
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream || !showCamera) {
      console.log('📹 Conditions non remplies:', { 
        hasVideo: !!video, 
        hasStream: !!stream, 
        showCamera 
      });
      return;
    }

    console.log('📹 Connexion du stream à la vidéo...', {
      streamActive: stream.active,
      streamTracks: stream.getTracks().length
    });
    
    video.srcObject = stream;
    
    // Attendre que les métadonnées soient chargées avant de lire
    const handleLoadedMetadata = () => {
      console.log('📹 Métadonnées vidéo chargées:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      video.play()
        .then(() => console.log('✅ Vidéo en lecture'))
        .catch(err => console.error('❌ Erreur lecture vidéo:', err));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [stream, showCamera]);

  /**
   * Démarrer la caméra
   */
  const startCamera = async () => {
    try {
      console.log('📸 Demande d\'accès à la caméra...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      console.log('✅ Caméra accessible, stream obtenu');
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error: any) {
      console.error('❌ Erreur accès caméra:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accéder à la caméra. Vérifiez les permissions.',
        variant: 'destructive'
      });
    }
  };

  /**
   * Capturer une photo depuis la caméra
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await handlePhotoUpload(file);
      closeCamera();
    }, 'image/jpeg', 0.85);
  };

  /**
   * Fermer la caméra
   */
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  /**
   * Gérer l'upload d'une photo
   */
  const handlePhotoUpload = async (file: File) => {
    if (photos.length >= maxPhotos) {
      toast({
        title: 'Limite atteinte',
        description: `Vous ne pouvez ajouter que ${maxPhotos} photos maximum`,
        variant: 'destructive'
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload vers le storage
      const photoUrl = await uploadChecklistPhoto(
        file,
        checklistId,
        itemId,
        photos.length
      );
      
      // Sauvegarder dans la DB si checklist existe déjà
      let photoId: string | undefined;
      if (checklistId && !checklistId.startsWith('temp-')) {
        const savedPhoto = await saveChecklistPhoto(
          checklistId,
          itemId,
          photoUrl,
          photos.length
        );
        photoId = savedPhoto.id;
      }
      
      // Ajouter au tableau local
      const newPhotos = [
        ...photos,
        { id: photoId, url: photoUrl, displayOrder: photos.length }
      ];
      
      onPhotosChange(newPhotos);
      
      toast({
        title: 'Photo ajoutée',
        description: `${newPhotos.length}/${maxPhotos} photos`
      });
    } catch (error: any) {
      console.error('Erreur upload photo:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter la photo',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Supprimer une photo
   */
  const removePhoto = async (index: number) => {
    const photoToRemove = photos[index];
    
    try {
      // Supprimer du storage
      await deleteChecklistPhoto(photoToRemove.url);
      
      // Supprimer de la DB si existe
      if (photoToRemove.id) {
        await deleteChecklistPhotoFromDB(photoToRemove.id);
      }
      
      // Retirer du tableau local
      const newPhotos = photos.filter((_, i) => i !== index);
      onPhotosChange(newPhotos);
      
      toast({
        title: 'Photo supprimée'
      });
    } catch (error: any) {
      console.error('Erreur suppression photo:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la photo',
        variant: 'destructive'
      });
    }
  };

  /**
   * Sélectionner un fichier depuis le device
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      {/* Galerie de miniatures */}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 group cursor-pointer"
              onClick={() => setSelectedPhotoIndex(index)}
            >
              <img
                src={photo.url}
                alt={`Photo ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg border-2 border-border group-hover:border-primary transition-colors"
                loading="lazy"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(index);
                }}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1 rounded-tl">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Boutons d'ajout */}
      {photos.length < maxPhotos && !disabled && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={startCamera}
            disabled={isUploading}
            title="Prendre une photo"
          >
            <Camera className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Choisir un fichier"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Indicateur de chargement */}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Upload en cours...
        </div>
      )}

      {/* Badge compteur */}
      {photos.length > 0 && (
        <div className="text-xs text-center text-muted-foreground">
          {photos.length}/{maxPhotos} photos
        </div>
      )}

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Dialog caméra */}
      <Dialog open={showCamera} onOpenChange={closeCamera}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prendre une photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => console.log('📹 Event: loadedmetadata')}
                onPlay={() => console.log('📹 Event: play')}
                onError={(e) => console.error('📹 Event: error', e)}
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Capturer
              </Button>
              <Button onClick={closeCamera} variant="outline">
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview plein écran */}
      {selectedPhotoIndex !== null && (
        <ImagePreview
          src={photos[selectedPhotoIndex].url}
          alt={`Photo ${selectedPhotoIndex + 1}`}
          open={true}
          onOpenChange={() => setSelectedPhotoIndex(null)}
        />
      )}
    </div>
  );
}
