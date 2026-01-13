-- Phase 4: Platform Admin Features - Subscription Management & Feature Toggles for Schools
-- Add subscription and feature toggle columns to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS max_students integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_teachers integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS features_enabled jsonb DEFAULT '{"timetable": true, "calendar": true, "todo": true, "pomodoro": true, "groups": true, "resources": true, "transcribe": false}'::jsonb,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS logo_url text;

-- Create a table for platform settings/analytics (for platform admin)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read/write platform settings
CREATE POLICY "Platform admins can manage settings"
    ON public.platform_settings
    FOR ALL
    USING (public.has_role(auth.uid(), 'platform_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value, description) VALUES
('default_subscription', '"free"', 'Default subscription tier for new schools'),
('max_schools', '100', 'Maximum number of schools allowed on the platform'),
('maintenance_mode', 'false', 'Enable maintenance mode'),
('allow_signups', 'true', 'Allow new user signups')
ON CONFLICT (key) DO NOTHING;

-- Add permissions for platform admin features
INSERT INTO public.permissions (name, description) VALUES
('can_manage_schools', 'Can create, edit, and delete schools'),
('can_manage_subscriptions', 'Can manage school subscriptions'),
('can_toggle_features', 'Can enable/disable features for schools'),
('can_view_platform_analytics', 'Can view platform-wide analytics'),
('can_manage_platform_settings', 'Can manage platform settings')
ON CONFLICT (name) DO NOTHING;

-- Grant these permissions to platform_admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'platform_admin', id FROM public.permissions 
WHERE name IN ('can_manage_schools', 'can_manage_subscriptions', 'can_toggle_features', 'can_view_platform_analytics', 'can_manage_platform_settings')
ON CONFLICT (role, permission_id) DO NOTHING;