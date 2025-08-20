-- Step 1: Drop the materialized view that depends on the status column
DROP MATERIALIZED VIEW IF EXISTS public.purchasing_analytics;

-- Step 2: Add missing workflow statuses to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'supplier_search';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'order_confirmed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'received_scanned';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'rejected';

-- Step 3: Update the orders table status column to allow text values
-- This allows both old enum values and new workflow statuses
ALTER TABLE public.orders 
ALTER COLUMN status TYPE text;

-- Step 4: Recreate the purchasing_analytics materialized view with updated logic
CREATE MATERIALIZED VIEW public.purchasing_analytics AS
SELECT 
    date_trunc('month'::text, o.created_at) AS month,
    o.base_id,
    b.name AS base_name,
    s.category AS supplier_category,
    count(*) AS order_count,
    sum(o.total_amount) AS total_amount,
    avg(o.total_amount) AS avg_order_value,
    count(
        CASE
            WHEN (o.status IN ('delivered', 'completed')) THEN 1
            ELSE NULL::integer
        END) AS delivered_count,
    count(
        CASE
            WHEN (o.status IN ('pending', 'pending_approval', 'draft')) THEN 1
            ELSE NULL::integer
        END) AS pending_count
FROM ((orders o
     LEFT JOIN bases b ON ((b.id = o.base_id)))
     LEFT JOIN suppliers s ON ((s.id = o.supplier_id)))
WHERE (o.created_at >= (now() - '2 years'::interval))
GROUP BY (date_trunc('month'::text, o.created_at)), o.base_id, b.name, s.category;