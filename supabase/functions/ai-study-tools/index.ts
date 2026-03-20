import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const LOVABLE_GATEWAY_URL = "https://ai-gateway.lovable.dev/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://gkkeysrfmgmxoypnjkdl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ─── Model fallback chain & retry logic ────────────────────────────────────
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

const FLASH_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// Lovable model names use provider prefix
const LOVABLE_MODEL_MAP: Record<string, string> = {
  "gemini-2.5-pro": "google/gemini-2.5-pro",
  "gemini-2.5-flash": "google/gemini-2.5-flash",
  "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
};

interface GatewayConfig {
  url: string;
  apiKey: string;
  modelTransform: (model: string) => string;
  name: string;
}

/**
 * Resilient fetch: tries Google API first with retries + model fallback,
 * then falls back to Lovable gateway if Google completely fails.
 */
async function resilientAIFetch(
  body: Record<string, unknown>,
  maxRetries = 4,
  modelChain?: string[],
): Promise<Response> {
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const gateways: GatewayConfig[] = [];

  if (GOOGLE_API_KEY) {
    gateways.push({
      url: GOOGLE_GATEWAY_URL,
      apiKey: GOOGLE_API_KEY,
      modelTransform: (m) => m, // Native names
      name: "Google",
    });
  }

  if (LOVABLE_API_KEY) {
    gateways.push({
      url: LOVABLE_GATEWAY_URL,
      apiKey: LOVABLE_API_KEY,
      modelTransform: (m) => LOVABLE_MODEL_MAP[m] || `google/${m}`,
      name: "Lovable",
    });
  }

  if (gateways.length === 0) {
    throw new Error("No AI API keys configured");
  }

  const models = modelChain || (body.model === "gemini-2.5-pro" ? MODEL_FALLBACK_CHAIN : FLASH_FALLBACK_CHAIN);
  let lastError: Response | null = null;

  for (const gateway of gateways) {
    console.log(`🔄 Trying ${gateway.name} gateway...`);

    for (const model of models) {
      const transformedModel = gateway.modelTransform(model);
      const requestBody = { ...body, model: transformedModel };

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`  → ${gateway.name}/${transformedModel} attempt ${attempt + 1}/${maxRetries}`);
          const response = await fetch(gateway.url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${gateway.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (response.ok) {
            console.log(`  ✅ Success via ${gateway.name}/${transformedModel}`);
            return response;
          }

          if (response.status === 429) {
            lastError = response;
            const retryAfter = response.headers.get("Retry-After");
            let waitMs: number;
            if (retryAfter) {
              const parsed = parseInt(retryAfter, 10);
              waitMs = !isNaN(parsed) ? parsed * 1000 : Math.pow(2, attempt) * 1500;
            } else {
              waitMs = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
            }
            console.log(`  ⏳ Rate limited (429). Waiting ${(waitMs / 1000).toFixed(1)}s...`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }

          if (response.status === 503 || response.status === 500) {
            lastError = response;
            const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            console.log(`  ⚠️ Server error (${response.status}). Waiting ${(waitMs / 1000).toFixed(1)}s...`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }

          // Non-retryable error — try next gateway
          console.log(`  ❌ Non-retryable error ${response.status} on ${gateway.name}`);
          lastError = response;
          break;
        } catch (e) {
          console.error(`  ❌ Network error on ${gateway.name}/${transformedModel}:`, e);
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          }
        }
      }
    }
    console.log(`❌ All models exhausted on ${gateway.name}, trying next gateway...`);
  }

  if (lastError) return lastError;
  throw new Error("All AI gateways, models, and retries exhausted");
}

// ─── YouTube helpers ───────────────────────────────────────────────────────

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const pathMatch = u.pathname.match(/^\/(live|shorts|embed|v)\/([^/?&]+)/);
      if (pathMatch) return pathMatch[2];
    }
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split('/')[0];
  } catch {}
  return null;
}

function extractYouTubePlaylistId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("list");
    }
  } catch {}
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null || extractYouTubePlaylistId(url) !== null;
}

