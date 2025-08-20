-- Create stock item quotes table
CREATE TABLE public.stock_item_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  quote_number TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  minimum_quantity INTEGER NOT NULL DEFAULT 1,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE,
  delivery_days INTEGER DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'requested',
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_terms TEXT,
  warranty_months INTEGER DEFAULT 0,
  notes TEXT,
  attachment_url TEXT,
  requested_by UUID,
  response_date DATE,
  selected_at TIMESTAMP WITH TIME ZONE,
  selected_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('requested', 'received', 'expired', 'selected', 'rejected', 'cancelled')),
  CONSTRAINT valid_currency CHECK (currency IN ('EUR', 'USD', 'GBP')),
  CONSTRAINT positive_price CHECK (unit_price >= 0),
  CONSTRAINT positive_quantity CHECK (minimum_quantity > 0)
);

-- Enable RLS
ALTER TABLE public.stock_item_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for stock item quotes
CREATE POLICY "Users can view quotes for items in their base" 
ON public.stock_item_quotes 
FOR SELECT 
USING (
  get_user_role() = 'direction' OR 
  EXISTS (
    SELECT 1 FROM stock_items si 
    WHERE si.id = stock_item_quotes.stock_item_id 
    AND si.base_id = get_user_base_id()
  )
);

CREATE POLICY "Direction and chef_base can manage quotes" 
ON public.stock_item_quotes 
FOR ALL 
USING (
  get_user_role() = ANY(ARRAY['direction', 'chef_base']) AND (
    get_user_role() = 'direction' OR 
    EXISTS (
      SELECT 1 FROM stock_items si 
      WHERE si.id = stock_item_quotes.stock_item_id 
      AND si.base_id = get_user_base_id()
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_stock_item_quotes_stock_item_id ON public.stock_item_quotes(stock_item_id);
CREATE INDEX idx_stock_item_quotes_supplier_id ON public.stock_item_quotes(supplier_id);
CREATE INDEX idx_stock_item_quotes_status ON public.stock_item_quotes(status);
CREATE INDEX idx_stock_item_quotes_quote_date ON public.stock_item_quotes(quote_date DESC);

-- Create updated_at trigger
CREATE TRIGGER update_stock_item_quotes_updated_at
  BEFORE UPDATE ON public.stock_item_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhance the purchase history table with quote reference
ALTER TABLE public.component_purchase_history 
ADD COLUMN IF NOT EXISTS quote_id UUID;

-- Add comment for documentation
COMMENT ON TABLE public.stock_item_quotes IS 'Stores quotes from suppliers for stock items with price comparison and history';
COMMENT ON COLUMN public.stock_item_quotes.status IS 'Quote status: requested, received, expired, selected, rejected, cancelled';
COMMENT ON COLUMN public.stock_item_quotes.delivery_days IS 'Expected delivery time in days from order';
COMMENT ON COLUMN public.stock_item_quotes.validity_date IS 'Date until which the quote is valid';