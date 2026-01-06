-- Make chat-files bucket public so images can be viewed
UPDATE storage.buckets SET public = true WHERE id = 'chat-files';