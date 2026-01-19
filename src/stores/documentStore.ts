import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Document, DocumentStatus, DocumentComment, Drawing } from '@/lib/types';
import type { LocationAnchor } from '@/lib/types/document';
import { db, storeBlob, deleteBlob } from '@/lib/db';
import { useUserStore } from './userStore';
import { useProjectStore } from './projectStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { getFileType, convertImageToPdf } from '@/components/documents/utils/fileConversion';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';
import { extractMentions } from '@/lib/mentions/parser';
import { notifyMention } from '@/lib/notifications/notificationService';

// Helper to get user's full name
function getUserFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

interface DocumentState {
  // State - Document metadata only (blobs in IndexedDB)
  documents: Document[];

  // Document CRUD
  uploadDocument: (
    file: File,
    name: string,
    description: string,
    projectId?: string,
    taskId?: string
  ) => Promise<string | null>; // Returns document ID

  uploadVersion: (documentId: string, file: File) => Promise<string | null>; // Returns version ID

  updateDocument: (id: string, updates: Partial<Pick<Document, 'name' | 'description'>>) => void;

  updateDocumentStatus: (
    id: string,
    status: DocumentStatus,
    note?: string
  ) => Promise<boolean>;

  deleteDocument: (id: string) => Promise<boolean>;

  getDocument: (id: string) => Document | null;

  // Comments
  addComment: (
    documentId: string,
    versionId: string,
    text: string,
    location?: LocationAnchor,
    mentions?: string[]
  ) => Promise<string | null>; // Returns comment ID

  resolveComment: (commentId: string) => Promise<boolean>;

  deleteComment: (commentId: string) => Promise<boolean>;

  // Drawings
  addDrawing: (drawing: Omit<Drawing, 'id' | 'createdAt' | 'createdBy'>) => Promise<string | null>;

  deleteDrawing: (drawingId: string) => Promise<boolean>;

