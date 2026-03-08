import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, content, title, subject, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const resourceContext = `Resource Title: ${title || "Untitled"}\nSubject: ${subject || "General"}\n\nContent:\n${content || "No content available"}`;

    // Chat mode: streaming
    if (type === "chat") {
      const chatMessages = [
        {
          role: "system",
          content: `You are CoCo, a friendly and knowledgeable AI study assistant. You help students understand study materials by explaining concepts clearly, providing examples, and answering questions. You have access to the following resource:\n\n${resourceContext}\n\nBe encouraging, use analogies, and break down complex topics. Use markdown formatting for clarity. Keep responses focused and educational.`,
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

    // Non-streaming modes: flashcards, slides, quiz
    const toolConfigs: Record<string, { systemPrompt: string; tool: any }> = {
      flashcards: {
        systemPrompt: `You are an expert educator. Create study flashcards from the provided resource material. Generate 8-12 high-quality flashcards that cover the key concepts. Each card should have a clear question/prompt on the front and a concise answer on the back.\n\nResource:\n${resourceContext}`,
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
                      front: { type: "string", description: "Question or prompt" },
                      back: { type: "string", description: "Answer or explanation" },
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
        systemPrompt: `You are a presentation expert. Create a slide deck from the provided resource material. Generate 6-10 slides that present the key information in a clear, engaging way. Each slide should have a title, 3-5 bullet points, and optional speaker notes.\n\nResource:\n${resourceContext}`,
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
                      notes: { type: "string", description: "Speaker notes" },
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
        systemPrompt: `You are an expert educator. Create a quiz from the provided resource material. Generate 8-10 multiple-choice questions that test understanding of the key concepts. Each question should have 4 options with one correct answer and a brief explanation.\n\nResource:\n${resourceContext}`,
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
          { role: "user", content: `Generate ${type} from this resource.` },
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
