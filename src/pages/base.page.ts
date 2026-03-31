import { Locator, Page, Response, Route } from '@playwright/test';

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
}

export interface WaitForApiOptions {
  timeout?: number;
}

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to this page's canonical URL. */
  abstract navigate(): Promise<void>;

  /** Wait until the page's primary content is visible and ready. */
  abstract waitUntilLoaded(): Promise<void>;

  // ── retry ─────────────────────────────────────────────────────────────────

  /**
   * Retries `action` up to `attempts` times (default 3) with `delayMs` ms
   * between attempts (default 500). Re-throws the last error on exhaustion.
   */
  protected async retry<T>(
    action: () => Promise<T>,
    { attempts = 3, delayMs = 500 }: RetryOptions = {},
  ): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await action();
      } catch (err) {
        lastError = err;
        if (i < attempts - 1) {
          await this.page.waitForTimeout(delayMs);
        }
      }
    }
    throw lastError;
  }

  // ── waitForApiResponse ────────────────────────────────────────────────────

  /**
   * Registers a one-time response waiter for `urlPattern`, fires `action`,
   * then resolves when the matching response is received.
   *
   * Usage:
   *   const res = await this.waitForApiResponse('/users/login', () => btn.click());
   */
  protected async waitForApiResponse(
    urlPattern: string | RegExp,
    action: () => Promise<void>,
    { timeout = 10_000 }: WaitForApiOptions = {},
  ): Promise<Response> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) => {
          const url = res.url();
          return typeof urlPattern === 'string'
            ? url.includes(urlPattern)
            : urlPattern.test(url);
        },
        { timeout },
      ),
      action(),
    ]);
    return response;
  }

  // ── waitForVisible / waitForHidden ────────────────────────────────────────

  protected async waitForVisible(
    locator: Locator,
    timeout = 10_000,
  ): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  protected async waitForHidden(
    locator: Locator,
    timeout = 10_000,
  ): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  // ── route mocking ─────────────────────────────────────────────────────────

  /**
   * Intercepts every request matching `urlPattern` and fulfills it with
   * the supplied `body` and `status`.
   *
   * Call `clearMock(urlPattern)` to remove the interception.
   */
  async mockApiResponse(
    urlPattern: string | RegExp,
    body: unknown,
    status = 200,
  ): Promise<void> {
    await this.page.route(urlPattern, (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
  }

  /**
   * Removes all route interceptions registered for `urlPattern`.
   */
  async clearMock(urlPattern: string | RegExp): Promise<void> {
    await this.page.unroute(urlPattern);
  }
}
