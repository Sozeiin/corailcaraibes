import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MessageComposerProps {
  topicId: string;
}

export function MessageComposer({ topicId }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (messageContent: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('messages')
        .insert({
          topic_id: topicId,
          author_id: user.id,
          content: messageContent
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', topicId] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setContent("");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      sendMessage.mutate(content);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Écrire un message..."
        className="min-h-[80px] resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm">
          <Paperclip className="h-4 w-4 mr-2" />
          Joindre
        </Button>
        
        <Button 
          type="submit" 
          size="sm"
          disabled={!content.trim() || sendMessage.isPending}
        >
          <Send className="h-4 w-4 mr-2" />
          Envoyer
        </Button>
      </div>
    </form>
  );
}