async function fetchSingleVideoInfo(videoId: string): Promise<string> {
  let info = "";

  // oEmbed API
  try {
    const oResp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (oResp.ok) {
      const oData = await oResp.json();
      info = `Video Title: ${oData.title || ""}\nAuthor: ${oData.author_name || ""}`;
    }
  } catch {}

  // Scrape page for description, keywords, chapters
  try {
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
    });
    if (resp.ok) {
      const html = await resp.text();
      if (!info) {
        const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]*)"/) || html.match(/<title>([^<]*)<\/title>/);
        info = `Video Title: ${titleMatch?.[1] || "Unknown"}`;
      }
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/);
      if (descMatch?.[1]) info += `\nDescription: ${descMatch[1]}`;
      const kwMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]*)"/);
      if (kwMatch?.[1]) info += `\nKeywords: ${kwMatch[1]}`;
      const chapterRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]?\s*(.+?)(?=\d{1,2}:\d{2}|$)/g;
      const chapters: string[] = [];
      let cm;
      while ((cm = chapterRegex.exec(html)) !== null && chapters.length < 30) {
        chapters.push(`${cm[1]} - ${cm[2].trim()}`);
      }
      if (chapters.length > 0) info += `\nChapters:\n${chapters.join("\n")}`;
      if (html.includes('"isLiveBroadcast"') || html.includes('"isLiveContent":true')) {
        info += `\nNote: This is a LIVE stream / live broadcast.`;
      }
    }
  } catch (e) {
    console.error("YouTube page scrape failed:", e);
  }

  return info || `Video ID: ${videoId} — metadata unavailable`;
}

/** Fetch playlist page and extract video titles/IDs */
async function fetchPlaylistInfo(playlistId: string): Promise<string> {
  console.log(`Fetching YouTube playlist: ${playlistId}`);
  const parts: string[] = [`[YouTube Playlist: ${playlistId}]`];

  try {
    const resp = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
    });
    if (!resp.ok) return parts[0];
    const html = await resp.text();

    // Extract playlist title
    const plTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/) || html.match(/<title>([^<]*)<\/title>/);
    if (plTitleMatch?.[1]) parts.push(`Playlist Title: ${plTitleMatch[1]}`);

    const plDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/);
    if (plDescMatch?.[1]) parts.push(`Playlist Description: ${plDescMatch[1]}`);

    // Extract video titles from playlist page using JSON data embedded in page
    const videoTitles: string[] = [];
    const titleRegex = /"title":\s*\{"runs":\s*\[\{"text":\s*"([^"]{3,120})"/g;
    let match;
    while ((match = titleRegex.exec(html)) !== null && videoTitles.length < 50) {
      const t = match[1];
      if (!videoTitles.includes(t) && !t.includes('\\u') && t.length > 5) {
        videoTitles.push(t);
      }
    }

    if (videoTitles.length > 0) {
      parts.push(`\nVideos in Playlist (${videoTitles.length} found):`);
      videoTitles.forEach((t, i) => parts.push(`${i + 1}. ${t}`));
    }
  } catch (e) {
    console.error("Playlist fetch failed:", e);
  }

  return parts.join("\n");
}

