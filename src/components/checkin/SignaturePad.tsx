import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw, Check, PenTool } from 'lucide-react';

interface SignaturePadProps {
  title: string;
  description: string;
  onSignature: (dataURL: string) => void;
  required?: boolean;
}

export function SignaturePad({ title, description, onSignature, required = true }: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [signed, setSigned] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const clearSignature = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setSigned(false);
      setIsEmpty(true);
    }
  };

  const saveSignature = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataURL = sigPadRef.current.toDataURL('image/png');
      onSignature(dataURL);
      setSigned(true);
    }
  };

  const handleEnd = () => {
    if (sigPadRef.current) {
      setIsEmpty(sigPadRef.current.isEmpty());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          {title}
          {required && <span className="text-destructive">*</span>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <SignatureCanvas
            ref={sigPadRef}
            canvasProps={{
              width: 500,
              height: 200,
              className: 'signature-canvas w-full h-48 cursor-crosshair',
              style: { touchAction: 'none' }
            }}
            backgroundColor="rgb(249, 250, 251)"
            onEnd={handleEnd}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <Label className="text-sm text-muted-foreground">
            Signez dans la zone ci-dessus avec votre doigt ou un stylet
          </Label>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Effacer
            </Button>
            
            <Button
              type="button"
              size="sm"
              onClick={saveSignature}
              disabled={isEmpty}
              className={signed ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {signed ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Signé
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Valider
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}