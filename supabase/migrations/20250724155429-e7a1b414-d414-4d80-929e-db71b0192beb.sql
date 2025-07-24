-- Add foreign key constraints that were missing
ALTER TABLE public.campaign_items 
ADD CONSTRAINT fk_campaign_items_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES public.bulk_purchase_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.supplier_quotes 
ADD CONSTRAINT fk_supplier_quotes_campaign_item_id 
FOREIGN KEY (campaign_item_id) REFERENCES public.campaign_items(id) ON DELETE CASCADE;

ALTER TABLE public.supplier_quotes 
ADD CONSTRAINT fk_supplier_quotes_supplier_id 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

ALTER TABLE public.quote_analysis 
ADD CONSTRAINT fk_quote_analysis_campaign_item_id 
FOREIGN KEY (campaign_item_id) REFERENCES public.campaign_items(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_base_distributions 
ADD CONSTRAINT fk_campaign_base_distributions_campaign_item_id 
FOREIGN KEY (campaign_item_id) REFERENCES public.campaign_items(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_base_distributions 
ADD CONSTRAINT fk_campaign_base_distributions_base_id 
FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE CASCADE;

-- Add constraints for selected references in campaign_items
ALTER TABLE public.campaign_items 
ADD CONSTRAINT fk_campaign_items_selected_supplier_id 
FOREIGN KEY (selected_supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.campaign_items 
ADD CONSTRAINT fk_campaign_items_selected_quote_id 
FOREIGN KEY (selected_quote_id) REFERENCES public.supplier_quotes(id) ON DELETE SET NULL;