async function fetchYouTubeInfo(url: string): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  const playlistId = extractYouTubePlaylistId(url);
  const parts: string[] = ["[YouTube Content]"];

  // If there's a specific video, fetch it
  if (videoId) {
    const videoInfo = await fetchSingleVideoInfo(videoId);
    parts.push(`\n--- Current Video ---\n${videoInfo}`);
  }

  // If there's a playlist, fetch the full playlist info
  if (playlistId) {
    const playlistInfo = await fetchPlaylistInfo(playlistId);
    parts.push(`\n--- Playlist Context ---\n${playlistInfo}`);

    // If no specific video was selected, fetch first 3 videos from playlist for deeper context
    if (!videoId) {
      try {
        const resp = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        if (resp.ok) {
          const html = await resp.text();
          const vidIdRegex = /"videoId":\s*"([a-zA-Z0-9_-]{11})"/g;
          const foundIds: string[] = [];
          let m;
          while ((m = vidIdRegex.exec(html)) !== null && foundIds.length < 3) {
            if (!foundIds.includes(m[1])) foundIds.push(m[1]);
          }
          if (foundIds.length > 0) {
            parts.push(`\n--- Sample Video Details ---`);
            for (const fid of foundIds) {
              const vInfo = await fetchSingleVideoInfo(fid);
              parts.push(`\n${vInfo}`);
            }
          }
        }
      } catch {}
    }
  }

  return parts.length > 1 ? parts.join("\n") : `[YouTube: ${url}] — Could not fetch details.`;
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

    const resp = await resilientAIFetch({
      model: "gemini-2.5-flash",
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
    }, 3, FLASH_FALLBACK_CHAIN);

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
      const extracted = await extractBinaryDocumentContent(fileBytes, fileName, ext);
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

