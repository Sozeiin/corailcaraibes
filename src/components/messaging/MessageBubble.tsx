import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Message } from '@/types/messaging';
import { useAuth } from '@/contexts/AuthContext';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useAuth();
  const isOwnMessage = message.author_id === user?.id;

  const roleColors = {
    direction: 'bg-purple-100 text-purple-700',
    chef_base: 'bg-blue-100 text-blue-700',
    technicien: 'bg-green-100 text-green-700',
    administratif: 'bg-orange-100 text-orange-700',
  };

  const roleColor = message.user?.role 
    ? roleColors[message.user.role as keyof typeof roleColors] 
    : 'bg-gray-100 text-gray-700';

  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={roleColor}>
          {message.user?.name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {message.user?.name || 'Utilisateur'}
          </span>
          {message.user?.role && (
            <Badge variant="secondary" className="text-xs capitalize">
              {message.user.role}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
          </span>
        </div>

        <div className={`
          rounded-lg p-3 text-sm
          ${isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-foreground'
          }
        `}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
