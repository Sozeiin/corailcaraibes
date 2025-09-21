import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImagePreview = ({ src, alt, open, onOpenChange }: ImagePreviewProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90 border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};