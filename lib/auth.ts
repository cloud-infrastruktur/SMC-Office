import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { UserRole } from "@prisma/client";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Nicht authentifiziert");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if ((user as any)?.role !== UserRole.ADMIN) {
    throw new Error("Keine Admin-Berechtigung");
  }
  return user;
}

export async function requireManagerOrAdmin() {
  const user = await requireAuth();
  const role = (user as any)?.role;
  if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
    throw new Error("Keine Manager-Berechtigung");
  }
  return user;
}

export function isAdmin(role: string | UserRole | undefined): boolean {
  return role === UserRole.ADMIN || role === 'ADMIN' || role === 'admin';
}

export function isManager(role: string | UserRole | undefined): boolean {
  return role === UserRole.MANAGER || role === 'MANAGER' || role === 'manager';
}

export function isAdminOrManager(role: string | UserRole | undefined): boolean {
  return isAdmin(role) || isManager(role);
}