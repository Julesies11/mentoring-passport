import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { getFileIcon } from '@/lib/helpers';
import { Eye, ExternalLink, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilePreviewCardProps {
  fileName: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  createdAt?: string;
  onDelete?: () => void;
  className?: string;
  showDetails?: boolean;
}

/**
 * Gold Standard component for displaying file and image previews.
 * Features: Lazy loading for images, professional file icons, error handling.
 */
export function FilePreviewCard({
  fileName,
  fileUrl,
  mimeType,
  createdAt,
  onDelete,
  className,
  showDetails = true,
}: FilePreviewCardProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const isImage = mimeType?.startsWith('image/') || 
                 fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  // Handle case where file record exists but URL failed to generate (missing in storage)
  const isMissing = !fileUrl;

  if (showFullPreview && isImage && fileUrl) {
    return (
      <div className={cn(
        "relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50 w-full animate-in fade-in zoom-in-95 duration-300",
        className
      )}>
        <img 
          src={fileUrl} 
          alt="Preview" 
          className="w-full h-auto max-h-[400px] object-contain mx-auto"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-lg shadow-lg h-8 text-[10px] font-bold bg-white/90 hover:bg-white"
            onClick={() => window.open(fileUrl, '_blank')}
          >
            <ExternalLink size={12} className="mr-1.5" />
            Full Size
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-lg shadow-lg h-8 text-[10px] font-bold bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullPreview(false);
            }}
          >
            <XCircle size={12} className="mr-1.5" />
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-primary/20 transition-all group",
      isMissing && "opacity-75 bg-gray-50/50",
      className
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn(
            "size-9 rounded-lg bg-gray-50 flex items-center justify-center p-2 shrink-0 transition-transform group-hover:scale-105",
            isMissing && "grayscale opacity-50"
          )}>
            <img src={getFileIcon(fileName)} alt="file icon" className="size-full" />
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "text-xs font-bold truncate",
              isMissing ? "text-gray-400 line-through" : "text-gray-700"
            )}>
              {fileName || 'Untitled File'}
            </span>
            {showDetails && (
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tight">
                {isMissing ? 'File Missing' : (mimeType?.split('/')[1] || 'File')} 
                {createdAt && ` • ${new Date(createdAt).toLocaleDateString()}`}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isMissing && isImage && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 rounded-lg text-primary hover:bg-primary/5 font-bold text-[10px]"
              onClick={() => setShowFullPreview(true)}
            >
              <Eye size={12} className="mr-1" />
              Preview
            </Button>
          )}
          
          {!isMissing && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="size-8 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5"
              onClick={() => window.open(fileUrl!, '_blank')}
              title="Open full size"
            >
              <ExternalLink size={14} />
            </Button>
          )}

          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="size-8 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10" 
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to remove this file?')) {
                  onDelete();
                }
              }}
              title="Delete file"
            >
              <KeenIcon icon="trash" className="text-base" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
