UPDATE public.boat_sharing
   SET status = 'ended', updated_at = now()
 WHERE status = 'active'
   AND sharing_end_date < now();