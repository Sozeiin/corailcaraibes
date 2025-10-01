import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}

export function NewTopicDialog({ open, onOpenChange, channelId }: NewTopicDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [boatId, setBoatId] = useState("");
  const [baseId, setBaseId] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: boats } = useQuery({
    queryKey: ['boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: bases } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const createTopic = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('topics')
        .insert({
          channel_id: channelId,
          title,
          description: description || null,
          priority,
          boat_id: boatId || null,
          base_id: baseId || null,
          created_by: user.id
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      toast({
        title: "Sujet créé",
        description: "Le sujet a été créé avec succès"
      });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le sujet",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setBoatId("");
    setBaseId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createTopic.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouveau sujet</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Problème de pompe sur Lagoon 42"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème ou la demande..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="base">Base</Label>
              <Select value={baseId} onValueChange={setBaseId}>
                <SelectTrigger id="base">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {bases?.map((base) => (
                    <SelectItem key={base.id} value={base.id}>
                      {base.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="boat">Bateau</Label>
            <Select value={boatId} onValueChange={setBoatId}>
              <SelectTrigger id="boat">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {boats?.map((boat) => (
                  <SelectItem key={boat.id} value={boat.id}>
                    {boat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!title.trim() || createTopic.isPending}>
              Créer le sujet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
