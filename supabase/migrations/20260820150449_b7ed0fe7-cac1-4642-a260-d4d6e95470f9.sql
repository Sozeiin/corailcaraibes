UPDATE public.marevo_integration_config
SET marevo_api_base_url = 'https://app.base44.com/api/apps/' || COALESCE(NULLIF(marevo_app_id, ''), '697a49abec23233c4c28d9f8'),
    updated_at = now()
WHERE singleton = true;