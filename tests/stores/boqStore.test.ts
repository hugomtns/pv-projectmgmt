import { describe, it, expect, beforeEach } from 'vitest';
import { useBOQStore } from '@/stores/boqStore';
import { useUserStore } from '@/stores/userStore';
import { useDesignStore } from '@/stores/designStore';
import { seedRoles } from '@/data/seedUserData';

describe('boqStore', () => {
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

  const regularUser = {
    id: 'test-user-2',
    firstName: 'Test',
    lastName: 'User',
    email: 'user@test.com',
    function: 'Engineer',
    roleId: 'role-user',
    groupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testDesign = {
    id: 'design-1',
    projectId: 'project-1',
    name: 'Test Design',
    description: 'Test description',
    status: 'draft' as const,
    createdBy: 'Test Admin',
    creatorId: 'test-user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [],
    currentVersionId: '',
  };

  beforeEach(() => {
    // Reset stores before each test
    useBOQStore.setState({ boqs: [] });

    // Set up user store with roles
    useUserStore.setState({
      currentUser: adminUser,
      roles: seedRoles,
      users: [adminUser, regularUser],
      groups: [],
      permissionOverrides: [],
    });

    // Set up design store
    useDesignStore.setState({
      designs: [testDesign],
    });
  });

  describe('createBOQ', () => {
    it('should create a new BOQ for a design', () => {
      const boqId = useBOQStore.getState().createBOQ('design-1');

      expect(boqId).toBeDefined();
      const boq = useBOQStore.getState().getBOQById(boqId!);
      expect(boq).toBeDefined();
      expect(boq?.designId).toBe('design-1');
      expect(boq?.projectId).toBe('project-1');
      expect(boq?.items).toEqual([]);
      expect(boq?.totalValue).toBe(0);
    });

    it('should not create duplicate BOQ for same design', () => {
      useBOQStore.getState().createBOQ('design-1');
      const duplicateId = useBOQStore.getState().createBOQ('design-1');

      // Should return existing BOQ id
      const boqs = useBOQStore.getState().boqs;
      expect(boqs).toHaveLength(1);
      expect(duplicateId).toBe(boqs[0].id);
    });

    it('should not create BOQ when not logged in', () => {
      useUserStore.setState({ currentUser: null });

      const boqId = useBOQStore.getState().createBOQ('design-1');

      expect(boqId).toBeUndefined();
      expect(useBOQStore.getState().boqs).toHaveLength(0);
    });
  });

  describe('addItem', () => {
    it('should add an item to a BOQ', () => {
      const boqId = useBOQStore.getState().createBOQ('design-1')!;

      const itemId = useBOQStore.getState().addItem(boqId, {
        name: 'PV modules',
        category: 'PV Equipment',
        quantity: 100,
        unit: 'panels',
        unitPrice: 150,
        source: 'manual',
      });

      expect(itemId).toBeDefined();
      const boq = useBOQStore.getState().getBOQById(boqId);
      expect(boq?.items).toHaveLength(1);
      expect(boq?.items[0].name).toBe('PV modules');
      expect(boq?.items[0].totalPrice).toBe(15000); // 100 * 150
      expect(boq?.totalValue).toBe(15000);
    });

    it('should calculate total price correctly', () => {
      const boqId = useBOQStore.getState().createBOQ('design-1')!;

      useBOQStore.getState().addItem(boqId, {
        name: 'Item 1',
        category: 'PV Equipment',
        quantity: 10,
        unit: 'units',
        unitPrice: 100,
        source: 'manual',
      });

      useBOQStore.getState().addItem(boqId, {
        name: 'Item 2',
        category: 'PV Equipment',
        quantity: 5,
        unit: 'units',
        unitPrice: 200,
        source: 'manual',
      });

      const boq = useBOQStore.getState().getBOQById(boqId);
      expect(boq?.items).toHaveLength(2);
      expect(boq?.totalValue).toBe(2000); // (10*100) + (5*200)
    });
  });

  describe('updateItem', () => {
    it('should update item properties and recalculate totals', () => {
      const boqId = useBOQStore.getState().createBOQ('design-1')!;

      useBOQStore.getState().addItem(boqId, {
        name: 'PV modules',
        category: 'PV Equipment',
        quantity: 100,
        unit: 'panels',
        unitPrice: 150,
        source: 'manual',
      });

      const boq = useBOQStore.getState().getBOQById(boqId);
      const itemId = boq?.items[0].id;

      useBOQStore.getState().updateItem(boqId, itemId!, {
        quantity: 200,
      });

      const updatedBOQ = useBOQStore.getState().getBOQById(boqId);
      expect(updatedBOQ?.items[0].quantity).toBe(200);
      expect(updatedBOQ?.items[0].totalPrice).toBe(30000); // 200 * 150
      expect(updatedBOQ?.totalValue).toBe(30000);
    });

    it('should update unit price and recalculate', () => {
      const boqId = useBOQStore.getState().createBOQ('design-1')!;

      useBOQStore.getState().addItem(boqId, {
        name: 'PV modules',
        category: 'PV Equipment',
        quantity: 100,
        unit: 'panels',
        unitPrice: 150,
        source: 'manual',
      });

      const boq = useBOQStore.getState().getBOQById(boqId);
      const itemId = boq?.items[0].id;

      useBOQStore.getState().updateItem(boqId, itemId!, {
        unitPrice: 200,
      });

      const updatedBOQ = useBOQStore.getState().getBOQById(boqId);
      expect(updatedBOQ?.items[0].unitPrice).toBe(200);
      expect(updatedBOQ?.items[0].totalPrice).toBe(20000); // 100 * 200
    });
  });

  describe('deleteItem', () => {
    it('should remove item and recalculate totals', () => {
      const boqId = useBOQStore.getState().createBOQ('design-1')!;

      useBOQStore.getState().addItem(boqId, {
        name: 'Item 1',
        category: 'PV Equipment',
        quantity: 10,
        unit: 'units',
        unitPrice: 100,
        source: 'manual',
      });

      useBOQStore.getState().addItem(boqId, {
        name: 'Item 2',
        category: 'PV Equipment',
        quantity: 5,
        unit: 'units',
        unitPrice: 200,
        source: 'manual',
      });

      const boq = useBOQStore.getState().getBOQById(boqId);
      const itemId = boq?.items[0].id;

      useBOQStore.getState().deleteItem(boqId, itemId!);

      const updatedBOQ = useBOQStore.getState().getBOQById(boqId);
      expect(updatedBOQ?.items).toHaveLength(1);
      expect(updatedBOQ?.totalValue).toBe(1000); // 5 * 200
    });
  });

  describe('deleteBOQ', () => {
    it('should remove a BOQ', () => {
      const boqId = useBOQStore.getState().createBOQ('design-1')!;

      useBOQStore.getState().deleteBOQ(boqId);

      expect(useBOQStore.getState().boqs).toHaveLength(0);
    });
  });

  describe('helper functions', () => {
    it('getBOQByDesign should return BOQ for design', () => {
      useBOQStore.getState().createBOQ('design-1');

      const boq = useBOQStore.getState().getBOQByDesign('design-1');

      expect(boq).toBeDefined();
      expect(boq?.designId).toBe('design-1');
    });

    it('getBOQsByProject should return all BOQs for project', () => {
      // Add another design for same project
      useDesignStore.setState({
        designs: [
          testDesign,
          { ...testDesign, id: 'design-2', name: 'Test Design 2' },
        ],
      });

      useBOQStore.getState().createBOQ('design-1');
      useBOQStore.getState().createBOQ('design-2');

      const boqs = useBOQStore.getState().getBOQsByProject('project-1');

      expect(boqs).toHaveLength(2);
    });
  });

  describe('permission checks', () => {
    it('should not allow guest to create BOQ', () => {
      const guestUser = {
        ...regularUser,
        id: 'guest-user',
        roleId: 'role-guest',
      };
      useUserStore.setState({ currentUser: guestUser });

      const boqId = useBOQStore.getState().createBOQ('design-1');

      expect(boqId).toBeUndefined();
    });

    it('should not allow non-creator to update BOQ', () => {
      // Create BOQ as admin
      const boqId = useBOQStore.getState().createBOQ('design-1')!;

      // Switch to different regular user
      useUserStore.setState({ currentUser: regularUser });

      // Try to add item
      const itemId = useBOQStore.getState().addItem(boqId, {
        name: 'PV modules',
        category: 'PV Equipment',
        quantity: 100,
        unit: 'panels',
        unitPrice: 150,
        source: 'manual',
      });

      // Should fail - not creator and not admin
      expect(itemId).toBeUndefined();
    });
  });
});
