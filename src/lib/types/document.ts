// Document Management Types

export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'changes_requested';

export interface LocationAnchor {
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  page: number;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  versionId: string;
  type: 'document' | 'location';
  text: string;
  author: string;
  createdAt: string; // ISO timestamp
  location?: LocationAnchor;
  resolved: boolean;
}

export interface Drawing {
  id: string;
  documentId: string;
  versionId: string;
  page: number;
  type: 'rectangle' | 'circle' | 'arrow' | 'freehand' | 'text';
  color: string;
  strokeWidth: number;
  bounds: {
    x: number; // Percentage (0-100)
    y: number; // Percentage (0-100)
    width: number; // Percentage (0-100)
    height: number; // Percentage (0-100)
  };
  points?: Array<{ x: number; y: number }>; // For freehand, percentage coordinates
  text?: string; // For text annotations
  createdBy: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: number;
  pageCount: number;
  // Blob IDs stored in IndexedDB
  originalFileBlob: string; // Blob ID
  pdfFileBlob?: string; // Blob ID (for converted DOCX)
}

export interface Document {
  id: string;
  name: string;
  description: string;
  status: DocumentStatus;
  projectId?: string; // If attached to project
  taskId?: string; // If attached to task
  versions: string[]; // Array of DocumentVersion IDs
  currentVersionId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Denormalized from current version for easy display
  fileSize: number;
  uploadedBy: string;
}

export interface WorkflowEvent {
  id: string;
  documentId: string;
  action: 'created' | 'status_changed' | 'version_uploaded' | 'commented' | 'approved' | 'rejected';
  actor: string;
  timestamp: string;
  fromStatus?: DocumentStatus;
  toStatus?: DocumentStatus;
  note?: string;
}
