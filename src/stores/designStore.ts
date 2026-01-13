import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Design, DesignComment, ElementAnchor } from '@/lib/types';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { db, storeBlob, deleteBlob } from '@/lib/db';
import { toast } from 'sonner';

interface DesignState {
    // State
    designs: Design[];

    // Actions
    addDesign: (design: Omit<Design, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'creatorId' | 'versions' | 'currentVersionId'>) => string | undefined;
    updateDesign: (id: string, updates: Partial<Design>) => void;
    deleteDesign: (id: string) => Promise<void>;
    updateDesignStatus: (id: string, status: Design['status'], note?: string) => Promise<boolean>;

    // Versioning
    addVersion: (designId: string, file: File) => Promise<string | null>;

    // Comments
    addComment: (designId: string, versionId: string, text: string, elementAnchor?: ElementAnchor) => Promise<string | null>;
    resolveComment: (commentId: string) => Promise<boolean>;
    deleteComment: (commentId: string) => Promise<boolean>;
    getComments: (designId: string, versionId: string) => Promise<DesignComment[]>;
    getElementComments: (designId: string, versionId: string, elementType: string, elementId: string) => Promise<DesignComment[]>;
    getElementsWithComments: (designId: string, versionId: string) => Promise<Array<{ elementType: string; elementId: string; count: number; hasUnresolved: boolean }>>;

    // Helpers
    getDesignsByProject: (projectId: string) => Design[];
}

