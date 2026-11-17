// Shapes returned by the backend API (see backend/src/modules/*).

export type Permission =
  | "dashboard.view"
  | "dashboard.sales"
  | "dashboard.customers"
  | "dashboard.points"
  | "dashboard.influencers"
  | "billing.create"
  | "bills.view"
  | "bills.cancel"
  | "customers.view"
  | "customers.edit"
  | "customers.export"
  | "campaigns.view"
  | "campaigns.manage"
  | "influencers.view"
  | "influencers.manage"
  | "points.adjust"
  | "payouts.view"
  | "payouts.manage"
  | "reports.view"
  | "audit.view"
  | "settings.manage"
  | "users.manage";

export type AccountType = "INTERNAL" | "PARTNER";

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  isSystem: boolean;
  isSuperadmin: boolean;
  userCount?: number;
}

export interface PermissionGroup {
  group: string;
  permissions: { key: Permission; label: string }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  accountType: AccountType;
  roleId: string | null;
  role: Role | null;
  isActive: boolean;
  lastLoginAt: string | null;
  influencerId: string | null;
  totpEnabled: boolean;
  createdAt: string;
}

/** The signed-in user, with effective permissions (superadmins get all). */
export interface Me extends User {
  isSuperadmin: boolean;
  permissions: Permission[];
}

export type CustomerSource = "WALK_IN" | "INFLUENCER" | "REFERRAL" | "ONLINE" | "OTHER";
export type Gender = "FEMALE" | "MALE" | "OTHER";

export interface Customer {
  id: string;
  mobile: string;
  name: string;
  email: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  anniversaryDate: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  tags: string[];
  notes: string | null;
  panNumber: string | null;
  marketingConsent: boolean;
  consentUpdatedAt: string | null;
  source: CustomerSource;
  acquiredViaInfluencerId: string | null;
  acquiredViaInfluencer: Pick<Influencer, "id" | "name"> | null;
  totalSpend: number;
  purchaseCount: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  createdAt: string;
}

export interface Customer360 {
  customer: Customer;
  stats: {
    totalSpend: number;
    purchaseCount: number;
    averageBill: number;
    firstPurchaseAt: string | null;
    lastPurchaseAt: string | null;
    discountReceived: number;
    cancelledBills: number;
    piecesBought: number;
    usualPaymentMode: PaymentMode | null;
    metalMix: { metalType: MetalType; pieces: number; netWeight: number; value: number }[];
  };
  redemptions: (Redemption & { campaign: Campaign; influencer: Influencer })[];
  consentHistory: ConsentEvent[];
  contacts: CustomerContact[];
}

export type ContactType = "PHONE" | "EMAIL";

export interface CustomerContact {
  id: string;
  type: ContactType;
  /** Phones are digits only; emails lower-case. */
  value: string;
  label: string | null;
  remark: string | null;
  isPrimary: boolean;
  isOutdated: boolean;
  createdAt: string;
}

export interface ConsentEvent {
  id: string;
  createdAt: string;
  granted: boolean;
  source: "BILLING" | "CRM" | "CUSTOMER_REQUEST";
  note: string | null;
}

export type InfluencerStatus = "ACTIVE" | "INACTIVE";

/** What kind of partner: everyone gets codes, points and payouts the same way. */
export type PartnerType = "INFLUENCER" | "BUSINESS" | "OTHER";

/** A partner (influencer, business or other) who brings customers in with their own code. Named "influencer" in the API. */
export interface Influencer {
  id: string;
  name: string;
  type: PartnerType;
  contactPerson: string | null;
  mobile: string;
  email: string | null;
  instagramHandle: string | null;
  youtubeChannel: string | null;
  followerCount: number | null;
  status: InfluencerStatus;
  upiId: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  panNumber: string | null;
  notes?: string | null;
  pointsBalance: number;
  lifetimePointsEarned: number;
  /** Earned but still inside the hold (return) period. */
  pendingPoints: number;
  createdAt: string;
  campaignCount?: number;
  redemptionCount?: number;
}

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
export type EffectiveStatus = CampaignStatus | "SCHEDULED" | "EXPIRED";
export type ValueType = "PERCENTAGE" | "FLAT";
export type CalculationBase = "BILL_AMOUNT" | "MAKING_CHARGES";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  effectiveStatus?: EffectiveStatus;
  startsAt: string | null;
  endsAt: string | null;
  discountType: ValueType;
  discountValue: number;
  discountBase: CalculationBase;
  maxDiscountAmount: number | null;
  minBillAmount: number | null;
  rewardType: ValueType;
  rewardValue: number;
  rewardBase: CalculationBase;
  maxRewardPoints: number | null;
  maxRedemptionsPerInfluencer: number | null;
  terms: string | null;
  createdAt: string;
  influencerCount?: number;
  redemptionCount?: number;
}

