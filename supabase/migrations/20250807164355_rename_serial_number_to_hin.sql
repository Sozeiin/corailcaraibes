ALTER TABLE public.boats RENAME COLUMN serial_number TO hin;
ALTER TABLE public.boats ADD COLUMN hull_number TEXT;
