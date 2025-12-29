import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Hand,
  MessageCircle,
  Pencil,
  CheckCheck,
  Trash2,
  Download,
  Sparkles,
} from 'lucide-react';

export default function Toolbar({
  mode,
  onModeChange,
  commentCount = 0,
  onClearAll,
  onResolveAll,
  onExport,
  onOpenComments,
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] glass border-b border-border/50 shadow-lg shadow-black/10">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left Section - Mode Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 border border-border/50">
            <Button
              variant={mode === 'pan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('pan')}
              className={`gap-2 h-8 ${
                mode === 'pan'
                  ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-primary/25'
                  : 'hover:bg-secondary'
              }`}
            >
              <Hand className="w-4 h-4" />
              <span className="hidden sm:inline">Pan</span>
            </Button>
            <Button
              variant={mode === 'comment' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('comment')}
              className={`gap-2 h-8 relative ${
                mode === 'comment'
                  ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-primary/25'
                  : 'hover:bg-secondary'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Comment</span>
              {commentCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1.5 -right-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] font-bold"
                >
                  {commentCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={mode === 'draw' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onModeChange('draw')}
              className={`gap-2 h-8 ${
                mode === 'draw'
                  ? 'bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-primary/25'
                  : 'hover:bg-secondary'
              }`}
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Draw</span>
            </Button>
          </div>

          {/* Comments Sidebar Button */}
          {onOpenComments && (
            <>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenComments}
                className="gap-2 h-8 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">All Comments</span>
                {commentCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {commentCount}
                  </Badge>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {commentCount > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onResolveAll}
                className="gap-2 h-8 border-border/50 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Resolve All</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="gap-2 h-8 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear All</span>
              </Button>
            </>
          )}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2 h-8 border-border/50 hover:bg-secondary"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
