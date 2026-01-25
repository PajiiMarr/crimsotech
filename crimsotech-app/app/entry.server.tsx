// app/entry.server.tsx
import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { renderToString } from "react-dom/server";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext
) {
  const html = renderToString(
    <ServerRouter context={routerContext} url={request.url} />
  );

  return new Response("<!DOCTYPE html>" + html, {
    headers: { "Content-Type": "text/html" },
    status: responseStatusCode,
  });
}

export function getLoadContext(): AppLoadContext {
  const contextStore = new Map();
  
  return {
    get: (key: any) => contextStore.get(key),
    set: (key: any, value: any) => contextStore.set(key, value),
  } as AppLoadContext;
}