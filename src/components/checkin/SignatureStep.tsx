import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SignaturePad } from './SignaturePad';
import { FileSignature, AlertCircle } from 'lucide-react';

interface SignatureStepProps {
  type: 'checkin' | 'checkout';
  technicianSignature: string;
  customerSignature: string;
  onTechnicianSignature: (signature: string) => void;
  onCustomerSignature: (signature: string) => void;
  isLoading?: boolean;
}

export function SignatureStep({
  type,
  technicianSignature,
  customerSignature,
  onTechnicianSignature,
  onCustomerSignature,
  isLoading = false,
}: SignatureStepProps) {
  const isComplete = technicianSignature && customerSignature;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Signatures requises
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            {type === 'checkin' 
              ? "Les signatures confirment la prise en charge du bateau et l'accord sur son état."
              : "Les signatures confirment la restitution du bateau et l'accord sur son état final."
            }
          </div>
          
          {!isComplete && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Les deux signatures sont obligatoires pour finaliser le {type === 'checkin' ? 'check-in' : 'check-out'}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <SignaturePad
          title="Signature Technicien"
          description={`Signature du technicien confirmant l'état du bateau lors du ${type === 'checkin' ? 'check-in' : 'check-out'}`}
          onSignature={onTechnicianSignature}
          required={true}
        />

        <SignaturePad
          title="Signature Client"
          description={`Signature du client confirmant l'accord sur l'état du bateau`}
          onSignature={onCustomerSignature}
          required={true}
        />
      </div>

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">
                Traitement des signatures...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}