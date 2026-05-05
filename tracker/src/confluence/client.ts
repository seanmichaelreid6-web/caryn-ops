import { request } from "undici";
import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "../config.js";
import { log } from "../util/logger.js";

export interface PageSummary {
  id: string;
  title: string;
  spaceId: string;
  status: string;
  version: { number: number };
}

export interface PageBody {
  id: string;
  title: string;
  spaceId: string;
  version: { number: number };
  body: { storage?: { value: string }; atlas_doc_format?: { value: string } };
}

export interface AttachmentSummary {
  id: string;
  title: string;
  fileSize: number;
  /** SHA-256 if the upload tooling provided it via comment metadata. */
  comment?: string;
}

/**
 * Confluence Cloud REST client. Uses Basic auth with the Atlassian API token
 * the user provisions per `.env.example`. v2 endpoints are used for page
 * read/write; v1 is used for attachments because v2 still lacks a binary
 * upload endpoint as of late 2025.
 */
export class ConfluenceClient {
  private authHeader: string;
  private baseV1: string;
  private baseV2: string;

  constructor() {
    const { email, apiToken, baseUrl } = config.atlassian;
    if (!apiToken) {
      throw new Error(
        "ATLASSIAN_API_TOKEN is empty. Generate one at https://id.atlassian.com/manage-profile/security/api-tokens",
      );
    }
    const token = Buffer.from(`${email}:${apiToken}`).toString("base64");
    this.authHeader = `Basic ${token}`;
    this.baseV1 = `${baseUrl}/rest/api`;
    this.baseV2 = `${baseUrl}/api/v2`;
  }

  async whoami(): Promise<{ accountId: string; email: string; displayName: string }> {
    const url = `${config.atlassian.baseUrl}/rest/api/user/current`;
    const res = await request(url, { headers: this.headers() });
    if (res.statusCode !== 200) throw new Error(`whoami failed: ${res.statusCode}`);
    const body = (await res.body.json()) as { accountId: string; email: string; displayName: string };
    return body;
  }

  async getPage(pageId: string): Promise<PageBody> {
    const url = `${this.baseV2}/pages/${pageId}?body-format=storage`;
    const res = await request(url, { headers: this.headers() });
    if (res.statusCode !== 200) {
      throw new Error(`getPage(${pageId}) failed: ${res.statusCode} ${await res.body.text()}`);
    }
    return (await res.body.json()) as PageBody;
  }

  async updatePageBody(page: PageBody, newStorageHtml: string, versionMessage: string): Promise<PageBody> {
    const url = `${this.baseV2}/pages/${page.id}`;
    const body = {
      id: page.id,
      status: "current",
      title: page.title,
      spaceId: page.spaceId,
      body: { representation: "storage", value: newStorageHtml },
      version: { number: page.version.number + 1, message: versionMessage },
    };
    const res = await request(url, {
      method: "PUT",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.statusCode !== 200) {
      throw new Error(`updatePage(${page.id}) failed: ${res.statusCode} ${await res.body.text()}`);
    }
    return (await res.body.json()) as PageBody;
  }

  async listAttachments(pageId: string): Promise<AttachmentSummary[]> {
    const url = `${this.baseV2}/pages/${pageId}/attachments?limit=250`;
    const res = await request(url, { headers: this.headers() });
    if (res.statusCode !== 200) {
      throw new Error(`listAttachments(${pageId}) failed: ${res.statusCode}`);
    }
    const body = (await res.body.json()) as { results: AttachmentSummary[] };
    return body.results;
  }

  async uploadAttachment(pageId: string, filePath: string, comment: string): Promise<AttachmentSummary> {
    // v1 multipart upload — required header to bypass XSRF on REST.
    const url = `${this.baseV1}/content/${pageId}/child/attachment`;
    const buf = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const boundary = `----trackerBoundary${Date.now().toString(16)}`;
    const head = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`,
    );
    const mid = Buffer.from(
      `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="comment"\r\n\r\n` +
        `${comment}\r\n` +
        `--${boundary}--\r\n`,
    );
    const body = Buffer.concat([head, buf, mid]);

    const res = await request(url, {
      method: "POST",
      headers: {
        ...this.headers(),
        "X-Atlassian-Token": "nocheck",
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    if (res.statusCode !== 200) {
      throw new Error(`uploadAttachment failed: ${res.statusCode} ${await res.body.text()}`);
    }
    const out = (await res.body.json()) as { results?: AttachmentSummary[] };
    const first = out.results?.[0];
    if (!first) throw new Error("uploadAttachment: empty response");
    log.info(`Uploaded attachment ${fileName} → page ${pageId} (id=${first.id})`);
    return first;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      Accept: "application/json",
    };
  }
}
