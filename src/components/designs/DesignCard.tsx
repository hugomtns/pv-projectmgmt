import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
import type { Design } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface DesignCardProps {
    design: Design;
}

export function DesignCard({ design }: DesignCardProps) {
    const navigate = useNavigate();

    const getStatusColor = (status: Design['status']) => {
        switch (status) {
            case 'approved':
                return 'bg-green-500/10 text-green-700 hover:bg-green-500/20';
            case 'review':
                return 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20';
            default:
                return 'bg-slate-500/10 text-slate-700 hover:bg-slate-500/20';
        }
    };

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow group h-full flex flex-col"
            onClick={() => navigate(`/designs/${design.id}`)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {design.name}
                    </CardTitle>
                    <Badge variant="secondary" className={`shrink-0 ${getStatusColor(design.status)}`}>
                        {design.status.replace('_', ' ')}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="flex-1 pb-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                    {design.description || 'No description provided.'}
                </p>
            </CardContent>

            <CardFooter className="pt-0 text-xs text-muted-foreground border-t bg-muted/20 p-3 mt-auto">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5" title={`Created by ${design.createdBy}`}>
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{design.createdBy}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title={`Updated ${new Date(design.updatedAt).toLocaleDateString()}`}>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(design.updatedAt), { addSuffix: true })}</span>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}
