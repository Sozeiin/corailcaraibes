-- Supprimer toutes les tables et fonctions liées à la distribution

-- Supprimer les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS public.logistics_receipt_items CASCADE;
DROP TABLE IF EXISTS public.logistics_receipts CASCADE;
DROP TABLE IF EXISTS public.logistics_shipment_items CASCADE;
DROP TABLE IF EXISTS public.logistics_shipments CASCADE;
DROP TABLE IF EXISTS public.shipment_items CASCADE;
DROP TABLE IF EXISTS public.shipment_packages CASCADE;
DROP TABLE IF EXISTS public.shipments CASCADE;

-- Supprimer les fonctions RPC liées à la distribution
DROP FUNCTION IF EXISTS public.add_item_by_scan(uuid, text, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_shipment(uuid, uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.pack_shipment(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.receive_scan(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.reconcile_shipment(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.generate_shipment_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_receipt_number() CASCADE;
DROP FUNCTION IF EXISTS public.auto_generate_receipt_number() CASCADE;