import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  CheckCheck,
  Circle,
  MessageSquare,
  User,
  Calendar,
  Pencil,
  MousePointer,
} from 'lucide-react';
import { API_BASE_URL } from '../config.js';

export default function ReviewList({ reviews, projectId, onUpdate }) {
  const [selectedReview, setSelectedReview] = useState(null);
  const [commentText, setCommentText] = useState('');

  const handleAddComment = async (reviewId) => {
    if (!commentText.trim()) return;

    try {
      await axios.post(`${API_BASE_URL}/reviews/${reviewId}/comments`, {
        text: commentText,
      });
      setCommentText('');
      setSelectedReview(null);
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleResolve = async (reviewId, currentStatus) => {
    try {
      await axios.patch(`${API_BASE_URL}/reviews/${reviewId}/resolve`);
      onUpdate();
    } catch (error) {
      console.error('Error resolving review:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'point':
        return <MousePointer className="w-3 h-3" />;
      case 'draw':
        return <Pencil className="w-3 h-3" />;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Reviews</h3>
            <Badge variant="secondary" className="text-xs">
              {reviews.length}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[10px]">
              {reviews.filter((r) => !r.resolved).length} open
            </Badge>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No reviews yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click on the canvas to add reviews
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review._id}
              className={`group rounded-lg border transition-all duration-200 ${
                review.resolved
                  ? 'bg-muted/20 border-border/30 opacity-60'
                  : 'bg-card/50 border-border/50 hover:border-primary/30'
              }`}
              style={{ borderLeftWidth: '3px', borderLeftColor: review.color }}
            >
              <div className="p-3">
                {/* Review Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${review.color}20`, color: review.color }}
                    >
                      {getTypeIcon(review.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize px-1.5 py-0"
                        >
                          {review.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {review.createdBy?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 shrink-0 ${
                      review.resolved
                        ? 'text-emerald-500 hover:text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => handleResolve(review._id, review.resolved)}
                    title={review.resolved ? 'Unresolve' : 'Resolve'}
                  >
                    {review.resolved ? (
                      <CheckCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>

                {/* Comments */}
                {review.comments && review.comments.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
                    {review.comments.map((comment, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs"
                      >
                        <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium text-secondary-foreground shrink-0 mt-0.5">
                          {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {comment.user?.name || 'Unknown'}
                            </span>
                            <span className="text-[10px]">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-foreground/80 mt-0.5 leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                <div className="mt-3">
                  <Input
                    type="text"
                    value={selectedReview === review._id ? commentText : ''}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && commentText.trim()) {
                        handleAddComment(review._id);
                      }
                    }}
                    onFocus={() => setSelectedReview(review._id)}
                    placeholder="Add a comment..."
                    className="h-8 text-xs bg-background/50 border-border/50"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
