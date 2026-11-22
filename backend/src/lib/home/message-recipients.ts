/** A charge, as much of it as the message rules need. */
export interface MessageCharge {
  personId: string;
  payViaPersonId: string | null;
  category: string;
}

/**
 * Who gets a monthly message once the utilities bill is in: the person who pays each utilities
 * charge. Someone paid via another person rides in that person's message, 
 * 
 * Rent and recurring charges do not need a message,
 * so a tenant who only pays rent directly gets none either. The owner's own charges are not
 * payments to anyone.
 *
 * @param charges - The month's charges.
 * @param ownerIds - The people who own the household.
 * @returns The ids of the people to message, each once, in the order they first appear.
 */
export function messageRecipientIds(charges: MessageCharge[], ownerIds: Set<string>): string[] {
  const payers = charges
    .filter((c) => c.category === "UTILITIES" && !ownerIds.has(c.personId))
    .map((c) => c.payViaPersonId ?? c.personId);
  return [...new Set(payers)];
}

/**
 * Who has had their monthly message opened.
 *
 * @param messages - The month's message events, nudges included.
 * @returns The ids of the people with a MONTHLY event, each once.
 */
export function monthlyMessagedIds(messages: { personId: string; kind: string }[]): string[] {
  return [...new Set(messages.filter((m) => m.kind === "MONTHLY").map((m) => m.personId))];
}

/**
 * Who still has no monthly message.
 *
 * @param recipientIds - The people to message, from `messageRecipientIds`.
 * @param sentToIds - The people with a MONTHLY message event for the month.
 * @returns The recipients with no event yet.
 */
export function unsentRecipientIds(recipientIds: string[], sentToIds: string[]): string[] {
  const sent = new Set(sentToIds);
  return recipientIds.filter((id) => !sent.has(id));
}

/** The categories that go in the monthly message and read `Not sent` until it goes out: utilities and what Add charge (and a higher correction) adds. Rent and recurring charges never do. */
const MESSAGE_CATEGORIES = new Set(["UTILITIES", "AIRCON", "ONE_OFF", "CORRECTION"]);

/** A charge, as much of it as the unsent rules need. */
export interface UnsentCharge extends MessageCharge {
  amountCents: number;
  paidCents: number | null;
  createdAt: Date;
}

/** A message event, as much of it as the unsent rules need. */
export interface UnsentMessage {
  personId: string;
  kind: string;
  openedAt: Date;
}

/** What `isChargeUnsent` reads, worked out once for the month. */
export interface UnsentContext {
  ownerIds: Set<string>;
  /** Who gets a monthly message, from `messageRecipientIds`. */
  recipientIds: Set<string>;
  /** Each person's latest monthly message. Someone with none is not in it. */
  lastMonthlyAt: Map<string, Date>;
}

/**
 * Works out the month's unsent context once, for `isChargeUnsent` and `unsentAgainIds`.
 *
 * @param charges - The month's charges.
 * @param messages - The month's message events, nudges included.
 * @param ownerIds - The people who own the household.
 * @returns The context.
 */
export function unsentContext(charges: MessageCharge[], messages: UnsentMessage[], ownerIds: Set<string>): UnsentContext {
  const lastMonthlyAt = new Map<string, Date>();
  for (const m of messages) {
    if (m.kind !== "MONTHLY") continue;
    const last = lastMonthlyAt.get(m.personId);
    if (!last || m.openedAt > last) lastMonthlyAt.set(m.personId, m.openedAt);
  }
  return { ownerIds, recipientIds: new Set(messageRecipientIds(charges, ownerIds)), lastMonthlyAt };
}

/**
 * Whether a charge reads `Not sent`: unpaid, not the owner's, and either waiting for its payer's first monthly
 * message (a utilities, aircon, one-off or correction charge of someone who gets one), or added after its payer's
 * last monthly message (any charge: "unsent again"). For a charge paid via someone, the payer is that person.
 *
 * @param charge - The charge.
 * @param context - The month's context, from `unsentContext`.
 * @returns True when the charge is not in a message that went out.
 */
export function isChargeUnsent(charge: UnsentCharge, context: UnsentContext): boolean {
  if (charge.paidCents !== null || charge.amountCents <= 0 || context.ownerIds.has(charge.personId)) return false;
  const payerId = charge.payViaPersonId ?? charge.personId;
  const last = context.lastMonthlyAt.get(payerId);
  if (last) return charge.createdAt > last;
  return MESSAGE_CATEGORIES.has(charge.category) && context.recipientIds.has(payerId);
}

/**
 * Who has had a monthly message but has an unpaid charge added since ("unsent again"): sending the monthly message
 * again and confirming it clears them. For a charge paid via someone, the payer is that person.
 *
 * @param charges - The month's charges.
 * @param context - The month's context, from `unsentContext`.
 * @returns Their ids, each once, in the order their charges appear.
 */
export function unsentAgainIds(charges: UnsentCharge[], context: UnsentContext): string[] {
  const payers = charges
    .filter((c) => context.lastMonthlyAt.has(c.payViaPersonId ?? c.personId) && isChargeUnsent(c, context))
    .map((c) => c.payViaPersonId ?? c.personId);
  return [...new Set(payers)];
}
