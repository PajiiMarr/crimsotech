// app/middleware/role.server.ts
import AxiosInstance from "~/components/axios/Axios";
import { getSession } from "~/sessions.server";
import { userContext } from "~/contexts/user-role";

export async function fetchUserRole({ request, context }: any) {
  if (context.get(userContext)) {
    // Already fetched this request cycle
    return context.get(userContext);
  }

  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) throw new Response("Unauthorized", { status: 401 });

  const response = await AxiosInstance.get("/get-role/", {
    headers: { "X-User-Id": userId },
  });

  context.set(userContext, response.data);
  return response.data;
}

