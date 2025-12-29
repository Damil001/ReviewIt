import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  MessageCircle,
  Send,
  Check,
  CheckCheck,
  Trash2,
  X,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Reply,
  ArrowLeft,
  Info,
  Globe,
  Monitor,
  Chrome,
  Maximize,
  MapPin,
  Languages,
  Smartphone,
  ExternalLink,
  ImageIcon,
  ZoomIn,
  ImagePlus,
  Loader2,
} from 'lucide-react';
import axios from 'axios';
import { formatMetadataForDisplay } from '@/lib/captureMetadata';
import { API_BASE_URL, getFullFileUrl } from '../config.js';

// Alias for backwards compatibility
const getFullImageUrl = getFullFileUrl;

// Icon map for metadata
const iconMap = {
  globe: Globe,
  clock: Clock,
  monitor: Monitor,
  chrome: Chrome,
  maximize: Maximize,
  smartphone: Smartphone,
  'map-pin': MapPin,
  languages: Languages,
};

export default function CommentsSidebar({
  isOpen,
  onClose,
  comments,
  onCommentsUpdate,
  currentUser = 'Anonymous',
  projectUrl,
}) {
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFullReplyImage, setShowFullReplyImage] = useState(null);
  const replyInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (replyingTo && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyingTo]);

  // Reset selected comment when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedComment(null);
    }
  }, [isOpen]);

  const toggleExpanded = (commentId) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Handle image file selection
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', file);

      const response = await axios.post(`${API_BASE_URL}/uploads/screenshot`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.url) {
        setImagePreview(response.data.url);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove image preview
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReply = async (commentId) => {
    if ((!replyText.trim() && !imagePreview) || sending) return;

    setSending(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/comments/${commentId}/replies`, {
        text: replyText.trim() || '📷 Image',
        author: currentUser,
        image: imagePreview,
      });
      setReplyText('');
      setImagePreview(null);
      setReplyingTo(null);
      onCommentsUpdate?.();
      
      // Update selected comment if viewing it
      if (selectedComment?.id === commentId && response.data.comment) {
        setSelectedComment(response.data.comment);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async (comment) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/comments/${comment.id}`, {
        resolved: !comment.resolved,
      });
      onCommentsUpdate?.();
      if (selectedComment?.id === comment.id && response.data.comment) {
        setSelectedComment(response.data.comment);
      }
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/comments/${commentId}`);
      onCommentsUpdate?.();
      if (selectedComment?.id === commentId) {
        setSelectedComment(null);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatFullTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  // Render comment detail view with tabs
  const renderCommentDetail = () => {
    if (!selectedComment) return null;

    const metadataItems = formatMetadataForDisplay(selectedComment.metadata);
    const hasReplies = selectedComment.replies && selectedComment.replies.length > 0;

    return (
      <div className="flex flex-col h-full">
        {/* Header with back button */}
        <div className="p-4 border-b border-border/50 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedComment(null)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">
              Comment by {selectedComment.author}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatFullTime(selectedComment.timestamp || selectedComment.createdAt)}
            </p>
          </div>
          {selectedComment.resolved && (
            <Badge variant="success" className="text-[10px]">Resolved</Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="thread" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="thread" className="flex-1 gap-1.5 text-xs">
                <MessageCircle className="w-3.5 h-3.5" />
                Thread
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-1 gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5" />
                Info
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Thread Tab */}
          <TabsContent value="thread" className="flex-1 overflow-hidden flex flex-col mt-0">
            <div className="flex-1 overflow-y-auto p-4">
              {/* Original Comment */}
              <div className="pb-4 mb-4 border-b border-border/50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {selectedComment.author?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">
                        {selectedComment.author}
                      </span>
                      {selectedComment.breakpoint && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {selectedComment.breakpoint}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">
                      {selectedComment.text}
                    </p>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {hasReplies && (
                <div className="space-y-3 mb-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {selectedComment.replies.length} {selectedComment.replies.length === 1 ? 'Reply' : 'Replies'}
                  </p>
                  {selectedComment.replies.map((reply, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-secondary-foreground shrink-0">
                        {reply.author?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-foreground">
                            {reply.author}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(reply.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                          {reply.text}
                        </p>
                        {/* Reply Image */}
                        {reply.image && (
                          <div 
                            className="mt-2 relative group cursor-pointer rounded-lg overflow-hidden border border-border/50 max-w-[220px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFullReplyImage(getFullImageUrl(reply.image));
                            }}
                          >
                            <img
                              src={getFullImageUrl(reply.image)}
                              alt="Reply attachment"
                              className="w-full h-auto max-h-[150px] object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Input */}
            {!selectedComment.resolved && (
              <div className="p-4 border-t border-border/50 bg-muted/10">
                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative inline-block mb-2">
                    <img
                      src={getFullImageUrl(imagePreview)}
                      alt="Upload preview"
                      className="h-16 w-auto rounded-lg border border-border/50 object-cover"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs hover:bg-destructive/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px] text-sm bg-background/50 border-border/50 resize-none mb-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleReply(selectedComment.id);
                    }
                  }}
                />
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
                      disabled={isUploading || sending}
                      className="h-7 gap-1 text-xs border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImagePlus className="w-3 h-3" />
                      )}
                    </Button>
                    <span className="text-[10px] text-muted-foreground">Ctrl+Enter</span>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5 bg-gradient-to-r from-primary to-blue-600"
                    onClick={() => handleReply(selectedComment.id)}
                    disabled={(!replyText.trim() && !imagePreview) || sending}
                  >
                    <Send className="w-3 h-3" />
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t border-border/50 flex gap-2">
              <Button
                variant={selectedComment.resolved ? 'default' : 'outline'}
                size="sm"
                className={`flex-1 gap-1.5 text-xs ${
                  selectedComment.resolved
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'border-border/50 hover:bg-emerald-500/10 hover:text-emerald-500'
                }`}
                onClick={() => handleResolve(selectedComment)}
              >
                {selectedComment.resolved ? (
                  <><CheckCheck className="w-3.5 h-3.5" />Resolved</>
                ) : (
                  <><Check className="w-3.5 h-3.5" />Resolve</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-xs border-border/50 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleDelete(selectedComment.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </TabsContent>

          {/* Info Tab - Metadata */}
          <TabsContent value="info" className="flex-1 overflow-y-auto mt-0 p-4">
            {/* Screenshot Section */}
            {selectedComment?.metadata?.screenshot && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="uppercase tracking-wider">Screenshot</span>
                </div>
                <div 
                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-border/50 bg-muted/20"
                  onClick={() => setShowFullScreenshot(true)}
                >
                  <img
                    src={selectedComment.metadata.screenshot}
                    alt="Comment screenshot"
                    className="w-full h-auto max-h-[180px] object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            )}

            {/* Full Screenshot Modal */}
            {showFullScreenshot && selectedComment?.metadata?.screenshot && (
              <div 
                className="fixed inset-0 z-[99999999] bg-black/90 flex items-center justify-center p-4"
                style={{ pointerEvents: 'auto' }}
                onClick={() => setShowFullScreenshot(false)}
              >
                <button
                  className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                  onClick={() => setShowFullScreenshot(false)}
                >
                  <X className="w-8 h-8" />
                </button>
                <img
                  src={selectedComment.metadata.screenshot}
                  alt="Comment screenshot (full)"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {metadataItems.length > 0 ? (
              <div className="space-y-2">
                {metadataItems.map((item, index) => {
                  const IconComponent = iconMap[item.icon] || Monitor;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {item.label}
                        </p>
                        {item.isLink ? (
                          <a
                            href={item.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <span className="truncate">{item.value}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <p className="text-xs text-foreground">{item.value}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !selectedComment?.metadata?.screenshot ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                  <Info className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No metadata available</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Older comments may not have metadata
                </p>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // Render comments list
  const renderCommentsList = () => (
    <>
      <SheetHeader className="p-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-lg">Comments</SheetTitle>
              <SheetDescription className="text-xs">
                {comments.length} total • {unresolvedCount} open
              </SheetDescription>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-2 mt-4">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <MessageCircle className="w-3 h-3 mr-1" />
            {unresolvedCount} Open
          </Badge>
          <Badge variant="success">
            <CheckCheck className="w-3 h-3 mr-1" />
            {resolvedCount} Resolved
          </Badge>
        </div>
      </SheetHeader>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No comments yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Click on the page to add a comment
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const hasReplies = comment.replies && comment.replies.length > 0;
            const hasMetadata = comment.metadata && Object.keys(comment.metadata).length > 0;

            return (
              <div
                key={comment.id}
                className={`group rounded-xl border transition-all duration-200 cursor-pointer ${
                  comment.resolved
                    ? 'bg-muted/30 border-border/30'
                    : 'bg-card/50 border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'
                }`}
                onClick={() => setSelectedComment(comment)}
              >
                {/* Main Comment */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                          comment.resolved
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-gradient-to-br from-primary to-blue-600 text-white'
                        }`}
                      >
                        {comment.author?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">
                            {comment.author || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(comment.timestamp || comment.createdAt)}
                          </span>
                          {comment.breakpoint && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {comment.breakpoint}
                            </Badge>
                          )}
                        </div>
                        <p
                          className={`mt-1.5 text-sm leading-relaxed line-clamp-2 ${
                            comment.resolved ? 'text-muted-foreground' : 'text-foreground/90'
                          }`}
                        >
                          {comment.text}
                        </p>
                      </div>
                    </div>

                    {/* Quick status indicators */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasMetadata && (
                        <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center" title="Has metadata">
                          <Info className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      {comment.resolved && (
                        <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center">
                          <CheckCheck className="w-3 h-3 text-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer with reply count */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
                    {hasReplies && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Reply className="w-3 h-3" />
                        {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                      </span>
                    )}
                    <span className="text-xs text-primary ml-auto">Click to view →</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[450px] sm:max-w-[450px] p-0 flex flex-col glass border-l border-border/50">
          {selectedComment ? renderCommentDetail() : renderCommentsList()}
        </SheetContent>
      </Sheet>

      {/* Full Reply Image Modal */}
      {showFullReplyImage && (
        <div 
          className="fixed inset-0 z-[99999999] bg-black/90 flex items-center justify-center p-4"
          style={{ pointerEvents: 'auto' }}
          onClick={() => setShowFullReplyImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setShowFullReplyImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={showFullReplyImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
