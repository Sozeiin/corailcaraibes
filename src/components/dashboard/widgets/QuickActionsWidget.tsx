import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, FileText, Package, Wrench, QrCode, ShoppingCart, Ship, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export const QuickActionsWidget = ({
  config
}: WidgetProps) => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const getActionsForRole = () => {
    if (user?.role === 'direction') {
      return [{
        label: 'Nouveau Bateau',
        icon: Plus,
        onClick: () => navigate('/boats'),
        variant: 'default' as const
      }, {
        label: 'Voir Rapports',
        icon: FileText,
        onClick: () => navigate('/rapports'),
        variant: 'outline' as const
      }, {
        label: 'Gestion Stock',
        icon: Package,
        onClick: () => navigate('/stock'),
        variant: 'outline' as const
      }, {
        label: 'Commandes',
        icon: ShoppingCart,
        onClick: () => navigate('/orders'),
        variant: 'outline' as const
      }];
    } else if (user?.role === 'chef_base') {
      return [{
        label: 'Nouvel Ordre',
        icon: Plus,
        onClick: () => navigate('/orders'),
        variant: 'default' as const
      }, {
        label: 'Scanner Stock',
        icon: QrCode,
        onClick: () => navigate('/stock'),
        variant: 'outline' as const
      }, {
        label: 'Maintenance',
        icon: Wrench,
        onClick: () => navigate('/maintenance'),
        variant: 'outline' as const
      }, {
        label: 'Planning',
        icon: Calendar,
        onClick: () => navigate('/planning'),
        variant: 'outline' as const
      }, {
        label: 'Voir Rapports',
        icon: FileText,
        onClick: () => navigate('/rapports'),
        variant: 'outline' as const
      }];
    } else {
      // technicien
      return [{
        label: 'Mes Interventions',
        icon: Wrench,
        onClick: () => navigate('/maintenance'),
        variant: 'default' as const
      }, {
        label: 'Scanner Stock',
        icon: QrCode,
        onClick: () => navigate('/stock'),
        variant: 'outline' as const
      }, {
        label: 'Bateaux',
        icon: Ship,
        onClick: () => navigate('/boats'),
        variant: 'outline' as const
      }, {
        label: 'Demande Achat',
        icon: ShoppingCart,
        onClick: () => navigate('/orders'),
        variant: 'outline' as const
      }];
    }
  };
  const actions = getActionsForRole();
  return <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => <Button key={index} variant={action.variant} size="sm" onClick={action.onClick} className="h-16 p-2 flex flex-col items-center justify-center gap-0.5 px-[7px]">
              <action.icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs text-center leading-none font-medium">
                {action.label}
              </span>
            </Button>)}
        </div>
      </CardContent>
    </Card>;
};