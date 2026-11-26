export type Role = "customer" | "admin";
export type JoinPolicy = "open" | "approval";
export type ReservationStatus = "confirmed" | "cancelled";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Participant {
  name: string;
  addedByUserId: string;
}

export interface Reservation {
  id: string;
  trackId: number;
  organizerId: string;
  operatingDate: string;
  startsAt: string;
  endsAt: string;
  joinPolicy: JoinPolicy;
  status: ReservationStatus;
  participants: Participant[];
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  reservationId: string;
  requesterId: string;
  status: RequestStatus;
  participantNames: string[];
  createdAt: string;
  decidedAt: string | null;
}

export interface TrackBlock {
  id: string;
  trackId: number;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdByAdminId: string;
  createdAt: string;
}

export interface NewReservation {
  organizerId: string;
  operatingDate: string;
  startsAt: string;
  endsAt: string;
  joinPolicy: JoinPolicy;
  participantNames: string[];
}

export interface NewJoinRequest {
  reservationId: string;
  requesterId: string;
  participantNames: string[];
}

export interface NewTrackBlock {
  trackId: number;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdByAdminId: string;
  operatingDate: string;
}

export interface Store {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(input: Omit<User, "id" | "createdAt">): Promise<User>;
  listReservations(from: string, to: string): Promise<Reservation[]>;
  getReservation(id: string): Promise<Reservation | null>;
  listMyReservations(userId: string): Promise<Reservation[]>;
  createReservation(input: NewReservation): Promise<Reservation>;
  createJoinRequest(input: NewJoinRequest): Promise<JoinRequest>;
  listRequestsForOrganizer(userId: string): Promise<Array<JoinRequest & { reservation: Reservation }>>;
  decideJoinRequest(id: string, organizerId: string, approve: boolean): Promise<JoinRequest>;
  cancelReservation(id: string, organizerId: string): Promise<void>;
  changeJoinPolicy(id: string, organizerId: string, policy: JoinPolicy): Promise<Reservation>;
  listBlocks(from?: string, to?: string): Promise<TrackBlock[]>;
  createBlock(input: NewTrackBlock): Promise<TrackBlock>;
  deleteBlock(id: string): Promise<void>;
  close(): Promise<void>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function publicUser(user: User): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
