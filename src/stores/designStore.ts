import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Design } from '@/lib/types';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { toast } from 'sonner';

interface DesignState {
    // State
    designs: Design[];

    // Actions
    addDesign: (design: Omit<Design, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'creatorId'>) => void;
    updateDesign: (id: string, updates: Partial<Design>) => void;
    deleteDesign: (id: string) => void;

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
                    undefined, // No specific ID for creation
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
                };

                set((state) => ({
                    designs: [...state.designs, newDesign]
                }));

                toast.success('Design created successfully');
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

                // Permission Logic:
                // 1. Check generic "update" permission for 'designs'
                // 2. BUT enforce strict ownership: Must be Creator OR Admin
                const permissions = resolvePermissions(
                    currentUser,
                    'designs',
                    id,
                    userState.permissionOverrides,
                    userState.roles
                );

                const isSystemAdmin = currentUser.roleId === 'role-admin';
                const isCreator = design.creatorId === currentUser.id;

                // If you are not an admin AND not the creator, you cannot edit, 
                // even if you technically have "update" rights on the resource type 
                // (unless we decide "update" implies full override, but requested logic was specific).
                // Let's stick to the requested logic: "only Users who created the Design retain full rights"
                // This implies generic "update" on designs role might be false by default, or ignored here.

                // However, we should also respect the RBAC system. 
                // If the RBAC says "no update", then definitely no.
                if (!permissions.update) {
                    toast.error('Permission denied: You do not have permission to update designs');
                    return;
                }

                // Extra check for non-admins: MUST be creator
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

            deleteDesign: (id) => {
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

                set((state) => ({
                    designs: state.designs.filter((d) => d.id !== id)
                }));

                toast.success('Design deleted');
            },

            getDesignsByProject: (projectId) => {
                return get().designs.filter(d => d.projectId === projectId);
            }
        }),
        { name: 'design-storage' }
    )
);
