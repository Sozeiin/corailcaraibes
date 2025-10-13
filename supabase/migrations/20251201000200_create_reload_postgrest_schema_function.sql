-- Function to allow authenticated clients to trigger a PostgREST schema reload when schema cache errors occur
create or replace function public.reload_postgrest_schema()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_notify('pgrst', 'reload schema');
  return jsonb_build_object('status', 'reloaded');
end;
$$;

revoke all on function public.reload_postgrest_schema() from public;
grant execute on function public.reload_postgrest_schema() to anon, authenticated, service_role;

comment on function public.reload_postgrest_schema() is 'Notify PostgREST to rebuild its schema cache so newly added columns become available.';
