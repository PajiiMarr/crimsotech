// app/middleware/role.server.ts
import AxiosInstance from "~/components/axios/Axios";
import { getSession, commitSession } from "~/sessions.server";

export async function fetchUserRole({ request, context }: any) {
  if (context.user) return context.user;

  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) throw new Response("Unauthorized", { status: 401 });

  const cached = session.get("userData");
  if (cached) {
    console.log(">>> Serving userData from session cache, no API call"); // <-- here
    context.user = cached;
    return cached;
  }

  const response = await AxiosInstance.get("/get-role/", {
    headers: { "X-User-Id": userId },
  });

  const userData = response.data;
  session.set("userData", userData);
  context.user = userData;
  context.__sessionCookie = await commitSession(session);
  console.log(">>> Session committed, userData cached"); // <-- here

  return userData;
}