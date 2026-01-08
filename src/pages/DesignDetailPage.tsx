import { useParams, useNavigate } from 'react-router-dom';
import { useDesignStore } from '@/stores/designStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DesignDetailPage() {
    const { designId } = useParams();
    const navigate = useNavigate();
    const design = useDesignStore((state) => state.designs.find(d => d.id === designId));

    if (!design) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Design Not Found</h2>
                <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 px-4">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    className="gap-2 pl-0 hover:pl-2 transition-all"
                    onClick={() => navigate(`/projects/${design.projectId}`)}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Project
                </Button>
            </div>

            <div className="bg-background border rounded-lg p-8 shadow-sm">
                <div className="mb-8 border-b pb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-3xl font-bold tracking-tight">{design.name}</h1>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground">
                            {design.status.replace('_', ' ')}
                        </span>
                    </div>
                    <p className="text-muted-foreground text-lg">
                        {design.description || 'No description provided.'}
                    </p>
                </div>

                <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                    <div className="text-center text-muted-foreground">
                        <p className="text-lg font-medium mb-1">Design Workspace</p>
                        <p className="text-sm">Future canvas integration will go here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
