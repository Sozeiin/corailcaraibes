-- Create purchasing workflow table for advanced approval processes
CREATE TABLE public.purchasing_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL DEFAULT 'standard', -- standard, bulk, urgent
  current_step TEXT NOT NULL DEFAULT 'created', -- created, manager_review, finance_review, approved, rejected
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchasing_workflows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Direction can manage all workflows"
ON public.purchasing_workflows
FOR ALL
USING (get_user_role() = 'direction'::user_role);

CREATE POLICY "Users can view workflows for their base"
ON public.purchasing_workflows
FOR SELECT
USING (
  get_user_role() = 'direction'::user_role OR
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = purchasing_workflows.order_id
    AND o.base_id = get_user_base_id()
  )
);

-- Create purchasing templates table
CREATE TABLE public.purchasing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for templates
ALTER TABLE public.purchasing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Direction and chef_base can manage templates"
ON public.purchasing_templates
FOR ALL
USING (get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- Create purchasing analytics materialized view
CREATE MATERIALIZED VIEW public.purchasing_analytics AS
SELECT 
  DATE_TRUNC('month', o.created_at) as month,
  o.base_id,
  b.name as base_name,
  s.category as supplier_category,
  COUNT(*) as order_count,
  SUM(o.total_amount) as total_amount,
  AVG(o.total_amount) as avg_order_value,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered_count,
  COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_count
FROM public.orders o
LEFT JOIN public.bases b ON b.id = o.base_id
LEFT JOIN public.suppliers s ON s.id = o.supplier_id
WHERE o.created_at >= NOW() - INTERVAL '2 years'
GROUP BY DATE_TRUNC('month', o.created_at), o.base_id, b.name, s.category;

-- Create index for better performance
CREATE INDEX idx_purchasing_analytics_month_base ON public.purchasing_analytics (month, base_id);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION public.refresh_purchasing_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.purchasing_analytics;
END;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_purchasing_workflows_updated_at
BEFORE UPDATE ON public.purchasing_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchasing_templates_updated_at
BEFORE UPDATE ON public.purchasing_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();