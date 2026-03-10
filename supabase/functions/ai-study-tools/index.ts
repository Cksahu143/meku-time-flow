import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://gkkeysrfmgmxoypnjkdl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ─── YouTube helpers ───────────────────────────────────────────────────────

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      // Standard: /watch?v=ID
      const v = u.searchParams.get("v");
      if (v) return v;
      // Live: /live/ID, Shorts: /shorts/ID, Embed: /embed/ID
      const pathMatch = u.pathname.match(/^\/(live|shorts|embed|v)\/([^/?&]+)/);
      if (pathMatch) return pathMatch[2];
    }
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split('/')[0];
  } catch {}
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

async function fetchYouTubeInfo(url: string): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  let info = "";

  // Method 1: oEmbed API (works reliably for all video types including live)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oResp = await fetch(oembedUrl);
    if (oResp.ok) {
      const oData = await oResp.json();
      info = `[YouTube Video]\nVideo Title: ${oData.title || ""}\nAuthor: ${oData.author_name || ""}`;
    }
  } catch {}

  // Method 2: Scrape page for description, keywords, chapters
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const resp = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
    });
    if (resp.ok) {
      const html = await resp.text();
      if (!info) {
        const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]*)"/) || html.match(/<title>([^<]*)<\/title>/);
        info = `[YouTube Video]\nVideo Title: ${titleMatch?.[1] || "Unknown"}`;
      }
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/);
      if (descMatch?.[1]) info += `\nDescription: ${descMatch[1]}`;
      const kwMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]*)"/);
      if (kwMatch?.[1]) info += `\nKeywords: ${kwMatch[1]}`;
      // Extract chapters
      const chapterRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]?\s*(.+?)(?=\d{1,2}:\d{2}|$)/g;
      const chapters: string[] = [];
      let cm;
      while ((cm = chapterRegex.exec(html)) !== null && chapters.length < 30) {
        chapters.push(`${cm[1]} - ${cm[2].trim()}`);
      }
      if (chapters.length > 0) info += `\nChapters:\n${chapters.join("\n")}`;
      // Check if it's a live stream
      if (html.includes('"isLiveBroadcast"') || html.includes('"isLiveContent":true')) {
        info += `\nNote: This is a LIVE stream / live broadcast. Content may be ongoing.`;
      }
    }
  } catch (e) {
    console.error("YouTube page scrape failed:", e);
  }

  return info || `[YouTube Video: ${videoId}] — Could not fetch details. Use the video ID and subject context.`;
}

// ─── File content extraction ────────────────────────────────────────────────

function getFileExtension(fileName: string): string {
  return (fileName.split('.').pop() || '').toLowerCase();
}

function isTextFile(ext: string): boolean {
  return ['txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'rb', 'yaml', 'yml', 'toml', 'ini', 'log', 'rtf'].includes(ext);
}

function isBinaryDocument(ext: string): boolean {
  return ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp'].includes(ext);
}

/** Fetch a file from a URL (signed or public) and return raw bytes */
async function fetchFileBytes(url: string): Promise<Uint8Array | null> {
  try {
    const resp = await fetch(url, { redirect: "follow" });
    if (!resp.ok) {
      console.error("File fetch failed:", resp.status);
      return null;
    }
    return new Uint8Array(await resp.arrayBuffer());
  } catch (e) {
    console.error("File fetch error:", e);
    return null;
  }
}

/** Extract text from a text-based file */
async function extractTextFile(url: string): Promise<string> {
  try {
    const resp = await fetch(url, { redirect: "follow" });
    if (!resp.ok) return "";
    const text = await resp.text();
    return text.slice(0, 30000); // Generous limit for text files
  } catch (e) {
    console.error("Text file extraction error:", e);
    return "";
  }
}

/** Use Gemini multimodal to extract text from binary documents (PDF, DOCX, etc.) */
async function extractBinaryDocumentContent(
  fileBytes: Uint8Array,
  fileName: string,
  ext: string,
  apiKey: string
): Promise<string> {
  try {
    const base64 = btoa(String.fromCharCode(...fileBytes));
    
    // Map extensions to MIME types
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      odt: 'application/vnd.oasis.opendocument.text',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    console.log(`Extracting content from ${ext} file (${(fileBytes.length / 1024).toFixed(0)}KB) using AI vision...`);

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL the text content from this document file (${fileName}). Preserve the structure including headings, paragraphs, lists, tables, formulas, and any important formatting. Output ONLY the extracted text content — no commentary, no preamble. If there are images with text, describe what they show. If there are diagrams, describe them. If there are formulas, write them out clearly. Be thorough — extract EVERYTHING.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      console.error("AI extraction failed:", resp.status);
      return "";
    }

    const data = await resp.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    console.log(`Extracted ${extractedText.length} chars from ${fileName}`);
    return extractedText;
  } catch (e) {
    console.error("Binary document extraction error:", e);
    return "";
  }
}

