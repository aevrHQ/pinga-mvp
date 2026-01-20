import { createProvider } from "@untools/ai-toolkit";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not defined in environment variables");
}

export const aiProvider = createProvider({
  provider: "vercel",
  vercelModel: { type: "groq", model: "llama-3.1-8b-instant" },
  apiKey: process.env.GROQ_API_KEY,
});
