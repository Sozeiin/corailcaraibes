-- Grant explicit execute permissions
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';