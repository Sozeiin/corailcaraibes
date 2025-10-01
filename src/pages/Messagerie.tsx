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
        <div className="h-[calc(100vh-8rem)]">
          <Tabs defaultValue="channels" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="channels">Canaux</TabsTrigger>
              <TabsTrigger value="topics" disabled={!selectedChannelId}>Sujets</TabsTrigger>
              <TabsTrigger value="thread" disabled={!selectedTopicId}>Discussion</TabsTrigger>
            </TabsList>
            
            <TabsContent value="channels" className="h-[calc(100%-3rem)] m-0">
              <ChannelSidebar 
                selectedChannelId={selectedChannelId}
                onSelectChannel={setSelectedChannelId}
              />
            </TabsContent>
            
            <TabsContent value="topics" className="h-[calc(100%-3rem)] m-0">
              {selectedChannelId && (
                <TopicsList 
                  channelId={selectedChannelId}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={setSelectedTopicId}
                />
              )}
            </TabsContent>
            
            <TabsContent value="thread" className="h-[calc(100%-3rem)] m-0">
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
      <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-lg border border-border shadow-sm bg-background">
        <div className="w-64 border-r border-border flex-shrink-0">
          <ChannelSidebar 
            selectedChannelId={selectedChannelId}
            onSelectChannel={setSelectedChannelId}
          />
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          <div className={selectedTopicId ? "w-3/5 border-r border-border" : "flex-1"}>
            {selectedChannelId ? (
              <TopicsList 
                channelId={selectedChannelId}
                selectedTopicId={selectedTopicId}
                onSelectTopic={setSelectedTopicId}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <Hash className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Bienvenue dans la messagerie</p>
                <p className="text-sm text-center max-w-sm">
                  Sélectionnez un canal dans la liste pour commencer à discuter avec votre équipe
                </p>
              </div>
            )}
          </div>
          
          {selectedTopicId && (
            <div className="w-2/5">
              <TopicThread topicId={selectedTopicId} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
