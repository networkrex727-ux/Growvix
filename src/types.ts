export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum TransactionType {
  RECHARGE = 'recharge',
  WITHDRAW = 'withdraw',
  BONUS = 'bonus',
  INCOME = 'income',
  REFERRAL = 'referral',
  INVESTMENT = 'investment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export enum InvestmentStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

export interface UserProfile {
  uid: string;
  phone: string;
  email: string;
  balance: number; // Total balance (sum of deposit and withdrawable)
  depositBalance: number; // Non-withdrawable (from recharges)
  withdrawableBalance: number; // Withdrawable (from income, bonuses, referrals)
  totalIncome: number;
  todayIncome: number;
  referralCode: string;
  referredBy?: string;
  role: UserRole;
  lastCheckIn?: string;
  hasRecharged: boolean;
  isBanned?: boolean;
  createdAt: string;
}

export interface SystemSettings {
  adminUpi: string;
  websiteUrl: string;
  minWithdrawal: number;
  minRecharge: number;
  withdrawalFee: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  validityDays: number;
  imageUrl: string;
}

export interface Investment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  dailyIncome: number;
  purchaseDate: string;
  expiryDate: string;
  lastIncomeClaimed: string;
  status: InvestmentStatus;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  paymentMethod?: string;
  utr?: string;
  bankDetails?: {
    holderName: string;
    accountNo: string;
    ifsc: string;
    upiId?: string;
  };
  createdAt: string;
}

export interface TeamStats {
  teamSize: number;
  totalTeamIncome: number;
  lv1Count: number;
  lv2Count: number;
  lv3Count: number;
}
