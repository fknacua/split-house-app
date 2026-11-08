import type { SetupMessagesResponse } from '@splithouse/shared';

/** Props for {@link MessagesPage}. */
export interface MessagesPageProps {
  /** The page as the server wrote it. */
  page: SetupMessagesResponse;
}
