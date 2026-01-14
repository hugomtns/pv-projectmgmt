import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, File, Image, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadDropzoneProps {
  /** Currently selected file */
  value: File | null;
  /** Callback when file is selected or removed */
  onChange: (file: File | null) => void;
  /** Accepted file types (e.g., ".pdf,.png,.jpg") */
  accept?: string;
  /** Max file size in bytes (default: 50MB) */
  maxSize?: number;
  /** Description of accepted file types (e.g., "PDF, PNG, JPG (max 50MB)") */
  acceptDescription?: string;
  /** Whether the dropzone is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Callback when validation fails */
  onError?: (error: string) => void;
  /** Custom className for the dropzone */
  className?: string;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="h-10 w-10 text-primary" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return <Image className="h-10 w-10 text-primary" />;
    case 'dxf':
    case 'json':
    case 'xml':
      return <FileCode className="h-10 w-10 text-primary" />;
    default:
      return <File className="h-10 w-10 text-primary" />;
  }
}

export function FileUploadDropzone({
  value,
  onChange,
  accept = ".pdf,.png,.jpg,.jpeg",
  maxSize = DEFAULT_MAX_SIZE,
  acceptDescription,
  disabled = false,
  error,
  onError,
  className,
}: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    // Validate file size
    if (file.size > maxSize) {
      const maxSizeFormatted = formatFileSize(maxSize);
      onError?.(`File size exceeds ${maxSizeFormatted} limit.`);
      return false;
    }

    // Validate file type if accept is specified
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      const fileType = file.type.toLowerCase();

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type;
        }
        // Handle MIME types like "image/*"
        if (type.endsWith('/*')) {
          const category = type.replace('/*', '');
          return fileType.startsWith(category);
        }
        return fileType === type;
      });

      if (!isAccepted) {
        onError?.('Invalid file type.');
        return false;
      }
    }

    return true;
  }, [accept, maxSize, onError]);

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      onChange(file);
    }
  }, [validateFile, onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const defaultDescription = acceptDescription ||
    `Supported: ${accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} (max ${formatFileSize(maxSize)})`;

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
        isDragging && !disabled && 'border-primary bg-primary/5',
        error && 'border-destructive',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && !isDragging && !error && 'border-border hover:border-primary/50 cursor-pointer',
        value && 'bg-muted/50',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {value ? (
        <div className="space-y-2">
          {getFileIcon(value.name)}
          <div className="flex items-center justify-center gap-2">
            <span
              className="font-medium truncate max-w-[280px]"
              title={value.name}
            >
              {value.name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(value.size)}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="mt-2"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            {defaultDescription}
          </p>
        </div>
      )}
    </div>
  );
}