export interface EnrollmentStats {
  redemptions: number;
  discountGiven: number;
  pointsAwarded: number;
  revenue: number;
}

export interface Enrollment {
  id: string;
  campaignId: string;
  influencerId: string;
  code: string;
  isActive: boolean;
  discountTypeOverride: ValueType | null;
  discountValueOverride: number | null;
  rewardTypeOverride: ValueType | null;
  rewardValueOverride: number | null;
  redemptionCount: number;
  shareUrl: string;
  stats: EnrollmentStats;
}

export interface CampaignDetail {
  campaign: Campaign;
  influencers: (Enrollment & { influencer: Influencer })[];
  totals: EnrollmentStats;
}

export interface QrResponse {
  code: string;
  url: string;
  pngDataUrl: string;
  svg: string;
}

export type MetalType = "GOLD" | "SILVER" | "PLATINUM" | "DIAMOND" | "OTHER";
/** How one part of a bill was paid. */
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
/** A bill's payment in one word: its single method, or MIXED when split. */
export type PaymentMode = PaymentMethod | "MIXED";

export interface TransactionPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
}
export type TransactionStatus = "COMPLETED" | "CANCELLED";

export interface TransactionItem {
  id?: string;
  description: string;
  category?: string | null;
  metalType: MetalType;
  purity?: string | null;
  hsnCode?: string | null;
  huid?: string | null;
  grossWeight: number;
  netWeight: number;
  ratePerGram: number;
  metalValue: number;
  makingCharges: number;
  stoneCharges: number;
  otherCharges: number;
  lineTotal: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  billedBy?: { id: string; name: string };
  campaignInfluencerId: string | null;
  campaignInfluencer?: (Enrollment & { campaign: Campaign; influencer: Influencer }) | null;
  campaignId: string | null;
  influencerId: string | null;
  appliedCode: string | null;
  subtotal: number;
  makingChargesTotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  pointsAwarded: number;
  paymentMode: PaymentMode;
  cashAmount: number;
  /** How the bill was paid, one line per method; adds up to grandTotal. */
  payments?: TransactionPayment[];
  customerPan: string | null;
  status: TransactionStatus;
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  items?: TransactionItem[];
  createdAt: string;
}

export interface BillTotals {
  lines: TransactionItem[];
  subtotal: number;
  makingChargesTotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  pointsAwarded: number;
}

export interface BillPreview {
  customer: Customer | null;
  isNewCustomer: boolean;
  totals: BillTotals;
  offer: {
    code: string;
    campaign: { id: string; name: string };
    influencer: { id: string; name: string };
    description: string;
  } | null;
  codeError: { code: string; message: string } | null;
  compliance: ComplianceIssue[];
  /** Once payments are entered: how much they cover and what is left (negative when over). */
  payment: { paid: number; remaining: number; cashAmount: number };
  panOnFile: boolean;
  otpRequired: boolean;
}

export interface ComplianceIssue {
  code:
    | "PAN_REQUIRED"
    | "PAN_INVALID"
    | "CASH_LIMIT"
    | "CASH_AMOUNT_INVALID"
    | "HUID_REQUIRED"
    | "HUID_INVALID"
    | "HUID_DUPLICATE"
    | "HUID_ALREADY_SOLD";
  message: string;
  itemIndex?: number;
}

export interface OtpChallenge {
  challengeId: string;
  expiresAt: string;
  /** Only present in development (console SMS provider). */
  devCode?: string;
}

export interface Redemption {
  id: string;
  campaignId: string;
  influencerId: string;
  customerId: string | null;
  /** A redemption is on either a full bill or a partner sale. */
  transactionId: string | null;
  partnerSaleId: string | null;
  discountAmount: number;
  pointsAwarded: number;
  status: "ACTIVE" | "REVERSED";
  createdAt: string;
}

