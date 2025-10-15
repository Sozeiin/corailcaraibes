-- Add barcode column to stock_items table
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Create index for barcode lookups
CREATE INDEX IF NOT EXISTS idx_stock_items_barcode ON public.stock_items(barcode);

-- Create sequence for barcode generation
CREATE SEQUENCE IF NOT EXISTS public.stock_barcode_seq START 1;

-- Create function to generate unique barcodes
CREATE OR REPLACE FUNCTION public.generate_unique_barcode()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_barcode TEXT;
  barcode_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate barcode with format STK-YYYYMMDD-XXXXX
    new_barcode := 'STK-' || 
                   TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
                   LPAD(nextval('public.stock_barcode_seq')::TEXT, 5, '0');
    
    -- Check if barcode already exists
    SELECT EXISTS(SELECT 1 FROM public.stock_items WHERE barcode = new_barcode) INTO barcode_exists;
    
    -- If unique, return it
    IF NOT barcode_exists THEN
      RETURN new_barcode;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger to auto-generate barcode on insert if null
CREATE OR REPLACE FUNCTION public.auto_generate_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if barcode is NULL
  IF NEW.barcode IS NULL OR NEW.barcode = '' THEN
    NEW.barcode := public.generate_unique_barcode();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on stock_items
DROP TRIGGER IF EXISTS trigger_auto_generate_barcode ON public.stock_items;
CREATE TRIGGER trigger_auto_generate_barcode
  BEFORE INSERT ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_barcode();