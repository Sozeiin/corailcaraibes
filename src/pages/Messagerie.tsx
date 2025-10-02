import React, { useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChannelSidebar } from '@/components/messaging/ChannelSidebar';
import { ThreadsList } from '@/components/messaging/ThreadsList';
import { ThreadDetail } from '@/components/messaging/ThreadDetail';
import { CreateThreadDialog } from '@/components/messaging/CreateThreadDialog';
import { CollapsibleColumn, ExpandColumnButton } from '@/components/messaging/CollapsibleColumn';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Channel } from '@/types/messaging';

export default function Messagerie() {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { visibility, toggleColumn } = useColumnVisibility();

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['messaging-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Channel[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messagerie</h1>
            <p className="text-sm text-muted-foreground">
              Gestion des demandes et communications par canaux
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau sujet
        </Button>
      </div>

      {/* Main Layout - 3 colonnes réductibles */}
      <Card className="flex-1 flex overflow-hidden">
        <CardContent className="flex w-full p-0 relative">
          {!visibility.channels && <ExpandColumnButton onClick={() => toggleColumn('channels')} title="canaux" />}
          {!visibility.threads && visibility.channels && <ExpandColumnButton onClick={() => toggleColumn('threads')} title="sujets" />}
          
          <CollapsibleColumn isVisible={visibility.channels} onToggle={() => toggleColumn('channels')} className="w-64 bg-muted/30" title="canaux">
            <ChannelSidebar channels={channels} selectedChannelId={selectedChannelId} onChannelSelect={setSelectedChannelId} />
          </CollapsibleColumn>

          <CollapsibleColumn isVisible={visibility.threads} onToggle={() => toggleColumn('threads')} className="w-96" title="sujets">
            <ThreadsList channelId={selectedChannelId} selectedThreadId={selectedThreadId} onThreadSelect={setSelectedThreadId} />
          </CollapsibleColumn>

          <div className="flex-1 flex flex-col">
            {selectedThreadId ? (
              <ThreadDetail threadId={selectedThreadId} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Sélectionnez un sujet</p>
                  <p className="text-sm">Choisissez un canal et un sujet pour commencer</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de création */}
      <CreateThreadDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        channelId={selectedChannelId}
        channels={channels}
      />
    </div>
  );
}
