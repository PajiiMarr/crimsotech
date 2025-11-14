import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import { requireAuth } from '~/middleware/auth.server';
import { requireRole } from '~/middleware/role-require.server';
import { userContext } from '~/contexts/user-role';
import { UserProvider } from '~/components/providers/user-role-provider';
import { fetchUserRole } from '~/middleware/role.server';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Moderator | Dashboard",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  // registrationMiddleware expects the full Remix args shape; include params and unstable_pattern to satisfy the signature
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  // Fetch once and store in context
  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isModerator"]);

  return user;
}

export default function Home ({loaderData}: Route.ComponentProps) {
  const user = loaderData;
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className='w-full h-20'>
          <div>
            Moderator
          </div>
        </section>
      </SidebarLayout>
    </UserProvider>
  )
}