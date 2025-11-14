import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
// import { requireRole } from '~/middleware/role-require.server';
// import { userContext } from '~/contexts/user-role';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Home",
    },
  ];
}


export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireAuth } = await import("~/middleware/auth.server");
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return user;
}




export default function Home ({loaderData}: Route.ComponentProps) {
  const user = loaderData;
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className='w-full h-20'>
          <div>
            hello
          </div>
        </section>
      </SidebarLayout>
    </UserProvider>
  )
}