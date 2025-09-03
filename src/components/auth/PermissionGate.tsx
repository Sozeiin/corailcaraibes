import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions, PagePermission } from '@/hooks/usePermissions';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

interface PermissionGateProps {
  children: React.ReactNode;
  page: PagePermission;
  fallbackPath?: string;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  page,
  fallbackPath = '/dashboard'
}) => {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasPermission(page)) {
    // Try to redirect to an allowed page
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export const PermissionDenied: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Alert className="max-w-md">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Vous n'avez pas l'autorisation d'accéder à cette page. 
          Contactez votre administrateur si vous pensez que c'est une erreur.
        </AlertDescription>
      </Alert>
    </div>
  );
};