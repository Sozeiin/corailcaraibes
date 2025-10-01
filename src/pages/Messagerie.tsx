import { useState } from "react";
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
        <div className="h-[calc(100vh-4rem)]">
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
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <div className="w-64 border-r border-border bg-card flex-shrink-0">
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
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sélectionnez un canal pour voir les sujets
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
