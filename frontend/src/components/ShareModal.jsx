import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Link2,
  Copy,
  Check,
  Loader2,
  Lock,
  Calendar,
  MessageCircle,
  User,
  AlertTriangle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '../config.js';

export default function ShareModal({ projectId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    password: '',
    usePassword: false,
    expiresAt: '',
    useExpiry: false,
    allowGuestComments: true,
    requireName: true,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchShareSettings();
    }
  }, [isOpen, projectId]);

  const fetchShareSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/share`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fullShareUrl = response.data.shareToken
        ? `${window.location.origin}/share/${response.data.shareToken}`
        : null;

      setShareData({
        ...response.data,
        shareUrl: fullShareUrl,
      });
      setSettings((prev) => ({
        ...prev,
        usePassword: response.data.settings?.hasPassword || false,
        allowGuestComments: response.data.settings?.allowGuestComments ?? true,
        requireName: response.data.settings?.requireName ?? true,
        useExpiry: !!response.data.settings?.expiresAt,
        expiresAt: response.data.settings?.expiresAt
          ? new Date(response.data.settings.expiresAt).toISOString().split('T')[0]
          : '',
      }));
    } catch (err) {
      console.error('Error fetching share settings:', err);
      setError(err.response?.data?.message || 'Failed to load share settings.');
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = async () => {
    try {
      setGenerating(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('You need to be logged in to generate a share link.');
        return;
      }

      const payload = {
        allowGuestComments: settings.allowGuestComments,
        requireName: settings.requireName,
      };

      if (settings.usePassword && settings.password) {
        payload.password = settings.password;
      } else if (!settings.usePassword) {
        payload.password = null;
      }

      if (settings.useExpiry && settings.expiresAt) {
        payload.expiresAt = new Date(settings.expiresAt).toISOString();
      } else {
        payload.expiresAt = null;
      }

      const response = await axios.post(
        `${API_BASE_URL}/projects/${projectId}/share`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fullShareUrl = response.data.shareUrl?.startsWith('http')
        ? response.data.shareUrl
        : `${window.location.origin}/share/${response.data.shareToken}`;

      setShareData({
        ...response.data,
        shareUrl: fullShareUrl,
      });
      setSettings((prev) => ({ ...prev, password: '' }));

      try {
        await navigator.clipboard.writeText(fullShareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        console.log('Auto-copy failed');
      }
    } catch (err) {
      console.error('Error generating share link:', err);
      setError(err.response?.data?.message || 'Failed to generate share link.');
    } finally {
      setGenerating(false);
    }
  };

  const disableSharing = async () => {
    if (!window.confirm('Are you sure you want to disable sharing?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/projects/${projectId}/share`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShareData((prev) => ({
        ...prev,
        settings: { ...prev.settings, enabled: false },
      }));
    } catch (error) {
      console.error('Error disabling sharing:', error);
    }
  };

  const copyToClipboard = async () => {
    if (!shareData?.shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] glass border-border/50">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">Share Project</DialogTitle>
              <DialogDescription>
                Generate a link to share with clients
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Share Link Section */}
            {shareData?.settings?.enabled && shareData?.shareUrl ? (
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Share Link
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={shareData.shareUrl}
                    readOnly
                    className="bg-secondary/50 border-border/50 text-sm font-mono"
                  />
                  <Button
                    onClick={copyToClipboard}
                    className={`shrink-0 gap-2 ${
                      copied
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-gradient-to-r from-primary to-blue-600'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {copied
                    ? '✓ Link copied to clipboard!'
                    : 'Anyone with this link can view and comment on the project.'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                <Link2 className="w-8 h-8 text-primary mx-auto mb-3 opacity-70" />
                <p className="text-sm text-muted-foreground">
                  Generate a share link to allow clients to view and comment on this
                  project.
                </p>
              </div>
            )}

            {/* Settings Section */}
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Settings
              </Label>

              {/* Password Protection */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.usePassword}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        usePassword: e.target.checked,
                        password: '',
                      }))
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Password Protection</span>
                </label>
                {settings.usePassword && (
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={settings.password}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="bg-secondary/50 border-border/50 ml-7"
                  />
                )}
              </div>

              {/* Expiration Date */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.useExpiry}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        useExpiry: e.target.checked,
                        expiresAt: '',
                      }))
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Set Expiration Date</span>
                </label>
                {settings.useExpiry && (
                  <Input
                    type="date"
                    value={settings.expiresAt}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, expiresAt: e.target.value }))
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-secondary/50 border-border/50 ml-7"
                  />
                )}
              </div>

              {/* Guest Comments */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowGuestComments}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      allowGuestComments: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Allow Guest Comments</span>
              </label>

              {/* Require Name */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireName}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, requireName: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Require Name for Comments</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border/50">
              {shareData?.settings?.enabled ? (
                <>
                  <Button
                    onClick={generateShareLink}
                    disabled={generating}
                    className="flex-1 gap-2 bg-gradient-to-r from-primary to-blue-600"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Update Settings
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={disableSharing}
                    className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Disable
                  </Button>
                </>
              ) : (
                <Button
                  onClick={generateShareLink}
                  disabled={generating}
                  className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Generate Share Link
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
