import type { Route } from './+types/logout';
import { redirect, data } from 'react-router';

export async function loader ({ request }: Route.LoaderArgs) {
  const { getSession, destroySession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  if (session.has("userId")) {
    return redirect("/", {
        headers: {
            "Set-Cookie": await destroySession(session),
        },
    });
  }

  return data({}, {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}