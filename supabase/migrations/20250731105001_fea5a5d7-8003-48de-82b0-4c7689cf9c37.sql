-- Create API logs table for request monitoring
CREATE TABLE public.api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL,
  duration INTEGER NOT NULL, -- milliseconds
  error TEXT,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for API logs (admin only access)
CREATE POLICY "Only admins can view API logs" 
ON public.api_logs 
FOR SELECT 
USING (public.get_user_role() = 'direction');

-- Create login attempts tracking table
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for login attempts
CREATE POLICY "Only admins can view login attempts" 
ON public.login_attempts 
FOR SELECT 
USING (public.get_user_role() = 'direction');

-- Create indexes for performance
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at);
CREATE INDEX idx_api_logs_user_id ON public.api_logs(user_id);
CREATE INDEX idx_api_logs_endpoint ON public.api_logs(endpoint);
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts(created_at);
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);

-- Create function to clean old logs (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Keep only last 30 days of API logs
  DELETE FROM public.api_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Keep only last 90 days of login attempts
  DELETE FROM public.login_attempts 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Keep only last 180 days of security events
  DELETE FROM public.security_events 
  WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;