import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user?: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
  }
}

// Exportierter Typ für Session-User (für explizite Typisierung in API-Routen)
export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

// ==========================================
// RBAC - Role-Based Access Control
// ==========================================

// Rollen-Enum (muss mit Prisma übereinstimmen)
export type UserRole = 'USER' | 'CONSULTANT' | 'CUSTOMER_REF' | 'MANAGER' | 'ADMIN';

// Rollen, die volle Kundendetails sehen dürfen
const FULL_ACCESS_ROLES: UserRole[] = ['CONSULTANT', 'CUSTOMER_REF', 'MANAGER', 'ADMIN'];

// Rollen, die den Kunden-Referenzen Bereich sehen dürfen
const CUSTOMER_REF_ROLES: UserRole[] = ['CUSTOMER_REF', 'MANAGER', 'ADMIN'];

// Rollen, die Admin-Zugang haben
const ADMIN_ROLES: UserRole[] = ['MANAGER', 'ADMIN'];

// Hilfsfunktion zur Rollenprüfung
export function isAdmin(role?: string): boolean {
  return role?.toUpperCase() === 'ADMIN';
}

export function isManager(role?: string): boolean {
  return role?.toUpperCase() === 'MANAGER';
}

export function isAdminOrManager(role?: string): boolean {
  const upperRole = role?.toUpperCase();
  return upperRole === 'ADMIN' || upperRole === 'MANAGER';
}

// Neue RBAC-Funktionen
export function isConsultant(role?: string): boolean {
  return role?.toUpperCase() === 'CONSULTANT';
}

export function isCustomerRef(role?: string): boolean {
  return role?.toUpperCase() === 'CUSTOMER_REF';
}

// Kann volle Kundendetails sehen (CONSULTANT, CUSTOMER_REF, MANAGER, ADMIN)
export function canViewFullClientDetails(role?: string): boolean {
  const upperRole = role?.toUpperCase() as UserRole;
  return FULL_ACCESS_ROLES.includes(upperRole);
}

// Kann den Kunden-Referenzen Bereich sehen (CUSTOMER_REF, MANAGER, ADMIN)
export function canViewCustomerReferences(role?: string): boolean {
  const upperRole = role?.toUpperCase() as UserRole;
  return CUSTOMER_REF_ROLES.includes(upperRole);
}

// Hat Admin-Zugang (MANAGER, ADMIN)
export function hasAdminAccess(role?: string): boolean {
  const upperRole = role?.toUpperCase() as UserRole;
  return ADMIN_ROLES.includes(upperRole);
}

// Rollen-Labels für UI
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Registrierter Benutzer',
  CONSULTANT: 'Unternehmensberatung',
  CUSTOMER_REF: 'Kunden-Referenz',
  MANAGER: 'Manager',
  ADMIN: 'Administrator'
};

// Rollen-Farben für UI (Tailwind)
export const ROLE_COLORS: Record<UserRole, string> = {
  USER: 'bg-gray-100 text-gray-800',
  CONSULTANT: 'bg-blue-100 text-blue-800',
  CUSTOMER_REF: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-amber-100 text-amber-800',
  ADMIN: 'bg-red-100 text-red-800'
};

export type Expense = {
  id: string
  amount: number
  category: string
  description: string
  date: Date
}

export type ExpenseFormData = Omit<Expense, 'id' | 'date'> & {
  date: string
}

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Other'
] as const

export type DateRange = {
  from: Date | undefined
  to: Date | undefined
}