import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { DirectoryEntry } from "../directory/parseDirectory.js";

export const SynthesisSchema = z.object({
  confluenceStatus: z
    .string()
    .describe(
      "Markdown body for a Confluence 'Status Update' panel. 3–6 short bullet points covering decisions made, context, blockers, and next steps. No greeting or sign-off — this is a status block, not an email.",
    ),
  jiraActionItems: z
    .array(
      z.object({
        title: z.string().describe("Imperative summary, ≤80 chars."),
        description: z
          .string()
          .describe("1–3 sentences of context including the asker, due date if known, and the concrete deliverable."),
        projectHint: z
          .string()
          .describe(
            "Best guess at which project this belongs to, taken from the routing table when possible. Empty string if unclear.",
          ),
      }),
    )
    .describe("Concrete TODOs the user owes someone. Empty array if there are none."),
  stakeholderEmail: z
    .string()
    .describe(
      "Plaintext draft reply to the original sender. Match the user's voice as defined in the writing style guide. Do not invent commitments.",
    ),
});

export type Synthesis = z.infer<typeof SynthesisSchema>;

export interface SynthesisInput {
  /** Email or transcript subject. */
  subject: string;
  /** Sender / author. */
  from?: string;
  /** Recipients / participants. */
  to?: string[];
  /** Email body or transcript text. Plain text. */
  body: string;
  /** File names of attachments associated with this artifact. */
  attachments?: string[];
}

export interface SynthesisResult {
  synthesis: Synthesis;
  model: string;
  usage: {
    inputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    outputTokens: number;
  };
}

const DEFAULT_STYLE = `Default voice: direct, warm, low-ceremony. Lead with the answer. Avoid filler ("Hope this finds you well", "Just circling back"). Short paragraphs. Sign off with first name only.`;

export class ClaudeSynthesizer {
  private client: Anthropic;
  private model = "claude-opus-4-7";

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey });
  }

  async synthesize(
    input: SynthesisInput,
    projectIndex: DirectoryEntry[],
    writingStyle: string = DEFAULT_STYLE,
  ): Promise<SynthesisResult> {
    const system = buildSystemPrompt(projectIndex, writingStyle);
    const user = buildUserPrompt(input);

    // The system block is large, stable across calls (project list + style + role),
    // and goes through the prefix render before user content — perfect cache target.
    // `cache_control: ephemeral` at the top level auto-places on the last cacheable
    // block, which is the system block since user content varies per call.
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 4096,
      cache_control: { type: "ephemeral" },
      system: [{ type: "text", text: system }],
      messages: [{ role: "user", content: user }],
      output_config: { format: zodOutputFormat(SynthesisSchema) },
    });

    if (!response.parsed_output) {
      const refusal = response.stop_reason === "refusal" ? " (refusal)" : "";
      throw new Error(`Claude failed to return structured output${refusal}`);
    }

    return {
      synthesis: response.parsed_output,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}

function buildSystemPrompt(projectIndex: DirectoryEntry[], writingStyle: string): string {
  const projects = projectIndex
    .map((e) => {
      const aliases = e.aliases.length ? ` (aka ${e.aliases.join("; ")})` : "";
      const page = e.pageId ? ` [pageId=${e.pageId}]` : "";
      return `- ${e.title}${aliases}${page}`;
    })
    .join("\n");

  return [
    `You are an executive assistant for a product/engineering operator at CarynHealth. Given an email or meeting transcript, you produce three artifacts: a Confluence status update, a list of Jira-ready action items, and a draft reply to the sender.`,
    ``,
    `# Project routing table`,
    `When you cite a project in jiraActionItems.projectHint, use a title from this list verbatim. If nothing fits, leave projectHint empty — never invent a project.`,
    ``,
    projects,
    ``,
    `# Writing style guide`,
    writingStyle,
    ``,
    `# Output rules`,
    `- confluenceStatus: 3–6 bullets in markdown, no headers, no email pleasantries.`,
    `- jiraActionItems: only include items the user owes someone or that need tracking. If there are no real action items, return [].`,
    `- stakeholderEmail: a draft, not a paraphrase. Match the user's voice from the style guide.`,
    `- Do not invent facts, deadlines, or commitments not present in the source. If something is unclear, omit it rather than guessing.`,
  ].join("\n");
}

function buildUserPrompt(input: SynthesisInput): string {
  const lines: string[] = [];
  lines.push(`Subject: ${input.subject}`);
  if (input.from) lines.push(`From: ${input.from}`);
  if (input.to?.length) lines.push(`To: ${input.to.join(", ")}`);
  if (input.attachments?.length) lines.push(`Attachments: ${input.attachments.join(", ")}`);
  lines.push("", "---", "", input.body);
  return lines.join("\n");
}
