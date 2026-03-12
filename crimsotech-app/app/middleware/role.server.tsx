// app/middleware/role.server.ts
import AxiosInstance from "~/components/axios/Axios";
import { getSession } from "~/sessions.server";

export async function fetchUserRole({ request, context }: any) {
  // Check if we already have the user data in context
  if (context.user) {
    return context.user;
  }
  
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  
  // Only make the API request if we have a userId but no context.user
  const response = await AxiosInstance.get("/get-role/", {
    headers: { "X-User-Id": userId },
  });
  
  // Store the user data in context for future requests
  context.user = response.data;
  return response.data;
}