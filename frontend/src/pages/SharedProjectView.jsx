import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Canvas from '../components/Canvas';
import Toolbar from '../components/Toolbar';
import CommentsSidebar from '../components/CommentsSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Lock,
  AlertTriangle,
  User,
  Sparkles,
  LogIn,
  Globe,
  MessageCircle,
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001/api';
const PROXY_BASE_URL = 'http://localhost:3001';

export default function SharedProjectView() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password protection
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Guest info
  const [guestName, setGuestName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // Review mode
  const [overlayMode, setOverlayMode] = useState('pan');
  const [comments, setComments] = useState([]);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('guestName');
    if (savedName) {
      setGuestName(savedName);
    }
    fetchSharedProject();
  }, [token]);

  // Fetch comments when project is loaded
  useEffect(() => {
    if (project?.url) {
      fetchComments();
      const interval = setInterval(fetchComments, 3000);
      return () => clearInterval(interval);
    }
  }, [project?.url]);

  const fetchSharedProject = async (providedPassword = null) => {
    try {
      setLoading(true);
      setError(null);

      const headers = {};
      const authToken = localStorage.getItem('token');
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      if (providedPassword) {
        headers['x-share-password'] = providedPassword;
      }

      const response = await axios.get(`${API_BASE_URL}/share/${token}`, { headers });

      setProject(response.data.project);
      setPermissions(response.data.permissions);
      setNeedsPassword(false);

      // Check if we need guest name
      if (response.data.permissions.requireName && !response.data.isAuthenticated && !guestName) {
        setShowNamePrompt(true);
      }
    } catch (err) {
      console.error('Error fetching shared project:', err);

      if (err.response?.data?.requiresPassword) {
        setNeedsPassword(true);
      } else if (err.response?.status === 401) {
        setPasswordError('Invalid password');
      } else if (err.response?.status === 404) {
        setError('This share link is invalid or has been disabled.');
      } else if (err.response?.status === 403) {
        setError('This share link has expired.');
      } else {
        setError('Failed to load shared project.');
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
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

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');
    setSubmitting(true);
    fetchSharedProject(password);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (guestName.trim()) {
      localStorage.setItem('guestName', guestName.trim());
      setShowNamePrompt(false);
    }
  };

  const handleClearAllComments = async () => {
    if (!permissions?.allowGuestComments) return;
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
    if (!permissions?.allowGuestComments) return;
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading shared project...</p>
      </div>
    );
  }

  // Password prompt
  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md glass animate-fade-in border-border/50 shadow-2xl">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Password Protected</CardTitle>
              <CardDescription className="mt-2">
                This project requires a password to view
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {passwordError && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-secondary/50 border-border/50"
                autoFocus
              />
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-gradient-to-r from-primary to-blue-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Access Project'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-destructive/10 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md glass animate-fade-in border-border/50 shadow-2xl">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center shadow-lg shadow-destructive/30">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Unable to Access</CardTitle>
              <CardDescription className="mt-2">{error}</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <Button
              onClick={() => navigate('/')}
              className="w-full h-11 bg-gradient-to-r from-primary to-blue-600"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Name prompt for guests
  if (showNamePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md glass animate-fade-in border-border/50 shadow-2xl">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse-glow">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
              <CardDescription className="mt-2">
                Please enter your name to leave comments
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="h-11 bg-secondary/50 border-border/50"
                autoFocus
              />
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-primary to-blue-600"
              >
                Continue
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNamePrompt(false)}
                className="w-full border-border/50"
              >
                Skip (view only)
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main view
  return (
    <div className="min-h-screen flex flex-col">
      {/* Toolbar */}
      <Toolbar
        mode={overlayMode}
        onModeChange={setOverlayMode}
        commentCount={comments.length}
        onClearAll={permissions?.allowGuestComments ? handleClearAllComments : null}
        onResolveAll={permissions?.allowGuestComments ? handleResolveAllComments : null}
        onExport={handleExportComments}
        onOpenComments={() => setShowCommentsSidebar(true)}
      />

      {/* Header */}
      <header className="mt-[60px] glass border-b border-border/50">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Project info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-foreground truncate">{project?.name}</h1>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    Shared
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>by {project?.owner?.name}</span>
                  <span>•</span>
                  <Globe className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{project?.url}</span>
                </div>
              </div>
            </div>

            {/* Right side - User info */}
            <div className="flex items-center gap-3 shrink-0">
              {guestName && (
                <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                  <User className="w-3 h-3" />
                  {guestName}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/login')}
                className="gap-2 border-border/50 hover:bg-secondary"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 relative overflow-hidden">
        <Canvas
          url={project?.url}
          proxyBaseUrl={PROXY_BASE_URL}
          initialBreakpoints={project?.breakpoints}
          initialCanvasState={project?.canvasState}
          reviewMode={true}
          overlayMode={overlayMode}
          currentUser={guestName || 'Guest'}
          onCommentsUpdate={fetchComments}
        />
      </main>

      {/* Footer info */}
      <footer className="glass border-t border-border/50 py-3 px-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-center gap-2">
          {permissions?.allowGuestComments ? (
            <>
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Click <strong className="text-foreground">Comment</strong> mode to add feedback, or{' '}
                <button
                  onClick={() => setShowCommentsSidebar(true)}
                  className="text-primary hover:underline font-medium"
                >
                  view all comments
                </button>
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">👁️ View only mode</span>
          )}
        </div>
      </footer>

      {/* Comments Sidebar */}
      <CommentsSidebar
        isOpen={showCommentsSidebar}
        onClose={() => setShowCommentsSidebar(false)}
        comments={comments}
        onCommentsUpdate={fetchComments}
        currentUser={guestName || 'Guest'}
        projectUrl={project?.url}
      />
    </div>
  );
}
