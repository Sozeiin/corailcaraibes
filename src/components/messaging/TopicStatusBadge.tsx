import { Badge } from "@/components/ui/badge";

interface TopicStatusBadgeProps {
  status: string;
}

const statusConfig = {
  todo: { label: "À faire", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "En cours", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  waiting: { label: "En attente", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  validation: { label: "En validation", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  closed: { label: "Clôturé", className: "bg-green-500/10 text-green-600 dark:text-green-400" }
};

export function TopicStatusBadge({ status }: TopicStatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.todo;
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
