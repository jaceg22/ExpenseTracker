import type {
  AuthResponse,
  Balance,
  EmailInvite,
  Expense,
  Group,
  InviteLink,
  InvitePreview,
  Settlement,
  User,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

let authToken: string | null = localStorage.getItem("et_token");

export function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("et_token", token);
  else localStorage.removeItem("et_token");
}

export function getToken() {
  return authToken;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getAllUsers: () => request<User[]>("/users"),

  getGroups: () => request<Group[]>("/groups"),

  getGroup: (id: number) => request<Group>(`/groups/${id}`),

  createGroup: (name: string) =>
    request<Group>("/groups", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  addMember: (groupId: number, userId: number) =>
    request<Group>(`/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  getBalances: (groupId: number) =>
    request<Balance[]>(`/groups/${groupId}/balances`),

  getExpenses: (groupId: number) =>
    request<Expense[]>(`/groups/${groupId}/expenses`),

  createExpense: (
    groupId: number,
    data: {
      description: string;
      amount: number;
      paidByUserId: number;
      category?: string;
      participantUserIds?: number[];
    }
  ) =>
    request<Expense>(`/groups/${groupId}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteExpense: (groupId: number, expenseId: number) =>
    request<void>(`/groups/${groupId}/expenses/${expenseId}`, {
      method: "DELETE",
    }),

  getSettlements: (groupId: number) =>
    request<Settlement[]>(`/groups/${groupId}/settlements`),

  createSettlement: (
    groupId: number,
    data: { fromUserId: number; toUserId: number; amount: number; note?: string }
  ) =>
    request<Settlement>(`/groups/${groupId}/settlements`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getInviteLink: (groupId: number) =>
    request<InviteLink>(`/groups/${groupId}/invite-link`),

  inviteByEmail: (groupId: number, email: string) =>
    request<EmailInvite>(`/groups/${groupId}/invites/email`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  previewInvite: (code: string) =>
    request<InvitePreview>(`/invites/${code}`),

  joinGroup: (code: string) =>
    request<Group>(`/invites/${code}/join`, { method: "POST" }),

  leaveGroup: (groupId: number) =>
    request<void>(`/groups/${groupId}/members/me`, { method: "DELETE" }),
};

export { ApiError };
