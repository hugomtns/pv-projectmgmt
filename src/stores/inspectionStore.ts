import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Inspection,
  InspectionType,
  InspectionItem,
  InspectionItemResult,
  InspectionItemPhoto,
  InspectorSignature,
} from '@/lib/types';
import { INSPECTION_TEMPLATES } from '@/data/inspectionTemplates';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { storeBlob, deleteBlob } from '@/lib/db';
import { toast } from 'sonner';

interface InspectionState {
  // State
  inspections: Inspection[];

  // Inspection CRUD
  createInspection: (
    projectId: string,
    type: InspectionType,
    scheduledDate: string,
    siteId?: string,
    inspectorCompany?: string
  ) => string | undefined;

  updateInspection: (
    id: string,
    updates: Partial<
      Pick<
        Inspection,
        | 'status'
        | 'scheduledDate'
        | 'completedDate'
        | 'overallNotes'
        | 'inspectorName'
        | 'inspectorCompany'
      >
    >
  ) => void;

  deleteInspection: (id: string) => void;

  // Item operations
  updateInspectionItem: (
    inspectionId: string,
    itemId: string,
    updates: Partial<Pick<InspectionItem, 'result' | 'notes' | 'isPunchListItem'>>
  ) => void;

  // Photo operations
  addItemPhoto: (
    inspectionId: string,
    itemId: string,
    file: File,
    caption?: string
  ) => Promise<string | undefined>;

  deleteItemPhoto: (
    inspectionId: string,
    itemId: string,
    photoId: string
  ) => Promise<void>;

  // Punch list operations
  markPunchListResolved: (inspectionId: string, itemId: string) => void;

  // Signature operations
  addSignature: (
    inspectionId: string,
    role: InspectorSignature['role']
  ) => void;

  // Helpers
  getInspectionsByProject: (projectId: string) => Inspection[];
  getInspectionById: (id: string) => Inspection | undefined;
  getPunchListItems: (projectId: string) => Array<{
    inspection: Inspection;
    item: InspectionItem;
  }>;
}

