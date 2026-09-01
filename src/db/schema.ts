import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "sales",
  "operator",
  "read_only",
]);

export const prospectStatusEnum = pgEnum("prospect_status", [
  "new",
  "reviewed",
  "approved",
  "rejected",
  "converted",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "qualified",
  "contacted",
  "responded",
  "opportunity",
  "won",
  "lost",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "outbound",
  "inbound",
  "referral",
  "website",
  "chatbot",
  "kakao",
  "instagram",
  "facebook",
  "search_ad",
  "social_ad",
  "phone",
  "email",
  "other",
]);

export const interactionChannelEnum = pgEnum("interaction_channel", [
  "phone",
  "email",
  "website",
  "chatbot",
  "kakao",
  "instagram",
  "facebook",
  "sms",
  "meeting",
  "ad",
  "note",
  "other",
]);

export const interactionDirectionEnum = pgEnum("interaction_direction", [
  "inbound",
  "outbound",
  "internal",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "inquiry",
  "hold",
  "tentative",
  "confirmed",
  "completed",
  "cancelled",
]);

export const blockTypeEnum = pgEnum("block_type", [
  "hold",
  "booking",
  "setup",
  "teardown",
  "internal",
  "maintenance",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "not_required",
  "draft",
  "sent",
  "signed",
  "cancelled",
]);

export const paymentRequestStatusEnum = pgEnum("payment_request_status", [
  "pending",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "bank_transfer",
  "virtual_account",
  "card_online",
  "card_offline",
  "cash",
  "other",
]);

export const paymentKindEnum = pgEnum("payment_kind", [
  "deposit",
  "interim",
  "balance",
  "additional",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "charge",
  "refund",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "succeeded",
  "failed",
  "cancelled",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)],
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    externalAuthId: varchar("external_auth_id", { length: 255 }),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    role: memberRoleEnum("role").notNull().default("operator"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("members_org_email_uidx").on(table.organizationId, table.email),
    index("members_org_idx").on(table.organizationId),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    address: text("address"),
    timezone: varchar("timezone", { length: 80 }).notNull().default("Asia/Seoul"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("venues_org_slug_uidx").on(table.organizationId, table.slug),
    index("venues_org_idx").on(table.organizationId),
  ],
);

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    floor: varchar("floor", { length: 40 }),
    capacity: integer("capacity"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("spaces_venue_code_uidx").on(table.venueId, table.code),
    index("spaces_venue_idx").on(table.venueId),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    businessNumber: varchar("business_number", { length: 40 }),
    websiteUrl: text("website_url"),
    industry: varchar("industry", { length: 120 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customers_org_name_idx").on(table.organizationId, table.name)],
);

export const customerContacts = pgTable(
  "customer_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    title: varchar("title", { length: 120 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 60 }),
    kakaoId: varchar("kakao_id", { length: 160 }),
    socialHandle: varchar("social_handle", { length: 160 }),
    primaryContact: boolean("primary_contact").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customer_contacts_customer_idx").on(table.customerId)],
);

export const prospects = pgTable(
  "prospects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    companyName: varchar("company_name", { length: 200 }).notNull(),
    segment: varchar("segment", { length: 120 }).notNull(),
    status: prospectStatusEnum("status").notNull().default("new"),
    sourceType: varchar("source_type", { length: 80 }),
    sourceUrl: text("source_url"),
    websiteUrl: text("website_url"),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 60 }),
    socialHandle: varchar("social_handle", { length: 160 }),
    fitScore: integer("fit_score"),
    rationale: text("rationale"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>(),
    dedupeKey: varchar("dedupe_key", { length: 255 }),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    index("prospects_org_status_idx").on(table.organizationId, table.status),
    index("prospects_org_segment_idx").on(table.organizationId, table.segment),
    uniqueIndex("prospects_org_dedupe_uidx").on(table.organizationId, table.dedupeKey),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    prospectId: uuid("prospect_id").references(() => prospects.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => customerContacts.id, { onDelete: "set null" }),
    ownerMemberId: uuid("owner_member_id").references(() => members.id, { onDelete: "set null" }),
    title: varchar("title", { length: 240 }).notNull(),
    segment: varchar("segment", { length: 120 }),
    source: leadSourceEnum("source").notNull(),
    status: leadStatusEnum("status").notNull().default("new"),
    expectedValue: integer("expected_value"),
    probability: integer("probability"),
    eventDateFrom: timestamp("event_date_from", { withTimezone: true }),
    eventDateTo: timestamp("event_date_to", { withTimezone: true }),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_org_status_idx").on(table.organizationId, table.status),
    index("leads_owner_next_action_idx").on(table.ownerMemberId, table.nextActionAt),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => customerContacts.id, { onDelete: "set null" }),
    ownerMemberId: uuid("owner_member_id").references(() => members.id, { onDelete: "set null" }),
    bookingNumber: varchar("booking_number", { length: 60 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    eventType: varchar("event_type", { length: 120 }),
    status: bookingStatusEnum("status").notNull().default("inquiry"),
    customerName: varchar("customer_name", { length: 200 }),
    customerEmail: varchar("customer_email", { length: 320 }),
    customerPhone: varchar("customer_phone", { length: 60 }),
    attendeeCount: integer("attendee_count"),
    eventStartsAt: timestamp("event_starts_at", { withTimezone: true }),
    eventEndsAt: timestamp("event_ends_at", { withTimezone: true }),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookings_org_number_uidx").on(table.organizationId, table.bookingNumber),
    index("bookings_venue_status_idx").on(table.venueId, table.status),
    index("bookings_event_range_idx").on(table.venueId, table.eventStartsAt, table.eventEndsAt),
  ],
);

export const bookingSpaces = pgTable(
  "booking_spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("booking_spaces_booking_space_uidx").on(table.bookingId, table.spaceId),
    index("booking_spaces_space_idx").on(table.spaceId),
  ],
);

