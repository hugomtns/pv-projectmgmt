import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore } from '@/stores/documentStore';
import { useUserStore } from '@/stores/userStore';
import { useProjectStore } from '@/stores/projectStore';
import { seedRoles } from '@/data/seedUserData';
import { db } from '@/lib/db';
import type { DocumentComment, Drawing } from '@/lib/types';

// Mock the db and blob functions
vi.mock('@/lib/db', () => ({
  db: {
    documentVersions: {
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
          delete: vi.fn(),
        })),
      })),
      delete: vi.fn(),
    },
    documentComments: {
      add: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: vi.fn(),
          toArray: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    drawings: {
      add: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: vi.fn(),
        })),
      })),
    },
    workflowEvents: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: vi.fn(),
        })),
      })),
    },
    blobs: {
      add: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    },
  },
  storeBlob: vi.fn(() => Promise.resolve('blob-id')),
  getBlob: vi.fn(() => Promise.resolve(new Blob())),
  deleteBlob: vi.fn(),
}));

// Mock file conversion utilities
vi.mock('@/components/documents/utils/fileConversion', () => ({
  getFileType: vi.fn(() => 'pdf'),
  convertImageToPdf: vi.fn(() => Promise.resolve(new Blob())),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('documentStore', () => {
  const adminUser = {
    id: 'test-user-1',
    firstName: 'Test',
    lastName: 'Admin',
    email: 'admin@test.com',
    function: 'Administrator',
    roleId: 'role-admin',
    groupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const viewerUser = {
    id: 'test-user-2',
    firstName: 'Test',
    lastName: 'Viewer',
    email: 'viewer@test.com',
    function: 'Viewer',
    roleId: 'role-viewer',
    groupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset stores
    useDocumentStore.setState({ documents: [] });
    useProjectStore.setState({ projects: [], selectedProjectId: null });
    useUserStore.setState({
      currentUser: adminUser,
      roles: seedRoles,
      users: [adminUser, viewerUser],
      groups: [],
      permissionOverrides: [],
    });

    // Clear mock calls
    vi.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload a document with admin permissions', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      expect(documentId).toBeDefined();
      expect(documentId).not.toBeNull();

      const { documents } = useDocumentStore.getState();
      expect(documents).toHaveLength(1);
      expect(documents[0].name).toBe('Test Document');
      expect(documents[0].description).toBe('Test description');
      expect(documents[0].status).toBe('draft');
      expect(documents[0].createdBy).toBe('Test Admin');
    });

    it('should upload a document with project and task associations', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description', 'project-1', 'task-1');

      const { documents } = useDocumentStore.getState();
      expect(documents[0].projectId).toBe('project-1');
      expect(documents[0].taskId).toBe('task-1');
    });

    it('should reject upload when user is not logged in', async () => {
      useUserStore.setState({ currentUser: null });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      expect(documentId).toBeNull();
      expect(useDocumentStore.getState().documents).toHaveLength(0);
    });

    it('should reject upload when user lacks create permission', async () => {
      useUserStore.setState({ currentUser: viewerUser });

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      expect(documentId).toBeNull();
      expect(useDocumentStore.getState().documents).toHaveLength(0);
    });
  });

  describe('uploadVersion', () => {
    it('should upload a new version of an existing document', async () => {
      // First upload a document
      const file1 = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file1, 'Test Document', 'Test description');

      expect(documentId).not.toBeNull();

      // Upload a new version
      const file2 = new File(['test v2'], 'test-v2.pdf', { type: 'application/pdf' });
      const versionId = await useDocumentStore.getState().uploadVersion(documentId!, file2);

      expect(versionId).not.toBeNull();

      const { documents } = useDocumentStore.getState();
      expect(documents[0].versions).toHaveLength(2);
      expect(documents[0].currentVersionId).toBe(versionId);
    });

    it('should reject version upload when user lacks update permission', async () => {
      // Upload as admin
      const file1 = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file1, 'Test Document', 'Test description');

      // Try to upload version as viewer
      useUserStore.setState({ currentUser: viewerUser });
      const file2 = new File(['test v2'], 'test-v2.pdf', { type: 'application/pdf' });
      const versionId = await useDocumentStore.getState().uploadVersion(documentId!, file2);

      expect(versionId).toBeNull();
      expect(useDocumentStore.getState().documents[0].versions).toHaveLength(1);
    });
  });

  describe('updateDocument', () => {
    it('should update document metadata', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      useDocumentStore.getState().updateDocument(documentId!, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      const { documents } = useDocumentStore.getState();
      expect(documents[0].name).toBe('Updated Name');
      expect(documents[0].description).toBe('Updated description');
    });

    it('should reject update when user lacks update permission', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      useUserStore.setState({ currentUser: viewerUser });
      useDocumentStore.getState().updateDocument(documentId!, {
        name: 'Updated Name',
      });

      const { documents } = useDocumentStore.getState();
      expect(documents[0].name).toBe('Test Document'); // Should not change
    });
  });

  describe('updateDocumentStatus', () => {
    it('should update document status and log workflow event', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      const success = await useDocumentStore
        .getState()
        .updateDocumentStatus(documentId!, 'in_review', 'Ready for review');

      expect(success).toBe(true);

      const { documents } = useDocumentStore.getState();
      expect(documents[0].status).toBe('in_review');
      expect(db.workflowEvents.add).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId,
          action: 'status_changed',
          fromStatus: 'draft',
          toStatus: 'in_review',
          note: 'Ready for review',
        })
      );
    });

    it('should reject status change when user lacks update permission', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      useUserStore.setState({ currentUser: viewerUser });
      const success = await useDocumentStore
        .getState()
        .updateDocumentStatus(documentId!, 'in_review');

      expect(success).toBe(false);
      expect(useDocumentStore.getState().documents[0].status).toBe('draft');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and all associated data', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      const success = await useDocumentStore.getState().deleteDocument(documentId!);

      expect(success).toBe(true);
      expect(useDocumentStore.getState().documents).toHaveLength(0);
    });

    it('should cascade delete from project attachments', async () => {
      // Create a project
      const project = {
        name: 'Test Project',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1',
      };
      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      // Upload document associated with project
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description', projectId);

      // Add document to project attachments
      useProjectStore.getState().updateProject(projectId, {
        attachments: [documentId!],
      });

      // Delete document
      await useDocumentStore.getState().deleteDocument(documentId!);

      // Verify document removed from project attachments
      const updatedProject = useProjectStore.getState().projects[0];
      expect(updatedProject.attachments).toEqual([]);
    });

    it('should reject delete when user lacks delete permission', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      // Viewer user cannot delete
      useUserStore.setState({ currentUser: viewerUser });

      const success = await useDocumentStore.getState().deleteDocument(documentId!);

      expect(success).toBe(false);
      expect(useDocumentStore.getState().documents).toHaveLength(1);
    });
  });

  describe('getDocument', () => {
    it('should retrieve document by ID', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      const document = useDocumentStore.getState().getDocument(documentId!);

      expect(document).not.toBeNull();
      expect(document?.name).toBe('Test Document');
    });

    it('should return null for non-existent document', () => {
      const document = useDocumentStore.getState().getDocument('non-existent-id');
      expect(document).toBeNull();
    });
  });

  describe('addComment', () => {
    it('should add a document comment', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      const document = useDocumentStore.getState().getDocument(documentId!);
      const versionId = document!.currentVersionId;

      const commentId = await useDocumentStore
        .getState()
        .addComment(documentId!, versionId, 'This is a test comment');

      expect(commentId).not.toBeNull();
      expect(db.documentComments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId,
          versionId,
          text: 'This is a test comment',
          type: 'document',
          author: 'Test Admin',
        })
      );
    });

    it('should add a location comment with coordinates', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      const document = useDocumentStore.getState().getDocument(documentId!);
      const versionId = document!.currentVersionId;

      const commentId = await useDocumentStore
        .getState()
        .addComment(documentId!, versionId, 'Location comment', {
          x: 50,
          y: 75,
          page: 1,
        });

      expect(commentId).not.toBeNull();
      expect(db.documentComments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'location',
          location: { x: 50, y: 75, page: 1 },
        })
      );
    });

    it('should reject comment when user lacks update permission', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      const document = useDocumentStore.getState().getDocument(documentId!);
      const versionId = document!.currentVersionId;

      useUserStore.setState({ currentUser: viewerUser });
      const commentId = await useDocumentStore
        .getState()
        .addComment(documentId!, versionId, 'Test comment');

      expect(commentId).toBeNull();
    });
  });

  describe('resolveComment', () => {
    it('should resolve a comment', async () => {
      const mockComment: DocumentComment = {
        id: 'comment-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        type: 'document',
        text: 'Test comment',
        author: 'Test Admin',
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      vi.mocked(db.documentComments.get).mockResolvedValue(mockComment);

      const success = await useDocumentStore.getState().resolveComment('comment-1');

      expect(success).toBe(true);
      expect(db.documentComments.update).toHaveBeenCalledWith('comment-1', {
        resolved: true,
      });
    });

    it('should reject resolve when user lacks update permission', async () => {
      const mockComment: DocumentComment = {
        id: 'comment-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        type: 'document',
        text: 'Test comment',
        author: 'Test Admin',
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      vi.mocked(db.documentComments.get).mockResolvedValue(mockComment);

      useUserStore.setState({ currentUser: viewerUser });
      const success = await useDocumentStore.getState().resolveComment('comment-1');

      expect(success).toBe(false);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      const mockComment: DocumentComment = {
        id: 'comment-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        type: 'document',
        text: 'Test comment',
        author: 'Test Admin',
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      vi.mocked(db.documentComments.get).mockResolvedValue(mockComment);

      const success = await useDocumentStore.getState().deleteComment('comment-1');

      expect(success).toBe(true);
      expect(db.documentComments.delete).toHaveBeenCalledWith('comment-1');
    });

    it('should reject delete when user lacks delete permission', async () => {
      const mockComment: DocumentComment = {
        id: 'comment-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        type: 'document',
        text: 'Test comment',
        author: 'Test Admin',
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      vi.mocked(db.documentComments.get).mockResolvedValue(mockComment);

      // Viewer cannot delete
      useUserStore.setState({ currentUser: viewerUser });

      const success = await useDocumentStore.getState().deleteComment('comment-1');

      expect(success).toBe(false);
    });
  });

  describe('addDrawing', () => {
    it('should add a drawing', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      const document = useDocumentStore.getState().getDocument(documentId!);
      const versionId = document!.currentVersionId;

      const drawing = {
        documentId: documentId!,
        versionId,
        page: 1,
        type: 'rectangle' as const,
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 50, height: 30 },
      };

      const drawingId = await useDocumentStore.getState().addDrawing(drawing);

      expect(drawingId).not.toBeNull();
      expect(db.drawings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...drawing,
          createdBy: 'Test Admin',
        })
      );
    });

    it('should reject drawing when user lacks update permission', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Document', 'Test description');

      const document = useDocumentStore.getState().getDocument(documentId!);
      const versionId = document!.currentVersionId;

      useUserStore.setState({ currentUser: viewerUser });

      const drawing = {
        documentId: documentId!,
        versionId,
        page: 1,
        type: 'rectangle' as const,
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 50, height: 30 },
      };

      const drawingId = await useDocumentStore.getState().addDrawing(drawing);

      expect(drawingId).toBeNull();
    });
  });

  describe('deleteDrawing', () => {
    it('should allow user to delete their own drawing', async () => {
      const mockDrawing: Drawing = {
        id: 'drawing-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        page: 1,
        type: 'rectangle',
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 50, height: 30 },
        createdBy: 'Test Admin',
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.drawings.get).mockResolvedValue(mockDrawing);

      const success = await useDocumentStore.getState().deleteDrawing('drawing-1');

      expect(success).toBe(true);
      expect(db.drawings.delete).toHaveBeenCalledWith('drawing-1');
    });

    it('should prevent user from deleting others drawings without delete permission', async () => {
      const mockDrawing: Drawing = {
        id: 'drawing-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        page: 1,
        type: 'rectangle',
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 50, height: 30 },
        createdBy: 'Other User',
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.drawings.get).mockResolvedValue(mockDrawing);

      // Viewer without delete permission
      useUserStore.setState({ currentUser: viewerUser });

      const success = await useDocumentStore.getState().deleteDrawing('drawing-1');

      expect(success).toBe(false);
    });

    it('should allow admin to delete any drawing', async () => {
      const mockDrawing: Drawing = {
        id: 'drawing-1',
        documentId: 'doc-1',
        versionId: 'version-1',
        page: 1,
        type: 'rectangle',
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 50, height: 30 },
        createdBy: 'Other User',
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.drawings.get).mockResolvedValue(mockDrawing);

      const success = await useDocumentStore.getState().deleteDrawing('drawing-1');

      expect(success).toBe(true);
      expect(db.drawings.delete).toHaveBeenCalledWith('drawing-1');
    });
  });
});
