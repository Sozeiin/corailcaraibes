-- Add distribution page permission
ALTER TYPE public.page_permission ADD VALUE IF NOT EXISTS 'distribution';
