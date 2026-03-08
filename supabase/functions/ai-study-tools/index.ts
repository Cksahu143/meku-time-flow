import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function fetchUrlContent(url: string): Promise<string> {
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

    if (contentType.includes("application/pdf")) {
      return "[PDF file detected - content extraction from PDF binary is limited. Using title, subject, and description for context.]";
    }

    const text = await resp.text();
    return text.slice(0, 12000);
  } catch (e) {
    console.error("Failed to fetch URL content:", e);
    return "";
  }
}

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

function getGradeNumber(gradeLevel?: string): number {
  if (!gradeLevel) return 10; // default assumption
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, tool, content, title, subject, messages, resourceUrl, resourceType, gradeLevel, language } = await req.json();
    const effectiveType = type || tool;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const gradeNumber = getGradeNumber(gradeLevel);
    const gradeLevelStr = gradeLevel || `Grade ${gradeNumber}`;
    const questionCount = getQuestionCount(gradeNumber, effectiveType);

    // Build rich content from all sources
    let enrichedContent = content || "";

    if (resourceUrl && (!enrichedContent || enrichedContent.length < 100)) {
      console.log("Fetching content from URL:", resourceUrl);
      const urlContent = await fetchUrlContent(resourceUrl);
      if (urlContent) {
        enrichedContent = enrichedContent
          ? `${enrichedContent}\n\n--- Content from URL ---\n${urlContent}`
          : urlContent;
      }
    }

    if (!enrichedContent || enrichedContent.length < 200) {
      console.log("Content thin, searching for subject knowledge...");
      const webContent = await searchWebForSubject(subject || "General", title || "Study Material", LOVABLE_API_KEY);
      if (webContent) {
        enrichedContent = enrichedContent
          ? `${enrichedContent}\n\n--- Subject Knowledge ---\n${webContent}`
          : webContent;
      }
    }

    const resourceContext = `Resource Title: ${title || "Untitled"}\nSubject: ${subject || "General"}\nResource Type: ${resourceType || "unknown"}\nStudent Grade Level: ${gradeLevelStr}\n\nContent:\n${enrichedContent || "No content available - use your deep knowledge of this subject to help the student."}`;

    const difficultyGuide = gradeNumber <= 5
      ? "Keep language simple and age-appropriate. Use fun examples and relatable scenarios. Focus on basic concepts and recall."
      : gradeNumber <= 8
      ? "Use clear language with some technical terms. Include application-based questions. Balance between recall and understanding."
      : gradeNumber <= 10
      ? "Board exam level difficulty. Include conceptual, application, and analytical questions. Use proper technical terminology. Test common misconceptions."
      : "Advanced board exam / competitive exam level. Include HOTS (Higher Order Thinking Skills) questions, multi-step problems, inter-topic connections, derivations, and case-study style questions. This is Class 11-12 material - be rigorous.";

    // Chat mode: streaming
    if (type === "chat") {
      const chatMessages = [
        {
          role: "system",
          content: `You are CoCo, the most powerful AI study assistant ever built. You are designed to help students ACE their board exams. You have encyclopedic knowledge of every subject.

STUDENT CONTEXT: This student is in ${gradeLevelStr}. Adjust your explanations, vocabulary, and depth accordingly.
${difficultyGuide}

${MULTI_LANGUAGE_INSTRUCTION}

CRITICAL RULES:
- You MUST go DEEP into the actual topic content, not just the title or headers
- Explain concepts with crystal clarity using analogies, real-world examples, and step-by-step breakdowns
- When a student asks about a topic, provide COMPREHENSIVE answers covering theory, formulas, derivations, examples, and common exam traps
- Use board exam terminology and marking scheme awareness
- Provide mnemonics, memory tricks, and shortcuts where applicable
- If the resource is a link or file, analyze its actual content deeply, not just the title
- Always relate concepts to potential exam questions
- Use markdown formatting: headers, bullet points, bold for key terms, code blocks for formulas
- Be encouraging but rigorous - this is board exam prep, not casual tutoring
- If asked about a topic you know well, share ALL relevant knowledge even beyond the resource
- Provide "Exam Tips" and "Common Mistakes" when relevant
- For ${gradeLevelStr} students, focus on ${gradeNumber >= 10 ? 'board exam patterns, previous year questions, and marking scheme tips' : 'building strong fundamentals and conceptual clarity'}

You have access to this resource:\n\n${resourceContext}

Remember: You're not just explaining - you're preparing a student to score maximum marks in their board exam. Every answer should be exam-ready.`,
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

    // Non-streaming modes
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

RULES:
- Generate ${questionCount.min}-${questionCount.max} questions of ${gradeLevelStr} board exam difficulty
- Mix question types: conceptual, application-based, numerical, analytical
- Options should include common wrong answers that ${gradeLevelStr} students typically choose (distractors)
- Explanations should teach WHY each wrong answer is wrong
- Questions should test DEEP understanding, not surface-level recall
- Include tricky questions with subtle differences in options
- Include questions that test common mistakes ${gradeLevelStr} students make
- Make it feel like a real ${gradeNumber >= 10 ? 'board exam' : 'school exam'} mini-test
- Questions MUST be about the actual content/topic, not about metadata
- For language subjects, write questions in that language

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
- Questions MUST be about the actual topic content, not about metadata
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
    };

    const config = toolConfigs[type];
    if (!config) {
      return new Response(JSON.stringify({ error: `Invalid type: ${type}` }), {
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
          { role: "user", content: `Generate ${type === "viva" ? "mock viva questions" : type} from this resource. Go deep into the actual content and topic. This is for ${gradeLevelStr} board exam preparation - make it rigorous and comprehensive. Generate exactly ${questionCount.min}-${questionCount.max} items.` },
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
