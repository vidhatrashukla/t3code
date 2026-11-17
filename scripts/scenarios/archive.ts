// Archives threads the way an outside agent does, for scenarios that need archived threads.
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

import { T3_HOME } from "../e2e.config.ts";
import { ScenarioError } from "./shell.ts";
import { makeState } from "./t3.ts";

const SettingsJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));
const decodeSettings = Schema.decodeEffect(SettingsJson);
const encodeSettings = Schema.encodeEffect(SettingsJson);

// A token from `auth session issue` acts at most in approval-required mode, so the thread must too.
export const approvalRequiredThreads = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const settingsPath = (yield* Path.Path).join(T3_HOME, "userdata/settings.json");
  const original = yield* fs.readFileString(settingsPath);
  const settings = yield* decodeSettings(original);
  return {
    apply: fs.writeFileString(
      settingsPath,
      yield* encodeSettings({
        ...settings,
        defaultRuntimeMode: "approval-required",
      }),
    ),
    restore: fs.writeFileString(settingsPath, original),
  };
});

/** Archives a thread as an outside agent does: `t3_thread_organize` on the server's MCP endpoint. */
export const archiveOverMcp = Effect.fn("scenario.archiveOverMcp")(function* (
  baseUrl: string,
  threadId: string,
) {
  const { cli } = makeState(T3_HOME);
  const { stdout } = yield* cli([
    "auth",
    "session",
    "issue",
    "--subject",
    "mcp-client",
    "--scope",
    "orchestration:read",
    "--scope",
    "orchestration:operate",
    "--token-only",
  ]);
  const client = yield* HttpClient.HttpClient;
  let sessionId: string | null = null;
  const send = Effect.fnUntraced(function* (message: object) {
    const response = yield* client.execute(
      HttpClientRequest.post(`${baseUrl}/mcp`).pipe(
        HttpClientRequest.setHeaders({
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${stdout.trim()}`,
          ...(sessionId === null ? {} : { "mcp-session-id": sessionId }),
        }),
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", ...message }),
      ),
    );
    sessionId = response.headers["mcp-session-id"] ?? sessionId;
    const body = yield* response.text;
    if (response.status >= 300) {
      return yield* new ScenarioError({ message: `MCP ${response.status}: ${body}` });
    }
    return body;
  });
  yield* send({
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "scenario", version: "1" },
    },
  });
  yield* send({ method: "notifications/initialized" });
  const result = yield* send({
    id: 2,
    method: "tools/call",
    params: { name: "t3_thread_organize", arguments: { threadId, action: "archive" } },
  });
  if (result.includes('"isError":true')) {
    return yield* new ScenarioError({ message: `Archive failed: ${result}` });
  }
}, Effect.provide(FetchHttpClient.layer));
