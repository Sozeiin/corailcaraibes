import { useState } from "react";
import { Hash } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ChannelSidebar } from "@/components/messaging/ChannelSidebar";
import { TopicsList } from "@/components/messaging/TopicsList";
import { TopicThread } from "@/components/messaging/TopicThread";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Messagerie() {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Layout>
        <div className="h-[calc(100vh-12rem)]">
          <Tabs defaultValue="channels" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="channels">Canaux</TabsTrigger>
              <TabsTrigger value="topics" disabled={!selectedChannelId}>Sujets</TabsTrigger>
              <TabsTrigger value="thread" disabled={!selectedTopicId}>Discussion</TabsTrigger>
            </TabsList>
            
            <TabsContent value="channels" className="flex-1 m-0 overflow-hidden">
              <ChannelSidebar 
                selectedChannelId={selectedChannelId}
                onSelectChannel={setSelectedChannelId}
              />
            </TabsContent>
            
            <TabsContent value="topics" className="flex-1 m-0 overflow-hidden">
              {selectedChannelId && (
                <TopicsList 
                  channelId={selectedChannelId}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={setSelectedTopicId}
                />
              )}
            </TabsContent>
            
            <TabsContent value="thread" className="flex-1 m-0 overflow-hidden">
              {selectedTopicId && (
                <TopicThread topicId={selectedTopicId} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex gap-0 h-[calc(100vh-12rem)] overflow-hidden rounded-xl border border-border/50 shadow-lg bg-card">
        {/* Sidebar des canaux */}
        <div className="w-72 border-r border-border flex-shrink-0 bg-card">
          <ChannelSidebar 
            selectedChannelId={selectedChannelId}
            onSelectChannel={setSelectedChannelId}
          />
        </div>
        
        {/* Zone principale */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          {/* Liste des sujets */}
          <div className={selectedTopicId ? "w-[400px] lg:w-[450px] border-r border-border flex-shrink-0" : "flex-1"}>
            {selectedChannelId ? (
              <TopicsList 
                channelId={selectedChannelId}
                selectedTopicId={selectedTopicId}
                onSelectTopic={setSelectedTopicId}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 bg-background">
                <div className="rounded-full bg-primary/10 p-6 mb-4">
                  <Hash className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Bienvenue dans la messagerie</h3>
                <p className="text-sm text-center max-w-md text-muted-foreground">
                  Sélectionnez un canal dans la liste pour commencer à discuter avec votre équipe et suivre l'avancement des tâches
                </p>
              </div>
            )}
          </div>
          
          {/* Thread de discussion */}
          {selectedTopicId && (
            <div className="flex-1 min-w-0">
              <TopicThread topicId={selectedTopicId} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
