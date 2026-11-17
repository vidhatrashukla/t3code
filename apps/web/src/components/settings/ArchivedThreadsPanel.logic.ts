import {
  threadSearchSubject,
  type ThreadSearchShell,
} from "@t3tools/client-runtime/state/thread-search";
import { foldSearchQuery, rankSearchItems, scoreThreadSearch } from "@t3tools/shared/paletteSearch";

type ArchivedThread = ThreadSearchShell & { readonly environmentLabel: string };

interface ArchivedThreadGroup {
  readonly title: string;
  readonly project: { readonly title: string; readonly workspaceRoot: string };
  readonly threads: ReadonlyArray<ArchivedThread>;
}

const includes = (value: string, query: string) => value.toLocaleLowerCase().includes(query);

/**
 * Matches as the mobile archive does: a project matched by name or folder keeps every thread,
 * otherwise threads match as in every other thread search, or by environment name. The list keeps
 * its own order.
 */
export function filterArchivedThreadGroups<Group extends ArchivedThreadGroup>(
  groups: ReadonlyArray<Group>,
  query: string,
): ReadonlyArray<Group> {
  const lowerQuery = query.trim().toLocaleLowerCase();
  if (lowerQuery.length === 0) return groups;
  const foldedQuery = foldSearchQuery(query);
  return groups.flatMap((group) => {
    if (
      includes(group.title, lowerQuery) ||
      includes(group.project.title, lowerQuery) ||
      includes(group.project.workspaceRoot, lowerQuery)
    ) {
      return [group];
    }
    const matched = new Set(
      rankSearchItems(group.threads, (thread, options) =>
        scoreThreadSearch(foldedQuery, threadSearchSubject(thread, null), 0, {
          ...options,
          picks: false,
        }),
      ).map(({ item }) => item),
    );
    const threads = group.threads.filter(
      (thread) => matched.has(thread) || includes(thread.environmentLabel, lowerQuery),
    );
    return threads.length > 0 ? [{ ...group, threads }] : [];
  });
}
