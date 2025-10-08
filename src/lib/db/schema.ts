import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  wallet: varchar('wallet', { length: 42 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('wallet_idx').on(table.wallet),
  emailIdx: index('email_idx').on(table.email),
}));

// Apps table
export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  payoutSettings: jsonb('payout_settings'),
  webhookUrl: varchar('webhook_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('apps_user_id_idx').on(table.userId),
}));

// Invoices table
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id).notNull(),
  amount: decimal('amount', { precision: 18, scale: 8 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  externalChain: varchar('external_chain', { length: 50 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  memo: text('memo'),
  dueAt: timestamp('due_at'),
  paidAt: timestamp('paid_at'),
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  appIdIdx: index('invoices_app_id_idx').on(table.appId),
  statusIdx: index('invoices_status_idx').on(table.status),
  dueAtIdx: index('invoices_due_at_idx').on(table.dueAt),
}));

// Payments table
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  externalChain: varchar('external_chain', { length: 50 }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }).notNull(),
  payer: varchar('payer', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 18, scale: 8 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  blockNumber: integer('block_number'),
  blockHash: varchar('block_hash', { length: 66 }),
  gasUsed: decimal('gas_used', { precision: 18, scale: 0 }),
  gasFee: decimal('gas_fee', { precision: 18, scale: 8 }),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'),
  metadata: jsonb('metadata'),
}, (table) => ({
  invoiceIdIdx: index('payments_invoice_id_idx').on(table.invoiceId),
  txHashIdx: index('payments_tx_hash_idx').on(table.txHash),
  payerIdx: index('payments_payer_idx').on(table.payer),
  statusIdx: index('payments_status_idx').on(table.status),
}));

// Withdrawals table
export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id).notNull(),
  amount: decimal('amount', { precision: 18, scale: 8 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  destinationAddress: varchar('destination_address', { length: 255 }).notNull(),
  destinationChain: varchar('destination_chain', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  executedAt: timestamp('executed_at'),
  executedTx: varchar('executed_tx', { length: 66 }),
  fee: decimal('fee', { precision: 18, scale: 8 }),
  metadata: jsonb('metadata'),
}, (table) => ({
  appIdIdx: index('withdrawals_app_id_idx').on(table.appId),
  statusIdx: index('withdrawals_status_idx').on(table.status),
  executedTxIdx: index('withdrawals_executed_tx_idx').on(table.executedTx),
}));

// Transactions table
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'payment', 'withdrawal', 'fee'
  chain: varchar('chain', { length: 50 }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }).notNull(),
  amount: decimal('amount', { precision: 18, scale: 8 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  fee: decimal('fee', { precision: 18, scale: 8 }),
  status: varchar('status', { length: 20 }).notNull(),
  blockNumber: integer('block_number'),
  fromAddress: varchar('from_address', { length: 255 }),
  toAddress: varchar('to_address', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  appIdIdx: index('transactions_app_id_idx').on(table.appId),
  typeIdx: index('transactions_type_idx').on(table.type),
  chainIdx: index('transactions_chain_idx').on(table.chain),
  txHashIdx: index('transactions_tx_hash_idx').on(table.txHash),
  statusIdx: index('transactions_status_idx').on(table.status),
}));

// Fee Plans table
export const feePlans = pgTable('fee_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  model: varchar('model', { length: 20 }).notNull(), // 'flat', 'percentage', 'tiered'
  bps: integer('bps'), // basis points for percentage model
  flatFee: decimal('flat_fee', { precision: 18, scale: 8 }),
  tiers: jsonb('tiers'), // for tiered pricing
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  appIdIdx: index('fee_plans_app_id_idx').on(table.appId),
  modelIdx: index('fee_plans_model_idx').on(table.model),
}));

// Fee Quotes table
export const feeQuotes = pgTable('fee_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  networkFee: decimal('network_fee', { precision: 18, scale: 8 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 18, scale: 8 }).notNull(),
  totalFee: decimal('total_fee', { precision: 18, scale: 8 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  chain: varchar('chain', { length: 50 }).notNull(),
  gasPrice: decimal('gas_price', { precision: 18, scale: 0 }),
  gasLimit: integer('gas_limit'),
  expiresAt: timestamp('expires_at').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
}, (table) => ({
  invoiceIdIdx: index('fee_quotes_invoice_id_idx').on(table.invoiceId),
  expiresAtIdx: index('fee_quotes_expires_at_idx').on(table.expiresAt),
}));

// Balances table (for real-time balance tracking)
export const balances = pgTable('balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  available: decimal('available', { precision: 18, scale: 8 }).default('0').notNull(),
  pending: decimal('pending', { precision: 18, scale: 8 }).default('0').notNull(),
  reserved: decimal('reserved', { precision: 18, scale: 8 }).default('0').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  appIdCurrencyIdx: index('balances_app_id_currency_idx').on(table.appId, table.currency),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  apps: many(apps),
}));

export const appsRelations = relations(apps, ({ one, many }) => ({
  user: one(users, {
    fields: [apps.userId],
    references: [users.id],
  }),
  invoices: many(invoices),
  withdrawals: many(withdrawals),
  transactions: many(transactions),
  feePlans: many(feePlans),
  balances: many(balances),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  app: one(apps, {
    fields: [invoices.appId],
    references: [apps.id],
  }),
  payments: many(payments),
  feeQuotes: many(feeQuotes),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  app: one(apps, {
    fields: [withdrawals.appId],
    references: [apps.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  app: one(apps, {
    fields: [transactions.appId],
    references: [apps.id],
  }),
}));

export const feePlansRelations = relations(feePlans, ({ one }) => ({
  app: one(apps, {
    fields: [feePlans.appId],
    references: [apps.id],
  }),
}));

export const feeQuotesRelations = relations(feeQuotes, ({ one }) => ({
  invoice: one(invoices, {
    fields: [feeQuotes.invoiceId],
    references: [invoices.id],
  }),
}));

export const balancesRelations = relations(balances, ({ one }) => ({
  app: one(apps, {
    fields: [balances.appId],
    references: [apps.id],
  }),
}));