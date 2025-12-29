import { useState } from 'react';
import { formatMetadataForDisplay } from '@/lib/captureMetadata';
import {
  Globe,
  Clock,
  Monitor,
  Chrome,
  Maximize,
  Smartphone,
  Tablet,
  MapPin,
  Languages,
  ExternalLink,
  ImageIcon,
  X,
  ZoomIn,
} from 'lucide-react';

const iconMap = {
  globe: Globe,
  clock: Clock,
  monitor: Monitor,
  chrome: Chrome,
  maximize: Maximize,
  smartphone: Smartphone,
  tablet: Tablet,
  'map-pin': MapPin,
  languages: Languages,
};

export default function MetadataDisplay({ metadata }) {
  const [showFullImage, setShowFullImage] = useState(false);

  if (!metadata) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No metadata captured for this comment
      </div>
    );
  }

  const items = formatMetadataForDisplay(metadata);
  const screenshot = metadata.screenshot;

  return (
    <div className="space-y-4">
      {/* Screenshot Section */}
      {screenshot && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="w-4 h-4" />
            <span>Screenshot</span>
          </div>
          <div 
            className="relative group cursor-pointer rounded-lg overflow-hidden border border-border/50 bg-muted/20"
            onClick={() => setShowFullImage(true)}
          >
            <img
              src={screenshot}
              alt="Comment screenshot"
              className="w-full h-auto max-h-[200px] object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      )}

      {/* Full Image Modal */}
      {showFullImage && screenshot && (
        <div 
          className="fixed inset-0 z-[99999999] bg-black/90 flex items-center justify-center p-4"
          style={{ pointerEvents: 'auto' }}
          onClick={() => setShowFullImage(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setShowFullImage(false)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={screenshot}
            alt="Comment screenshot (full)"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Metadata Items */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const IconComponent = iconMap[item.icon] || Monitor;
          
          return (
            <div
              key={index}
              className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconComponent className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                {item.isLink ? (
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{item.value}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm text-foreground truncate">{item.value}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