export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    type: blockTypeEnum("type").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isBlocking: boolean("is_blocking").notNull().default(true),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("schedule_blocks_space_time_idx").on(table.spaceId, table.startsAt, table.endsAt),
    index("schedule_blocks_booking_idx").on(table.bookingId),
  ],
);

export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => customerContacts.id, { onDelete: "set null" }),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    channel: interactionChannelEnum("channel").notNull(),
    direction: interactionDirectionEnum("direction").notNull(),
    subject: varchar("subject", { length: 240 }),
    summary: text("summary"),
    externalId: varchar("external_id", { length: 255 }),
    externalUrl: text("external_url"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("interactions_lead_time_idx").on(table.leadId, table.occurredAt),
    index("interactions_booking_time_idx").on(table.bookingId, table.occurredAt),
  ],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    status: quoteStatusEnum("status").notNull().default("draft"),
    subtotal: integer("subtotal").notNull().default(0),
    discountAmount: integer("discount_amount").notNull().default(0),
    vatAmount: integer("vat_amount").notNull().default(0),
    totalAmount: integer("total_amount").notNull().default(0),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("quotes_booking_version_uidx").on(table.bookingId, table.version),
    index("quotes_booking_status_idx").on(table.bookingId, table.status),
  ],
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 100 }).notNull(),
    description: varchar("description", { length: 240 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull().default(0),
    amount: integer("amount").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("quote_items_quote_idx").on(table.quoteId)],
);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    status: contractStatusEnum("status").notNull().default("draft"),
    documentUrl: text("document_url"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contracts_booking_idx").on(table.bookingId)],
);

export const paymentRequests = pgTable(
  "payment_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
    kind: paymentKindEnum("kind").notNull(),
    status: paymentRequestStatusEnum("status").notNull().default("pending"),
    amount: integer("amount").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    memo: text("memo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_requests_booking_idx").on(table.bookingId),
    index("payment_requests_due_status_idx").on(table.status, table.dueAt),
  ],
);

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    paymentRequestId: uuid("payment_request_id").references(() => paymentRequests.id, {
      onDelete: "set null",
    }),
    type: transactionTypeEnum("type").notNull(),
    method: paymentMethodEnum("method").notNull(),
    status: transactionStatusEnum("status").notNull().default("pending"),
    provider: varchar("provider", { length: 80 }),
    providerPaymentId: varchar("provider_payment_id", { length: 255 }),
    amount: integer("amount").notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_transactions_booking_idx").on(table.bookingId, table.createdAt),
    index("payment_transactions_provider_idx").on(table.provider, table.providerPaymentId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorType: varchar("actor_type", { length: 40 }).notNull(),
    actorId: varchar("actor_id", { length: 255 }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 120 }).notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_org_time_idx").on(table.organizationId, table.createdAt)],
);