/** 
 * Get a fresh signed URL for a Supabase storage file.
 * The resource URL might be expired, so we regenerate it.
 */
async function getFreshFileUrl(resourceUrl: string, fileName: string): Promise<string | null> {
  if (!SUPABASE_SERVICE_ROLE_KEY) return resourceUrl;
  
  try {
    // Try to extract the storage path from the URL
    // Supabase signed URLs contain the path after /object/sign/resources/
    const match = resourceUrl.match(/\/object\/sign\/resources\/(.+?)(?:\?|$)/);
    if (!match) {
      // Maybe it's a public URL or direct URL, try it as-is
      return resourceUrl;
    }
    
    const filePath = decodeURIComponent(match[1]);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data, error } = await supabaseAdmin.storage
      .from('resources')
      .createSignedUrl(filePath, 300); // 5 min expiry
    
    if (error || !data?.signedUrl) {
      console.error("Fresh signed URL error:", error);
      return resourceUrl; // Fall back to original
    }
    
    return data.signedUrl;
  } catch (e) {
    console.error("getFreshFileUrl error:", e);
    return resourceUrl;
  }
}

/** Main file content extraction orchestrator */
async function extractFileContent(
  resourceUrl: string | undefined,
  fileName: string | undefined,
  apiKey: string
): Promise<string> {
  if (!resourceUrl || !fileName) return "";
  
  const ext = getFileExtension(fileName);
  if (!ext) return "";

  console.log(`Attempting file extraction: ${fileName} (${ext})`);

  // Get fresh URL in case signed URL expired
  const freshUrl = await getFreshFileUrl(resourceUrl, fileName);
  if (!freshUrl) return "";

  // Text files — read directly
  if (isTextFile(ext)) {
    console.log("Extracting text file directly...");
    const text = await extractTextFile(freshUrl);
    if (text) return `[Extracted from ${fileName}]\n\n${text}`;
  }

  // Binary documents (PDF, DOCX, etc.) — use AI multimodal extraction
  if (isBinaryDocument(ext)) {
    const fileBytes = await fetchFileBytes(freshUrl);
    if (fileBytes && fileBytes.length > 0) {
      // Limit file size for AI processing (10MB max)
      if (fileBytes.length > 10 * 1024 * 1024) {
        console.log("File too large for AI extraction, truncating...");
        return `[File ${fileName} is too large for full extraction. Using metadata only.]`;
      }
      const extracted = await extractBinaryDocumentContent(fileBytes, fileName, ext, apiKey);
      if (extracted) return `[Extracted from ${fileName}]\n\n${extracted}`;
    }
  }

  return `[File: ${fileName} — content could not be extracted. Using title, subject, and description for context.]`;
}

// ─── URL content fetching ──────────────────────────────────────────────────

