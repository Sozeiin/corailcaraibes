import React, { useState } from 'react';
import { MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChannelSelector } from '@/components/messaging/ChannelSelector';
import { ThreadsList } from '@/components/messaging/ThreadsList';
import { ThreadDetail } from '@/components/messaging/ThreadDetail';
import { CreateThreadDialog } from '@/components/messaging/CreateThreadDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Channel } from '@/types/messaging';
import { cn } from '@/lib/utils';

export default function Messagerie() {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMobileThreadView, setIsMobileThreadView] = useState(false);

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

      {/* Sélecteur de canal */}
      <div className="mb-4">
        <ChannelSelector
          channels={channels}
          selectedChannelId={selectedChannelId}
          onChannelSelect={setSelectedChannelId}
        />
      </div>

      {/* Main Layout - 2 colonnes responsives */}
      <Card className="flex-1 flex overflow-hidden">
        <CardContent className="flex w-full p-0">
          {/* Mobile: afficher soit la liste, soit le détail */}
          <div className={cn(
            "flex w-full h-full",
            "md:flex"
          )}>
            {/* Colonne Sujets */}
            <div className={cn(
              "w-full md:w-1/3 md:min-w-[320px] lg:w-[30%] border-r",
              isMobileThreadView && selectedThreadId && "hidden md:flex"
            )}>
              <ThreadsList 
                channelId={selectedChannelId} 
                selectedThreadId={selectedThreadId} 
                onThreadSelect={(threadId) => {
                  setSelectedThreadId(threadId);
                  setIsMobileThreadView(true);
                }} 
              />
            </div>

            {/* Colonne Détail */}
            <div className={cn(
              "w-full md:w-2/3 lg:w-[70%] flex flex-col",
              !isMobileThreadView && selectedThreadId && "hidden md:flex"
            )}>
              {/* Bouton retour mobile */}
              {selectedThreadId && (
                <div className="md:hidden p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsMobileThreadView(false);
                      setSelectedThreadId(null);
                    }}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour aux sujets
                  </Button>
                </div>
              )}
              
              {selectedThreadId ? (
                <ThreadDetail threadId={selectedThreadId} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center px-4">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Sélectionnez un sujet</p>
                    <p className="text-sm">Choisissez un sujet pour commencer la conversation</p>
                  </div>
                </div>
              )}
            </div>
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
