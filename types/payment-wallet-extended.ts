/**
 * Types étendus pour le système de paiement wallet amélioré
 */

import {
  PaymentMethod,
  PaymentStatus,
  CreatePaymentResponse,
  PaymentStatusResponse
} from './payment-wallet';

// Configuration des limites par wallet
export interface WalletLimits {
  min: number;
  max: number;
  dailyLimit?: number;
  monthlyLimit?: number;
}

// Configuration complète d'un wallet
export interface WalletConfig {
  method: PaymentMethod;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  limits: WalletLimits;
  supportedPrefixes: string[];
  fees?: {
    fixed?: number;
    percentage?: number;
  };
  enabled: boolean;
  description: string;
}

// Transaction détaillée
export interface PaymentTransaction {
  id: string;
  uuid: string;
  method: PaymentMethod;
  amount: number;
  fees: number;
  totalAmount: number;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  reference: string;
  externalId?: string;
  client: {
    name: string;
    phone: string;
    email?: string;
  };
  structure: {
    id: number;
    name: string;
    type: string;
  };
  metadata?: Record<string, any>;
  errorDetails?: {
    code: string;
    message: string;
    timestamp: Date;
  };
  retryCount: number;
  qrCode?: string;
  paymentUrl?: string;
}

// Webhook de notification
export interface PaymentWebhook {
  id: string;
  event: 'payment.created' | 'payment.processing' | 'payment.completed' | 'payment.failed';
  timestamp: Date;
  signature: string;
  data: {
    uuid: string;
    status: PaymentStatus;
    transaction?: PaymentTransaction;
    error?: string;
  };
}

// Réconciliation de paiement
export interface PaymentReconciliation {
  id: string;
  date: Date;
  method: PaymentMethod;
  transactions: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
  };
  amounts: {
    expected: number;
    received: number;
    fees: number;
    net: number;
  };
  discrepancies: {
    count: number;
    amount: number;
    transactions: string[];
  };
  status: 'PENDING' | 'RECONCILED' | 'DISCREPANCY';
}

// Rapport de paiement
export interface PaymentReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalTransactions: number;
    totalAmount: number;
    totalFees: number;
    netAmount: number;
    averageTransaction: number;
    successRate: number;
  };
  byMethod: Record<PaymentMethod, {
    count: number;
    amount: number;
    fees: number;
    successRate: number;
  }>;
  byDay: Array<{
    date: Date;
    count: number;
    amount: number;
  }>;
  topClients: Array<{
    name: string;
    phone: string;
    count: number;
    totalAmount: number;
  }>;
  failureReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

// Batch de paiements
export interface PaymentBatch {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  scheduledAt?: Date;
  status: 'DRAFT' | 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payments: Array<{
    clientName: string;
    clientPhone: string;
    amount: number;
    reference: string;
    method: PaymentMethod;
    status?: PaymentStatus;
    uuid?: string;
  }>;
  summary: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    totalAmount: number;
  };
}

// Template de paiement récurrent
export interface RecurringPaymentTemplate {
  id: string;
  name: string;
  description?: string;
  client: {
    name: string;
    phone: string;
    email?: string;
  };
  amount: number;
  method: PaymentMethod;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  nextDue: Date;
  startDate: Date;
  endDate?: Date;
  active: boolean;
  lastPayment?: {
    date: Date;
    uuid: string;
    status: PaymentStatus;
  };
  history: Array<{
    date: Date;
    uuid: string;
    status: PaymentStatus;
    amount: number;
  }>;
}

// Notification de paiement
export interface PaymentNotification {
  id: string;
  type: 'SMS' | 'EMAIL' | 'PUSH' | 'WEBHOOK';
  recipient: string;
  subject?: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: Date;
  error?: string;
  metadata: {
    uuid: string;
    method: PaymentMethod;
    amount: number;
    clientName: string;
  };
}

