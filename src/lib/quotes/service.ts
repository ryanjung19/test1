import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookings, quoteItems, quotes } from "@/db/schema";

export type QuoteLineInput = {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export class QuoteValidationError extends Error {
  constructor(
    public readonly code:
      | "booking_not_found"
      | "invalid_quote_item"
      | "invalid_discount"
      | "quote_not_found"
      | "invalid_quote_status",
  ) {
    super(code);
    this.name = "QuoteValidationError";
  }
}

function validateLine(line: QuoteLineInput) {
  if (
    !line.category.trim() ||
    !line.description.trim() ||
    !Number.isInteger(line.quantity) ||
    line.quantity <= 0 ||
    !Number.isInteger(line.unitPrice) ||
    line.unitPrice < 0
  ) {
    throw new QuoteValidationError("invalid_quote_item");
  }
}

export async function createQuoteVersion(params: {
  bookingId: string;
  items: QuoteLineInput[];
  discountAmount?: number;
  vatRate?: number;
  validUntil?: Date;
  notes?: string;
}) {
  if (params.items.length === 0 || params.items.length > 100) {
    throw new QuoteValidationError("invalid_quote_item");
  }
  params.items.forEach(validateLine);

  const discountAmount = params.discountAmount ?? 0;
  const vatRate = params.vatRate ?? 10;
  if (
    !Number.isInteger(discountAmount) ||
    discountAmount < 0 ||
    !Number.isInteger(vatRate) ||
    vatRate < 0 ||
    vatRate > 100
  ) {
    throw new QuoteValidationError("invalid_discount");
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`quote:${params.bookingId}`})::bigint)`,
    );

    const [booking] = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);
    if (!booking) throw new QuoteValidationError("booking_not_found");

    const [latest] = await tx
      .select({ version: quotes.version })
      .from(quotes)
      .where(eq(quotes.bookingId, params.bookingId))
      .orderBy(desc(quotes.version))
      .limit(1);

    const computedItems = params.items.map((item, index) => ({
      ...item,
      amount: item.quantity * item.unitPrice,
      sortOrder: index,
    }));
    const subtotal = computedItems.reduce((sum, item) => sum + item.amount, 0);
    if (discountAmount > subtotal) {
      throw new QuoteValidationError("invalid_discount");
    }

    const taxable = subtotal - discountAmount;
    const vatAmount = Math.round((taxable * vatRate) / 100);
    const totalAmount = taxable + vatAmount;

    const [quote] = await tx
      .insert(quotes)
      .values({
        bookingId: params.bookingId,
        version: (latest?.version ?? 0) + 1,
        status: "draft",
        subtotal,
        discountAmount,
        vatAmount,
        totalAmount,
        validUntil: params.validUntil,
        notes: params.notes,
      })
      .returning();

    const insertedItems = await tx
      .insert(quoteItems)
      .values(
        computedItems.map((item) => ({
          quoteId: quote.id,
          category: item.category.trim(),
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      )
      .returning();

    return { quote, items: insertedItems };
  });
}

export async function updateQuoteStatus(params: {
  quoteId: string;
  status: "sent" | "accepted" | "rejected" | "expired" | "cancelled";
}) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, params.quoteId))
    .limit(1);
  if (!quote) throw new QuoteValidationError("quote_not_found");

  if (quote.status === "accepted" && params.status !== "cancelled") {
    throw new QuoteValidationError("invalid_quote_status");
  }

  const [updated] = await db
    .update(quotes)
    .set({ status: params.status, updatedAt: new Date() })
    .where(eq(quotes.id, params.quoteId))
    .returning();

  return updated;
}

export async function getLatestCustomerQuote(bookingId: string) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.bookingId, bookingId),
        sql`${quotes.status} in ('sent', 'accepted')`,
      ),
    )
    .orderBy(desc(quotes.version))
    .limit(1);

  if (!quote) return null;

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quote.id))
    .orderBy(quoteItems.sortOrder);

  return { quote, items };
}
