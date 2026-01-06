import { describe, it, expect, beforeEach } from 'vitest';
import { db, storeBlob, getBlob, deleteBlob, getStorageUsage } from '@/lib/db';

describe('IndexedDB blob storage', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.blobs.clear();
    await db.documentVersions.clear();
    await db.drawings.clear();
    await db.documentComments.clear();
    await db.workflowEvents.clear();
  });

  describe('storeBlob', () => {
    it('should store a blob and return a blob ID', async () => {
      const testBlob = new Blob(['test content'], { type: 'text/plain' });
      const blobId = await storeBlob(testBlob);

      expect(blobId).toBeDefined();
      expect(typeof blobId).toBe('string');
      expect(blobId.length).toBeGreaterThan(0);
    });

    it('should store the blob data in IndexedDB', async () => {
      const testBlob = new Blob(['test content'], { type: 'text/plain' });
      const blobId = await storeBlob(testBlob);

      const storedRecord = await db.blobs.get(blobId);

      expect(storedRecord).toBeDefined();
      expect(storedRecord?.type).toBe('text/plain');
      expect(storedRecord?.size).toBe(testBlob.size);
    });
  });

  describe('getBlob', () => {
    it('should retrieve a stored blob by ID', async () => {
      const originalBlob = new Blob(['test content'], { type: 'text/plain' });
      const blobId = await storeBlob(originalBlob);

      const retrievedBlob = await getBlob(blobId);

      expect(retrievedBlob).not.toBeNull();
      expect(retrievedBlob?.type).toBe('text/plain');
      expect(retrievedBlob?.size).toBe(originalBlob.size);
    });

    it('should return the correct blob content', async () => {
      const testContent = 'Hello, World!';
      const originalBlob = new Blob([testContent], { type: 'text/plain' });
      const blobId = await storeBlob(originalBlob);

      const retrievedBlob = await getBlob(blobId);
      const retrievedText = await retrievedBlob!.text();

      expect(retrievedText).toBe(testContent);
    });

    it('should return null for non-existent blob ID', async () => {
      const retrievedBlob = await getBlob('non-existent-id');
      expect(retrievedBlob).toBeNull();
    });
  });

  describe('deleteBlob', () => {
    it('should delete a blob from storage', async () => {
      const testBlob = new Blob(['test content'], { type: 'text/plain' });
      const blobId = await storeBlob(testBlob);

      await deleteBlob(blobId);

      const retrievedBlob = await getBlob(blobId);
      expect(retrievedBlob).toBeNull();
    });

    it('should not throw error when deleting non-existent blob', async () => {
      await expect(deleteBlob('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('getStorageUsage', () => {
    it('should return 0 for empty storage', async () => {
      const usage = await getStorageUsage();
      expect(usage).toBe(0);
    });

    it('should calculate total storage usage', async () => {
      const blob1 = new Blob(['a'.repeat(100)], { type: 'text/plain' });
      const blob2 = new Blob(['b'.repeat(200)], { type: 'text/plain' });

      await storeBlob(blob1);
      await storeBlob(blob2);

      const usage = await getStorageUsage();
      expect(usage).toBe(300);
    });

    it('should update usage after deleting blobs', async () => {
      const blob1 = new Blob(['a'.repeat(100)], { type: 'text/plain' });
      const blob2 = new Blob(['b'.repeat(200)], { type: 'text/plain' });

      const blobId1 = await storeBlob(blob1);
      await storeBlob(blob2);

      await deleteBlob(blobId1);

      const usage = await getStorageUsage();
      expect(usage).toBe(200);
    });
  });

  describe('DocumentDatabase schema', () => {
    it('should create documentVersions table with correct indexes', async () => {
      const version = {
        id: 'version-1',
        documentId: 'doc-1',
        versionNumber: 1,
        uploadedBy: 'Test User',
        uploadedAt: new Date().toISOString(),
        fileSize: 1024,
        pageCount: 5,
        originalFileBlob: 'blob-1',
      };

      await db.documentVersions.add(version);

      const retrieved = await db.documentVersions.get('version-1');
      expect(retrieved).toEqual(version);
    });

    it('should query documentVersions by documentId', async () => {
      await db.documentVersions.add({
        id: 'version-1',
        documentId: 'doc-1',
        versionNumber: 1,
        uploadedBy: 'Test User',
        uploadedAt: new Date().toISOString(),
        fileSize: 1024,
        pageCount: 5,
        originalFileBlob: 'blob-1',
      });

      await db.documentVersions.add({
        id: 'version-2',
        documentId: 'doc-1',
        versionNumber: 2,
        uploadedBy: 'Test User',
        uploadedAt: new Date().toISOString(),
        fileSize: 2048,
        pageCount: 5,
        originalFileBlob: 'blob-2',
      });

      const versions = await db.documentVersions
        .where('documentId')
        .equals('doc-1')
        .toArray();

      expect(versions).toHaveLength(2);
      expect(versions.map((v) => v.id)).toEqual(['version-1', 'version-2']);
    });

    it('should create drawings table with correct indexes', async () => {
      const drawing = {
        id: 'drawing-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        page: 1,
        type: 'rectangle' as const,
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 50, height: 30 },
        createdBy: 'Test User',
        createdAt: new Date().toISOString(),
      };

      await db.drawings.add(drawing);

      const retrieved = await db.drawings.get('drawing-1');
      expect(retrieved).toEqual(drawing);
    });

    it('should query drawings by documentId and page', async () => {
      await db.drawings.add({
        id: 'drawing-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        page: 1,
        type: 'rectangle' as const,
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 50, height: 30 },
        createdBy: 'Test User',
        createdAt: new Date().toISOString(),
      });

      await db.drawings.add({
        id: 'drawing-2',
        documentId: 'doc-1',
        versionId: 'version-1',
        page: 2,
        type: 'circle' as const,
        color: '#00FF00',
        strokeWidth: 2,
        bounds: { x: 20, y: 20, width: 40, height: 40 },
        createdBy: 'Test User',
        createdAt: new Date().toISOString(),
      });

      const page1Drawings = await db.drawings
        .where('[documentId+page]')
        .equals(['doc-1', 1])
        .toArray();

      expect(page1Drawings).toHaveLength(1);
      expect(page1Drawings[0].id).toBe('drawing-1');
    });

    it('should create documentComments table with correct indexes', async () => {
      const comment = {
        id: 'comment-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        type: 'document' as const,
        text: 'Test comment',
        author: 'Test User',
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      await db.documentComments.add(comment);

      const retrieved = await db.documentComments.get('comment-1');
      expect(retrieved).toEqual(comment);
    });

    it('should query comments by documentId', async () => {
      const now = new Date().toISOString();

      await db.documentComments.add({
        id: 'comment-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        type: 'document' as const,
        text: 'Comment 1',
        author: 'User 1',
        createdAt: now,
        resolved: false,
      });

      await db.documentComments.add({
        id: 'comment-2',
        documentId: 'doc-1',
        versionId: 'version-1',
        type: 'location' as const,
        text: 'Comment 2',
        author: 'User 2',
        createdAt: now,
        resolved: false,
        location: { x: 50, y: 50, page: 1 },
      });

      const comments = await db.documentComments
        .where('documentId')
        .equals('doc-1')
        .toArray();

      expect(comments).toHaveLength(2);
    });

    it('should create workflowEvents table with correct indexes', async () => {
      const event = {
        id: 'event-1',
        documentId: 'doc-1',
        action: 'created' as const,
        actor: 'Test User',
        timestamp: new Date().toISOString(),
      };

      await db.workflowEvents.add(event);

      const retrieved = await db.workflowEvents.get('event-1');
      expect(retrieved).toEqual(event);
    });

    it('should query workflowEvents by documentId', async () => {
      const now = new Date().toISOString();

      await db.workflowEvents.add({
        id: 'event-1',
        documentId: 'doc-1',
        action: 'created' as const,
        actor: 'User 1',
        timestamp: now,
      });

      await db.workflowEvents.add({
        id: 'event-2',
        documentId: 'doc-1',
        action: 'status_changed' as const,
        actor: 'User 2',
        timestamp: now,
        fromStatus: 'draft' as const,
        toStatus: 'in_review' as const,
      });

      const events = await db.workflowEvents
        .where('documentId')
        .equals('doc-1')
        .toArray();

      expect(events).toHaveLength(2);
    });
  });

  describe('Complex blob storage scenarios', () => {
    it('should handle multiple blob types', async () => {
      const textBlob = new Blob(['text'], { type: 'text/plain' });
      const jsonBlob = new Blob([JSON.stringify({ key: 'value' })], {
        type: 'application/json',
      });
      const binaryBlob = new Blob([new Uint8Array([1, 2, 3, 4])], {
        type: 'application/octet-stream',
      });

      const textId = await storeBlob(textBlob);
      const jsonId = await storeBlob(jsonBlob);
      const binaryId = await storeBlob(binaryBlob);

      const retrievedText = await getBlob(textId);
      const retrievedJson = await getBlob(jsonId);
      const retrievedBinary = await getBlob(binaryId);

      expect(retrievedText?.type).toBe('text/plain');
      expect(retrievedJson?.type).toBe('application/json');
      expect(retrievedBinary?.type).toBe('application/octet-stream');
    });

    it('should handle large blobs', async () => {
      // Create a 1MB blob
      const largeContent = 'a'.repeat(1024 * 1024);
      const largeBlob = new Blob([largeContent], { type: 'text/plain' });

      const blobId = await storeBlob(largeBlob);
      const retrievedBlob = await getBlob(blobId);

      expect(retrievedBlob?.size).toBe(1024 * 1024);

      const retrievedContent = await retrievedBlob!.text();
      expect(retrievedContent).toBe(largeContent);
    });

    it('should maintain blob integrity after store and retrieve', async () => {
      const originalData = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const originalBlob = new Blob([originalData], {
        type: 'application/octet-stream',
      });

      const blobId = await storeBlob(originalBlob);
      const retrievedBlob = await getBlob(blobId);

      const retrievedBuffer = await retrievedBlob!.arrayBuffer();
      const retrievedData = new Uint8Array(retrievedBuffer);

      expect(retrievedData).toEqual(originalData);
    });
  });
});
