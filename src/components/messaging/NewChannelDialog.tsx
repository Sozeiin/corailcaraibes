import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Hash, Lock } from "lucide-react";

interface NewChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChannelDialog({ open, onOpenChange }: NewChannelDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelType, setChannelType] = useState<"public" | "private">("public");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          channel_type: channelType,
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Auto-join the creator to the channel
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channel.id,
          user_id: user.id
        });

      if (memberError) throw memberError;

      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast({
        title: "Canal créé",
        description: "Le canal a été créé avec succès",
      });
      setName("");
      setDescription("");
      setChannelType("public");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le canal",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createChannel.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau canal</DialogTitle>
          <DialogDescription>
            Organisez vos conversations par thématique
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du canal</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: maintenance, sav..."
              required
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'objectif de ce canal..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Type de canal</Label>
            <RadioGroup value={channelType} onValueChange={(value: any) => setChannelType(value)}>
              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Public</div>
                    <div className="text-sm text-muted-foreground">
                      Visible par tous les membres
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Privé</div>
                    <div className="text-sm text-muted-foreground">
                      Accessible uniquement sur invitation
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim() || createChannel.isPending}>
              {createChannel.isPending ? "Création..." : "Créer le canal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