/** A sale billed in the store's own system where the customer used a partner code. */
export interface PartnerSale {
  id: string;
  number: number;
  billReference: string | null;
  customerId: string | null;
  customer?: Pick<Customer, "id" | "name" | "mobile"> | null;
  campaignId: string;
  campaign?: Pick<Campaign, "id" | "name">;
  influencerId: string;
  influencer?: Pick<Influencer, "id" | "name" | "type">;
  code: string;
  billAmount: number;
  makingCharges: number | null;
  discountAmount: number;
  finalAmount: number;
  pointsAwarded: number;
  status: TransactionStatus;
  recordedBy?: { id: string; name: string };
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface SaleTotals {
  sales: number;
  billAmount: number;
  discountAmount: number;
  finalAmount: number;
  pointsAwarded: number;
}

export interface SaleAmounts {
  billAmount: number;
  discountAmount: number;
  finalAmount: number;
  pointsAwarded: number;
}

/** What the counter sees after scanning a partner code. */
export interface SalePreview {
  offer: {
    code: string;
    description: string;
    campaign: { id: string; name: string; endsAt: string | null; terms: string | null };
    partner: { id: string; name: string; type: PartnerType; contactPerson: string | null; instagramHandle: string | null };
  } | null;
  /** Why the code cannot be used for this sale; the partner is still shown when the code itself is valid. */
  codeError: { code: string; message: string } | null;
  /** Null until the amounts needed are in (making charges, for offers calculated on them). */
  amounts: SaleAmounts | null;
  makingChargesRequired?: boolean;
  pointValue?: number;
  customer?: { id: string; name: string; mobile: string } | null;
  otpRequired?: boolean;
}

export type LedgerType = "EARN" | "EARN_REVERSAL" | "PAYOUT" | "PAYOUT_REVERSAL" | "ADJUSTMENT";

export interface LedgerEntry {
  id: string;
  createdAt: string;
  type: LedgerType;
  points: number;
  balanceAfter: number;
  transactionId: string | null;
  payoutId: string | null;
  note: string | null;
}

export type PayoutStatus = "REQUESTED" | "APPROVED" | "PAID" | "REJECTED";

export interface Payout {
  id: string;
  influencerId: string;
  influencer?: Influencer;
  points: number;
  pointValue: number;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  /** Net payable after TDS. */
  amount: number;
  panNumber: string | null;
  status: PayoutStatus;
  reviewedAt: string | null;
  paidAt: string | null;
  paymentMode: string | null;
  paymentReference: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InfluencerDetail {
  influencer: Influencer;
  pointsValue: number;
  campaigns: (Enrollment & { campaign: Campaign; offer: string })[];
  payouts: Payout[];
  login: { id: string; email: string; isActive: boolean; lastLoginAt: string | null } | null;
}

export interface InfluencerSelf {
  influencer: Influencer;
  pointValue: number;
  minPayoutPoints: number;
  campaigns: (Enrollment & { campaign: Campaign; offer: string })[];
}

export interface Settings {
  storeName: string;
  storeAddress: string | null;
  storePhone: string | null;
  gstin: string | null;
  invoicePrefix: string;
  taxRate: number;
  roundToNearestRupee: boolean;
  pointValue: number;
  minPayoutPoints: number;
  cashLimit: number;
  panRequiredAbove: number;
  requireHuid: boolean;
  huidMinNetWeight: number;
  requireRedemptionOtp: boolean;
  pointsHoldDays: number;
  tdsRate: number;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  actor: { name: string; email: string } | null;
}

export type ReportType = "partnerSales" | "sales" | "collections" | "hsn" | "metals" | "campaigns" | "tds";

export interface Report {
  title: string;
  columns: { key: string; header: string }[];
  rows: Record<string, string | number | null>[];
}

/** Each widget is null when the viewer's role does not share it. */
export interface DashboardSummary {
  sales: {
    today: { revenue: number; bills: number; discounts: number };
    month: { revenue: number; bills: number; discounts: number };
    monthly: { month: string; revenue: number; bills: number; influencerBills: number }[];
  } | null;
  customers: { total: number; newThisMonth: number; acquiredViaInfluencers: number } | null;
  points: {
    pointsOutstanding: number;
    pointsOnHold: number;
    liability: number;
    pendingPayouts: { count: number; amount: number };
  } | null;
  influencers: {
    liveCampaigns: number;
    activeInfluencers: number;
    topThisMonth: { id: string; name: string; redemptions: number; revenue: number; points: number }[];
  } | null;
}

export interface PublicOffer {
  code: string;
  valid: boolean;
  campaignName: string;
  description: string | null;
  terms: string | null;
  startsAt: string | null;
  endsAt: string | null;
  influencerName: string;
  instagramHandle: string | null;
  offer: string;
  store: { name: string; address: string | null; phone: string | null };
}
