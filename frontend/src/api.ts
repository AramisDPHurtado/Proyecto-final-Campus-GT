export interface ApiError extends Error {
  status?: number;
  code?: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "karting-campus-token";

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}, withAuth = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (withAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", "Bearer " + token);
  }
  const response = await fetch(API_BASE + path, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? "No se pudo completar la operación.") as ApiError;
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload as T;
}

export const jsonBody = (body: unknown): string => JSON.stringify(body);

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
}

export interface PublicSession {
  id: string;
  trackId: number;
  organizerId: string;
  operatingDate: string;
  startsAt: string;
  endsAt: string;
  joinPolicy: "open" | "approval";
  status: "confirmed" | "cancelled";
  participantCount: number;
  participants: string[];
  createdAt: string;
}

export interface SlotView {
  startsAt: string;
  endsAt: string;
  operatingDate: string;
  label: string;
  canCreate: boolean;
  availableTracks: number;
  sessions: Array<{
    id: string;
    trackId: number;
    participantCount: number;
    placesLeft: number;
    joinPolicy: "open" | "approval";
  }>;
}
