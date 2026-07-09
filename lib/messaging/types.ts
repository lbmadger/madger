export type Conversation = {
  id: string;
  coach_id: string;
  client_id: string;
  coach_name: string | null;
  client_name: string | null;
  created_at: string;
  last_message_at: string;
  // État de lecture par participant (migration 0041). Optionnels : absents
  // tant que la migration n'est pas passée.
  coach_last_read_at?: string | null;
  client_last_read_at?: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