  // Lock management
  lockDocument: (documentId: string) => Promise<boolean>;
  unlockDocument: (documentId: string) => Promise<boolean>;
  canUserUnlockDocument: (documentId: string, userId: string) => boolean;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],

      // Upload new document
      uploadDocument: async (file, name, description, projectId, taskId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to upload documents');
          return null;
        }

        // Permission check
        const permissions = getDocumentPermissions(
          currentUser,
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('You do not have permission to upload documents');
          return null;
        }

        try {
          // Store file blob
          const originalBlobId = await storeBlob(file);

          // Check if image needs conversion to PDF
          const fileType = getFileType(file);
          let pdfBlobId: string | undefined;

          if (fileType === 'image') {
            try {
              const pdfBlob = await convertImageToPdf(file);
              pdfBlobId = await storeBlob(pdfBlob);
            } catch (err) {
              console.error('Failed to convert image to PDF:', err);
              toast.error('Failed to convert image. Please try again.');
              return null;
            }
          }

          // Create document and version
          const documentId = crypto.randomUUID();
          const versionId = crypto.randomUUID();
          const now = new Date().toISOString();

          const userFullName = getUserFullName(currentUser);

          // Store version in IndexedDB
          await db.documentVersions.add({
            id: versionId,
            documentId,
            versionNumber: 1,
            uploadedBy: userFullName,
            uploadedAt: now,
            fileSize: file.size,
            pageCount: 1, // TODO: Calculate from PDF
            originalFileBlob: originalBlobId,
            pdfFileBlob: pdfBlobId,
          });

          // Create document metadata
          const document: Document = {
            id: documentId,
            name,
            description,
            status: 'draft',
            projectId,
            taskId,
            versions: [versionId],
            currentVersionId: versionId,
            createdBy: userFullName,
            createdAt: now,
            updatedAt: now,
            fileSize: file.size,
            uploadedBy: userFullName,
            isLocked: false,
            lockedBy: undefined,
            lockedAt: undefined,
            lockedByUserId: undefined,
          };

          // Store workflow event
          await db.workflowEvents.add({
            id: crypto.randomUUID(),
            documentId,
            action: 'created',
            actor: userFullName,
            timestamp: now,
          });

          set((state) => ({
            documents: [...state.documents, document],
          }));

          logAdminAction('create', 'documents', documentId, name, {
            projectId,
            taskId,
            fileSize: file.size,
          });

          toast.success('Document uploaded successfully');
          return documentId;
        } catch (error) {
          console.error('Failed to upload document:', error);
          toast.error('Failed to upload document');
          return null;
        }
      },

      // Upload new version
      uploadVersion: async (documentId, file) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return null;
        }

        // Permission check
        const permissions = getDocumentPermissions(
          currentUser,
          documentId,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('You do not have permission to upload versions');
          return null;
        }

        const document = get().documents.find((d) => d.id === documentId);
        if (!document) {
          toast.error('Document not found');
          return null;
        }

        // Lock check - admins can bypass
        const isAdmin = currentUser.roleId === 'role-admin';
        if (document.isLocked && !isAdmin) {
          const lockedBy = document.lockedBy || 'another user';
          const lockedAt = document.lockedAt
            ? new Date(document.lockedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })
            : '';
          toast.error(
            `This document is locked by ${lockedBy}${lockedAt ? ` on ${lockedAt}` : ''}. Only admins can upload versions to locked documents.`
          );
          return null;
        }

        try {
          // Store file blob
          const originalBlobId = await storeBlob(file);

          // Check if image needs conversion to PDF
          const fileType = getFileType(file);
          let pdfBlobId: string | undefined;

          if (fileType === 'image') {
            try {
              const pdfBlob = await convertImageToPdf(file);
              pdfBlobId = await storeBlob(pdfBlob);
            } catch (err) {
              console.error('Failed to convert image to PDF:', err);
              toast.error('Failed to convert image. Please try again.');
              return null;
            }
          }

          // Create version
          const versionId = crypto.randomUUID();
          const versionNumber = document.versions.length + 1;
          const now = new Date().toISOString();
          const userFullName = getUserFullName(currentUser);

          await db.documentVersions.add({
            id: versionId,
            documentId,
            versionNumber,
            uploadedBy: userFullName,
            uploadedAt: now,
            fileSize: file.size,
            pageCount: 1, // TODO: Calculate from PDF
            originalFileBlob: originalBlobId,
            pdfFileBlob: pdfBlobId,
          });

          // Update document
          set((state) => ({
            documents: state.documents.map((d) =>
              d.id === documentId
                ? {
                    ...d,
                    versions: [...d.versions, versionId],
                    currentVersionId: versionId,
                    updatedAt: now,
                    fileSize: file.size,
                    uploadedBy: userFullName,
                  }
                : d
            ),
          }));

          // Log workflow event
          await db.workflowEvents.add({
            id: crypto.randomUUID(),
            documentId,
            action: 'version_uploaded',
            actor: userFullName,
            timestamp: now,
          });

          logAdminAction('update', 'documents', documentId, document.name, {
            versionNumber,
            fileSize: file.size,
          });

          toast.success(`Version ${versionNumber} uploaded`);
          return versionId;
        } catch (error) {
          console.error('Failed to upload version:', error);
          toast.error('Failed to upload version');
          return null;
        }
      },

      // Update document metadata
      updateDocument: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const permissions = getDocumentPermissions(
          currentUser,
          id,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('You do not have permission to update this document');
          return;
        }

        const document = get().documents.find((d) => d.id === id);

        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id
              ? {
                  ...d,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        }));

        if (document) {
          logAdminAction('update', 'documents', id, document.name, {
            updatedFields: Object.keys(updates),
          });
        }

        toast.success('Document updated');
      },

      // Update document status
      updateDocumentStatus: async (id, status, note) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return false;
        }

        const permissions = getDocumentPermissions(
          currentUser,
          id,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('You do not have permission to change document status');
          return false;
        }

        const document = get().documents.find((d) => d.id === id);
        if (!document) {
          toast.error('Document not found');
          return false;
        }

        const now = new Date().toISOString();
        const userFullName = getUserFullName(currentUser);

        // Log workflow event
        await db.workflowEvents.add({
          id: crypto.randomUUID(),
          documentId: id,
          action: 'status_changed',
          actor: userFullName,
          timestamp: now,
          fromStatus: document.status,
          toStatus: status,
          note,
        });

        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status,
                  updatedAt: now,
                }
              : d
          ),
        }));

        logAdminAction('update', 'documents', id, document.name, {
          statusChange: { from: document.status, to: status },
        });

        toast.success(`Document ${status.replace('_', ' ')}`);
        return true;
      },

      // Delete document
      deleteDocument: async (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return false;
        }

        const permissions = getDocumentPermissions(
          currentUser,
          id,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.delete) {
          toast.error('You do not have permission to delete this document');
          return false;
        }

        const document = get().documents.find((d) => d.id === id);
        if (!document) {
          toast.error('Document not found');
          return false;
        }

        try {
          // Delete all versions and blobs
          const versions = await db.documentVersions
            .where('documentId')
            .equals(id)
            .toArray();

          for (const version of versions) {
            await deleteBlob(version.originalFileBlob);
            if (version.pdfFileBlob) {
              await deleteBlob(version.pdfFileBlob);
            }
            await db.documentVersions.delete(version.id);
          }

          // Delete comments and drawings
          await db.documentComments.where('documentId').equals(id).delete();
          await db.drawings.where('documentId').equals(id).delete();
          await db.workflowEvents.where('documentId').equals(id).delete();

          // Remove from store
          set((state) => ({
            documents: state.documents.filter((d) => d.id !== id),
          }));

          logAdminAction('delete', 'documents', id, document.name);

          // Cascade delete: Remove from project/task attachments
          const projectStore = useProjectStore.getState();
          if (document.projectId) {
            // Remove from project attachments
            const project = projectStore.projects.find(p => p.id === document.projectId);
            if (project && project.attachments) {
              projectStore.updateProject(document.projectId, {
                attachments: project.attachments.filter(docId => docId !== id)
              });
            }
          }
          if (document.taskId && document.projectId) {
            // Remove from task attachments
            const project = projectStore.projects.find(p => p.id === document.projectId);
            if (project) {
              // Find the task in project stages
              for (const [stageId, stageData] of Object.entries(project.stages)) {
                const task = stageData.tasks.find(t => t.id === document.taskId);
                if (task && task.attachments) {
                  projectStore.updateTask(document.projectId, stageId, document.taskId, {
                    attachments: task.attachments.filter(docId => docId !== id)
                  });
                  break;
                }
              }
            }
          }

          toast.success('Document deleted');
          return true;
        } catch (error) {
          console.error('Failed to delete document:', error);
          toast.error('Failed to delete document');
          return false;
        }
      },

      // Get document by ID
      getDocument: (id) => {
        return get().documents.find((d) => d.id === id) || null;
      },

      // Add comment
      addComment: async (documentId, versionId, text, location, mentions) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;
        const users = userState.users;

        if (!currentUser) {
          toast.error('You must be logged in');
          return null;
        }

        const permissions = getDocumentPermissions(
          currentUser,
          documentId,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('You do not have permission to comment');
          return null;
        }

        try {
          const commentId = crypto.randomUUID();
          const userFullName = getUserFullName(currentUser);

          // Extract mentions from text if not provided
          const mentionedUserIds = mentions ?? extractMentions(text, users);

          const comment: DocumentComment = {
            id: commentId,
            documentId,
            versionId,
            type: location ? 'location' : 'document',
            text,
            author: userFullName,
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
            location,
            resolved: false,
            mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
          };

          await db.documentComments.add(comment);

          // Trigger mention notifications
          if (mentionedUserIds.length > 0) {
            const doc = get().documents.find((d) => d.id === documentId);
            notifyMention({
              actorId: currentUser.id,
              actorName: userFullName,
              mentionedUserIds,
              commentText: text,
              commentId,
              context: {
                type: 'document',
                documentId,
                documentName: doc?.name || 'Document',
              },
            });
          }

          toast.success('Comment added');
          return commentId;
        } catch (error) {
          console.error('Failed to add comment:', error);
          toast.error('Failed to add comment');
          return null;
        }
      },

      // Resolve comment
      resolveComment: async (commentId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return false;
        }

        try {
          const comment = await db.documentComments.get(commentId);
          if (!comment) {
            toast.error('Comment not found');
            return false;
          }

          const permissions = getDocumentPermissions(
            currentUser,
            comment.documentId,
            userState.permissionOverrides,
            userState.roles
          );

          if (!permissions.update) {
            toast.error('You do not have permission to resolve comments');
            return false;
          }

          await db.documentComments.update(commentId, { resolved: true });
          return true;
        } catch (error) {
          console.error('Failed to resolve comment:', error);
          toast.error('Failed to resolve comment');
          return false;
        }
      },

      // Delete comment
      deleteComment: async (commentId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return false;
        }

        try {
          const comment = await db.documentComments.get(commentId);
          if (!comment) {
            toast.error('Comment not found');
            return false;
          }

          const permissions = getDocumentPermissions(
            currentUser,
            comment.documentId,
            userState.permissionOverrides,
            userState.roles
          );

          if (!permissions.delete) {
            toast.error('You do not have permission to delete comments');
            return false;
          }

          await db.documentComments.delete(commentId);
          toast.success('Comment deleted');
          return true;
        } catch (error) {
          console.error('Failed to delete comment:', error);
          toast.error('Failed to delete comment');
          return false;
        }
      },

      // Add drawing
      addDrawing: async (drawing) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return null;
        }

        const permissions = getDocumentPermissions(
          currentUser,
          drawing.documentId,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('You do not have permission to draw on this document');
          return null;
        }

        try {
          const drawingId = crypto.randomUUID();
          const userFullName = getUserFullName(currentUser);
          const fullDrawing: Drawing = {
            ...drawing,
            id: drawingId,
            createdBy: userFullName,
            createdAt: new Date().toISOString(),
          };

          await db.drawings.add(fullDrawing);
          return drawingId;
        } catch (error) {
          console.error('Failed to add drawing:', error);
          toast.error('Failed to add drawing');
          return null;
        }
      },

      // Delete drawing
      deleteDrawing: async (drawingId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return false;
        }

        try {
          const drawing = await db.drawings.get(drawingId);
          if (!drawing) {
            toast.error('Drawing not found');
            return false;
          }

          const permissions = getDocumentPermissions(
            currentUser,
            drawing.documentId,
            userState.permissionOverrides,
            userState.roles
          );

          const userFullName = getUserFullName(currentUser);
          if (!permissions.delete && drawing.createdBy !== userFullName) {
            toast.error('You can only delete your own drawings');
            return false;
          }

          await db.drawings.delete(drawingId);
          return true;
        } catch (error) {
          console.error('Failed to delete drawing:', error);
          toast.error('Failed to delete drawing');
          return false;
        }
      },

      // Lock document
      lockDocument: async (documentId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to lock documents');
          return false;
        }

        const permissions = getDocumentPermissions(
          currentUser,
          documentId,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('You do not have permission to lock this document');
          return false;
        }

        const document = get().documents.find((d) => d.id === documentId);
        if (!document) {
          toast.error('Document not found');
          return false;
        }

        if (document.isLocked) {
          toast.error('Document is already locked');
          return false;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  isLocked: true,
                  lockedBy: userFullName,
                  lockedAt: now,
                  lockedByUserId: currentUser.id,
                  updatedAt: now,
                }
              : d
          ),
        }));

        toast.success('Document locked successfully');
        return true;
      },

      // Unlock document
      unlockDocument: async (documentId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to unlock documents');
          return false;
        }

        const document = get().documents.find((d) => d.id === documentId);
        if (!document) {
          toast.error('Document not found');
          return false;
        }

        if (!document.isLocked) {
          toast.error('Document is not locked');
          return false;
        }

        const isAdmin = currentUser.roleId === 'role-admin';
        const isLocker = document.lockedByUserId === currentUser.id;

        if (!isAdmin && !isLocker) {
          toast.error('Only the user who locked this document or an admin can unlock it');
          return false;
        }

        const now = new Date().toISOString();

        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  isLocked: false,
                  lockedBy: undefined,
                  lockedAt: undefined,
                  lockedByUserId: undefined,
                  updatedAt: now,
                }
              : d
          ),
        }));

        toast.success('Document unlocked successfully');
        return true;
      },

      // Helper to check unlock permission
      canUserUnlockDocument: (documentId, userId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser || currentUser.id !== userId) return false;

        const document = get().documents.find((d) => d.id === documentId);
        if (!document || !document.isLocked) return false;

        const isAdmin = currentUser.roleId === 'role-admin';
        const isLocker = document.lockedByUserId === currentUser.id;

        return isAdmin || isLocker;
      },
    }),
    {
      name: 'document-storage-v1',
      // Only persist metadata, not IndexedDB data
      partialize: (state) => ({
        documents: state.documents,
      }),
    }
  )
);
