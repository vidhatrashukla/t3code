import { describe, expect, it } from "vite-plus/test";

import { filterArchivedThreadGroups } from "./ArchivedThreadsPanel.logic";

const groups = [
  { title: "t3code", threads: [{ title: "Fix login bug" }, { title: "Add dark mode" }] },
  { title: "website", threads: [{ title: "Update pricing page" }, { title: "Login redirect" }] },
];

describe("filterArchivedThreadGroups", () => {
  it("returns every group for a blank query", () => {
    expect(filterArchivedThreadGroups(groups, "   ")).toBe(groups);
  });

  it("matches thread titles case-insensitively across projects", () => {
    expect(filterArchivedThreadGroups(groups, "LOGIN")).toEqual([
      { title: "t3code", threads: [{ title: "Fix login bug" }] },
      { title: "website", threads: [{ title: "Login redirect" }] },
    ]);
  });

  it("keeps every thread of a project whose title matches", () => {
    expect(filterArchivedThreadGroups(groups, "web")).toEqual([groups[1]]);
  });

  it("returns no groups when nothing matches", () => {
    expect(filterArchivedThreadGroups(groups, "nothing here")).toEqual([]);
  });
});
