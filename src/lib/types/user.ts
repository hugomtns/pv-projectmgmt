export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  function: string;        // Job title/role
  roleId: string;          // FK to CustomRole.id
  groupIds: string[];      // Array of group IDs
  createdAt: string;
  updatedAt: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  memberIds: string[];     // Array of user IDs
  createdAt: string;
  updatedAt: string;
}