// Règle de fraude
export interface FraudRule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  conditions: Array<{
    field: 'amount' | 'phone' | 'frequency' | 'velocity';
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
    value: any;
  }>;
  action: 'BLOCK' | 'FLAG' | 'REVIEW' | 'NOTIFY';
  priority: number;
  triggeredCount: number;
  lastTriggered?: Date;
}

// Scoring de risque
export interface RiskScore {
  uuid: string;
  score: number; // 0-100 (0 = sans risque, 100 = très risqué)
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: Array<{
    name: string;
    weight: number;
    value: any;
    contribution: number;
  }>;
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  timestamp: Date;
}

// Configuration des callbacks
export interface PaymentCallbacks {
  onInitiated?: (payment: CreatePaymentResponse) => void;
  onProcessing?: (status: PaymentStatusResponse) => void;
  onCompleted?: (transaction: PaymentTransaction) => void;
  onFailed?: (error: Error, transaction?: PaymentTransaction) => void;
  onTimeout?: () => void;
  onRetry?: (attempt: number, maxAttempts: number) => void;
  onQRGenerated?: (qrCode: string) => void;
  onProgress?: (percentage: number) => void;
}

// Options avancées de paiement
export interface AdvancedPaymentOptions {
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  retryStrategy: {
    maxAttempts: number;
    delay: number;
    backoff: 'LINEAR' | 'EXPONENTIAL';
  };
  timeout: number;
  pollingInterval: number;
  notifications: {
    email?: string;
    sms?: string;
    webhook?: string;
  };
  metadata?: Record<string, any>;
  fraudCheck: boolean;
  saveForLater: boolean;
  splitPayment?: {
    recipients: Array<{
      phone: string;
      amount: number;
      percentage?: number;
    }>;
  };
}

// Export des configurations par défaut
export const WALLET_CONFIGS: Record<PaymentMethod, WalletConfig> = {
  OM: {
    method: 'OM',
    name: 'orange_money',
    displayName: 'Orange Money',
    icon: '🟠',
    color: '#FF6B00',
    limits: {
      min: 100,
      max: 2000000,
      dailyLimit: 5000000,
      monthlyLimit: 50000000
    },
    supportedPrefixes: ['77', '78'],
    fees: {
      percentage: 1
    },
    enabled: true,
    description: 'Paiement via Orange Money Sénégal'
  },
  WAVE: {
    method: 'WAVE',
    name: 'wave',
    displayName: 'Wave',
    icon: '🌊',
    color: '#2C5FF6',
    limits: {
      min: 100,
      max: 5000000,
      dailyLimit: 10000000,
      monthlyLimit: 100000000
    },
    supportedPrefixes: ['77', '78', '76', '70', '75'],
    fees: {
      percentage: 1
    },
    enabled: true,
    description: 'Paiement via Wave Money'
  },
  FREE: {
    method: 'FREE',
    name: 'free_money',
    displayName: 'Free Money',
    icon: '💚',
    color: '#00B900',
    limits: {
      min: 100,
      max: 1000000,
      dailyLimit: 3000000,
      monthlyLimit: 30000000
    },
    supportedPrefixes: ['76'],
    fees: {
      percentage: 1.5
    },
    enabled: true,
    description: 'Paiement via Free Money'
  },
  CASH: {
    method: 'CASH',
    name: 'cash',
    displayName: 'Espèces',
    icon: '💵',
    color: '#4CAF50',
    limits: {
      min: 1,
      max: Number.MAX_SAFE_INTEGER
    },
    supportedPrefixes: [],
    enabled: true,
    description: 'Paiement en espèces'
  }
};

// Types d'export pour les rapports
export type ExportFormat = 'CSV' | 'JSON' | 'PDF' | 'EXCEL';

export interface ExportOptions {
  format: ExportFormat;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: {
    method?: PaymentMethod;
    status?: PaymentStatus;
    minAmount?: number;
    maxAmount?: number;
  };
  columns?: string[];
  includeMetadata?: boolean;
}