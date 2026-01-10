import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate URL to prevent SSRF attacks
function isValidAudioUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP(S) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost and loopback addresses
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    ) {
      return { valid: false, reason: 'Localhost addresses are not allowed' };
    }
    
    // Block private IP ranges
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      hostname.startsWith('169.254.') || // Link-local / Cloud metadata
      hostname === '169.254.169.254' // AWS/GCP metadata endpoint
    ) {
      return { valid: false, reason: 'Private IP addresses are not allowed' };
    }
    
    // Block direct IP address access (numeric hostnames)
    if (hostname.match(/^[0-9.]+$/)) {
      return { valid: false, reason: 'Direct IP address access is not allowed' };
    }
    
    // Block common internal hostnames
    if (
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost')
    ) {
      return { valid: false, reason: 'Internal hostnames are not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BHAKTICONVERT_API_KEY = Deno.env.get('BHAKTICONVERT_API_KEY');
    
    if (!BHAKTICONVERT_API_KEY) {
      console.error('BHAKTICONVERT_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Transcription service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const audioUrl = formData.get('url') as string;
    const language = (formData.get('language') as string) || 'auto';

    if (!audioFile && !audioUrl) {
      return new Response(
        JSON.stringify({ error: 'Please provide an audio file or URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing transcription request with BhaktiConvert, language:', language);

    let audioData: Blob;
    let fileName = 'audio.mp3';
    let mimeType = 'audio/mpeg';

    if (audioFile) {
      audioData = audioFile;
      fileName = audioFile.name || 'audio.mp3';
      mimeType = audioFile.type || 'audio/mpeg';
      console.log(`Processing uploaded file: ${fileName}, size: ${audioFile.size}, type: ${mimeType}`);
    } else if (audioUrl) {
      // Validate URL to prevent SSRF attacks
      const validation = isValidAudioUrl(audioUrl);
      if (!validation.valid) {
        console.warn(`Blocked SSRF attempt: ${validation.reason} - URL: ${audioUrl.substring(0, 100)}`);
        return new Response(
          JSON.stringify({ error: `Invalid audio URL: ${validation.reason}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log(`Fetching audio from URL: ${audioUrl}`);
      
      // Add timeout and security controls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const audioResponse = await fetch(audioUrl, {
          signal: controller.signal,
          redirect: 'manual', // Prevent redirect attacks
        });
        clearTimeout(timeoutId);
        
        // Check if response is a redirect (potential attack vector)
        if (audioResponse.status >= 300 && audioResponse.status < 400) {
          return new Response(
            JSON.stringify({ error: 'URL redirects are not allowed for security reasons' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch audio from URL: ${audioResponse.statusText}`);
        }
        
        // Check content length before downloading (max 25MB)
        const contentLength = audioResponse.headers.get('content-length');
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (contentLength && parseInt(contentLength) > maxSize) {
          return new Response(
            JSON.stringify({ error: 'Audio file is too large (max 25MB)' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        audioData = await audioResponse.blob();
        
        // Double-check actual size after download
        if (audioData.size > maxSize) {
          return new Response(
            JSON.stringify({ error: 'Audio file is too large (max 25MB)' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        fileName = audioUrl.split('/').pop()?.split('?')[0] || 'audio.mp3';
        mimeType = audioData.type || 'audio/mpeg';
        console.log(`Fetched audio from URL, size: ${audioData.size}`);
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return new Response(
            JSON.stringify({ error: 'Request timed out while fetching audio' }),
            { 
              status: 408, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw error;
      }
    } else {
      throw new Error('No audio source provided');
    }

    // Convert to base64 for BhaktiConvert API
    const arrayBuffer = await audioData.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Call BhaktiConvert API for transcription
    // Map language codes to proper format for the API
    const languageMap: Record<string, string> = {
      'auto': 'auto',
      'en': 'english',
      'hi': 'hindi', 
      'or': 'odia',
      'english': 'english',
      'hindi': 'hindi',
      'odia': 'odia',
    };
    
    const mappedLanguage = languageMap[language.toLowerCase()] || language;
    console.log('Calling BhaktiConvert API for transcription with language:', mappedLanguage);
    
    const bhaktiConvertResponse = await fetch('https://ijxranhndtbihzwtflyo.supabase.co/functions/v1/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BHAKTICONVERT_API_KEY,
      },
      body: JSON.stringify({
        audio: base64Audio,
        fileName: fileName,
        mimeType: mimeType,
        language: mappedLanguage,
      }),
    });

    if (!bhaktiConvertResponse.ok) {
      const errorText = await bhaktiConvertResponse.text();
      console.error('BhaktiConvert API error:', errorText);
      throw new Error(`Transcription failed: ${bhaktiConvertResponse.statusText}`);
    }

    const transcriptionResult = await bhaktiConvertResponse.json();
    console.log('Transcription completed successfully:', transcriptionResult);

    // If user explicitly selected a language, use that instead of API's detected language
    const userSelectedLanguage = language !== 'auto' ? mappedLanguage : null;
    const finalLanguage = userSelectedLanguage || transcriptionResult.detectedLanguage || 'unknown';
    const finalLanguageName = userSelectedLanguage 
      ? mappedLanguage.charAt(0).toUpperCase() + mappedLanguage.slice(1)
      : transcriptionResult.languageName || 'Unknown';

    const response = {
      success: true,
      transcript: transcriptionResult.text,
      originalText: transcriptionResult.originalText || '',
      detectedLanguage: finalLanguage,
      languageName: finalLanguageName,
      wasTranslated: transcriptionResult.wasTranslated || false,
      summary: '',
      notes: '',
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Transcription failed. Please try again.',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
