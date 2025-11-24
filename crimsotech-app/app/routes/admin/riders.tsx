import type { Route } from './+types/riders'
import { useFetcher, useLoaderData } from 'react-router';
import { redirect, data } from 'react-router';
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Riders | Admin",
    },
  ];
}


export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  return data({ 
    user, 
  });
}

export default function Riders ({loaderData}: Route.ComponentProps) {
    let user = useLoaderData<typeof loader>();

    return (
        <UserProvider user={user.user}>
            <SidebarLayout>
                <div>
                    <h1>Riders Management</h1>

                </div>
                {/* Riders management content goes here */}
            </SidebarLayout>
        </UserProvider>
    )

}