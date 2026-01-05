import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SSOUser {
  edasUserId: string;
  email: string;
  name: string;
  role: string;
  source: string;
}

interface SSOTokenResponse {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const useSSO = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  // Generate SSO token for authenticated EDAS user
  const generateSSOToken = useCallback(async (): Promise<SSOTokenResponse | null> => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: 'destructive',
          title: 'Not authenticated',
          description: 'Please log in to EDAS first.',
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('generate-sso-token', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('SSO token generation error:', error);
        toast({
          variant: 'destructive',
          title: 'SSO Error',
          description: 'Failed to generate SSO token.',
        });
        return null;
      }

      return data as SSOTokenResponse;
    } catch (error) {
      console.error('SSO token generation error:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  // Verify SSO token (for receiving apps like Transcriber)
  const verifySSOToken = useCallback(async (token: string): Promise<SSOUser | null> => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sso-token', {
        body: { token },
      });

      if (error || !data?.valid) {
        console.error('SSO token verification failed:', error || data?.error);
        return null;
      }

      return data.user as SSOUser;
    } catch (error) {
      console.error('SSO token verification error:', error);
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Build SSO URL with token
  const buildSSOUrl = useCallback((baseUrl: string, token: string): string => {
    const url = new URL(baseUrl);
    url.searchParams.set('sso_token', token);
    url.searchParams.set('source', 'edas');
    return url.toString();
  }, []);

  return {
    generateSSOToken,
    verifySSOToken,
    buildSSOUrl,
    isGenerating,
    isVerifying,
  };
};