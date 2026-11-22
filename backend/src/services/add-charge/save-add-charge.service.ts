import { addChargeResponseSchema, parseHouseholdConfig, type AddChargeRequest, type AddChargeResponse } from "@splithouse/shared";
import { addChargeProblem, buildAddChargeCharges, type AddChargePerson } from "@/lib/add-charge/build-add-charge";
import { ApiError } from "@/lib/api";
import { readMessageTemplates, type MessageTemplatesDb } from "@/services/templates/message-templates.service";

/** What a key is stored under, so a key is never answered with another endpoint's response. */
const ENDPOINT = "POST /api/add-charge";

const MONTH_SELECT = {
  month: true,
  householdVersionId: true,
  householdVersion: { select: { schemaVersion: true, config: true } },
} as const;
const PERSON_SELECT = { id: true, name: true, color: true } as const;

/** The slice of the Prisma client, or of a transaction, that reads a stored response. */
interface IdempotentRequestDb {
  idempotentRequest: {
    findUnique(args: {
      where: { key: string };
      select: { endpoint: true; response: true };
    }): Promise<{ endpoint: string; response: unknown } | null>;
  };
}

/** The transaction client's slice this service uses, so tests can pass an in-memory fake. */
export interface SaveAddChargeTx extends IdempotentRequestDb, MessageTemplatesDb {
  idempotentRequest: IdempotentRequestDb["idempotentRequest"] & {
    create(args: { data: { key: string; endpoint: string; response: AddChargeResponse } }): Promise<unknown>;
  };
  month: {
    findFirst(args: { orderBy: { month: "desc" }; select: typeof MONTH_SELECT }): Promise<{
      month: string;
      householdVersionId: string;
      householdVersion: { schemaVersion: number; config: unknown };
    } | null>;
  };
  person: {
    findMany(args: { select: typeof PERSON_SELECT }): Promise<AddChargePerson[]>;
  };
  chargeGroup: {
    create(args: {
      data: { scope: "SHARED"; splitMethod: "EQUAL" | "PER_SHARE" | "PER_UNIT" | "CUSTOM"; totalCents: number };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
  charge: {
    createManyAndReturn(args: {
      data: {
        month: string;
        personId: string;
        payViaPersonId: string | null;
        category: "AIRCON" | "ONE_OFF";
        label: string;
        amountCents: number;
        dueDate: Date;
        chargeGroupId: string | null;
        householdVersionId: string;
      }[];
      select: { id: true };
    }): Promise<{ id: string }[]>;
  };
}

/** The Prisma client's slice this service uses. */
export interface SaveAddChargeDb extends IdempotentRequestDb {
  $transaction<T>(fn: (tx: SaveAddChargeTx) => Promise<T>): Promise<T>;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

/**
 * The response stored under a key by an earlier save, or null when the key is new.
 *
 * @throws {ApiError} 409 `key_reused` when the key was stored by another endpoint.
 */
async function storedResponse(db: IdempotentRequestDb, key: string): Promise<AddChargeResponse | null> {
  const row = await db.idempotentRequest.findUnique({ where: { key }, select: { endpoint: true, response: true } });
  if (!row) return null;
  if (row.endpoint !== ENDPOINT) throw new ApiError(409, "key_reused", "This request key was already used for something else.");
  return addChargeResponseSchema.parse(row.response);
}

/**
 * Saves an Add charge charge in the newest opened month, in one transaction: for aircon or a shared Other, a
 * `ChargeGroup` and one charge per person with an amount (the owner's own share included), for Personal one charge.
 * The charges come from the split engine through the same builder as the preview, with the version pinned to the
 * month, its routes, and the due date picked in the sheet; aircon is stored under the message templates' aircon
 * line label. A settled month unsettles, since it now has unpaid charges. The response is stored under the request's
 * key, so a repeated key (a Retry after a lost response) answers the same without saving again.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param request - The fields and the idempotency key.
 * @returns The month and the stored ids.
 * @throws {ApiError} 422 `no_kind`, `no_label`, `no_amount`, `no_who`, `no_date` or `split_mismatch` for fields that
 * can't be saved; 404 `no_person` for a Personal pick who isn't in the month's household or is the owner; 404
 * `no_month` while no month has opened; 409 `key_reused` for a key another endpoint stored.
 */
export async function saveAddCharge(db: SaveAddChargeDb, request: AddChargeRequest): Promise<AddChargeResponse> {
  const { idempotencyKey: key, ...values } = request;
  const earlier = await storedResponse(db, key);
  if (earlier) return earlier;
  try {
    return await db.$transaction(async (tx) => {
      const raced = await storedResponse(tx, key);
      if (raced) return raced;

      const [newest, people] = await Promise.all([
        tx.month.findFirst({ orderBy: { month: "desc" }, select: MONTH_SELECT }),
        tx.person.findMany({ select: PERSON_SELECT }),
      ]);
      if (!newest) throw new ApiError(404, "no_month", "No month is open yet.");
      const { schemaVersion, config } = newest.householdVersion;
      const input = { month: newest.month, config: parseHouseholdConfig(schemaVersion, config), people };

      const problem = addChargeProblem(input, values);
      if (problem) throw new ApiError(problem.status, problem.code, problem.message);
      const { lineLabels } = await readMessageTemplates(tx);
      const charges = buildAddChargeCharges(input, values, lineLabels.AIRCON);
      // addChargeProblem refuses every case the builder can't make charges for.
      if (!charges || values.amountCents === null) throw new Error("Add charge fields passed the checks but made no charges");

      const personal = values.kind === "ONE_OFF" && values.scope === "PERSONAL";
      const group = personal
        ? null
        : await tx.chargeGroup.create({
            data: {
              scope: "SHARED",
              splitMethod: values.kind === "AIRCON" ? "PER_UNIT" : values.split,
              totalCents: values.amountCents,
            },
            select: { id: true },
          });
      const rows = await tx.charge.createManyAndReturn({
        data: charges.map((c) => ({
          month: newest.month,
          personId: c.personId,
          payViaPersonId: c.payViaPersonId,
          category: c.category as "AIRCON" | "ONE_OFF",
          label: c.label,
          amountCents: c.amountCents,
          dueDate: new Date(c.dueDate ?? ""),
          chargeGroupId: group?.id ?? null,
          householdVersionId: newest.householdVersionId,
        })),
        select: { id: true },
      });

      const response: AddChargeResponse = { month: newest.month, chargeGroupId: group?.id ?? null, chargeIds: rows.map((r) => r.id) };
      await tx.idempotentRequest.create({ data: { key, endpoint: ENDPOINT, response } });
      return response;
    });
  } catch (err) {
    // Two taps with the same key at once: the second's insert loses, so it answers with the first's response.
    if (isUniqueViolation(err)) {
      const winner = await storedResponse(db, key);
      if (winner) return winner;
    }
    throw err;
  }
}
