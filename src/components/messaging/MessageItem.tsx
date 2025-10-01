import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface MessageItemProps {
  message: any;
}

export function MessageItem({ message }: MessageItemProps) {
  const initials = message.author?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '??';

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{message.author?.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: fr
            })}
          </span>
        </div>
        
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {message.attachments.map((attachment: any, i: number) => (
              <div
                key={i}
                className="px-3 py-2 bg-muted rounded text-xs"
              >
                📎 {attachment.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
