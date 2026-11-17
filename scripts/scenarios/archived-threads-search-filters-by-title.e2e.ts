import { expect } from "e2e";

import { approvalRequiredThreads, archiveOverMcp } from "./archive.ts";
import { runPromise, test, WEB } from "./t3.ts";

test(
  "Settings Archived search narrows the list to matching threads",
  WEB,
  async ({ t3, app, screen, browser }) => {
    const settings = await runPromise(approvalRequiredThreads);
    try {
      await runPromise(settings.apply);
      const seeds = [
        { project: "storefront", titles: ["Fix login redirect loop", "Add dark mode toggle"] },
        { project: "billing-api", titles: ["Login rate limiting", "Invoice PDF rounding"] },
      ];
      const threadIds: Array<string> = [];
      for (const seed of seeds) {
        const project = await t3.project(seed.project);
        for (const title of seed.titles) {
          const thread = await t3.thread({ project, title, messages: ["first"] });
          threadIds.push(thread.threadId);
        }
      }
      for (const threadId of threadIds) {
        await runPromise(archiveOverMcp(app.baseUrl ?? "", threadId));
      }

      await t3.open("/settings/archived");
      await expect(screen.getByRole("button", "Unarchive Invoice PDF rounding")).toBeVisible();
      await app.screenshot("archived-list");

      await screen.getByRole("searchbox", "Search archived threads").fill("login");
      await expect(screen.getByRole("button", "Unarchive Fix login redirect loop")).toBeVisible();
      await expect(screen.getByRole("button", "Unarchive Login rate limiting")).toBeVisible();
      await expect(screen.getByRole("button", "Unarchive Add dark mode toggle")).toBeHidden();
      await expect(screen.getByRole("button", "Unarchive Invoice PDF rounding")).toBeHidden();
      await app.screenshot("archived-search");

      await screen.getByRole("searchbox", "Search archived threads").fill("refund");
      await expect(screen.getByText("No matching archived threads")).toBeVisible();
      await app.screenshot("archived-search-no-match");

      // Escape clears the search without closing Settings.
      await browser.keyboard.press("Escape");
      await expect(screen.getByRole("button", "Unarchive Add dark mode toggle")).toBeVisible();
      await expect(screen.getByRole("searchbox", "Search archived threads")).toBeVisible();
    } finally {
      await runPromise(settings.restore);
    }
  },
);