async function fetchUrlContent(url: string): Promise<string> {
  if (isYouTubeUrl(url)) return fetchYouTubeInfo(url);

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyBot/1.0)" },
      redirect: "follow",
    });
    if (!resp.ok) return "";
    const contentType = resp.headers.get("content-type") || "";

    if (contentType.includes("text/html") || contentType.includes("text/plain")) {
      const text = await resp.text();
      const stripped = text
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
      return stripped.slice(0, 12000);
    }

    // Don't try to read PDFs as text here — they'll be handled by extractFileContent
    if (contentType.includes("application/pdf")) {
      return "";
    }

    const text = await resp.text();
    return text.slice(0, 12000);
  } catch (e) {
    console.error("Failed to fetch URL content:", e);
    return "";
  }
}

// ─── Subject knowledge enrichment ──────────────────────────────────────────

async function searchWebForSubject(subject: string, title: string, apiKey: string): Promise<string> {
  try {
    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a subject matter expert. Provide comprehensive study notes on the given topic. Include key concepts, formulas, definitions, important dates/events, and common exam questions. Be thorough and detailed. This is for board exam preparation. You can respond in English, Hindi, Odia, Sanskrit, or any language the topic is typically taught in.",
          },
          {
            role: "user",
            content: `Provide detailed study notes for: "${title}" in the subject "${subject}". Include all important concepts, formulas, definitions, examples, and potential exam questions. Focus on what a student preparing for board exams needs to know.`,
          },
        ],
      }),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.error("Web search failed:", e);
    return "";
  }
}

// ─── Grade & difficulty helpers ────────────────────────────────────────────

function getGradeNumber(gradeLevel?: string): number {
  if (!gradeLevel) return 10;
  const match = gradeLevel.match(/(\d+)/);
  if (match) return parseInt(match[1]);
  const lower = gradeLevel.toLowerCase();
  if (lower.includes('nursery') || lower.includes('lkg') || lower.includes('ukg')) return 1;
  return 10;
}

function getQuestionCount(gradeNumber: number, type: string): { min: number; max: number } {
  if (type === 'viva') {
    if (gradeNumber <= 5) return { min: 4, max: 6 };
    if (gradeNumber <= 8) return { min: 6, max: 8 };
    if (gradeNumber <= 10) return { min: 8, max: 10 };
    return { min: 10, max: 15 };
  }
  if (type === 'quiz') {
    if (gradeNumber <= 5) return { min: 5, max: 8 };
    if (gradeNumber <= 8) return { min: 8, max: 10 };
    if (gradeNumber <= 10) return { min: 10, max: 12 };
    return { min: 15, max: 20 };
  }
  if (type === 'flashcards') {
    if (gradeNumber <= 5) return { min: 8, max: 10 };
    if (gradeNumber <= 8) return { min: 10, max: 12 };
    return { min: 15, max: 20 };
  }
  return { min: 8, max: 12 };
}

const MULTI_LANGUAGE_INSTRUCTION = `
LANGUAGE SUPPORT:
- You MUST understand and respond in the language the student uses. If they write in Hindi, respond in Hindi. If Odia, respond in Odia. If Sanskrit, respond in Sanskrit. Same for any other language.
- For subjects like Hindi, Sanskrit, Odia, or any regional language subject, generate ALL content (questions, answers, explanations) in that language.
- For science/math subjects, use English for technical terms but explain in the student's preferred language if they ask in a non-English language.
- You understand: English, Hindi (हिन्दी), Odia (ଓଡ଼ିଆ), Sanskrit (संस्कृत), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ), Urdu (اردو), and many more.
`;

