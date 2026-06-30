export type Conversation = {
  id: string;
  coach_id: string;
  client_id: string;
  coach_name: string | null;
  client_name: string | null;
  created_at: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
