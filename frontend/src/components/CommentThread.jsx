import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Send,
  Check,
  CheckCheck,
  Trash2,
  User,
  Clock,
  MessageCircle,
  ImagePlus,
  Loader2,
  ZoomIn,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL, getFullFileUrl } from "../config.js";

// Alias for backwards compatibility
const getFullImageUrl = getFullFileUrl;

export default function CommentThread({
  comment,
  onClose,
  onReply,
  onResolve,
  onDelete,
  currentUser = "",
}) {
  const [replyText, setReplyText] = useState("");
  const [author, setAuthor] = useState(currentUser);
  const [isSending, setIsSending] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(null);
  const threadEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comment?.replies]);

  // Handle image file selection
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Create FormData and upload
      const formData = new FormData();
      formData.append("screenshot", file);

      const response = await axios.post(
        `${API_BASE_URL}/uploads/screenshot`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.url) {
        setImagePreview(response.data.url);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Remove image preview
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReply = async () => {
    if ((replyText.trim() || imagePreview) && !isSending) {
      setIsSending(true);
      try {
        await onReply(
          replyText || "📷 Image",
          author || "Anonymous",
          imagePreview
        );
        setReplyText("");
        setImagePreview(null);
      } catch (error) {
        console.error("Failed to send reply:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!comment) return null;

  return (
    <div
      className="fixed inset-0 z-[9999999] bg-black/60 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-200"
      style={{ pointerEvents: "auto", isolation: "isolate" }}
      onClick={onClose}
      onMouseDown={(e) => e.target === e.currentTarget && e.stopPropagation()}
    >
      <div
        className="h-full w-[420px] border-l border-border/50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        style={{
          pointerEvents: "auto",
          backgroundColor: "hsl(240 10% 4%)",
          position: "relative",
          zIndex: 1,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 border-b border-border/50 flex items-center justify-between"
          style={{ backgroundColor: "hsl(240 10% 4%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md shadow-primary/20">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Comment Thread</h3>
              <p className="text-xs text-muted-foreground">
                {comment.replies?.length || 0} replies
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Comment Section */}
        <div
          className="flex-1 overflow-y-auto p-5"
          style={{ backgroundColor: "hsl(240 10% 4%)" }}
        >
          {/* Original Comment */}
          <div className="pb-5 mb-5 border-b-2 border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                {comment.author?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {comment.author || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(comment.timestamp)}
                  </span>
                  {comment.resolved && (
                    <Badge variant="success" className="text-[10px]">
                      Resolved
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground/90 leading-relaxed">
                  {comment.text}
                </p>
              </div>
            </div>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-4">
              {comment.replies.map((reply, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground shrink-0">
                    {reply.author?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">
                        {reply.author || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(reply.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/80 leading-relaxed">
                      {reply.text}
                    </p>
                    {/* Reply Image */}
                    {reply.image && (
                      <div
                        className="mt-2 relative group cursor-pointer rounded-lg overflow-hidden border border-border/50 max-w-[280px]"
                        onClick={() =>
                          setShowFullImage(getFullImageUrl(reply.image))
                        }
                      >
                        <img
                          src={getFullImageUrl(reply.image)}
                          alt="Reply attachment"
                          className="w-full h-auto max-h-[200px] object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Reply Input */}
        <div
          className="p-5 border-t border-border/50 space-y-3"
          style={{ backgroundColor: "hsl(240 10% 6%)" }}
        >
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={getFullImageUrl(imagePreview)}
                alt="Upload preview"
                className="h-20 w-auto rounded-lg border border-border/50 object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs hover:bg-destructive/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <Input
            type="text"
            placeholder="Your name (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="bg-background/50 border-border/50 h-9 text-sm"
          />
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="bg-background/50 border-border/50 min-h-[80px] resize-none text-sm"
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey && !isSending) {
                  handleReply();
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              {/* Image upload button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSending}
                className="gap-1.5 h-8 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5" />
                )}
                <span className="text-xs">
                  {isUploading ? "Uploading..." : "Image"}
                </span>
              </Button>
              <span className="text-[10px] text-muted-foreground">
                Ctrl+Enter to send
              </span>
            </div>
            <Button
              onClick={handleReply}
              disabled={(!replyText.trim() && !imagePreview) || isSending}
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-blue-600"
            >
              {isSending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Reply
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div
          className="p-5 border-t border-border/50 flex gap-3"
          style={{ backgroundColor: "hsl(240 10% 4%)" }}
        >
          <Button
            variant={comment.resolved ? "default" : "outline"}
            className={`flex-1 gap-2 ${
              comment.resolved
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "border-border/50 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
            }`}
            onClick={onResolve}
          >
            {comment.resolved ? (
              <>
                <CheckCheck className="w-4 h-4" />
                Resolved
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Resolve
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && (
        <div
          className="fixed inset-0 z-[99999999] bg-black/90 flex items-center justify-center p-4"
          style={{ pointerEvents: "auto" }}
          onClick={() => setShowFullImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setShowFullImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={showFullImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
