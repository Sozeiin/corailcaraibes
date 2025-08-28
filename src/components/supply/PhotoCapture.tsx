import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhotoCaptureProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}

export function PhotoCapture({ photoUrl, onPhotoChange }: PhotoCaptureProps) {
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      closeCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
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
        description: "Impossible d'accéder à la caméra. Vérifiez les permissions.",
      });
      setShowCamera(false);
    }
  };

  const uploadPhoto = async (file: File): Promise<void> => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `supply-requests/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('stock-photos')
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from('stock-photos')
        .getPublicUrl(filePath);
      onPhotoChange(data.publicUrl);
      toast({
        title: 'Photo ajoutée',
        description: 'La photo a été téléchargée avec succès.',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Erreur lors du téléchargement de la photo",
      });
    } finally {
      setIsUploading(false);
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

  const removePhoto = () => {
    onPhotoChange(null);
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={startCamera} disabled={isUploading}>
        <Camera className="h-4 w-4 mr-2" />
        Prendre une photo
      </Button>
      {photoUrl && (
        <div className="relative w-32 h-32">
          <img src={photoUrl} alt="Preview" className="w-full h-full object-cover rounded border" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1"
            onClick={removePhoto}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <Dialog open={showCamera} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prendre une photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded-lg bg-gray-800" />
            <div className="flex justify-center gap-2">
              <Button onClick={capturePhoto} disabled={isUploading} className="flex-1">
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

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

