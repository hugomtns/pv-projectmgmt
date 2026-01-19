import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DesignViewer } from '@/components/designs/DesignViewer';

interface LocationState {
    highlightCommentId?: string;
    commentType?: 'element' | 'general';
}

export default function DesignDetailPage() {
    const { designId } = useParams<{ designId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState | null;

    // The DesignViewer handles loading the design data internally via the ID.
    // We just provide the close handler and optional comment to highlight.

    if (!designId) return null;

    return (
        <DesignViewer
            designId={designId}
            initialHighlightCommentId={state?.highlightCommentId}
            initialCommentTab={state?.commentType}
            onClose={() => {
                navigate(-1);
            }}
        />
    );
}
