import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export async function requireAuth(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { request } = args;

  // Run only on the server
  const { getSession } = await import("../sessions.server");
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userId")) {
    throw new Response("Unauthorized", { 
      status: 401,
      statusText: "You must be logged in to access this page",
    });
  }

  // return session.get("userId");
}
