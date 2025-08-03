import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, CheckCircle } from 'lucide-react';

interface EmailStepProps {
  customerEmail: string;
  onCustomerEmailChange: (email: string) => void;
  sendEmailReport: boolean;
  onSendEmailReportChange: (send: boolean) => void;
  type: 'checkin' | 'checkout';
  isLoading?: boolean;
}

export function EmailStep({
  customerEmail,
  onCustomerEmailChange,
  sendEmailReport,
  onSendEmailReportChange,
  type,
  isLoading = false,
}: EmailStepProps) {
  const isEmailValid = sendEmailReport ? customerEmail && customerEmail.includes('@') : true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Rapport par email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="send-email"
              checked={sendEmailReport}
              onCheckedChange={onSendEmailReportChange}
              disabled={isLoading}
            />
            <Label htmlFor="send-email">
              Envoyer le rapport de {type === 'checkin' ? 'check-in' : 'check-out'} par email
            </Label>
          </div>

          {sendEmailReport && (
            <div className="space-y-2">
              <Label htmlFor="customer-email">
                Adresse email du client <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={(e) => onCustomerEmailChange(e.target.value)}
                placeholder="client@example.com"
                disabled={isLoading}
              />
              {!isEmailValid && (
                <p className="text-sm text-destructive">
                  Veuillez entrer une adresse email valide.
                </p>
              )}
            </div>
          )}

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {sendEmailReport 
                ? `Le rapport détaillé avec les signatures sera envoyé à l'adresse ${customerEmail || 'spécifiée'}.`
                : 'Le rapport ne sera pas envoyé par email. Vous pourrez l\'envoyer manuellement plus tard.'
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-4">
              <Send className="h-5 w-5 mr-2 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Finalisation en cours...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}