import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Profile {
  id: string;
  name: string;
  role: string;
}

interface ChannelMembersSelectorProps {
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
}

export function ChannelMembersSelector({ selectedUserIds, onChange }: ChannelMembersSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles-for-channel-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .order('name');

      if (error) throw error;
      return data as Profile[];
    },
  });

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter(id => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const removeUser = (userId: string) => {
    onChange(selectedUserIds.filter(id => id !== userId));
  };

  const selectedProfiles = profiles.filter(p => selectedUserIds.includes(p.id));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Membres du canal privé</Label>
        <p className="text-sm text-muted-foreground">
          Sélectionnez les utilisateurs qui auront accès à ce canal
        </p>
      </div>

      {/* Membres sélectionnés */}
      {selectedProfiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {selectedProfiles.map(profile => (
            <Badge
              key={profile.id}
              variant="secondary"
              className="gap-1.5 pr-1"
            >
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[10px]">
                  {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{profile.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeUser(profile.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Recherche */}
      <Input
        placeholder="Rechercher un utilisateur..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Liste des utilisateurs */}
      <ScrollArea className="h-64 rounded-md border">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Chargement...
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Aucun utilisateur trouvé
          </div>
        ) : (
          <div className="p-2">
            {filteredProfiles.map(profile => {
              const isSelected = selectedUserIds.includes(profile.id);
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => toggleUser(profile.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary' : 'border-input'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{profile.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {profile.role.replace('_', ' ')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {selectedUserIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedUserIds.length} membre{selectedUserIds.length > 1 ? 's' : ''} sélectionné{selectedUserIds.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
