import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { filterArchivedThreadGroups } from "./ArchivedThreadsPanel.logic";

const thread = (id: string, title: string, environmentLabel = "This Mac") => ({
  environmentId: EnvironmentId.make("local"),
  id: ThreadId.make(id),
  title,
  branch: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  latestUserMessageAt: null,
  latestUserAuthoredMessageAt: null,
  opens: null,
  environmentLabel,
});

const storefront = {
  title: "storefront",
  project: { title: "storefront", workspaceRoot: "/code/shop/storefront" },
  threads: [thread("t1", "Fix login redirect loop"), thread("t2", "Add dark mode toggle")],
};
const billing = {
  title: "billing-api",
  project: { title: "billing-api", workspaceRoot: "/code/billing-api" },
  threads: [
    thread("t3", "Login rate limiting", "Build box"),
    thread("t4", "Invoice PDF rounding", "Build box"),
  ],
};
const groups = [storefront, billing];

describe("filterArchivedThreadGroups", () => {
  it("returns every group for a blank query", () => {
    expect(filterArchivedThreadGroups(groups, "   ")).toBe(groups);
  });

  it("matches thread titles case-insensitively across projects, keeping list order", () => {
    expect(filterArchivedThreadGroups(groups, "LOGIN")).toEqual([
      { ...storefront, threads: [storefront.threads[0]] },
      { ...billing, threads: [billing.threads[0]] },
    ]);
  });

  it("matches thread titles by word prefix as other thread searches do", () => {
    expect(filterArchivedThreadGroups(groups, "dark tog")).toEqual([
      { ...storefront, threads: [storefront.threads[1]] },
    ]);
  });

  it("keeps every thread of a project matched by name or folder", () => {
    expect(filterArchivedThreadGroups(groups, "billing")).toEqual([billing]);
    expect(filterArchivedThreadGroups(groups, "/code/shop")).toEqual([storefront]);
  });

  it("matches threads by environment name", () => {
    expect(filterArchivedThreadGroups(groups, "build box")).toEqual([billing]);
  });

  it("keeps list order and only the matching environment's threads in a mixed group", () => {
    const mixed = {
      title: "shop",
      project: { title: "storefront", workspaceRoot: "/code/storefront" },
      threads: [
        thread("m1", "Update the login copy", "This Mac"),
        thread("m2", "Login", "Build box"),
        thread("m3", "Release notes", "Build box"),
      ],
    };
    expect(filterArchivedThreadGroups([mixed], "login")).toEqual([
      { ...mixed, threads: [mixed.threads[0], mixed.threads[1]] },
    ]);
    expect(filterArchivedThreadGroups([mixed], "build box")).toEqual([
      { ...mixed, threads: [mixed.threads[1], mixed.threads[2]] },
    ]);
  });

  it("returns no groups when nothing matches", () => {
    expect(filterArchivedThreadGroups(groups, "refund")).toEqual([]);
  });
});
