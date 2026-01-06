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
    const TRANSCRIPTION_API_KEY = Deno.env.get('TRANSCRIPTION_API_KEY');
    
    if (!TRANSCRIPTION_API_KEY) {
      console.error('TRANSCRIPTION_API_KEY not configured');
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

    console.log('Processing transcription request...');

    let audioData: Blob;
    let fileName = 'audio.mp3';

    if (audioFile) {
      audioData = audioFile;
      fileName = audioFile.name || 'audio.mp3';
      console.log(`Processing uploaded file: ${fileName}, size: ${audioFile.size}`);
    } else if (audioUrl) {
      // Fetch audio from URL
      console.log(`Fetching audio from URL: ${audioUrl}`);
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio from URL: ${audioResponse.statusText}`);
      }
      audioData = await audioResponse.blob();
      fileName = audioUrl.split('/').pop() || 'audio.mp3';
      console.log(`Fetched audio from URL, size: ${audioData.size}`);
    } else {
      throw new Error('No audio source provided');
    }

    // Convert to base64 for API
    const arrayBuffer = await audioData.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Call OpenAI Whisper API for transcription
    console.log('Calling Whisper API for transcription...');
    
    const whisperFormData = new FormData();
    whisperFormData.append('file', new Blob([arrayBuffer], { type: audioData.type || 'audio/mpeg' }), fileName);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('response_format', 'verbose_json');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRANSCRIPTION_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Transcription failed: ${whisperResponse.statusText}`);
    }

    const transcriptionResult = await whisperResponse.json();
    console.log('Transcription completed successfully');

    // Generate summary using GPT
    console.log('Generating summary and notes...');
    
    const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRANSCRIPTION_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries and study notes from transcribed content. Format your response as JSON with "summary" and "notes" fields. Keep responses clear and educational.'
          },
          {
            role: 'user',
            content: `Please create a summary and study notes from this transcription:\n\n${transcriptionResult.text}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    });

    let summary = '';
    let notes = '';

    if (summaryResponse.ok) {
      const summaryResult = await summaryResponse.json();
      const content = summaryResult.choices?.[0]?.message?.content || '';
      
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(content);
        summary = parsed.summary || '';
        notes = parsed.notes || '';
      } catch {
        // If not valid JSON, use raw content as summary
        summary = content;
      }
      console.log('Summary generated successfully');
    } else {
      console.warn('Failed to generate summary, returning transcript only');
    }

    const response = {
      success: true,
      transcript: transcriptionResult.text,
      summary: summary,
      notes: notes,
      duration: transcriptionResult.duration,
      language: transcriptionResult.language,
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
