import { marked } from "marked";

export async function parseMarkdown(content: string): Promise<string> {
  // Configure marked with safe defaults
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Parse and return the HTML
  return marked.parse(content);
}
