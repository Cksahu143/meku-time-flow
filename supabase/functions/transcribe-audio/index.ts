import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!audioFile && !audioUrl) {
      return new Response(
        JSON.stringify({ error: 'Please provide an audio file or URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing transcription request with BhaktiConvert...');

    let audioData: Blob;
    let fileName = 'audio.mp3';
    let mimeType = 'audio/mpeg';

    if (audioFile) {
      audioData = audioFile;
      fileName = audioFile.name || 'audio.mp3';
      mimeType = audioFile.type || 'audio/mpeg';
      console.log(`Processing uploaded file: ${fileName}, size: ${audioFile.size}, type: ${mimeType}`);
    } else if (audioUrl) {
      console.log(`Fetching audio from URL: ${audioUrl}`);
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio from URL: ${audioResponse.statusText}`);
      }
      audioData = await audioResponse.blob();
      fileName = audioUrl.split('/').pop() || 'audio.mp3';
      mimeType = audioData.type || 'audio/mpeg';
      console.log(`Fetched audio from URL, size: ${audioData.size}`);
    } else {
      throw new Error('No audio source provided');
    }

    // Convert to base64 for BhaktiConvert API
    const arrayBuffer = await audioData.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Call BhaktiConvert API for transcription
    console.log('Calling BhaktiConvert API for transcription...');
    
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
        language: 'auto',
      }),
    });

    if (!bhaktiConvertResponse.ok) {
      const errorText = await bhaktiConvertResponse.text();
      console.error('BhaktiConvert API error:', errorText);
      throw new Error(`Transcription failed: ${bhaktiConvertResponse.statusText}`);
    }

    const transcriptionResult = await bhaktiConvertResponse.json();
    console.log('Transcription completed successfully:', transcriptionResult);

    const response = {
      success: true,
      transcript: transcriptionResult.text,
      originalText: transcriptionResult.originalText || '',
      detectedLanguage: transcriptionResult.detectedLanguage || 'unknown',
      languageName: transcriptionResult.languageName || 'Unknown',
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
