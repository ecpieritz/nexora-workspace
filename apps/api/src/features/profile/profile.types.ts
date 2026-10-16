import type { WorkspaceRole } from '../../generated/prisma/client.js';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  displayName: string | null;
  phone: string | null;
  birthDate: string | null;
  bio: string | null;
  taxId: string | null;
  avatarUrl: string | null;
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    compactSidebar: boolean;
    notifications: {
      tasks: boolean;
      invoices: boolean;
      events: boolean;
      customers: boolean;
    };
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    role: WorkspaceRole;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileChanges {
  fullName?: string;
  displayName?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  bio?: string | null;
  taxId?: string;
  avatarUrl?: string | null;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  compactSidebar?: boolean;
  taskNotifications?: boolean;
  invoiceNotifications?: boolean;
  eventNotifications?: boolean;
  customerNotifications?: boolean;
}

export interface UserProfileRepository {
  findById(userId: string, workspaceId: string): Promise<UserProfile | null>;
  update(
    userId: string,
    workspaceId: string,
    expectedTaxId: string | null,
    changes: UserProfileChanges,
  ): Promise<UserProfile | null>;
}
