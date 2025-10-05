import React, { useState } from 'react';
import { MessageSquare, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChannelSidebar } from '@/components/messaging/ChannelSidebar';
import { ThreadsList } from '@/components/messaging/ThreadsList';
import { ThreadDetail } from '@/components/messaging/ThreadDetail';
import { CreateThreadDialog } from '@/components/messaging/CreateThreadDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { usePanelState } from '@/hooks/useColumnVisibility';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Channel } from '@/types/messaging';

export default function Messagerie() {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { channelsRef, threadsRef, panelState, togglePanel, onLayout } = usePanelState();

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

      {/* Main Layout - 3 colonnes responsives */}
      <Card className="flex-1 flex overflow-hidden">
        <CardContent className="flex w-full p-0 relative">
          <ResizablePanelGroup 
            direction="horizontal" 
            onLayout={onLayout}
            className="w-full"
          >
            {/* Colonne Canaux */}
            <ResizablePanel
              ref={channelsRef}
              defaultSize={panelState.channels.size}
              minSize={15}
              collapsible
              collapsedSize={0}
              onCollapse={() => {}}
              onExpand={() => {}}
              className="relative"
            >
              <div className="h-full bg-muted/30 relative">
                {!panelState.channels.collapsed && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePanel('channels')}
                      className="absolute top-2 right-2 z-10 h-6 w-6 p-0"
                      title="Réduire les canaux"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <ChannelSidebar 
                      channels={channels} 
                      selectedChannelId={selectedChannelId} 
                      onChannelSelect={setSelectedChannelId} 
                    />
                  </>
                )}
                {panelState.channels.collapsed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePanel('channels')}
                    className="absolute top-2 left-2 z-10 h-8 w-8 p-0"
                    title="Afficher les canaux"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Colonne Sujets */}
            <ResizablePanel
              ref={threadsRef}
              defaultSize={panelState.threads.size}
              minSize={20}
              collapsible
              collapsedSize={0}
              onCollapse={() => {}}
              onExpand={() => {}}
              className="relative"
            >
              <div className="h-full relative">
                {!panelState.threads.collapsed && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePanel('threads')}
                      className="absolute top-2 right-2 z-10 h-6 w-6 p-0"
                      title="Réduire les sujets"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <ThreadsList 
                      channelId={selectedChannelId} 
                      selectedThreadId={selectedThreadId} 
                      onThreadSelect={setSelectedThreadId} 
                    />
                  </>
                )}
                {panelState.threads.collapsed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePanel('threads')}
                    className="absolute top-2 left-2 z-10 h-8 w-8 p-0"
                    title="Afficher les sujets"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Colonne Détail (toujours visible) */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col">
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
            </ResizablePanel>
          </ResizablePanelGroup>
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
