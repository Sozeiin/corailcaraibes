import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, Trash2, User, Paperclip, X, FileText, Camera } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  useSupplyRequestComments,
  useAddSupplyRequestComment,
  useDeleteSupplyRequestComment,
  uploadCommentAttachment,
  SupplyRequestCommentAttachment,
} from "@/hooks/useSupplyRequestComments";
import { useAuth } from "@/contexts/AuthContext";
import { StorageImage } from "@/components/ui/storage-image";
import { openStorageFile } from "@/lib/storageUrls";

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
  const [attachments, setAttachments] = useState<SupplyRequestCommentAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: SupplyRequestCommentAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} dépasse 20 Mo`);
          continue;
        }
        uploaded.push(await uploadCommentAttachment(requestId, file));
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      if (uploaded.length > 0) toast.success("Pièce(s) jointe(s) ajoutée(s)");
    } catch (error) {
      console.error("Error uploading attachment:", error);
      toast.error("Erreur lors de l'envoi de la pièce jointe");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!newComment.trim() && attachments.length === 0) return;

    addComment.mutate(
      {
        requestId,
        comment: newComment.trim() || "(pièce jointe)",
        statusAtComment: currentStatus,
        attachments,
      },
      {
        onSuccess: () => {
          setNewComment("");
          setAttachments([]);
        },
      }
    );
  };

  const handleDelete = (commentId: string) => {
    if (confirm("Supprimer ce commentaire ?")) {
      deleteComment.mutate({ commentId, requestId });
    }
  };

  const isImage = (type: string) => type.startsWith("image/");

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
          <div className="space-y-3 max-h-80 overflow-y-auto">
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
                <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>

                {(comment.attachments || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(comment.attachments || []).map((file, index) => (
                      <button
                        key={`${comment.id}-${index}`}
                        type="button"
                        onClick={() => openStorageFile(file.url)}
                        className="block"
                      >
                        {isImage(file.type) ? (
                          <StorageImage
                            src={file.url}
                            alt={file.name}
                            loading="lazy"
                            className="h-20 w-20 rounded border object-cover"
                          />
                        ) : (
                          <span className="flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs hover:bg-muted">
                            <FileText className="h-3 w-3" />
                            {file.name}
                          </span>
                        )}
                      </button>

                    ))}
                  </div>
                )}
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

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.url}-${index}`}
                      className="relative flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs"
                    >
                      {isImage(file.type) ? (
                        <StorageImage src={file.url} alt={file.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span className="max-w-[140px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    {isUploading ? "Envoi..." : "Joindre"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Photo
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    (!newComment.trim() && attachments.length === 0) ||
                    addComment.isPending ||
                    isUploading
                  }
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
