// app/middleware/requireRole.server.ts
import { fetchUserRole } from "./role.server";

export async function requireRole(request: Request, context: any, allowedRoles: string[]) {
  const userRole = await fetchUserRole({ request, context });

  const hasRole = allowedRoles.some((role) => userRole[role] === true);

  if (!hasRole) {
    throw new Response("Forbidden", {
      status: 403,
      statusText: "You don't have permission to access this page.",
    });
  }

  return userRole;
}
