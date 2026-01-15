import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSiteStore } from '@/stores/siteStore';
import { parseSiteFile, squareMetersToAcres } from '@/lib/kml/parser';
import type { KMLParseResult } from '@/lib/types';
import { toast } from 'sonner';
import { Upload, FileUp, Loader2, MapPin, AlertTriangle } from 'lucide-react';

const createSiteSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type CreateSiteFormValues = z.infer<typeof createSiteSchema>;

interface CreateSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateSiteDialog({ open, onOpenChange, projectId }: CreateSiteDialogProps) {
  const createSiteFromKML = useSiteStore((state) => state.createSiteFromKML);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<KMLParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateSiteFormValues>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleFileChange = async (file: File | null) => {
    setSelectedFile(file);
    setParseResult(null);
    setParseError(null);

    if (file) {
      setIsParsing(true);
      try {
        const result = await parseSiteFile(file);
        setParseResult(result);

        // Auto-fill name from file if empty
        const currentName = (document.getElementById('site-name') as HTMLInputElement)?.value;
        if (!currentName) {
          const baseName = file.name.replace(/\.(kml|kmz)$/i, '');
          setValue('name', baseName);
        }

        if (result.boundaries.length === 0) {
          setParseError('No boundaries found in KML file. Make sure the file contains polygon data.');
        } else {
          toast.success(`Parsed ${result.boundaries.length} boundary, ${result.exclusionZones.length} exclusions`);
        }
      } catch (error) {
        console.error('Failed to parse KML:', error);
        setParseError((error as Error).message);
        toast.error('Failed to parse KML file');
        setSelectedFile(null);
      } finally {
        setIsParsing(false);
      }
    }
  };

  const onSubmit = async (data: CreateSiteFormValues) => {
    if (!selectedFile || !parseResult) {
      toast.error('Please select a KML or KMZ file');
      return;
    }

    if (parseResult.boundaries.length === 0) {
      toast.error('No boundaries found in KML file');
      return;
    }

    setIsSubmitting(true);
    try {
      createSiteFromKML(
        projectId,
        data.name,
        data.description || '',
        selectedFile.name,
        selectedFile.size,
        parseResult
      );

      reset();
      setSelectedFile(null);
      setParseResult(null);
      setParseError(null);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create site');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedFile(null);
    setParseResult(null);
    setParseError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Site from KML</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          {/* KML File Upload */}
          <div className="space-y-2">
            <Label htmlFor="kml-file">KML/KMZ File *</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <Input
                id="kml-file"
                type="file"
                accept=".kml,.kmz"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="kml-file" className="cursor-pointer block">
                {isParsing ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Parsing file...
                  </div>
                ) : selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <FileUp className="h-5 w-5" />
                    {selectedFile.name}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-8 w-8" />
                    <span>Click to upload KML or KMZ file</span>
                    <span className="text-xs">Site boundaries will be extracted automatically</span>
                  </div>
                )}
              </label>
            </div>

            {/* Parse Error */}
            {parseError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Parse Preview */}
            {parseResult && parseResult.boundaries.length > 0 && (
              <div className="bg-muted/50 rounded p-3 text-sm space-y-1">
                <div className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  File Preview
                </div>
                <div className="text-muted-foreground">
                  {parseResult.boundaries.length} site{' '}
                  {parseResult.boundaries.length === 1 ? 'boundary' : 'boundaries'} detected
                </div>
                {parseResult.exclusionZones.length > 0 && (
                  <div className="text-amber-600">
                    {parseResult.exclusionZones.length} exclusion zone
                    {parseResult.exclusionZones.length !== 1 ? 's' : ''} detected
                  </div>
                )}
                {parseResult.totalArea && (
                  <div className="text-muted-foreground">
                    Total area: {squareMetersToAcres(parseResult.totalArea).toFixed(1)} acres
                  </div>
                )}
                {parseResult.centroid && (
                  <div className="text-xs text-muted-foreground">
                    Center: {parseResult.centroid.latitude.toFixed(5)},{' '}
                    {parseResult.centroid.longitude.toFixed(5)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Site Name */}
          <div className="space-y-2">
            <Label htmlFor="site-name">Site Name *</Label>
            <Input
              id="site-name"
              {...register('name')}
              placeholder="e.g., North Parcel"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="site-description">Description</Label>
            <Textarea
              id="site-description"
              {...register('description')}
              placeholder="Optional site description..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedFile || !parseResult || parseResult.boundaries.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Site'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
