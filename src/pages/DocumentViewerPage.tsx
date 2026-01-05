import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '@/stores/documentStore';
import { db, getBlob } from '@/lib/db';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import NotFound from './NotFound';

export default function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const getDocument = useDocumentStore((state) => state.getDocument);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const document = documentId ? getDocument(documentId) : null;

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

        // Load blob and create URL
        const blob = await getBlob(version.pdfFileBlob || version.originalFileBlob);
        if (!blob) {
          setError('Failed to load document file');
          setLoading(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        setFileUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load document:', err);
        setError('Failed to load document');
        setLoading(false);
      }
    };

    loadDocument();

    // Cleanup blob URL on unmount
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
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
    />
  );
}
