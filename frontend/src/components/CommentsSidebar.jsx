import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

// Helper function to highlight mentions in text
const highlightMentions = (text) => {
  if (!text) return text;
  const mentionRegex = /@([\w.-]+@[\w.-]+\.\w+)|@(\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add highlighted mention
    parts.push(
      <span key={match.index} className="text-primary font-medium">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts.length > 0 ? parts : text;
};

export default function CommentsSidebar({
  isOpen,
  onClose,
  comments,
  onCommentsUpdate,
  currentUser = 'Anonymous',
  projectUrl,
  projectId,
}) {
  console.log('🎬 CommentsSidebar component rendered:', { isOpen, projectId, projectUrl, hasComments: comments?.length });
  
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFullReplyImage, setShowFullReplyImage] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const replyInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const mentionSuggestionsRef = useRef(null);

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

  // Fetch project participants for mentions
  useEffect(() => {
    console.log('📋 CommentsSidebar useEffect triggered:', { projectId, projectUrl, isOpen });
    
    if (!projectId) {
      // Try to get from share token if no projectId
      const shareToken = window.location.pathname.split('/share/')[1];
      if (shareToken) {
        console.log('🔗 CommentsSidebar: No projectId, trying share token:', shareToken);
        fetchParticipantsFromShare(shareToken);
      } else {
        console.warn('⚠️ CommentsSidebar: No projectId and no share token found');
      }
      return;
    }

    console.log('🚀 CommentsSidebar: Starting to fetch participants for projectId:', projectId);
    fetchParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // Only depend on projectId, not isOpen

  const fetchParticipants = async () => {
    console.log('🔄 CommentsSidebar fetchParticipants called for projectId:', projectId);
    try {
      // Try to get participants endpoint first (for authenticated users)
      try {
        const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/participants`);
        const participants = response.data.participants || [];
        console.log('✅ CommentsSidebar: Fetched participants from /participants endpoint:', participants.length, participants);
        setCollaborators(participants);
        return;
      } catch (err) {
        // If that fails, try regular project endpoint
        console.log("⚠️ CommentsSidebar: Participants endpoint failed, trying project endpoint", err.response?.status, err.message);
      }

      // Fallback to project endpoint
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
      const project = response.data.project;
      const allUsers = [
        project.owner,
        ...(project.collaborators || []),
        ...(project.participants || []).map(p => p.user || { name: p.name, email: p.email }),
      ].filter(Boolean);
      console.log('✅ CommentsSidebar: Fetched users from project endpoint:', allUsers.length, allUsers);
      setCollaborators(allUsers);
    } catch (error) {
      console.error("❌ CommentsSidebar: Error fetching participants:", error.response?.status, error.message);
      // If both fail, try share endpoint (for shared projects)
      const shareToken = window.location.pathname.split('/share/')[1];
      if (shareToken) {
        console.log('🔄 CommentsSidebar: Trying share endpoint as fallback');
        fetchParticipantsFromShare(shareToken);
      }
    }
  };

  const fetchParticipantsFromShare = async (shareToken) => {
    console.log('🔄 CommentsSidebar fetchParticipantsFromShare called for token:', shareToken);
    try {
      const response = await axios.get(`${API_BASE_URL}/share/${shareToken}`);
      const project = response.data.project;
      const allUsers = [
        project.owner,
        ...(project.collaborators || []),
        ...(project.participants || []).map(p => p.user || { name: p.name, email: p.email }),
      ].filter(Boolean);
      console.log('✅ CommentsSidebar: Fetched users from share endpoint:', allUsers.length, allUsers);
      setCollaborators(allUsers);
    } catch (shareError) {
      console.error("❌ CommentsSidebar: Error fetching from share endpoint:", shareError.response?.status, shareError.message);
    }
  };

  // Filter collaborators based on mention query
  const filteredCollaborators = collaborators.filter((user) => {
    if (!mentionQuery) return true;
    const name = (user.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    return name.includes(mentionQuery) || email.includes(mentionQuery);
  });

  // Handle mention detection in textarea
  const handleTextChange = (e) => {
    console.log('🟢 CommentsSidebar handleTextChange CALLED!', e.target.value);
    const text = e.target.value;
    setReplyText(text);

    // Get cursor position
    const cursorPos = e.target.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursorPos);
    
    // Check if we're typing a mention
    const mentionMatch = textBeforeCursor.match(/@([\w.-@]*)$/);
    
    console.log('🔍 CommentsSidebar mention check:', {
      text,
      cursorPos,
      textBeforeCursor,
      hasMatch: !!mentionMatch,
      collaboratorsCount: collaborators.length,
      projectId
    });
    
    if (mentionMatch) {
      const query = (mentionMatch[1] || '').toLowerCase();
      setMentionQuery(query);
      
      // Get textarea position for suggestions dropdown
      const textarea = e.target;
      const rect = textarea.getBoundingClientRect();
      
      // Simple positioning - show below textarea
      const atPosition = {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX + 10,
      };
      
      setMentionPosition(atPosition);
      setShowMentionSuggestions(true);
      setSelectedMentionIndex(0);
      
      console.log('✅ CommentsSidebar showing mention dropdown:', {
        position: atPosition,
        collaboratorsCount: collaborators.length,
        filteredCount: filteredCollaborators.length,
        query
      });
    } else {
      if (showMentionSuggestions) {
        setShowMentionSuggestions(false);
        console.log('❌ CommentsSidebar hiding mention dropdown');
      }
    }
  };

  // Insert mention into text
  const insertMention = (user) => {
    const text = replyText;
    const cursorPos = textareaRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);
    
    // Find the @ mention to replace
    const mentionMatch = textBeforeCursor.match(/@([\w.-@]*)$/);
    if (mentionMatch) {
      const startPos = mentionMatch.index;
      const newText = 
        text.substring(0, startPos) + 
        `@${user.email || user.name}` + 
        " " + 
        textAfterCursor;
      
      setReplyText(newText);
      setShowMentionSuggestions(false);
      
      // Set cursor position after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = startPos + `@${user.email || user.name} `.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Handle keyboard navigation in mention suggestions
  const handleKeyDown = (e) => {
    if (showMentionSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          Math.min(prev + 1, filteredCollaborators.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredCollaborators[selectedMentionIndex]) {
          insertMention(filteredCollaborators[selectedMentionIndex]);
        }
      } else if (e.key === "Escape") {
        setShowMentionSuggestions(false);
      }
      } else {
        // Normal keyboard handling when not in mention mode
        if (e.key === 'Enter' && e.ctrlKey && selectedComment?.id) {
          handleReplySubmit(selectedComment.id);
        }
      }
    };

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

  const handleReplySubmit = async (commentId) => {
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
                      {highlightMentions(selectedComment.text)}
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
                          {highlightMentions(reply.text)}
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
                
                <div className="relative mb-2">
                  <Textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => {
                      console.log('🟢 CommentsSidebar Textarea onChange FIRED!', e.target.value);
                      handleTextChange(e);
                    }}
                    placeholder="Write a reply... Use @ to mention someone"
                    className="min-h-[60px] text-sm bg-background/50 border-border/50 resize-none"
                    onKeyDown={handleKeyDown}
                    onBlur={(e) => {
                      // Delay hiding suggestions to allow clicking on them
                      setTimeout(() => {
                        if (!mentionSuggestionsRef.current?.contains(document.activeElement)) {
                          setShowMentionSuggestions(false);
                        }
                      }, 200);
                    }}
                  />
                  
                  {/* Mention Suggestions Dropdown - Render via portal to escape Sheet z-index */}
                  {showMentionSuggestions && (() => {
                    console.log('🎯 CommentsSidebar: Rendering dropdown via portal', {
                      showMentionSuggestions,
                      position: mentionPosition,
                      filteredCount: filteredCollaborators.length
                    });
                    return createPortal(
                      <div
                        ref={mentionSuggestionsRef}
                        className="fixed z-[99999999] bg-background border border-border/50 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                        style={{
                          top: `${mentionPosition.top}px`,
                          left: `${mentionPosition.left}px`,
                          minWidth: '200px',
                        }}
                      >
                      {filteredCollaborators.length > 0 ? (
                        filteredCollaborators.map((user, index) => (
                          <div
                            key={user.id || user._id || index}
                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                              index === selectedMentionIndex
                                ? "bg-primary/20 text-primary"
                                : "hover:bg-accent"
                            }`}
                            onClick={() => insertMention(user)}
                            onMouseEnter={() => setSelectedMentionIndex(index)}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                              {user.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {user.name || "Unknown"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {collaborators.length === 0 
                            ? "Loading users..." 
                            : "No users found"}
                        </div>
                      )}
                      </div>,
                      document.body
                    );
                  })()}
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
                    onClick={() => handleReplySubmit(selectedComment.id)}
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
