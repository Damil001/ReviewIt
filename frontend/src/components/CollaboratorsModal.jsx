import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UserPlus,
  X,
  Mail,
  User,
  Loader2,
  Trash2,
} from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext';

export default function CollaboratorsModal({ projectId, project, isOpen, onClose, onUpdate }) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (project && project.collaborators) {
      setCollaborators(project.collaborators);
    }
  }, [project]);

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/collaborators`, {
        email: email.trim(),
      });

      setEmail('');
      setCollaborators(response.data.project.collaborators || []);
      onUpdate?.(response.data.project);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add collaborator');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    if (!window.confirm('Remove this collaborator from the project?')) {
      return;
    }

    setRemovingId(userId);
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/projects/${projectId}/collaborators/${userId}`
      );

      setCollaborators(response.data.project.collaborators || []);
      onUpdate?.(response.data.project);
    } catch (err) {
      console.error('Error removing collaborator:', err);
      alert(err.response?.data?.error || 'Failed to remove collaborator');
    } finally {
      setRemovingId(null);
    }
  };

  const isOwner = project?.owner?._id === user?._id || project?.owner === user?._id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Manage Collaborators
          </DialogTitle>
          <DialogDescription>
            Add team members to collaborate on this project
          </DialogDescription>
        </DialogHeader>

        {isOwner && (
          <form onSubmit={handleAddCollaborator} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="collaborator@example.com"
                  className="pl-10 bg-secondary/50 border-border/50"
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full gap-2 bg-gradient-to-r from-primary to-blue-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Collaborator
                </>
              )}
            </Button>
          </form>
        )}

        <div className="space-y-2">
          <Label>Project Owner</Label>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {project?.owner?.name || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {project?.owner?.email || ''}
              </p>
            </div>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
              Owner
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Collaborators ({collaborators.length})</Label>
          {collaborators.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground rounded-lg bg-secondary/50 border border-border/50">
              No collaborators yet
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {collaborators.map((collab) => (
                <div
                  key={collab._id || collab}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {collab.name || collab.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {collab.email || ''}
                    </p>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCollaborator(collab._id || collab)}
                      disabled={removingId === (collab._id || collab)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      {removingId === (collab._id || collab) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

