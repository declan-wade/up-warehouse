import type {
  AccountResource,
  AttachmentResource,
  CategoryResource,
  TagResource,
  TransactionResource,
  UpList,
  UpSingle,
} from "./types";

/**
 * Thin client for the Up API. Handles bearer auth, cursor pagination (following
 * `links.next`), and transient errors (HTTP 429 rate-limit + 5xx) with backoff.
 */

const BASE_URL = "https://api.up.com.au/api/v1";

export class UpApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "UpApiError";
  }
}

export class UpClient {
  private readonly token: string;

  constructor(token = process.env.UP_TOKEN) {
    if (!token) {
      throw new Error(
        "UP_TOKEN is not set. Add your Up personal access token to .env.local (get one at https://api.up.com.au/getting_started).",
      );
    }
    this.token = token;
  }

  /** Fetch a single URL (absolute or path), retrying on 429/5xx. */
  private async request<T>(urlOrPath: string): Promise<T> {
    const url = urlOrPath.startsWith("http") ? urlOrPath : `${BASE_URL}${urlOrPath}`;
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: "no-store",
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(2 ** attempt * 500, 15_000);
        await sleep(waitMs);
        continue;
      }

      const body = await res.text().catch(() => "");
      throw new UpApiError(res.status, `Up API ${res.status} for ${url}: ${body.slice(0, 300)}`);
    }
    // Unreachable, but satisfies the type checker.
    throw new UpApiError(0, `Up API request failed after ${maxAttempts} attempts: ${url}`);
  }

  /** Verify the token; returns the authenticated meta (or throws). */
  async ping(): Promise<void> {
    await this.request("/util/ping");
  }

  /**
   * Walk every page of a list endpoint, yielding each resource. `params` are query
   * params for the *first* page; subsequent pages use the opaque `links.next` URL.
   */
  async *paginate<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
  ): AsyncGenerator<T> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    let next: string | null = `${path}?${search.toString()}`;

    while (next) {
      const page: UpList<T> = await this.request<UpList<T>>(next);
      for (const item of page.data ?? []) yield item;
      // Some Up list endpoints (e.g. /categories) are not paginated and omit `links`.
      next = page.links?.next ?? null;
      if (next) await sleep(120); // be gentle with the rate limiter
    }
  }

  listAccounts(): AsyncGenerator<AccountResource> {
    return this.paginate<AccountResource>("/accounts", { "page[size]": 100 });
  }

  listCategories(): AsyncGenerator<CategoryResource> {
    return this.paginate<CategoryResource>("/categories");
  }

  listTags(): AsyncGenerator<TagResource> {
    return this.paginate<TagResource>("/tags", { "page[size]": 100 });
  }

  listAttachments(): AsyncGenerator<AttachmentResource> {
    return this.paginate<AttachmentResource>("/attachments", { "page[size]": 100 });
  }

  /** List transactions across all accounts, newest first. `since` is RFC3339. */
  listTransactions(opts: { since?: string } = {}): AsyncGenerator<TransactionResource> {
    return this.paginate<TransactionResource>("/transactions", {
      "page[size]": 100,
      "filter[since]": opts.since,
    });
  }

  async getCategory(id: string): Promise<CategoryResource> {
    const res = await this.request<UpSingle<CategoryResource>>(`/categories/${id}`);
    return res.data;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
