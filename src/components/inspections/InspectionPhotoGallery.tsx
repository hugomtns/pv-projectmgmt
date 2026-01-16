import { useState, useEffect } from 'react';
import { getBlob } from '@/lib/db';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, ZoomIn, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { InspectionItemPhoto } from '@/lib/types/inspection';

interface InspectionPhotoGalleryProps {
  photos: InspectionItemPhoto[];
  onDelete?: (photoId: string) => void;
  disabled?: boolean;
}

interface PhotoWithUrl extends InspectionItemPhoto {
  url?: string;
  loading?: boolean;
  error?: boolean;
}

export function InspectionPhotoGallery({
  photos,
  onDelete,
  disabled,
}: InspectionPhotoGalleryProps) {
  const [photosWithUrls, setPhotosWithUrls] = useState<PhotoWithUrl[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUrl | null>(null);

  // Load photo URLs from IndexedDB
  useEffect(() => {
    const loadPhotos = async () => {
      const loaded = await Promise.all(
        photos.map(async (photo) => {
          try {
            const blob = await getBlob(photo.blobId);
            if (blob) {
              const url = URL.createObjectURL(blob);
              return { ...photo, url, loading: false };
            }
            return { ...photo, loading: false, error: true };
          } catch {
            return { ...photo, loading: false, error: true };
          }
        })
      );
      setPhotosWithUrls(loaded);
    };

    // Set initial loading state
    setPhotosWithUrls(photos.map((p) => ({ ...p, loading: true })));
    loadPhotos();

    // Cleanup URLs on unmount
    return () => {
      photosWithUrls.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, [photos]);

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photosWithUrls.map((photo) => (
          <div
            key={photo.id}
            className={cn(
              'relative aspect-square rounded-md overflow-hidden bg-muted group',
              photo.url && 'cursor-pointer'
            )}
            onClick={() => photo.url && setSelectedPhoto(photo)}
          >
            {photo.loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : photo.error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Failed to load</span>
              </div>
            ) : (
              <>
                <img
                  src={photo.url}
                  alt={photo.caption || photo.fileName}
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                    }}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  {onDelete && !disabled && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(photo.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Full-size preview dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.caption || selectedPhoto?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedPhoto?.url && (
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || selectedPhoto.fileName}
                className="w-full max-h-[60vh] object-contain rounded-md"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Captured {selectedPhoto && format(new Date(selectedPhoto.capturedAt), 'PPp')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
