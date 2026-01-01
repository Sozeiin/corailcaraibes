import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useSupplyRequestComments,
  useAddSupplyRequestComment,
  useDeleteSupplyRequestComment,
} from "@/hooks/useSupplyRequestComments";
import { useAuth } from "@/contexts/AuthContext";

interface SupplyRequestCommentsSectionProps {
  requestId: string;
  currentStatus: string;
  readOnly?: boolean;
}

export function SupplyRequestCommentsSection({
  requestId,
  currentStatus,
  readOnly = false,
}: SupplyRequestCommentsSectionProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const { data: comments = [], isLoading } = useSupplyRequestComments(requestId);
  const addComment = useAddSupplyRequestComment();
  const deleteComment = useDeleteSupplyRequestComment();

  const getStatusLabel = (status: string | null) => {
    if (!status) return null;
    switch (status) {
      case "pending":
        return "En attente";
      case "approved":
        return "Approuvé";
      case "ordered":
        return "Commandé";
      case "shipped":
        return "Expédié";
      case "received":
        return "Reçu";
      case "completed":
        return "Terminé";
      case "rejected":
        return "Rejeté";
      default:
        return status;
    }
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    addComment.mutate(
      {
        requestId,
        comment: newComment.trim(),
        statusAtComment: currentStatus,
      },
      {
        onSuccess: () => setNewComment(""),
      }
    );
  };

  const handleDelete = (commentId: string) => {
    if (confirm("Supprimer ce commentaire ?")) {
      deleteComment.mutate({ commentId, requestId });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Commentaires ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun commentaire pour le moment
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-muted/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {comment.author_name}
                    </span>
                    {comment.status_at_comment && (
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(comment.status_at_comment)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", {
                        locale: fr,
                      })}
                    </span>
                    {comment.author_id === user?.id && !readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm">{comment.comment}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment Form */}
        {!readOnly && (
          <>
            <Separator />
            <div className="space-y-2">
              <Textarea
                placeholder="Ajouter un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || addComment.isPending}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {addComment.isPending ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
