import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore } from '@/stores/documentStore';
import { useUserStore } from '@/stores/userStore';
import { useProjectStore } from '@/stores/projectStore';
import { seedRoles } from '@/data/seedUserData';
import { db } from '@/lib/db';
import type { DocumentStatus } from '@/lib/types';

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
          toArray: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    workflowEvents: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: vi.fn(),
          toArray: vi.fn(() => Promise.resolve([])),
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

describe('Document Management E2E Flow', () => {
  const adminUser = {
    id: 'admin-1',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    function: 'Administrator',
    roleId: 'role-admin',
    groupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const regularUser = {
    id: 'user-1',
    firstName: 'Regular',
    lastName: 'User',
    email: 'user@test.com',
    function: 'Engineer',
    roleId: 'role-user',
    groupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset all stores
    useDocumentStore.setState({ documents: [] });
    useProjectStore.setState({ projects: [], selectedProjectId: null });
    useUserStore.setState({
      currentUser: adminUser,
      roles: seedRoles,
      users: [adminUser, regularUser],
      groups: [],
      permissionOverrides: [],
    });

    // Clear mock calls
    vi.clearAllMocks();
  });

  describe('Complete Document Lifecycle', () => {
    it('should complete full lifecycle: upload → annotate → version → approve', async () => {
      // Step 1: Upload document
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Project Spec', 'Initial project specification');

      expect(documentId).not.toBeNull();

      let document = useDocumentStore.getState().getDocument(documentId!);
      expect(document?.status).toBe('draft');
      expect(document?.versions).toHaveLength(1);

      // Verify workflow event was logged
      expect(db.workflowEvents.add).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId,
          action: 'created',
        })
      );

      // Step 2: Add comments
      const versionId = document!.currentVersionId;

      // Add document-level comment
      const comment1Id = await useDocumentStore
        .getState()
        .addComment(documentId!, versionId, 'Looks good overall');

      expect(comment1Id).not.toBeNull();
      expect(db.documentComments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'document',
          text: 'Looks good overall',
        })
      );

      // Add location comment
      const comment2Id = await useDocumentStore
        .getState()
        .addComment(documentId!, versionId, 'Check this section', {
          x: 50,
          y: 75,
          page: 1,
        });

      expect(comment2Id).not.toBeNull();
      expect(db.documentComments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'location',
          text: 'Check this section',
          location: { x: 50, y: 75, page: 1 },
        })
      );

      // Step 3: Add drawings
      const drawingId = await useDocumentStore.getState().addDrawing({
        documentId: documentId!,
        versionId,
        page: 1,
        type: 'rectangle',
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 50, height: 30 },
      });

      expect(drawingId).not.toBeNull();
      expect(db.drawings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rectangle',
          page: 1,
        })
      );

      // Step 4: Submit for review
      let success = await useDocumentStore
        .getState()
        .updateDocumentStatus(documentId!, 'in_review', 'Ready for review');

      expect(success).toBe(true);
      document = useDocumentStore.getState().getDocument(documentId!);
      expect(document?.status).toBe('in_review');

      // Verify workflow event
      expect(db.workflowEvents.add).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'status_changed',
          fromStatus: 'draft',
          toStatus: 'in_review',
          note: 'Ready for review',
        })
      );

      // Step 5: Request changes
      success = await useDocumentStore
        .getState()
        .updateDocumentStatus(
          documentId!,
          'changes_requested',
          'Please update section 3'
        );

      expect(success).toBe(true);
      document = useDocumentStore.getState().getDocument(documentId!);
      expect(document?.status).toBe('changes_requested');

      // Step 6: Upload new version
      const file2 = new File(['updated content'], 'test-v2.pdf', {
        type: 'application/pdf',
      });

      const version2Id = await useDocumentStore
        .getState()
        .uploadVersion(documentId!, file2);

      expect(version2Id).not.toBeNull();
      document = useDocumentStore.getState().getDocument(documentId!);
      expect(document?.versions).toHaveLength(2);
      expect(document?.currentVersionId).toBe(version2Id);

      // Step 7: Resubmit for review
      success = await useDocumentStore
        .getState()
        .updateDocumentStatus(documentId!, 'in_review', 'Changes made');

      expect(success).toBe(true);

      // Step 8: Approve document
      success = await useDocumentStore
        .getState()
        .updateDocumentStatus(documentId!, 'approved', 'Approved by admin');

      expect(success).toBe(true);
      document = useDocumentStore.getState().getDocument(documentId!);
      expect(document?.status).toBe('approved');

      // Verify final state
      expect(document?.versions).toHaveLength(2);
      expect(document?.status).toBe('approved');
      expect(document?.name).toBe('Project Spec');
    });

    it('should handle project/task attachment workflow', async () => {
      // Create a project
      const project = {
        name: 'Solar Farm A',
        location: 'CA',
        priority: 2,
        owner: 'Admin User',
        currentStageId: 'stage-1',
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      // Add a task
      const task = {
        title: 'Review specs',
        description: 'Review project specifications',
        assignee: 'Regular User',
        dueDate: null,
        status: 'not_started' as const,
        comments: [],
      };

      useProjectStore.getState().addTask(projectId, 'stage-1', task);
      const taskId = useProjectStore.getState().projects[0].stages['stage-1']
        .tasks[0].id;

      // Upload document attached to task
      const file = new File(['spec content'], 'spec.pdf', {
        type: 'application/pdf',
      });

      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(
          file,
          'Task Specification',
          'Detailed specification for task',
          projectId,
          taskId
        );

      expect(documentId).not.toBeNull();

      const document = useDocumentStore.getState().getDocument(documentId!);
      expect(document?.projectId).toBe(projectId);
      expect(document?.taskId).toBe(taskId);

      // Add document to task attachments
      useProjectStore.getState().updateTask(projectId, 'stage-1', taskId, {
        attachments: [documentId!],
      });

      const updatedTask = useProjectStore.getState().projects[0].stages[
        'stage-1'
      ].tasks[0];
      expect(updatedTask.attachments).toContain(documentId);

      // Delete document - should cascade delete from task
      await useDocumentStore.getState().deleteDocument(documentId!);

      // Verify document is removed
      expect(useDocumentStore.getState().getDocument(documentId!)).toBeNull();

      // Verify cascade delete removed from task attachments
      const taskAfterDelete = useProjectStore.getState().projects[0].stages[
        'stage-1'
      ].tasks[0];
      expect(taskAfterDelete.attachments).toEqual([]);
    });
  });

  describe('Permission-Based Workflows', () => {
    it('should enforce permissions throughout lifecycle', async () => {
      // Admin uploads document
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Doc', 'Test');

      expect(documentId).not.toBeNull();

      // Switch to regular user
      useUserStore.setState({ currentUser: regularUser });

      // Regular user can add comments and drawings
      const document = useDocumentStore.getState().getDocument(documentId!);
      const commentId = await useDocumentStore
        .getState()
        .addComment(
          documentId!,
          document!.currentVersionId,
          'Regular user comment'
        );

      expect(commentId).not.toBeNull();

      const drawingId = await useDocumentStore.getState().addDrawing({
        documentId: documentId!,
        versionId: document!.currentVersionId,
        page: 1,
        type: 'circle',
        color: '#00FF00',
        strokeWidth: 2,
        bounds: { x: 20, y: 20, width: 30, height: 30 },
      });

      expect(drawingId).not.toBeNull();

      // Regular user CAN delete because they have fullAccess to documents
      const deleteSuccess = await useDocumentStore
        .getState()
        .deleteDocument(documentId!);

      expect(deleteSuccess).toBe(true);
      expect(useDocumentStore.getState().getDocument(documentId!)).toBeNull();
    });

    it('should prevent viewer from uploading or modifying', async () => {
      const viewerUser = {
        ...regularUser,
        roleId: 'role-viewer',
      };

      useUserStore.setState({ currentUser: viewerUser });

      // Viewer cannot upload
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Doc', 'Test');

      expect(documentId).toBeNull();

      // Create a document as admin first
      useUserStore.setState({ currentUser: adminUser });

      const adminDocId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Admin Doc', 'Test');

      // Switch back to viewer
      useUserStore.setState({ currentUser: viewerUser });

      // Viewer cannot add comments
      const document = useDocumentStore.getState().getDocument(adminDocId!);
      const commentId = await useDocumentStore
        .getState()
        .addComment(adminDocId!, document!.currentVersionId, 'Test comment');

      expect(commentId).toBeNull();

      // Viewer cannot add drawings
      const drawingId = await useDocumentStore.getState().addDrawing({
        documentId: adminDocId!,
        versionId: document!.currentVersionId,
        page: 1,
        type: 'rectangle',
        color: '#FF0000',
        strokeWidth: 4,
        bounds: { x: 10, y: 10, width: 20, height: 20 },
      });

      expect(drawingId).toBeNull();
    });
  });

  describe('Version Management', () => {
    it('should track comments across versions', async () => {
      // Upload initial version
      const file1 = new File(['v1'], 'doc.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file1, 'Versioned Doc', 'Test');

      const doc = useDocumentStore.getState().getDocument(documentId!);
      const v1Id = doc!.currentVersionId;

      // Add comment to v1
      await useDocumentStore
        .getState()
        .addComment(documentId!, v1Id, 'V1 comment');

      // Upload v2
      const file2 = new File(['v2'], 'doc-v2.pdf', {
        type: 'application/pdf',
      });
      const v2Id = await useDocumentStore
        .getState()
        .uploadVersion(documentId!, file2);

      // Add comment to v2
      await useDocumentStore
        .getState()
        .addComment(documentId!, v2Id!, 'V2 comment');

      // Verify both comments were added to different versions
      expect(db.documentComments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          versionId: v1Id,
          text: 'V1 comment',
        })
      );

      expect(db.documentComments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          versionId: v2Id,
          text: 'V2 comment',
        })
      );
    });

    it('should maintain version history', async () => {
      const file1 = new File(['v1'], 'doc.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file1, 'Versioned Doc', 'Test');

      let doc = useDocumentStore.getState().getDocument(documentId!);
      expect(doc?.versions).toHaveLength(1);

      // Upload 3 more versions
      for (let i = 2; i <= 4; i++) {
        const file = new File([`v${i}`], `doc-v${i}.pdf`, {
          type: 'application/pdf',
        });
        await useDocumentStore.getState().uploadVersion(documentId!, file);
      }

      doc = useDocumentStore.getState().getDocument(documentId!);
      expect(doc?.versions).toHaveLength(4);
    });
  });

  describe('Workflow Status Transitions', () => {
    const testStatusTransition = async (
      from: DocumentStatus,
      to: DocumentStatus
    ) => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const documentId = await useDocumentStore
        .getState()
        .uploadDocument(file, 'Test Doc', 'Test');

      // Set initial status
      if (from !== 'draft') {
        await useDocumentStore.getState().updateDocumentStatus(documentId!, from);
      }

      // Transition to target status
      const success = await useDocumentStore
        .getState()
        .updateDocumentStatus(documentId!, to);

      const document = useDocumentStore.getState().getDocument(documentId!);
      return { success, status: document?.status };
    };

    it('should allow draft → in_review transition', async () => {
      const { success, status } = await testStatusTransition('draft', 'in_review');
      expect(success).toBe(true);
      expect(status).toBe('in_review');
    });

    it('should allow in_review → approved transition', async () => {
      const { success, status } = await testStatusTransition(
        'in_review',
        'approved'
      );
      expect(success).toBe(true);
      expect(status).toBe('approved');
    });

    it('should allow in_review → changes_requested transition', async () => {
      const { success, status } = await testStatusTransition(
        'in_review',
        'changes_requested'
      );
      expect(success).toBe(true);
      expect(status).toBe('changes_requested');
    });

    it('should allow changes_requested → in_review transition', async () => {
      const { success, status } = await testStatusTransition(
        'changes_requested',
        'in_review'
      );
      expect(success).toBe(true);
      expect(status).toBe('in_review');
    });
  });
});
