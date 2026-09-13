import type { AppendOnlyEntity } from './base';
import type { AiRole } from './enums';

/** Append-only message within an AI conversation. */
export interface AiMessage extends AppendOnlyEntity {
  conversationId: number;
  role: AiRole;
  content: string;
  isGuardrailBlocked: boolean;
  blockedTopic: string | null;
  tokenCount: number | null;
}
