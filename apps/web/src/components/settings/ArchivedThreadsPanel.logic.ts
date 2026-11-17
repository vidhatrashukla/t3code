interface ArchivedThreadGroup {
  readonly title: string;
  readonly threads: ReadonlyArray<{ readonly title: string }>;
}

/** Keeps groups whose project title matches, and otherwise only the threads whose title matches. */
export function filterArchivedThreadGroups<Group extends ArchivedThreadGroup>(
  groups: ReadonlyArray<Group>,
  query: string,
): ReadonlyArray<Group> {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) return groups;
  return groups.flatMap((group) => {
    if (group.title.toLocaleLowerCase().includes(needle)) return [group];
    const threads = group.threads.filter((thread) =>
      thread.title.toLocaleLowerCase().includes(needle),
    );
    return threads.length > 0 ? [{ ...group, threads }] : [];
  });
}
