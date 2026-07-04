export interface Package {
  _id: string;
  name: string;
  durationMins: number;
  price: number;
  dataCapMb: number | null;
  isActive: boolean;
  sortOrder: number;
}

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface Transaction {
  _id: string;
  package: string | { _id: string; name: string };
  phone: string;
  amount: number;
  status: TransactionStatus;
  mpesaReceipt: string | null;
  createdAt: string;
}

export type SessionStatus = 'UNUSED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface WifiSession {
  _id: string;
  phone: string;
  radiusUsername: string;
  radiusPassword: string;
  durationMins: number;
  status: SessionStatus;
  expiresAt: string | null;
}

export interface InitiatePaymentResponse {
  transactionId: string;
  checkoutRequestId: string;
  message: string;
}

export interface PaymentStatusResponse {
  status: TransactionStatus;
  transaction: Transaction;
  session: WifiSession | null;
}

export interface SessionCheckResponse {
  active: boolean;
  expiresAt?: string;
  secondsRemaining?: number;
}

export interface AdminStats {
  today: { count: number; revenue: number };
  allTime: { count: number; revenue: number };
  activeNow: number;
  byPackage: { name: string; sales: number; revenue: number }[];
}
