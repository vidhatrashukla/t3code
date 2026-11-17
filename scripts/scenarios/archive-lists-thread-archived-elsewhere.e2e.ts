import { expect } from "e2e";

import { approvalRequiredThreads, archiveOverMcp } from "./archive.ts";
import { runPromise, test, WEB } from "./t3.ts";

test(
  "Settings Archived lists a thread archived elsewhere while it is open",
  WEB,
  async ({ t3, app, screen }) => {
    const settings = await runPromise(approvalRequiredThreads);
    try {
      await runPromise(settings.apply);
      const project = await t3.project("demo");
      const thread = await t3.thread({ project, title: "Archived elsewhere", messages: ["first"] });
      await t3.open("/settings/archived");
      await expect(screen.getByText("No archived threads")).toBeVisible();

      await runPromise(archiveOverMcp(app.baseUrl ?? "", thread.threadId));

      await expect(screen.getByRole("button", "Unarchive Archived elsewhere")).toBeVisible();
      await app.screenshot("archived-list");
    } finally {
      await runPromise(settings.restore);
    }
  },
);
