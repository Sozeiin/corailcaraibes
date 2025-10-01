import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
interface ChecklistPhotoCaptureProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  checklistId?: string;
  itemId: string;
}
export function ChecklistPhotoCapture({
  photoUrl,
  onPhotoChange,
  checklistId,
  itemId
}: ChecklistPhotoCaptureProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const {
    toast
  } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = async (file: File) => {
    try {
      setIsUploading(true);

      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        throw new Error('Veuillez sélectionner une image valide');
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        throw new Error('L\'image ne doit pas dépasser 5MB');
      }
      const fileName = `${checklistId || 'temp'}/${itemId}_${Date.now()}.jpg`;
      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('checklist-photos').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
      if (uploadError) throw uploadError;
      console.log('Upload successful:', uploadData);
      const {
        data: urlData
      } = supabase.storage.from('checklist-photos').getPublicUrl(uploadData.path);
      console.log('URL data:', urlData);
      console.log('Public URL:', urlData.publicUrl);

      // Vérifier que l'image est accessible avant de la définir
      const img = new Image();
      img.onload = () => {
        console.log('Image accessible:', urlData.publicUrl);
        onPhotoChange(urlData.publicUrl);
      };
      img.onerror = () => {
        console.error('Image not accessible:', urlData.publicUrl);
        toast({
          title: 'Erreur',
          description: 'La photo a été uploadée mais n\'est pas accessible. Réessayez.',
          variant: 'destructive'
        });
      };
      img.src = urlData.publicUrl;
      toast({
        title: 'Photo ajoutée',
        description: 'La photo a été ajoutée avec succès.'
      });
    } catch (error: any) {
      console.error('Erreur upload photo:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'upload de la photo',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  const startCamera = async () => {
    try {
      setShowCamera(true);

      // Wait for dialog to be open before requesting camera
      await new Promise(resolve => setTimeout(resolve, 100));
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: 'environment'
          },
          // Prefer back camera
          width: {
            ideal: 1280
          },
          height: {
            ideal: 720
          }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Erreur accès caméra:', error);
      setShowCamera(false);
      toast({
        title: 'Erreur caméra',
        description: 'Impossible d\'accéder à la caméra. Vérifiez les permissions.',
        variant: 'destructive'
      });
    }
  };
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob and upload
    canvas.toBlob(async blob => {
      if (blob) {
        const file = new File([blob], `checklist_${itemId}_${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        await uploadPhoto(file);
        closeCamera();
      }
    }, 'image/jpeg', 0.8);
  };
  const closeCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPhoto(file);
    }
    e.target.value = '';
  };
  const removePhoto = async () => {
    if (photoUrl) {
      try {
        // Extract file path from URL
        const urlParts = photoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = urlParts.slice(-2).join('/'); // checklistId/fileName

        await supabase.storage.from('checklist-photos').remove([filePath]);
        onPhotoChange(null);
        toast({
          title: 'Photo supprimée',
          description: 'La photo a été supprimée avec succès.'
        });
      } catch (error) {
        console.error('Erreur suppression photo:', error);
        toast({
          title: 'Erreur',
          description: 'Erreur lors de la suppression de la photo',
          variant: 'destructive'
        });
      }
    }
  };
  return <div className="flex flex-col items-center gap-2">
      {!photoUrl ? <div className="flex gap-1 mx-0 px-px">
          <Button variant="outline" size="icon" onClick={startCamera} disabled={isUploading} className="h-7 w-7" title="Prendre une photo">
            <Camera className="h-3 w-3" />
          </Button>
          
        </div> : <div className="flex items-center gap-1">
          <img src={photoUrl} alt="Photo checklist" className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowPreview(true)} title="Cliquer pour agrandir" onError={e => {
        console.error('Error loading image:', photoUrl);
        console.error('Image error event:', e);
      }} onLoad={() => console.log('Image loaded successfully:', photoUrl)} />
          <Button variant="outline" size="icon" onClick={removePhoto} className="h-7 w-7" title="Supprimer la photo">
            <X className="h-3 w-3" />
          </Button>
        </div>}

      {isUploading && <div className="w-12 h-1 bg-gray-200 rounded">
          <div className="h-full bg-primary rounded animate-pulse" />
        </div>}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <Dialog open={showCamera} onOpenChange={closeCamera}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prendre une photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <video ref={videoRef} className="w-full rounded bg-gray-900" autoPlay playsInline muted style={{
              minHeight: '300px'
            }} />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={capturePhoto} disabled={isUploading}>
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

      {/* Modal de prévisualisation en plein écran */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90">
          <div className="relative w-full h-full flex items-center justify-center">
            <img src={photoUrl || ''} alt="Aperçu photo checklist" className="max-w-full max-h-full object-contain" />
            <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)} className="absolute top-4 right-4 text-white hover:bg-white/20" title="Fermer">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}