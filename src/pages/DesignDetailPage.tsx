import { useParams, useNavigate } from 'react-router-dom';
import { DesignViewer } from '@/components/designs/DesignViewer';

export default function DesignDetailPage() {
    const { designId } = useParams<{ designId: string }>();
    const navigate = useNavigate();

    // The DesignViewer handles loading the design data internally via the ID.
    // We just provide the close handler.

    if (!designId) return null;

    return (
        <DesignViewer
            designId={designId}
            onClose={() => {
                navigate(-1);
            }}
        />
    );
}
