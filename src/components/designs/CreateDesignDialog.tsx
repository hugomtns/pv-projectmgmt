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
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

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

    const onSubmit = async (data: CreateDesignFormValues) => {
        setIsSubmitting(true);
        try {
            // Parse GPS coordinates if provided
            let gpsCoordinates: GPSCoordinates | undefined;
            const lat = parseFloat(latitude);
            const lon = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lon)) {
                gpsCoordinates = { latitude: lat, longitude: lon };
            }

            const designId = addDesign({
                projectId,
                name: data.name,
                description: data.description || '',
                status: 'draft',
                gpsCoordinates,
            });

            // If a file was selected, upload it as the first version
            if (selectedFile && designId) {
                await addVersion(designId, selectedFile);
            }

            reset();
            setSelectedFile(null);
            setLatitude('');
            setLongitude('');
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
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
                        <Label htmlFor="file">DXF File (optional)</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".dxf"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                        {selectedFile && (
                            <p className="text-sm text-muted-foreground">
                                Selected: {selectedFile.name}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>GPS Coordinates (optional)</Label>
                        <p className="text-xs text-muted-foreground">
                            For satellite imagery overlay in 3D view
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Input
                                    type="number"
                                    step="0.000001"
                                    placeholder="Latitude (e.g., 37.7749)"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                />
                            </div>
                            <div>
                                <Input
                                    type="number"
                                    step="0.000001"
                                    placeholder="Longitude (e.g., -122.4194)"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                />
                            </div>
                        </div>
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
