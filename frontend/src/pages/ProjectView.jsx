import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import Canvas from '../components/Canvas';
import ReviewTools from '../components/ReviewTools';
import ReviewList from '../components/ReviewList';
import Toolbar from '../components/Toolbar';
import ShareModal from '../components/ShareModal';
import CommentsSidebar from '../components/CommentsSidebar';
import CollaboratorsModal from '../components/CollaboratorsModal';
import ProjectParticipants from '../components/ProjectParticipants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Share2,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import { API_BASE_URL, SERVER_BASE_URL } from '../config.js';

const PROXY_BASE_URL = SERVER_BASE_URL;

export default function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinProject, leaveProject, connectedUsers } = useSocket();
  const [project, setProject] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [selectedBreakpoint, setSelectedBreakpoint] = useState(null);
  const [reviewToolState, setReviewToolState] = useState({ tool: 'point', color: '#ff4444', lineWidth: 3 });
  const [overlayMode, setOverlayMode] = useState('pan');
  
  // Update reviewToolState when overlayMode changes to 'draw'
  useEffect(() => {
    if (overlayMode === 'draw') {
      setReviewToolState(prev => ({ ...prev, color: prev.color || '#ff4444', lineWidth: prev.lineWidth || 3 }));
    }
  }, [overlayMode]);
  const [comments, setComments] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchReviews();
  }, [id]);

  // Join project room for real-time updates
  useEffect(() => {
    if (id && socket) {
      joinProject(id);
      
      // Listen for real-time review updates
      socket.on('review-added', (review) => {
        setReviews(prev => {
          if (prev.find(r => r._id === review._id)) return prev;
          return [...prev, review];
        });
      });
      
      socket.on('review-updated', (review) => {
        setReviews(prev => prev.map(r => r._id === review._id ? review : r));
      });
      
      socket.on('review-deleted', (data) => {
        setReviews(prev => prev.filter(r => r._id !== data.id));
      });
      
      return () => {
        leaveProject(id);
        socket.off('review-added');
        socket.off('review-updated');
        socket.off('review-deleted');
      };
    }
  }, [id, socket, joinProject, leaveProject]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${id}`);
      setProject(response.data.project);
    } catch (error) {
      console.error('Error fetching project:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reviews/project/${id}`);
      setReviews(response.data.reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSaveProject = async (breakpoints, canvasState) => {
    try {
      await axios.put(`${API_BASE_URL}/projects/${id}`, {
        breakpoints,
        canvasState,
      });
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const fetchComments = async () => {
    if (!project?.url) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/comments`, {
        params: { url: project.url },
      });
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  useEffect(() => {
    if (project?.url) {
      fetchComments();
      const interval = setInterval(fetchComments, 3000);
      return () => clearInterval(interval);
    }
  }, [project?.url]);

  const handleClearAllComments = async () => {
    if (!window.confirm('Clear all comments? This cannot be undone.')) return;
    try {
      for (const comment of comments) {
        await axios.delete(`${API_BASE_URL}/comments/${comment.id}`);
      }
      fetchComments();
    } catch (error) {
      console.error('Error clearing comments:', error);
    }
  };

  const handleResolveAllComments = async () => {
    try {
      for (const comment of comments) {
        if (!comment.resolved) {
          await axios.patch(`${API_BASE_URL}/comments/${comment.id}`, {
            resolved: true,
          });
        }
      }
      fetchComments();
    } catch (error) {
      console.error('Error resolving comments:', error);
    }
  };

  const handleExportComments = () => {
    const dataStr = JSON.stringify(comments, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comments-${project?.name || 'project'}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/export/${id}/pdf`, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `review-report-${project?.name || 'project'}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Toolbar */}
      <Toolbar
        mode={overlayMode}
        onModeChange={setOverlayMode}
        commentCount={comments.length}
        onClearAll={handleClearAllComments}
        onResolveAll={handleResolveAllComments}
        onExport={handleExportComments}
        onExportPDF={handleExportPDF}
        onOpenComments={() => setShowCommentsSidebar(true)}
      />

      {/* Project Header */}
      <header className="mt-[60px] glass border-b border-border/50 sticky top-[60px] z-[999]">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Back button and project info */}
            <div className="flex items-center gap-4 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2 border-border/50 hover:bg-secondary shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-semibold text-foreground truncate">{project.name}</h1>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-[300px]">{project.url}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Project Participants */}
              <ProjectParticipants projectId={id} />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCollaboratorsModal(true)}
                className="gap-2 border-border/50 hover:bg-purple-500/10 hover:text-purple-500 hover:border-purple-500/30"
                title="Manage Collaborators"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Team</span>
                {project?.collaborators?.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-500">
                    {project.collaborators.length}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareModal(true)}
                className="gap-2 border-border/50 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                variant={reviewMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setReviewMode(!reviewMode);
                  if (!reviewMode && selectedBreakpoint === null && project?.breakpoints?.length > 0) {
                    setSelectedBreakpoint(0);
                  }
                }}
                className={`gap-2 ${
                  reviewMode
                    ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-primary/25'
                    : 'border-border/50 hover:bg-secondary'
                }`}
              >
                {reviewMode ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Exit Review</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Review Mode</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Canvas
            url={project.url}
            proxyBaseUrl={PROXY_BASE_URL}
            initialBreakpoints={project.breakpoints}
            initialCanvasState={project.canvasState}
            onSave={handleSaveProject}
            reviewMode={reviewMode}
            onBreakpointSelect={setSelectedBreakpoint}
            selectedBreakpoint={selectedBreakpoint}
            projectId={id}
            reviews={reviews}
            onReviewAdd={fetchReviews}
            reviewToolState={overlayMode === 'draw' ? reviewToolState : (reviewMode ? reviewToolState : null)}
            overlayMode={overlayMode}
            currentUser={user?.name || 'Anonymous'}
            onCommentsUpdate={fetchComments}
          />
          {reviewMode && selectedBreakpoint !== null && (
            <ReviewTools
              projectId={id}
              breakpointIndex={selectedBreakpoint}
              onReviewAdd={fetchReviews}
              onToolChange={setReviewToolState}
            />
          )}
        </div>

        {/* Review Sidebar */}
        {reviewMode && (
          <aside className="w-[350px] border-l border-border/50 glass overflow-y-auto">
            <ReviewList
              reviews={reviews.filter((r) => r.breakpointIndex === selectedBreakpoint)}
              projectId={id}
              onUpdate={fetchReviews}
            />
          </aside>
        )}
      </main>

      {/* Share Modal */}
      <ShareModal
        projectId={id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Collaborators Modal */}
      <CollaboratorsModal
        projectId={id}
        project={project}
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        onUpdate={(updatedProject) => {
          setProject(updatedProject);
        }}
      />

      {/* Comments Sidebar */}
      <CommentsSidebar
        isOpen={showCommentsSidebar}
        onClose={() => setShowCommentsSidebar(false)}
        comments={comments}
        onCommentsUpdate={fetchComments}
        currentUser={user?.name || 'Anonymous'}
        projectUrl={project.url}
      />
    </div>
  );
}
