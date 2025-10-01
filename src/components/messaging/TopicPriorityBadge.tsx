import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowUp, Minus, Zap } from "lucide-react";

interface TopicPriorityBadgeProps {
  priority: string;
}

const priorityConfig = {
  low: { 
    label: "Basse", 
    icon: Minus,
    className: "bg-muted text-muted-foreground" 
  },
  medium: { 
    label: "Moyenne", 
    icon: AlertCircle,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
  },
  high: { 
    label: "Haute", 
    icon: ArrowUp,
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" 
  },
  critical: { 
    label: "Critique", 
    icon: Zap,
    className: "bg-red-500/10 text-red-600 dark:text-red-400" 
  }
};

export function TopicPriorityBadge({ priority }: TopicPriorityBadgeProps) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
