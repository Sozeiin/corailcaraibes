-- Create table for stock reservations
create table if not exists stock_reservations (
  id uuid primary key default uuid_generate_v4(),
  stock_item_id uuid references stock_items(id) on delete cascade,
  intervention_id uuid references interventions(id) on delete set null,
  quantity integer not null check (quantity > 0),
  created_at timestamp with time zone default now()
);

-- Index to speed up lookups by stock item
create index if not exists stock_reservations_stock_item_id_idx on stock_reservations(stock_item_id);
create index if not exists stock_reservations_intervention_id_idx on stock_reservations(intervention_id);
