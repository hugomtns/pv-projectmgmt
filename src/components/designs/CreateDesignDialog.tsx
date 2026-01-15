import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDesignStore } from '@/stores/designStore';
import { LocationPicker } from './LocationPicker';
import { extractGeoDataFromDXF } from '@/lib/dxf/parser';
import { toast } from 'sonner';
import { Upload, FileUp } from 'lucide-react';
import type { GPSCoordinates } from '@/lib/types';

const createDesignSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

type CreateDesignFormValues = z.infer<typeof createDesignSchema>;

interface CreateDesignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
}

export function CreateDesignDialog({ open, onOpenChange, projectId }: CreateDesignDialogProps) {
    const addDesign = useDesignStore((state) => state.addDesign);
    const addVersion = useDesignStore((state) => state.addVersion);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinates | undefined>(undefined);
    const [groundSizeMeters, setGroundSizeMeters] = useState(400);
    const [gpsExtractedFromFile, setGpsExtractedFromFile] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateDesignFormValues>({
        resolver: zodResolver(createDesignSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    // Handle DXF file selection - extract GPS coordinates if available
    const handleFileChange = async (file: File | null) => {
        setSelectedFile(file);
        setGpsExtractedFromFile(false);

        if (file && file.name.toLowerCase().endsWith('.dxf')) {
            try {
                const geoData = await extractGeoDataFromDXF(file);
                if (geoData?.latitude && geoData?.longitude) {
                    setGpsCoordinates({
                        latitude: geoData.latitude,
                        longitude: geoData.longitude,
                        elevation: geoData.elevation,
                    });
                    setGpsExtractedFromFile(true);
                    toast.success('GPS coordinates extracted from DXF');
                }
            } catch (error) {
                console.error('Failed to extract GPS from DXF:', error);
            }
        }
    };

    // Handle manual GPS coordinate changes
    const handleGpsChange = (coords: GPSCoordinates | undefined) => {
        setGpsCoordinates(coords);
        if (!coords) {
            setGpsExtractedFromFile(false);
        }
    };

    const onSubmit = async (data: CreateDesignFormValues) => {
        setIsSubmitting(true);
        try {
            const designId = addDesign({
                projectId,
                name: data.name,
                description: data.description || '',
                status: 'draft',
                gpsCoordinates,
                groundSizeMeters: gpsCoordinates ? groundSizeMeters : undefined,
            });

            // If a file was selected, upload it as the first version
            if (selectedFile && designId) {
                await addVersion(designId, selectedFile);
            }

            reset();
            setSelectedFile(null);
            setGpsCoordinates(undefined);
            setGroundSizeMeters(400);
            setGpsExtractedFromFile(false);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Design</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Design Name</Label>
                        <Input id="name" {...register('name')} placeholder="e.g., Roof Layout V1" />
                        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            {...register('description')}
                            placeholder="Optional description..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dxf-file">DXF File (optional)</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                            <Input
                                id="dxf-file"
                                type="file"
                                accept=".dxf"
                                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                            <label htmlFor="dxf-file" className="cursor-pointer block">
                                {selectedFile ? (
                                    <div className="flex items-center justify-center gap-2 text-primary">
                                        <FileUp className="h-5 w-5" />
                                        {selectedFile.name}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Upload className="h-8 w-8" />
                                        <span>Click to upload DXF file</span>
                                        <span className="text-xs">GPS coordinates will be extracted if available</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Project Location (optional)</Label>
                        <p className="text-xs text-muted-foreground">
                            For satellite imagery overlay in 3D view
                        </p>
                        <LocationPicker
                            value={gpsCoordinates}
                            onChange={handleGpsChange}
                            groundSize={groundSizeMeters}
                            onGroundSizeChange={setGroundSizeMeters}
                            extractedFromFile={gpsExtractedFromFile}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            Create Design
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
