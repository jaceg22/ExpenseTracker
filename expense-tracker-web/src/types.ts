export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  userId: number;
  name: string;
  email: string;
  token: string;
}

export interface Group {
  id: number;
  name: string;
  createdByUserId: number;
  createdAt: string;
  members: User[];
}

export interface Balance {
  userId: number;
  name: string;
  netBalance: number;
}

export interface ExpenseParticipant {
  userId: number;
  name: string;
  shareAmount: number;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string | null;
  paidByUserId: number;
  paidByName: string;
  date: string;
  participants: ExpenseParticipant[];
}

export interface Settlement {
  id: number;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amount: number;
  note: string | null;
  date: string;
}

export interface InviteLink {
  inviteCode: string;
  invitePath: string;
}

export interface EmailInvite extends InviteLink {
  email: string;
}

export interface InvitePreview {
  groupId: number;
  groupName: string;
  memberCount: number;
  invitedByName: string;
}
