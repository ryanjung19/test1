import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookings, contracts } from "@/db/schema";

export class ContractValidationError extends Error {
  constructor(
    public readonly code:
      | "booking_not_found"
      | "contract_not_found"
      | "invalid_contract_status"
      | "signed_contract_locked",
  ) {
    super(code);
    this.name = "ContractValidationError";
  }
}

export async function saveContract(params: {
  bookingId: string;
  documentUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`contract:${params.bookingId}`})::bigint)`,
    );

    const [booking] = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);
    if (!booking) throw new ContractValidationError("booking_not_found");

    const [existing] = await tx
      .select()
      .from(contracts)
      .where(eq(contracts.bookingId, params.bookingId))
      .orderBy(desc(contracts.createdAt))
      .limit(1);

    if (existing?.status === "signed") {
      throw new ContractValidationError("signed_contract_locked");
    }

    if (existing) {
      const [updated] = await tx
        .update(contracts)
        .set({
          documentUrl: params.documentUrl,
          metadata: params.metadata,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await tx
      .insert(contracts)
      .values({
        bookingId: params.bookingId,
        status: "draft",
        documentUrl: params.documentUrl,
        metadata: params.metadata,
      })
      .returning();

    return created;
  });
}

export async function updateContractStatus(params: {
  contractId: string;
  status: "not_required" | "draft" | "sent" | "signed" | "cancelled";
}) {
  return db.transaction(async (tx) => {
    const [contract] = await tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, params.contractId))
      .limit(1);
    if (!contract) throw new ContractValidationError("contract_not_found");

    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`contract:${contract.bookingId}`})::bigint)`,
    );

    if (contract.status === "signed" && params.status !== "signed") {
      throw new ContractValidationError("signed_contract_locked");
    }
    if (params.status === "sent" && !contract.documentUrl) {
      throw new ContractValidationError("invalid_contract_status");
    }

    const now = new Date();
    const [updated] = await tx
      .update(contracts)
      .set({
        status: params.status,
        sentAt: params.status === "sent" ? contract.sentAt ?? now : contract.sentAt,
        signedAt: params.status === "signed" ? contract.signedAt ?? now : contract.signedAt,
        updatedAt: now,
      })
      .where(eq(contracts.id, contract.id))
      .returning();

    return updated;
  });
}

export async function getCurrentContract(bookingId: string) {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.bookingId, bookingId))
    .orderBy(desc(contracts.createdAt))
    .limit(1);

  return contract ?? null;
}