export const useInspectionStore = create<InspectionState>()(
  persist(
    (set, get) => ({
      inspections: [],

      createInspection: (projectId, type, scheduledDate, siteId, inspectorCompany) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create inspections');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'inspections',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create inspections');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        // Create items from template
        const templateItems = INSPECTION_TEMPLATES[type];
        const items: InspectionItem[] = templateItems.map((template) => ({
          id: crypto.randomUUID(),
          title: template.title,
          description: template.description,
          category: template.category,
          result: 'pending' as InspectionItemResult,
          required: template.required,
          photos: [],
          notes: '',
          isPunchListItem: false,
          createdAt: now,
          updatedAt: now,
        }));

        const newInspection: Inspection = {
          id: crypto.randomUUID(),
          projectId,
          siteId,
          type,
          status: 'scheduled',
          scheduledDate,
          inspectorName: userFullName,
          inspectorId: currentUser.id,
          inspectorCompany,
          items,
          overallNotes: '',
          signatures: [],
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          inspections: [...state.inspections, newInspection],
        }));

        logAdminAction('create', 'inspections', newInspection.id, `${type} inspection`, {
          projectId,
          type,
          scheduledDate,
          itemCount: items.length,
        });

        toast.success('Inspection created successfully');
        return newInspection.id;
      },

      updateInspection: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update inspections');
          return;
        }

        const inspection = get().inspections.find((i) => i.id === id);
        if (!inspection) {
          toast.error('Inspection not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'inspections',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isSystemAdmin = currentUser.roleId === 'role-admin';
        const isCreator = inspection.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update inspections');
          return;
        }

        if (!isSystemAdmin && !isCreator) {
          toast.error('Permission denied: You can only edit inspections you created');
          return;
        }

        set((state) => ({
          inspections: state.inspections.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
          ),
        }));

        logAdminAction('update', 'inspections', id, `${inspection.type} inspection`, {
          updatedFields: Object.keys(updates),
        });
      },

      deleteInspection: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete inspections');
          return;
        }

        const inspection = get().inspections.find((i) => i.id === id);
        if (!inspection) {
          toast.error('Inspection not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'inspections',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isSystemAdmin = currentUser.roleId === 'role-admin';
        const isCreator = inspection.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete inspections');
          return;
        }

        if (!isSystemAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete inspections you created');
          return;
        }

        // TODO: In Story 6, also clean up photo blobs from IndexedDB

        set((state) => ({
          inspections: state.inspections.filter((i) => i.id !== id),
        }));

        logAdminAction('delete', 'inspections', id, `${inspection.type} inspection`);

        toast.success('Inspection deleted');
      },

      updateInspectionItem: (inspectionId, itemId, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update inspection items');
          return;
        }

        const inspection = get().inspections.find((i) => i.id === inspectionId);
        if (!inspection) {
          toast.error('Inspection not found');
          return;
        }

        const isSystemAdmin = currentUser.roleId === 'role-admin';
        const isCreator = inspection.creatorId === currentUser.id;

        if (!isSystemAdmin && !isCreator) {
          toast.error('Permission denied: You can only edit inspections you created');
          return;
        }

        const now = new Date().toISOString();

        set((state) => ({
          inspections: state.inspections.map((i) =>
            i.id === inspectionId
              ? {
                  ...i,
                  updatedAt: now,
                  items: i.items.map((item) =>
                    item.id === itemId
                      ? { ...item, ...updates, updatedAt: now }
                      : item
                  ),
                }
              : i
          ),
        }));
      },

      addItemPhoto: async (inspectionId, itemId, file, caption) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to add photos');
          return;
        }

        const inspection = get().inspections.find((i) => i.id === inspectionId);
        if (!inspection) {
          toast.error('Inspection not found');
          return;
        }

        const isSystemAdmin = currentUser.roleId === 'role-admin';
        const isCreator = inspection.creatorId === currentUser.id;

        if (!isSystemAdmin && !isCreator) {
          toast.error('Permission denied: You can only edit inspections you created');
          return;
        }

        try {
          // Store the blob in IndexedDB
          const blobId = await storeBlob(file);
          const now = new Date().toISOString();

          const newPhoto: InspectionItemPhoto = {
            id: crypto.randomUUID(),
            blobId,
            fileName: file.name,
            fileSize: file.size,
            capturedAt: now,
            caption,
          };

          set((state) => ({
            inspections: state.inspections.map((i) =>
              i.id === inspectionId
                ? {
                    ...i,
                    updatedAt: now,
                    items: i.items.map((item) =>
                      item.id === itemId
                        ? {
                            ...item,
                            photos: [...item.photos, newPhoto],
                            updatedAt: now,
                          }
                        : item
                    ),
                  }
                : i
            ),
          }));

          toast.success('Photo added');
          return newPhoto.id;
        } catch (error) {
          console.error('Failed to store photo:', error);
          toast.error('Failed to add photo');
          return;
        }
      },

      deleteItemPhoto: async (inspectionId, itemId, photoId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete photos');
          return;
        }

        const inspection = get().inspections.find((i) => i.id === inspectionId);
        if (!inspection) {
          toast.error('Inspection not found');
          return;
        }

        const isSystemAdmin = currentUser.roleId === 'role-admin';
        const isCreator = inspection.creatorId === currentUser.id;

        if (!isSystemAdmin && !isCreator) {
          toast.error('Permission denied: You can only edit inspections you created');
          return;
        }

        // Find the photo to get its blobId
        const item = inspection.items.find((i) => i.id === itemId);
        const photo = item?.photos.find((p) => p.id === photoId);

        if (photo) {
          try {
            // Delete the blob from IndexedDB
            await deleteBlob(photo.blobId);
          } catch (error) {
            console.error('Failed to delete blob:', error);
          }
        }

        const now = new Date().toISOString();

        set((state) => ({
          inspections: state.inspections.map((i) =>
            i.id === inspectionId
              ? {
                  ...i,
                  updatedAt: now,
                  items: i.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          photos: item.photos.filter((p) => p.id !== photoId),
                          updatedAt: now,
                        }
                      : item
                  ),
                }
              : i
          ),
        }));

        toast.success('Photo deleted');
      },

      markPunchListResolved: (inspectionId, itemId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const inspection = get().inspections.find((i) => i.id === inspectionId);
        if (!inspection) {
          toast.error('Inspection not found');
          return;
        }

        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;
        const now = new Date().toISOString();

        set((state) => ({
          inspections: state.inspections.map((i) =>
            i.id === inspectionId
              ? {
                  ...i,
                  updatedAt: now,
                  items: i.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          punchListResolvedAt: now,
                          punchListResolvedBy: userFullName,
                          updatedAt: now,
                        }
                      : item
                  ),
                }
              : i
          ),
        }));

        toast.success('Punch list item marked as resolved');
      },

      addSignature: (inspectionId, role) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to sign inspections');
          return;
        }

        const inspection = get().inspections.find((i) => i.id === inspectionId);
        if (!inspection) {
          toast.error('Inspection not found');
          return;
        }

        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;
        const now = new Date().toISOString();

        const newSignature: InspectorSignature = {
          id: crypto.randomUUID(),
          signedBy: userFullName,
          signedById: currentUser.id,
          signedAt: now,
          role,
        };

        set((state) => ({
          inspections: state.inspections.map((i) =>
            i.id === inspectionId
              ? {
                  ...i,
                  signatures: [...i.signatures, newSignature],
                  updatedAt: now,
                }
              : i
          ),
        }));

        toast.success('Signature added');
      },

      getInspectionsByProject: (projectId) => {
        return get().inspections.filter((i) => i.projectId === projectId);
      },

      getInspectionById: (id) => {
        return get().inspections.find((i) => i.id === id);
      },

      getPunchListItems: (projectId) => {
        const projectInspections = get().getInspectionsByProject(projectId);
        const punchListItems: Array<{ inspection: Inspection; item: InspectionItem }> = [];

        for (const inspection of projectInspections) {
          for (const item of inspection.items) {
            if (item.isPunchListItem && !item.punchListResolvedAt) {
              punchListItems.push({ inspection, item });
            }
          }
        }

        return punchListItems;
      },
    }),
    { name: 'inspection-storage' }
  )
);
