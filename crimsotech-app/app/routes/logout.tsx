// app/routes/logout.ts
import type { Route } from './+types/logout';
import { redirect } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const { getSession, destroySession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  
  // Destroy the session and redirect to login
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}