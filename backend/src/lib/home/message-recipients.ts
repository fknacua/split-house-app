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
