import { messageTemplatesSchema, type MessageTemplates } from "@splithouse/shared";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";

const SINGLETON = { id: "singleton" } as const;

/** The read of the wording, so tests can pass an in-memory fake. */
export interface MessageTemplatesDb {
  messageTemplates: {
    findUnique(args: { where: typeof SINGLETON; select: { templates: true } }): Promise<{ templates: unknown } | null>;
  };
}

/**
 * Reads the current message wording. Read-only.
 *
 * @param db - The Prisma client, a transaction, or a fake in tests.
 * @returns The saved wording, or the Brief's defaults before the first save.
 * @throws {ZodError} When the stored JSON does not match the schema.
 */
export async function readMessageTemplates(db: MessageTemplatesDb): Promise<MessageTemplates> {
  const row = await db.messageTemplates.findUnique({ where: SINGLETON, select: { templates: true } });
  return row ? messageTemplatesSchema.parse(row.templates) : DEFAULT_MESSAGE_TEMPLATES;
}

/** The write of the wording, so tests can pass an in-memory fake. */
export interface MessageTemplatesWriteDb {
  messageTemplates: {
    upsert(args: {
      where: typeof SINGLETON;
      create: { templates: MessageTemplates };
      update: { templates: MessageTemplates };
    }): Promise<unknown>;
  };
}

/**
 * Stores the message wording, which applies immediately.
 *
 * @param db - The Prisma client, or a fake in tests.
 * @param templates - The whole wording.
 */
export async function writeMessageTemplates(db: MessageTemplatesWriteDb, templates: MessageTemplates): Promise<void> {
  await db.messageTemplates.upsert({ where: SINGLETON, create: { templates }, update: { templates } });
}
