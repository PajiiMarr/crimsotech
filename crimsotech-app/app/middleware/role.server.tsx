// app/middleware/role.server.ts
import AxiosInstance from "~/components/axios/Axios";
import { getSession } from "~/sessions.server";

export async function fetchUserRole({ request, context }: any) {
  // Use direct property access instead of context.get()
  if (context.user) {
    return context.user;
  }
  
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  
  const response = await AxiosInstance.get("/get-role/", {
    headers: { "X-User-Id": userId },
  });
  
  // Use direct property assignment instead of context.set()
  context.user = response.data;
  return response.data;
}