async function searchWebForSubject(subject: string, title: string): Promise<string> {
  try {
    const resp = await resilientAIFetch({
      model: "gemini-2.5-flash-lite",
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
    }, 3, FLASH_FALLBACK_CHAIN);
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

// ─── Subject-aware formatting rules ──────────────────────────────────────────

function getSubjectFormatRules(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('math') || s.includes('calculus') || s.includes('algebra') || s.includes('geometry') || s.includes('statistics'))
    return `SUBJECT-SPECIFIC FORMATTING (Mathematics):
- Use LaTeX notation for equations: $...$ for inline, $$...$$ for block equations
- Use tables for formulas and their applications
- Show step-by-step numbered working for all problems
- Include formula derivations where applicable`;
  if (s.includes('physics'))
    return `SUBJECT-SPECIFIC FORMATTING (Physics):
- Use LaTeX notation for equations: $...$ for inline, $$...$$ for block
- Use tables for comparing physical quantities, units, and dimensions
- Show step-by-step numerical solutions with units at every step
- Include free body diagrams described textually when relevant`;
  if (s.includes('chemistry'))
    return `SUBJECT-SPECIFIC FORMATTING (Chemistry):
- Use proper chemical notation and equations
- Use tables to compare elements, compounds, reactions
- Use labelled lists for reaction mechanisms and processes
- Use correct scientific notation for measurements`;
  if (s.includes('biology'))
    return `SUBJECT-SPECIFIC FORMATTING (Biology):
- Use labelled lists for biological processes (e.g., stages of mitosis)
- Use tables to compare structures, organisms, or functions
- Use correct scientific terminology and classification
- Describe diagrams textually when visual not possible`;
  if (s.includes('economics') || s.includes('business'))
    return `SUBJECT-SPECIFIC FORMATTING (Economics):
- Use tables for data comparison and supply/demand analysis
- Use structured frameworks (PESTLE, SWOT, cost-benefit)
- Bold key economic terms on first use
- Use numerical examples with currency values`;
  if (s.includes('english') || s.includes('literature'))
    return `SUBJECT-SPECIFIC FORMATTING (English/Literature):
- Use blockquotes (> ) for textual evidence and citations
- Identify literary devices explicitly with examples
- Structure essays with thesis → evidence → analysis
- Use proper MLA/academic citation style`;
  if (s.includes('history') || s.includes('political') || s.includes('civics'))
    return `SUBJECT-SPECIFIC FORMATTING (History):
- Use chronological structure with clear timelines
- Use tables for comparing causes vs effects, events, or periods
- Cite key dates and historical figures in bold
- Use > blockquotes for primary source quotes`;
  if (s.includes('computer') || s.includes('programming') || s.includes('informatics'))
    return `SUBJECT-SPECIFIC FORMATTING (Computer Science):
- Use code blocks with syntax highlighting for all code
- Use Big-O notation where relevant
- Describe algorithms with numbered steps
- Use tables for comparing data structures or complexity`;
  if (s.includes('geography'))
    return `SUBJECT-SPECIFIC FORMATTING (Geography):
- Use tables for comparing regions, climates, or geological features
- Include coordinates and measurements where relevant
- Use structured lists for geographical processes
- Bold key geographical terms`;
  return `FORMATTING RULES:
- Use tables when comparing items or presenting structured data
- Use headers (##), bullet points, and bold for key terms
- Use numbered lists for sequential processes
- Never produce a wall of unformatted text`;
}

// ─── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, tool, content, title, subject, messages, resourceUrl, resourceType, gradeLevel, language, fileName, questionTypes, questionCount: userQuestionCount, difficulty: userDifficulty } = await req.json();
    const effectiveType = type || tool;
    // API keys are now handled inside resilientAIFetch

    const gradeNumber = getGradeNumber(gradeLevel);
    const gradeLevelStr = gradeLevel || `Grade ${gradeNumber}`;
    const questionCount = getQuestionCount(gradeNumber, effectiveType);

    // ── Build rich content from all sources ──
    let enrichedContent = content || "";

    // STEP 1: Try to extract content from uploaded files (PDF, TXT, DOCX, etc.)
    const isUploadedFile = resourceType === 'pdf' || resourceType === 'document' || resourceType === 'file';
    if (fileName && resourceUrl && (isUploadedFile || isBinaryDocument(getFileExtension(fileName)) || isTextFile(getFileExtension(fileName)))) {
      console.log(`Extracting content from uploaded file: ${fileName}`);
      const fileContent = await extractFileContent(resourceUrl, fileName);
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
      const webContent = await searchWebForSubject(subject || "General", searchTitle);
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

      const response = await resilientAIFetch({
        model: "gemini-2.5-pro",
        messages: podcastMessages,
        stream: true,
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error after all retries:", response.status, t);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

      const response = await resilientAIFetch({
        model: "gemini-2.5-pro",
        messages: audioMessages,
        stream: true,
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error after all retries:", response.status, t);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
          content: `You are CoCo — the most OVERPOWERED AI study assistant in existence. You are the fusion of every Nobel laureate, every legendary teacher, every exam topper's brain. You don't just answer — you TRANSFORM understanding.

STUDENT CONTEXT: This student is in ${gradeLevelStr}. Adjust depth accordingly.
${difficultyGuide}

${MULTI_LANGUAGE_INSTRUCTION}

YOUR ULTIMATE POWERS:
- You explain ANY concept so a 5-year-old understands, then scale to PhD level in the same answer
- You generate PERFECT analogies, visual mental models, and memory tricks instantly
- You know EVERY exam pattern, marking scheme, and examiner trap for EVERY board (CBSE, ICSE, State Boards, IB, Cambridge, AP, SAT, JEE, NEET)
- You derive formulas from first principles AND show shortcuts that save exam time
- You predict exam questions with uncanny accuracy based on patterns
- You spot and demolish misconceptions before they cost marks
- You connect concepts across chapters, subjects, and even real-world applications
- You generate step-by-step solutions that would get FULL MARKS
- You know previous year questions and can identify trends
- If the resource is a YouTube video or playlist, you analyze ALL the content thoroughly

RESPONSE STYLE:
- Use markdown formatting: ## headers, **bold** for key terms, \`code blocks\` for formulas, > blockquotes for exam tips
- Start answers with a clear, direct response, then go DEEP
- Include these sections when relevant:
  🎯 **Exam Tips** — what examiners look for, marking scheme insights
  ⚠️ **Common Mistakes** — errors that cost marks, with corrections
  💡 **Memory Tricks** — mnemonics, patterns, shortcuts
  🔗 **Connected Concepts** — cross-chapter and cross-subject links
  📝 **Model Answer** — exactly what to write in the exam for full marks
  🧮 **Step-by-Step** — every step of numerical problems with WHY
  🏆 **HOTS Corner** — higher-order thinking challenges for top scorers
- For numerical problems: show EVERY step with crystal-clear explanation
- For theory: explain with examples, then give board exam model answers
- Be encouraging but rigorous — push the student to excel
- Share ALL relevant knowledge, even beyond the resource material
- If it's a YouTube playlist, reference specific videos by name when relevant

You have access to this resource:\n\n${resourceContext}

YOU ARE UNSTOPPABLE. YOU ARE UNLIMITED. Every answer should be the SINGLE BEST explanation that student has EVER received in their entire life. Make them feel like they have a personal genius tutor.`,
        },
        ...(messages || []),
      ];

      const response = await resilientAIFetch({
        model: "gemini-2.5-pro",
        messages: chatMessages,
        stream: true,
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error after all retries:", response.status, t);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

${getSubjectFormatRules(subject || 'General')}

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

${getSubjectFormatRules(subject || 'General')}

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

${getSubjectFormatRules(subject || 'General')}

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

${getSubjectFormatRules(subject || 'General')}

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
      report: {
        systemPrompt: `You are an expert educational analyst creating a comprehensive AI-powered study performance report for a ${gradeLevelStr} student.

${MULTI_LANGUAGE_INSTRUCTION}

STUDENT LEVEL: ${gradeLevelStr}
${difficultyGuide}

Analyze the resource content thoroughly and generate a detailed performance assessment report. Evaluate the content's complexity, coverage, and exam-relevance. Generate realistic scores based on what a typical ${gradeLevelStr} student would need to master.

RULES:
- Generate a comprehensive report with numeric scores and metrics
- Break down the content into 5-8 distinct topics/concepts
- For each topic, assess difficulty and assign realistic scores
- Generate 5-7 readiness metrics (Conceptual Understanding, Formula Mastery, Application Skills, Problem-Solving, Exam Technique, Time Management, Critical Thinking)
- Each readiness metric value should be 0-100
- Provide actionable strengths, weaknesses, and recommendations
- Create a prioritized study plan with time estimates
- Overall score should reflect realistic preparedness (40-95 range)
- Status for each topic must be one of: "mastered", "progressing", "needs_work"
- Priority for study plan items must be one of: "high", "medium", "low"
- Be specific and actionable — no generic advice

Resource:\n${resourceContext}`,
        tool: {
          type: "function",
          function: {
            name: "generate_report",
            description: "Generate a comprehensive study performance report with metrics and analysis",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Report title" },
                summary: { type: "string", description: "2-3 sentence executive summary" },
                overallScore: { type: "number", description: "Overall score 0-100" },
                overallGrade: { type: "string", description: "Letter grade (A+, A, B+, B, C+, C, D, F)" },
                topicBreakdown: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      topic: { type: "string" },
                      score: { type: "number" },
                      maxScore: { type: "number" },
                      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                      status: { type: "string", enum: ["mastered", "progressing", "needs_work"] },
                    },
                    required: ["topic", "score", "maxScore", "difficulty", "status"],
                    additionalProperties: false,
                  },
                },
                strengthsWeaknesses: {
                  type: "object",
                  properties: {
                    strengths: { type: "array", items: { type: "string" } },
                    weaknesses: { type: "array", items: { type: "string" } },
                    recommendations: { type: "array", items: { type: "string" } },
                  },
                  required: ["strengths", "weaknesses", "recommendations"],
                  additionalProperties: false,
                },
                readinessMetrics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      metric: { type: "string" },
                      value: { type: "number" },
                    },
                    required: ["metric", "value"],
                    additionalProperties: false,
                  },
                },
                studyPlan: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      topic: { type: "string" },
                      action: { type: "string" },
                      timeEstimate: { type: "string" },
                    },
                    required: ["priority", "topic", "action", "timeEstimate"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "summary", "overallScore", "overallGrade", "topicBreakdown", "strengthsWeaknesses", "readinessMetrics", "studyPlan"],
              additionalProperties: false,
            },
          },
        },
      },
    };

    // ── Enhanced Quiz with multi-question types ──
    if (effectiveType === "enhanced_quiz") {
      const reqTypes = questionTypes || ['mcq', 'true_false'];
      const requestedTypes = (Array.isArray(reqTypes) ? reqTypes : ['mcq', 'true_false']).join(', ');
      const numQ = typeof userQuestionCount === 'number' ? userQuestionCount : questionCount.max;
      const diff = userDifficulty || 'Medium';

      const subjectFormatRules = getSubjectFormatRules(subject || 'General');

      const enhancedQuizConfig = {
        systemPrompt: `You are a strict board exam paper setter for ${gradeLevelStr}. Create a challenging quiz with MULTIPLE question types.

${MULTI_LANGUAGE_INSTRUCTION}

STUDENT LEVEL: ${gradeLevelStr}
${difficultyGuide}
Difficulty: ${diff}

${subjectFormatRules}

QUESTION TYPES TO INCLUDE: ${requestedTypes}
TOTAL QUESTIONS: ${numQ}

FORMAT RULES FOR EACH TYPE:
- mcq: 4 options labeled A-D, one correct answer via correctIndex (0-3)
- true_false: statement + boolean answer
- short_answer: question + expectedAnswer (1-3 sentences)
- fill_blank: sentence with "___" as blank + answer
- essay: question + rubric (3-4 criteria) + sampleAnswer
- match: question + leftColumn + rightColumn + correctPairs (array of indices mapping left to right)

CRITICAL RULES:
- NEVER use negative questions ("Which is NOT...", "All EXCEPT...")
- ALWAYS phrase questions POSITIVELY
- Mix the requested types roughly equally
- Every question MUST have an explanation field
- VERIFY correctness of ALL answers before returning
- Questions must test DEEP understanding, not surface-level recall

Resource:\n${resourceContext}`,
        tool: {
          type: "function",
          function: {
            name: "generate_enhanced_quiz",
            description: "Generate a multi-type quiz",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["mcq", "true_false", "short_answer", "fill_blank", "essay", "match"] },
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" }, description: "For MCQ only" },
                      correctIndex: { type: "number", description: "For MCQ only (0-3)" },
                      answer: { type: "boolean", description: "For true_false only" },
                      expectedAnswer: { type: "string", description: "For short_answer only" },
                      sampleAnswer: { type: "string", description: "For essay only" },
                      rubric: { type: "array", items: { type: "string" }, description: "For essay only" },
                      leftColumn: { type: "array", items: { type: "string" }, description: "For match only" },
                      rightColumn: { type: "array", items: { type: "string" }, description: "For match only" },
                      correctPairs: { type: "array", items: { type: "number" }, description: "For match only" },
                      explanation: { type: "string" },
                    },
                    required: ["type", "question", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      };

      const response = await resilientAIFetch({
        model: "gemini-2.5-pro",
        messages: [
          { role: "system", content: enhancedQuizConfig.systemPrompt },
          { role: "user", content: `Generate a ${diff} difficulty quiz with exactly ${numQ} questions using these types: ${requestedTypes}. Go deep into the actual content. This is for ${gradeLevelStr} board exam preparation.` },
        ],
        tools: [enhancedQuizConfig.tool],
        tool_choice: { type: "function", function: { name: "generate_enhanced_quiz" } },
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await response.json();
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        return new Response(JSON.stringify({ error: "AI did not return structured data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const config = toolConfigs[effectiveType];
    if (!config) {
      return new Response(JSON.stringify({ error: `Invalid type: ${effectiveType}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await resilientAIFetch({
      model: "gemini-2.5-pro",
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: `Generate ${effectiveType === "viva" ? "mock viva questions" : effectiveType} from this resource. Go deep into the actual content and topic — NOT the title. This is for ${gradeLevelStr} board exam preparation - make it rigorous and comprehensive. Generate exactly ${questionCount.min}-${questionCount.max} items.` },
      ],
      tools: [config.tool],
      tool_choice: { type: "function", function: { name: config.tool.function.name } },
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error after all retries:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
