import Dexie, { type EntityTable } from 'dexie';
import type { DocumentVersion, Drawing, DocumentComment, WorkflowEvent } from './types/document';

// Blob storage record
interface BlobRecord {
  id: string;
  data: ArrayBuffer;
  type: string;
  size: number;
}

// IndexedDB database for document management
// Stores file blobs, drawings, comments, and workflow events
// Metadata is stored in Zustand/localStorage
class DocumentDatabase extends Dexie {
  documentVersions!: EntityTable<DocumentVersion, 'id'>;
  drawings!: EntityTable<Drawing, 'id'>;
  documentComments!: EntityTable<DocumentComment, 'id'>;
  workflowEvents!: EntityTable<WorkflowEvent, 'id'>;
  blobs!: EntityTable<BlobRecord, 'id'>;

  constructor() {
    super('pv-projectmgmt-documents');

    this.version(1).stores({
      documentVersions: 'id, documentId, versionNumber, uploadedAt',
      drawings: 'id, documentId, page, createdBy',
      documentComments: 'id, documentId, versionId, type, createdAt',
      workflowEvents: 'id, documentId, timestamp',
      blobs: 'id'
    });
  }
}

export const db = new DocumentDatabase();

// Blob storage utilities
// Store and retrieve file blobs in IndexedDB

/**
 * Store a file blob in IndexedDB
 * Returns a blob ID (the file's unique identifier)
 */
export async function storeBlob(blob: Blob): Promise<string> {
  const blobId = crypto.randomUUID();

  // Convert blob to ArrayBuffer for storage
  const arrayBuffer = await blob.arrayBuffer();

  // Store in blobs table
  await db.blobs.add({
    id: blobId,
    data: arrayBuffer,
    type: blob.type,
    size: blob.size
  });

  return blobId;
}

/**
 * Retrieve a file blob from IndexedDB by blob ID
 */
export async function getBlob(blobId: string): Promise<Blob | null> {
  const record = await db.blobs.get(blobId);

  if (!record) {
    return null;
  }

  return new Blob([record.data], { type: record.type });
}

/**
 * Delete a blob from IndexedDB
 */
export async function deleteBlob(blobId: string): Promise<void> {
  await db.blobs.delete(blobId);
}

/**
 * Get total storage usage in bytes
 */
export async function getStorageUsage(): Promise<number> {
  const blobs = await db.blobs.toArray();
  return blobs.reduce((total, blob) => total + blob.size, 0);
}

/**
 * Check if storage quota is approaching limit
 * Returns percentage used (0-100)
 */
export async function getStoragePercentage(): Promise<number> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return 0;
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 1;

  return (usage / quota) * 100;
}
