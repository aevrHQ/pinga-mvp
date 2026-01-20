import { createProvider } from "@untools/ai-toolkit";

interface EventSummaryInput {
  eventType: string;
  source: string;
  payload: unknown;
}

export async function generateEventSummary(
  input: EventSummaryInput,
): Promise<string | undefined> {
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY not configured");
    return undefined;
  }

  try {
    const provider = createProvider({
      provider: "groq",
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.1-8b-instant",
    });

    const result = await provider.generateText({
      system: `You are a technical assistant for a developer notification tool.
Your job is to summarize a webhook event into a SINGLE, concise line of text.
Start with an appropriate emoji.
Focus on the "what" and "who".
Do not use markdown bold/italic, just plain text with an emoji.

Examples:
- 🚀 Deploy "web-app" successful by @user
- 🐛 Issue #123 "Fix login bug" opened by @user
- ⭐️ Starred by @user

Return ONLY the summary line, nothing else.`,
      messages: [
        {
          role: "user",
          content: `Event Source: ${input.source}
Event Type: ${input.eventType}
Payload: ${JSON.stringify(input.payload, null, 2).slice(0, 2000)}`,
        },
      ],
      temperature: 0.3,
    });

    return result.text.trim();
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    return undefined;
  }
}
