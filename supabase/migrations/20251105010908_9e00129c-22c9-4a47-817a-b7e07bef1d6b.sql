-- Drop trigger first, then function, and recreate with proper search_path
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.direct_messages;
DROP FUNCTION IF EXISTS update_conversation_timestamp();

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now(), last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();