import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDocumentStore } from '@/stores/documentStore';
import { db, getBlob } from '@/lib/db';
import { blobCache } from '@/lib/blobCache';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import NotFound from './NotFound';

interface LocationState {
  highlightCommentId?: string;
  commentType?: 'location' | 'general';
}

export default function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const document = useDocumentStore((state) =>
    documentId ? state.documents.find(d => d.id === documentId) : null
  );

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document || !documentId) {
      setLoading(false);
      return;
    }

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current version
        const version = await db.documentVersions.get(document.currentVersionId);
        if (!version) {
          setError('Document version not found');
          setLoading(false);
          return;
        }

        // Load blob from cache or create new URL
        const blobId = version.pdfFileBlob || version.originalFileBlob;
        const url = await blobCache.get(blobId, getBlob);
        if (!url) {
          setError('Failed to load document file');
          setLoading(false);
          return;
        }

        setFileUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load document:', err);
        setError('Failed to load document');
        setLoading(false);
      }
    };

    loadDocument();

    // Cleanup: release blob from cache on unmount
    return () => {
      if (document) {
        const version = document.currentVersionId;
        db.documentVersions.get(version).then((v) => {
          if (v) {
            const blobId = v.pdfFileBlob || v.originalFileBlob;
            blobCache.release(blobId);
          }
        });
      }
    };
  }, [document?.currentVersionId, documentId]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!document || error) {
    return <NotFound message={error || 'Document not found'} />;
  }

  if (!fileUrl) {
    return <LoadingScreen />;
  }

  return (
    <DocumentViewer
      documentId={document.id}
      versionId={document.currentVersionId}
      documentName={document.name}
      status={document.status}
      fileUrl={fileUrl}
      onClose={() => navigate(-1)}
      initialHighlightCommentId={state?.highlightCommentId}
      initialCommentTab={state?.commentType}
    />
  );
}
