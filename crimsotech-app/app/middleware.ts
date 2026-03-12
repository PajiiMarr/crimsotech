// app/middleware.ts
import type { MiddlewareFunction } from "react-router";

export const sessionMiddleware: MiddlewareFunction = async ({ context }, next) => {
  console.log(">>> Middleware ran");
  const response = await next() as Response;

  console.log(">>> __sessionCookie exists:", !!(context as any).__sessionCookie);

  if ((context as any).__sessionCookie) {
    response.headers.append("Set-Cookie", (context as any).__sessionCookie);
    console.log(">>> Set-Cookie appended");
  }

  return response;
};