export const useDesignStore = create<DesignState>()(
    persist(
        (set, get) => ({
            designs: [],

            addDesign: (designData) => {
                const userState = useUserStore.getState();
                const currentUser = userState.currentUser;

                if (!currentUser) {
                    toast.error('You must be logged in to create designs');
                    return;
                }

                const permissions = resolvePermissions(
                    currentUser,
                    'designs',
                    undefined,
                    userState.permissionOverrides,
                    userState.roles
                );

                if (!permissions.create) {
                    toast.error('Permission denied: You do not have permission to create designs');
                    return;
                }

                const now = new Date().toISOString();
                const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

                const newDesign: Design = {
                    ...designData,
                    id: crypto.randomUUID(),
                    createdBy: userFullName,
                    creatorId: currentUser.id,
                    createdAt: now,
                    updatedAt: now,
                    versions: [],
                    currentVersionId: '',
                    status: 'draft' // Ensure default for new field
                };

                set((state) => ({
                    designs: [...state.designs, newDesign]
                }));

                toast.success('Design created successfully');
                return newDesign.id;
            },

            updateDesign: (id, updates) => {
                const userState = useUserStore.getState();
                const currentUser = userState.currentUser;

                if (!currentUser) {
                    toast.error('You must be logged in to update designs');
                    return;
                }

                const design = get().designs.find(d => d.id === id);
                if (!design) {
                    toast.error('Design not found');
                    return;
                }

                const permissions = resolvePermissions(
                    currentUser,
                    'designs',
                    id,
                    userState.permissionOverrides,
                    userState.roles
                );

                const isSystemAdmin = currentUser.roleId === 'role-admin';
                const isCreator = design.creatorId === currentUser.id;

                if (!permissions.update) {
                    toast.error('Permission denied: You do not have permission to update designs');
                    return;
                }

                if (!isSystemAdmin && !isCreator) {
                    toast.error('Permission denied: You can only edit designs you created');
                    return;
                }

                set((state) => ({
                    designs: state.designs.map((d) =>
                        d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
                    )
                }));

                toast.success('Design updated');
            },

            deleteDesign: async (id) => {
                const userState = useUserStore.getState();
                const currentUser = userState.currentUser;

                if (!currentUser) {
                    toast.error('You must be logged in to delete designs');
                    return;
                }

                const design = get().designs.find(d => d.id === id);
                if (!design) {
                    toast.error('Design not found');
                    return;
                }

                const permissions = resolvePermissions(
                    currentUser,
                    'designs',
                    id,
                    userState.permissionOverrides,
                    userState.roles
                );

                const isSystemAdmin = currentUser.roleId === 'role-admin';
                const isCreator = design.creatorId === currentUser.id;

                if (!permissions.delete) {
                    toast.error('Permission denied: You do not have permission to delete designs');
                    return;
                }

                if (!isSystemAdmin && !isCreator) {
                    toast.error('Permission denied: You can only delete designs you created');
                    return;
                }

                try {
                    // Cleanup DB resources
                    const versions = await db.designVersions.where('designId').equals(id).toArray();
                    for (const v of versions) {
                        await deleteBlob(v.fileBlob);
                    }
                    await db.designVersions.where('designId').equals(id).delete();
                    await db.designComments.where('designId').equals(id).delete();

                    set((state) => ({
                        designs: state.designs.filter((d) => d.id !== id)
                    }));

                    toast.success('Design deleted');
                } catch (error) {
                    console.error('Failed to delete design resources:', error);
                    toast.error('Failed to delete design data');
                }
            },

            updateDesignStatus: async (id, status, note) => {
                const userState = useUserStore.getState();
                const currentUser = userState.currentUser;

                if (!currentUser) {
                    toast.error('You must be logged in to change design status');
                    return false;
                }

                const design = get().designs.find((d) => d.id === id);
                if (!design) {
                    toast.error('Design not found');
                    return false;
                }

                // Permission check
                const permissions = resolvePermissions(
                    currentUser,
                    'designs',
                    id,
                    userState.permissionOverrides,
                    userState.roles
                );

                const isSystemAdmin = currentUser.roleId === 'role-admin';
                const isCreator = design.creatorId === currentUser.id;

                if (!permissions.update && !isCreator && !isSystemAdmin) {
                    toast.error('Permission denied: You cannot change this design status');
                    return false;
                }

                const now = new Date().toISOString();
                const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

                try {
                    // Log workflow event
                    await db.designWorkflowEvents.add({
                        id: crypto.randomUUID(),
                        designId: id,
                        action: 'status_changed',
                        actor: userFullName,
                        timestamp: now,
                        fromStatus: design.status,
                        toStatus: status,
                        note,
                    });

                    // Update design
                    set((state) => ({
                        designs: state.designs.map((d) =>
                            d.id === id ? { ...d, status, updatedAt: now } : d
                        ),
                    }));

                    toast.success(`Design ${status.replace('_', ' ')}`);
                    return true;
                } catch (error) {
                    console.error('Failed to update design status:', error);
                    toast.error('Failed to update design status');
                    return false;
                }
            },

            addVersion: async (designId, file) => {
                const userState = useUserStore.getState();
                const currentUser = userState.currentUser;

                if (!currentUser) {
                    toast.error('You must be logged in to upload versions');
                    return null;
                }

                const design = get().designs.find(d => d.id === designId);
                if (!design) {
                    toast.error('Design not found');
                    return null;
                }

                // Reuse update permission logic
                const permissions = resolvePermissions(
                    currentUser,
                    'designs',
                    designId,
                    userState.permissionOverrides,
                    userState.roles
                );

                if (!permissions.update && design.creatorId !== currentUser.id && currentUser.roleId !== 'role-admin') {
                    toast.error('Permission denied: You cannot add versions to this design');
                    return null;
                }

                try {
                    const blobId = await storeBlob(file);
                    const versionId = crypto.randomUUID();
                    const now = new Date().toISOString();
                    const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;
                    const versionNumber = design.versions.length + 1;

                    await db.designVersions.add({
                        id: versionId,
                        designId,
                        versionNumber,
                        uploadedBy: userFullName,
                        uploadedAt: now,
                        fileBlob: blobId,
                        fileSize: file.size,
                        fileType: 'dxf'
                    });

                    set((state) => ({
                        designs: state.designs.map((d) =>
                            d.id === designId
                                ? {
                                    ...d,
                                    versions: [...d.versions, versionId],
                                    currentVersionId: versionId,
                                    updatedAt: now
                                }
                                : d
                        )
                    }));

                    toast.success(`Version ${versionNumber} uploaded`);
                    return versionId;
                } catch (error) {
                    console.error('Failed to upload version:', error);
                    toast.error('Failed to upload version');
                    return null;
                }
            },

            addComment: async (designId, versionId, text, elementAnchor) => {
                const userState = useUserStore.getState();
                const currentUser = userState.currentUser;
                if (!currentUser) {
                    toast.error('Login required');
                    return null;
                }

                // Anyone can comment if they can read? Or restricts to team?
                // For now assume if you can see it, you can comment.

                try {
                    const commentId = crypto.randomUUID();
                    const now = new Date().toISOString();
                    const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

                    const comment: DesignComment = {
                        id: commentId,
                        designId,
                        versionId,
                        text,
                        author: userFullName,
                        createdAt: now,
                        resolved: false,
                        type: elementAnchor ? 'element' : 'design',
                        ...(elementAnchor && { elementAnchor }),
                    };

                    await db.designComments.add(comment);

                    return commentId;
                } catch (e) {
                    console.error(e);
                    toast.error('Failed to add comment');
                    return null;
                }
            },

            resolveComment: async (commentId) => {
                // Toggle resolution
                try {
                    const comment = await db.designComments.get(commentId);
                    if (!comment) return false;

                    await db.designComments.update(commentId, { resolved: !comment.resolved });
                    return true;
                } catch (e) {
                    toast.error('Failed to update comment');
                    return false;
                }
            },

            deleteComment: async (commentId) => {
                // Only author or admin? For now allow any delete (simplified) or check author
                try {
                    await db.designComments.delete(commentId);
                    return true;
                } catch (e) {
                    toast.error('Failed to delete comment');
                    return false;
                }
            },

            getComments: async (designId, versionId) => {
                return await db.designComments
                    .where('designId').equals(designId)
                    .filter(c => c.versionId === versionId)
                    .toArray();
            },

            getElementComments: async (designId, versionId, elementType, elementId) => {
                const comments = await db.designComments
                    .where('designId').equals(designId)
                    .filter(c =>
                        c.versionId === versionId &&
                        c.type === 'element' &&
                        c.elementAnchor?.elementType === elementType &&
                        c.elementAnchor?.elementId === elementId
                    )
                    .toArray();
                return comments;
            },

            getElementsWithComments: async (designId, versionId) => {
                const comments = await db.designComments
                    .where('designId').equals(designId)
                    .filter(c => c.versionId === versionId && c.type === 'element' && !!c.elementAnchor)
                    .toArray();

                // Group by element
                const elementMap = new Map<string, { elementType: string; elementId: string; count: number; hasUnresolved: boolean }>();

                for (const comment of comments) {
                    if (!comment.elementAnchor) continue;
                    const key = `${comment.elementAnchor.elementType}:${comment.elementAnchor.elementId}`;

                    if (!elementMap.has(key)) {
                        elementMap.set(key, {
                            elementType: comment.elementAnchor.elementType,
                            elementId: comment.elementAnchor.elementId,
                            count: 0,
                            hasUnresolved: false,
                        });
                    }

                    const entry = elementMap.get(key)!;
                    entry.count++;
                    if (!comment.resolved) {
                        entry.hasUnresolved = true;
                    }
                }

                return Array.from(elementMap.values());
            },

            getDesignsByProject: (projectId) => {
                return get().designs.filter(d => d.projectId === projectId);
            }
        }),
        { name: 'design-storage' }
    )
);
