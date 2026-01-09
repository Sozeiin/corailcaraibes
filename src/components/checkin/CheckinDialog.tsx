import React, { useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ChecklistForm, ChecklistFormRef } from '@/components/checkin/ChecklistForm';
import { useFormState } from '@/contexts/FormStateContext';
import { useToast } from '@/hooks/use-toast';

interface CheckinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boat: any;
  rentalData: any;
  onComplete: (data: any) => void;
  type?: 'checkin' | 'checkout';
}

export function CheckinDialog({
  isOpen,
  onClose,
  boat,
  rentalData,
  onComplete,
  type = 'checkin'
}: CheckinDialogProps) {
  const { registerForm, unregisterForm } = useFormState();
  const { toast } = useToast();
  const formRef = useRef<ChecklistFormRef>(null);

  // Enregistrer/désenregistrer le formulaire pour suspendre le refresh
  useEffect(() => {
    if (isOpen) {
      registerForm();
      console.log('📝 CheckinDialog enregistré');
    } else {
      unregisterForm();
      console.log('📝 CheckinDialog désenregistré');
    }
    
    return () => {
      unregisterForm();
    };
  }, [isOpen, registerForm, unregisterForm]);

  const handleComplete = (data: any) => {
    onComplete(data);
    if (data !== null) {
      onClose();
    }
  };

  // Sauvegarder le brouillon et fermer le dialog
  const handleCancel = useCallback(() => {
    // Sauvegarder le formulaire avant de fermer
    if (formRef.current) {
      formRef.current.saveFormNow();
      console.log('💾 [CheckinDialog] Brouillon sauvegardé avant fermeture');
      toast({
        title: "Brouillon sauvegardé",
        description: "Votre progression a été sauvegardée automatiquement.",
      });
    }
    
    onComplete(null);
    onClose();
  }, [onComplete, onClose, toast]);

  // Sauvegarder AVANT que Radix ne ferme le dialog (plus robuste que onOpenChange)
  const handlePointerDownOutside = useCallback(() => {
    console.log('👆 [CheckinDialog] Clic hors modal détecté, sauvegarde immédiate');
    if (formRef.current) {
      formRef.current.saveFormNow();
    }
  }, []);

  const handleEscapeKeyDown = useCallback(() => {
    console.log('⎋ [CheckinDialog] Touche Escape détectée, sauvegarde immédiate');
    if (formRef.current) {
      formRef.current.saveFormNow();
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent 
        className="max-w-[98vw] w-[98vw] max-h-[98vh] h-[98vh] overflow-hidden p-0 gap-0"
        onPointerDownOutside={handlePointerDownOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <div className="h-full overflow-y-auto p-6">
          <ChecklistForm
            ref={formRef}
            boat={boat}
            rentalData={rentalData}
            type={type}
            onComplete={handleComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
