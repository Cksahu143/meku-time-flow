-- Add reply_to_message_id to messages table for message threading
ALTER TABLE public.messages 
ADD COLUMN reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add reply_to_message_id to direct_messages table for message threading
ALTER TABLE public.direct_messages 
ADD COLUMN reply_to_message_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL;

-- Add bio field to profiles table for enhanced user profiles
ALTER TABLE public.profiles 
ADD COLUMN bio text;

-- Add link preview fields to messages table
ALTER TABLE public.messages 
ADD COLUMN link_url text,
ADD COLUMN link_title text,
ADD COLUMN link_description text,
ADD COLUMN link_image text;

-- Add link preview fields to direct_messages table
ALTER TABLE public.direct_messages 
ADD COLUMN link_url text,
ADD COLUMN link_title text,
ADD COLUMN link_description text,
ADD COLUMN link_image text;

-- Create index for better query performance on reply threads
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to_message_id);
CREATE INDEX idx_direct_messages_reply_to ON public.direct_messages(reply_to_message_id);