-- Migration: Update website storage bucket to support video files
-- Description: Add video MIME types (including .mov/quicktime) and increase file size limit for videos

-- Update the website bucket to allow video MIME types and increase file size limit
-- 104857600 bytes = 100MB (to support video uploads up to 100MB)
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'  -- For .mov files
  ],
  file_size_limit = 104857600  -- 100MB in bytes
WHERE id = 'website';

-- If the bucket doesn't exist yet, this will be handled by migration 005
-- This migration assumes the bucket already exists from migration 005