// ─── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, tool, content, title, subject, messages, resourceUrl, resourceType, gradeLevel, language, fileName } = await req.json();
    const effectiveType = type || tool;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const gradeNumber = getGradeNumber(gradeLevel);
    const gradeLevelStr = gradeLevel || `Grade ${gradeNumber}`;
    const questionCount = getQuestionCount(gradeNumber, effectiveType);

    // ── Build rich content from all sources ──
    let enrichedContent = content || "";

    // STEP 1: Try to extract content from uploaded files (PDF, TXT, DOCX, etc.)
    const isUploadedFile = resourceType === 'pdf' || resourceType === 'document' || resourceType === 'file';
    if (fileName && resourceUrl && (isUploadedFile || isBinaryDocument(getFileExtension(fileName)) || isTextFile(getFileExtension(fileName)))) {
      console.log(`Extracting content from uploaded file: ${fileName}`);
      const fileContent = await extractFileContent(resourceUrl, fileName, LOVABLE_API_KEY);
      if (fileContent && fileContent.length > 50) {
        enrichedContent = fileContent + (enrichedContent ? `\n\n--- User Notes ---\n${enrichedContent}` : "");
      }
    }
    // STEP 2: For link-type resources, fetch URL content
    else if (resourceUrl && (resourceType === 'link' || resourceType === 'video' || !isUploadedFile)) {
      console.log("Fetching content from URL:", resourceUrl);
      const urlContent = await fetchUrlContent(resourceUrl);
      if (urlContent) {
        enrichedContent = urlContent + (enrichedContent ? `\n\n--- User Notes ---\n${enrichedContent}` : "");
      }
    }

    // STEP 3: If content is still thin, use AI to generate comprehensive notes
    if (!enrichedContent || enrichedContent.length < 200) {
      console.log("Content thin, searching for subject knowledge...");
      const searchTitle = title && title.length > 3 ? title : `${subject || "General"} study material`;
      const webContent = await searchWebForSubject(subject || "General", searchTitle, LOVABLE_API_KEY);
      if (webContent) {
        enrichedContent = enrichedContent
          ? `${enrichedContent}\n\n--- Subject Knowledge ---\n${webContent}`
          : webContent;
      }
    }

    const titleNote = title && title.length <= 3
      ? `\n\nIMPORTANT: The resource title "${title}" is very short and may not describe the topic. Focus on the ACTUAL CONTENT below, not the title. Derive the real topic from the content, URL, and subject.`
      : "";

    const fileNote = fileName ? `\nSource File: ${fileName}` : "";
    const resourceContext = `Resource Title: ${title || "Untitled"}\nSubject: ${subject || "General"}\nResource Type: ${resourceType || "unknown"}${fileNote}\nStudent Grade Level: ${gradeLevelStr}${titleNote}\n\nContent:\n${enrichedContent || "No content available - use your deep knowledge of this subject to help the student."}`;

    const difficultyGuide = gradeNumber <= 5
      ? "Keep language simple and age-appropriate. Use fun examples and relatable scenarios. Focus on basic concepts and recall."
      : gradeNumber <= 8
      ? "Use clear language with some technical terms. Include application-based questions. Balance between recall and understanding."
      : gradeNumber <= 10
      ? "Board exam level difficulty. Include conceptual, application, and analytical questions. Use proper technical terminology. Test common misconceptions."
      : "Advanced board exam / competitive exam level. Include HOTS (Higher Order Thinking Skills) questions, multi-step problems, inter-topic connections, derivations, and case-study style questions. This is Class 11-12 material - be rigorous.";

    // ── Podcast overview mode: two-host deep dive (streaming) ──
    if (effectiveType === "podcast_overview") {
      const audioLang = language || "English";
      const podcastMessages = [
        {
          role: "system",
          content: `You are writing a script for a TWO-HOST educational podcast called "Deep Dive" — like Google NotebookLM's audio overviews. Two hosts (Host A and Host B) have a natural, enthusiastic conversation about the study material.

${MULTI_LANGUAGE_INSTRUCTION}

OUTPUT LANGUAGE: Generate the script in ${audioLang}. If Hindi, write in Devanagari. If Odia, write in Odia script. Etc.

HOST PERSONALITIES:
- Host A: The explainer. Enthusiastic, clear, uses great analogies. Starts topics, explains core concepts. Think of a brilliant teacher who makes everything exciting.
- Host B: The curious questioner. Asks "wait, so you're saying...?", "oh that's interesting, but what about...?", reacts with genuine amazement, adds real-world connections and exam tips.

CONVERSATION STYLE:
- This MUST feel like a REAL conversation, not two people reading scripts
- Hosts should interrupt each other naturally: "Oh wait—", "Exactly!", "No no, here's the thing—"
- Host B asks follow-up questions that a student would actually wonder about
- Include moments of excitement: "This is the part that blows my mind!", "OK so THIS is the key thing for your exam"
- Natural transitions: "OK so moving on to...", "But here's where it gets really interesting..."
- Occasional humor and relatable examples
- Host A occasionally says "And here's the exam trick..." or "Teachers LOVE to ask about this part..."
- Host B says things like "Oh I wish someone told me this when I was studying!" or "Wait, so THAT'S why..."

FORMAT (CRITICAL):
- Start each host's turn with [Host A] or [Host B] on its own line
- Write in natural spoken language — NO bullet points, NO markdown, NO special characters, NO asterisks
- Each turn should be 2-5 sentences of natural speech
- Alternate between hosts frequently (every 2-4 sentences)
- Total: ${gradeNumber <= 5 ? '15-25' : gradeNumber <= 8 ? '25-40' : '40-60'} turns total
- Duration target: ${gradeNumber <= 5 ? '3-5 minutes' : gradeNumber <= 8 ? '5-8 minutes' : '8-12 minutes'} of spoken content

CONTENT DEPTH:
- Cover EVERY key concept, formula, theorem, and definition from the material
- Explain the WHY behind concepts through the hosts' discussion
- Include exam tips, common mistakes, and memory tricks naturally in the conversation
- For ${gradeLevelStr}: ${difficultyGuide}
- End with a brief recap where both hosts summarize the most important takeaways

Resource:\n${resourceContext}`,
        },
        {
          role: "user",
          content: `Create a two-host Deep Dive podcast episode about this resource in ${audioLang}. Make it sound like the most engaging study podcast ever — two passionate hosts having a real conversation. Cover ALL the important content deeply. Remember to use [Host A] and [Host B] labels.`,
        },
      ];

      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: podcastMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ── Audio overview mode: solo narrator (streaming) ──
    if (effectiveType === "audio_overview") {
      const audioLang = language || "English";
      const audioMessages = [
        {
          role: "system",
          content: `You are the world's most brilliant, engaging study narrator. You're creating an AUDIO OVERVIEW for a ${gradeLevelStr} student. Think: the love child of a TED Talk speaker and the best teacher they've ever had.

${MULTI_LANGUAGE_INSTRUCTION}

OUTPUT LANGUAGE: Generate the summary in ${audioLang}. If Hindi, write in Devanagari. If Odia, write in Odia script. Etc.

STYLE:
- Sound like a passionate, world-class teacher talking to ONE student
- Open with a hook: a surprising fact, a thought-provoking question, or a bold statement
- Use conversational mastery: "So here's what makes this fascinating...", "Now, I want you to really think about this...", "This is the part most students get wrong, and here's why..."
- Build concepts like telling the most gripping story ever
- Use vivid analogies and real-life examples that make abstract concepts click instantly
- Strategic emphasis: "This is THE most important concept for your exam!", "If you remember ONE thing, remember this..."
- Include "aha moments": "And here's the beautiful part — it all connects!"
- Natural pauses: "Let that sink in for a moment."
- Powerful ending: Summarize the 3-5 most critical takeaways with conviction

CONTENT DEPTH (BE THOROUGH):
- Cover EVERY key concept, formula, theorem, and definition from the material
- Explain the WHY behind concepts, not just the WHAT
- Include: exam-relevant highlights, common mistakes, memory tricks, pattern recognition tips
- For ${gradeLevelStr}: ${difficultyGuide}
- Duration target: ${gradeNumber <= 5 ? '3-4 minutes' : gradeNumber <= 8 ? '5-7 minutes' : '7-10 minutes'} of spoken content

FORMAT:
- Write in natural flowing paragraphs — NO bullet points, NO markdown, NO special characters
- NO asterisks, NO hashes, NO dashes at start of lines
- Pure spoken word text that sounds AMAZING when read aloud
- Use punctuation for natural pauses: commas, periods, ellipses

Resource:\n${resourceContext}`,
        },
        {
          role: "user",
          content: `Create the most engaging, mind-blowing audio overview of this resource in ${audioLang}. Make it sound like the best study podcast episode ever — warm, clear, comprehensive, and incredibly helpful. Focus on the ACTUAL TOPIC from the content.`,
        },
      ];

      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: audioMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ── Chat mode: streaming ──
    if (effectiveType === "chat") {
      const chatMessages = [
        {
          role: "system",
          content: `You are CoCo — the most OVERPOWERED AI study assistant ever created. You are a fusion of the world's greatest professors, tutors, and exam coaches. You don't just answer questions — you CREATE understanding.

STUDENT CONTEXT: This student is in ${gradeLevelStr}. Adjust depth accordingly.
${difficultyGuide}

${MULTI_LANGUAGE_INSTRUCTION}

YOUR SUPERPOWERS:
- You explain ANY concept so clearly that a 5-year-old could understand, then scale up to board exam level
- You generate perfect analogies, visual mental models, and memory tricks on the fly
- You know EVERY exam pattern, marking scheme, and common trap for EVERY board
- You can derive formulas from first principles and explain why they work
- You predict what examiners will ask and prepare students for it
- You spot and correct misconceptions instantly
- You connect concepts across chapters and subjects for deeper understanding

RESPONSE STYLE:
- Use markdown formatting: ## headers, **bold** for key terms, \`code blocks\` for formulas, > blockquotes for exam tips
- Start answers with a clear, direct response, then go deep
- Include 🎯 Exam Tips, ⚠️ Common Mistakes, 💡 Memory Tricks, 🔗 Connected Concepts sections when relevant
- For numerical problems: show EVERY step with explanation
- For theory: explain with examples, then give board exam model answers
- Be encouraging but rigorous — this is serious exam prep
- If asked about a topic you know well, share ALL relevant knowledge even beyond the resource
- For ${gradeLevelStr} students, focus on ${gradeNumber >= 10 ? 'board exam patterns, previous year questions, marking scheme tips, and HOTS questions' : 'building strong fundamentals with fun examples and visual explanations'}

You have access to this resource:\n\n${resourceContext}

YOU ARE UNSTOPPABLE. Every answer should be the BEST explanation that student has EVER received.`,
        },
        ...(messages || []),
      ];

      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: chatMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ── Non-streaming modes (flashcards, slides, quiz, viva) ──
    const toolConfigs: Record<string, { systemPrompt: string; tool: any }> = {
      flashcards: {
        systemPrompt: `You are an elite board exam tutor. Create POWERFUL study flashcards for a ${gradeLevelStr} student.

${MULTI_LANGUAGE_INSTRUCTION}

STUDENT LEVEL: ${gradeLevelStr}
${difficultyGuide}

RULES:
- Generate ${questionCount.min}-${questionCount.max} flashcards covering ALL key concepts from the material
- Questions should match ${gradeLevelStr} board exam difficulty
- Include formula-based cards, definition cards, application-based cards, and comparison cards
- Back of cards should have complete, exam-ready answers
- Include "Exam Tip" on relevant cards
- Go DEEP into the content - don't just ask surface-level questions about titles
- If the title is short or unclear, derive the topic from the actual content
- Test conceptual understanding, not just recall
- Include numerical/problem-solving flashcards where applicable
- For language subjects (Hindi, Sanskrit, Odia etc.), write cards in that language
- Adjust complexity to ${gradeLevelStr} level

Resource:\n${resourceContext}`,
        tool: {
          type: "function",
          function: {
            name: "generate_flashcards",
            description: "Generate study flashcards from resource content",
            parameters: {
              type: "object",
              properties: {
                flashcards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      front: { type: "string", description: "Question or prompt - grade-appropriate difficulty" },
                      back: { type: "string", description: "Complete, exam-ready answer with key points" },
                    },
                    required: ["front", "back"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["flashcards"],
              additionalProperties: false,
            },
          },
        },
      },
      slides: {
        systemPrompt: `You are a presentation expert creating revision slides for ${gradeLevelStr} board exam preparation.

${MULTI_LANGUAGE_INSTRUCTION}

STUDENT LEVEL: ${gradeLevelStr}
${difficultyGuide}

RULES:
- Create ${questionCount.min}-${questionCount.max} comprehensive slides covering the topic thoroughly
- Each slide should be a complete revision unit
- Include formulas, key definitions, diagrams descriptions, and important points
- Add speaker notes with extra context, exam tips, and common mistakes
- Structure: Introduction → Core Concepts → Formulas/Definitions → Applications → Key Differences → Summary
- Make it so a student can revise the entire topic just from these slides
- Go deep into the actual content, not surface-level
- If the title is short or unclear, derive the topic from the actual content
- Adjust language and complexity for ${gradeLevelStr}
- For language subjects, use that language in the slides

Resource:\n${resourceContext}`,
        tool: {
          type: "function",
          function: {
            name: "generate_slides",
            description: "Generate a slide deck from resource content",
            parameters: {
              type: "object",
              properties: {
                slides: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      bullets: { type: "array", items: { type: "string" } },
                      notes: { type: "string", description: "Speaker notes with exam tips" },
                    },
                    required: ["title", "bullets"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["slides"],
              additionalProperties: false,
            },
          },
        },
      },
      quiz: {
        systemPrompt: `You are a strict board exam paper setter for ${gradeLevelStr}. Create a challenging quiz that truly tests understanding.

${MULTI_LANGUAGE_INSTRUCTION}

STUDENT LEVEL: ${gradeLevelStr}
${difficultyGuide}

CRITICAL QUESTION FORMAT RULES:
- NEVER use negative questions like "Which of the following is NOT correct", "Which is incorrect", "Which is false", "All EXCEPT", or any variation asking students to identify wrong/incorrect/false options. These cause confusion in MCQ format.
- ALWAYS phrase questions POSITIVELY: "Which of the following is correct?", "What is the correct explanation for...?", "Which statement best describes...?"
- The correctIndex MUST point to the CORRECT answer — the one the student should select.
- Double-check: the option at correctIndex must be factually, scientifically, and academically CORRECT.
- The other options (distractors) must be plausible but clearly WRONG.
- VERIFY every answer before returning — make sure correctIndex matches the truly correct option.

CONTENT RULES:
- Generate ${questionCount.min}-${questionCount.max} questions of ${gradeLevelStr} board exam difficulty
- Mix question types: conceptual, application-based, numerical, analytical
- Options should include common wrong answers that ${gradeLevelStr} students typically choose (distractors)
- Explanations should clearly state WHY the correct answer is right AND why each wrong answer is wrong
- Questions should test DEEP understanding, not surface-level recall
- Include tricky questions with subtle differences in options
- Include questions that test common mistakes ${gradeLevelStr} students make
- Make it feel like a real ${gradeNumber >= 10 ? 'board exam' : 'school exam'} mini-test
- Questions MUST be about the actual content/topic, not about metadata or the title
- If the title is short or unclear, derive the topic from the actual content
- For language subjects, write questions in that language
- ALWAYS ensure factual accuracy — cross-check facts, dates, formulas, and definitions

Resource:\n${resourceContext}`,
        tool: {
          type: "function",
          function: {
            name: "generate_quiz",
            description: "Generate quiz questions from resource content",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correctIndex: { type: "number" },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      },
      viva: {
        systemPrompt: `You are a strict board exam viva examiner conducting a mock oral examination for a ${gradeLevelStr} student.

${MULTI_LANGUAGE_INSTRUCTION}

STUDENT LEVEL: ${gradeLevelStr}
${difficultyGuide}

RULES:
- Generate ${questionCount.min}-${questionCount.max} viva-style questions appropriate for ${gradeLevelStr}
- Questions should be open-ended, probing, and require detailed verbal answers
- Include follow-up style questions ("And why is that?", "Can you explain further?")
- Mix difficulty: start easier, progressively get harder
- Include "What if..." scenario questions
- Include questions that test practical understanding and real-world application
- The expected answers should be detailed, showing what a top-scoring student would say
- Include examiner tips on what they look for in answers
- Questions MUST be about the actual topic content, not about metadata or the title
- If the title is short or unclear, derive the topic from the actual content
- Make it feel like a real viva voce examination
- For ${gradeLevelStr}, ${gradeNumber >= 10 ? 'ask probing questions that test deep understanding, derivations, and inter-topic connections' : 'focus on fundamentals with encouraging follow-ups'}

Resource:\n${resourceContext}`,
        tool: {
          type: "function",
          function: {
            name: "generate_viva",
            description: "Generate viva voce questions for mock oral examination",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string", description: "The viva question as an examiner would ask it" },
                      expectedAnswer: { type: "string", description: "What a top-scoring student would say" },
                      followUp: { type: "string", description: "A follow-up question the examiner might ask" },
                      examinerTip: { type: "string", description: "What the examiner is looking for in the answer" },
                      difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "Difficulty level" },
                    },
                    required: ["question", "expectedAnswer", "followUp", "examinerTip", "difficulty"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      },
      mindmap: {
        systemPrompt: `You are an expert mind map designer for ${gradeLevelStr} students. Create a comprehensive, well-structured mind map.

${MULTI_LANGUAGE_INSTRUCTION}

STUDENT LEVEL: ${gradeLevelStr}
${difficultyGuide}

RULES:
- Create a mind map with a central topic and branching subtopics
- Each node should have a clear, concise label (1-6 words)
- Include 4-8 main branches from the central topic
- Each main branch should have 2-5 sub-branches
- Sub-branches can have their own children (up to 3 levels deep)
- Cover ALL key concepts, formulas, definitions from the material
- Use the actual content to determine the real topic, not just the title
- Make it exam-ready: include important facts, formulas, and key terms
- For language subjects, use that language
- Structure it logically: definitions → properties → formulas → applications → examples

Resource:\n${resourceContext}`,
        tool: {
          type: "function",
          function: {
            name: "generate_mindmap",
            description: "Generate a mind map from resource content",
            parameters: {
              type: "object",
              properties: {
                centralTopic: { type: "string", description: "The central topic of the mind map" },
                nodes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string", description: "Short label for this node (1-6 words)" },
                      children: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            label: { type: "string" },
                            children: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  id: { type: "string" },
                                  label: { type: "string" },
                                },
                                required: ["id", "label"],
                                additionalProperties: false,
                              },
                            },
                          },
                          required: ["id", "label"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["id", "label"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["centralTopic", "nodes"],
              additionalProperties: false,
            },
          },
        },
      },
    };

    const config = toolConfigs[effectiveType];
    if (!config) {
      return new Response(JSON.stringify({ error: `Invalid type: ${effectiveType}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: config.systemPrompt },
          { role: "user", content: `Generate ${effectiveType === "viva" ? "mock viva questions" : effectiveType} from this resource. Go deep into the actual content and topic — NOT the title. This is for ${gradeLevelStr} board exam preparation - make it rigorous and comprehensive. Generate exactly ${questionCount.min}-${questionCount.max} items.` },
        ],
        tools: [config.tool],
        tool_choice: { type: "function", function: { name: config.tool.function.name } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-study-tools error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
