export interface ProjectFolder {
  dir: string;
  name: string;
  context: ProjectContext;
}

export interface ProjectContext {
  id: string;
  source: "msg" | "transcript" | "manual";
  origin: string;
  ingestedAt: string;
  subject: string;
  from?: string;
  to?: string[];
  occurredAt?: string;
  body: string;
  attachments: AttachmentRef[];
  projectTitle?: string;
  projectPageId?: string;
  matchScore?: number;
  syntheses?: SynthesisRecord[];
}

export interface AttachmentRef {
  fileName: string;
  relPath: string;
  size: number;
  hash: string;
}

export interface SynthesisRecord {
  generatedAt: string;
  model: string;
  cacheReadTokens: number;
  inputTokens: number;
  outputTokens: number;
  confluenceStatus: string;
  jiraActionItems: { title: string; description: string; projectHint: string }[];
  stakeholderEmail: string;
  pushedToConfluence?: { pageId: string; pushedAt: string; versionMessage: string };
}

export interface Settings {
  site: string;
  email: string;
  cloudId: string;
  hasApiToken: boolean;
  hasAnthropicKey: boolean;
  inbox: string;
  projectsDir: string;
  directoryDocx: string;
}
