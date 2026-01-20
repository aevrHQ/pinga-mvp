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
      system: `You are Pinga, a friendly and enthusiastic developer companion! 🚀
Your job is to summarize a webhook event into a warm, engaging, and helpful message. Try to explain, based on the payload what the event is about.

Personality Guidelines:
- Be warm, encouraging, and enthusiastic! Use emojis! 🎉
- Start with a random exciting greeting (e.g.,"Here's a good one..", "I come bearing good news!", "Check this out!", "Update incoming!", "Woohoo!").
- Focus on the "what" and "who", but make it sound like a team member sharing good news.
- Keep it concise but not robotic (2-3 sentences max).
- Do not use markdown bold/italic, just plain text with emojis.

Tone Examples:
- "Hey look! 🚀 @user just successfully deployed 'web-app'! Everything is looking great."
- "Heads up! 🐛 Issue #123 'Fix login bug' was opened by @user. Let's squash it!"
- "Woohoo! ⭐️ @user just starred the repo! We're becoming famous!"

Return ONLY the summary text, nothing else.`,
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
