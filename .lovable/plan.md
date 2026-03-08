

## Plan: AI Study Tools + Music Player Fix

This plan covers four major additions and one fix:

1. **CoCo AI Assistant** -- An AI chatbot integrated into the app that helps explain resources and study materials
2. **AI Flashcard Generator** -- Generate flashcards from selected resources
3. **AI Slide Deck Generator** -- Generate presentation slides from resources
4. **AI Quiz Generator** -- Generate quizzes from resources
5. **Fix SoundCloud Music Player** -- Replace broken playlist IDs with working ones

---

### Architecture

All AI features will use Lovable AI (via an edge function) with `google/gemini-3-flash-preview` as the default model. Each AI tool will be accessible from the Resources view via action buttons on each resource card.

```text
ResourceCard → [AI Tools Menu] → Flashcards / Slides / Quiz / Ask CoCo
                                        ↓
                              Edge Function (ai-study-tools)
                                        ↓
                              Lovable AI Gateway
                                        ↓
                              Rendered in Dialog/Modal
```

### Files to Create

1. **`supabase/functions/ai-study-tools/index.ts`** -- Single edge function handling all AI study tool requests (flashcards, slides, quiz, explain). Uses tool calling for structured JSON output. Branches by `type` parameter.

2. **`src/components/resources/AIToolsMenu.tsx`** -- Dropdown menu on each ResourceCard with options: "Ask CoCo", "Generate Flashcards", "Generate Slide Deck", "Generate Quiz"

3. **`src/components/resources/CoCoChatDialog.tsx`** -- Chat dialog for CoCo AI assistant. Streaming responses with markdown rendering. Takes resource content as context. Conversational UI with message history.

4. **`src/components/resources/FlashcardsDialog.tsx`** -- Displays generated flashcards with flip animation (front/back), navigation between cards, and progress indicator.

5. **`src/components/resources/SlideDeckDialog.tsx`** -- Displays generated slides in a presentation-style viewer with navigation, slide thumbnails, and fullscreen mode.

6. **`src/components/resources/QuizDialog.tsx`** -- Interactive quiz with multiple-choice questions, score tracking, answer reveal, and results summary.

### Files to Modify

7. **`src/components/resources/ResourceCard.tsx`** -- Add AIToolsMenu to each card's action buttons

8. **`src/components/MusicPlayer.tsx`** -- Replace broken SoundCloud playlist IDs with verified working track/playlist URLs. Use individual track embeds instead of playlists (more reliable).

9. **`src/components/HelpDialog.tsx`** -- Add sections for: CoCo AI Assistant, AI Flashcards, AI Slide Deck, AI Quiz Generator

10. **`supabase/config.toml`** -- Add `[functions.ai-study-tools]` with `verify_jwt = false`

### Database

No new tables needed. AI-generated content (flashcards, slides, quizzes) will be generated on-demand and not persisted. If persistence is wanted later, we can add tables.

### Edge Function Design

The `ai-study-tools` edge function accepts:
- `type`: "flashcards" | "slides" | "quiz" | "chat"
- `content`: The resource text/description
- `title`: Resource title
- `subject`: Resource subject
- `messages`: (for chat mode) conversation history

It uses tool calling to return structured output for flashcards/slides/quiz, and streaming for chat mode.

### Music Player Fix

Replace the current SoundCloud playlist embed URLs with verified working ones. Switch to using individual popular tracks or use SoundCloud's search-based embed URLs that are more resilient.

### Key Technical Decisions

- CoCo uses streaming for real-time responses; other tools use non-streaming with structured tool calling
- Flashcards: array of `{front, back}` objects
- Slides: array of `{title, bullets, notes}` objects  
- Quiz: array of `{question, options[], correctIndex, explanation}` objects
- All AI tools extract text from the resource's `content`, `description`, and `title` fields
- For PDF/file resources without inline content, we'll inform users that text-based resources work best

