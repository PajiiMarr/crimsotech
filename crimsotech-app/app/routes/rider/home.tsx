import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Rider | Dashboard",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");
  const { riderStatusMiddleware } = await import("~/middleware/rider_apply.server");

  // 1. Check registration first
  const registrationResult = await registrationMiddleware({ 
    request, context, params: {}, unstable_pattern: undefined 
  } as any);
  if (registrationResult) {
    console.log('Registration middleware redirected:', registrationResult);
    return registrationResult;
  }

  // 2. Check user role and fetch user data
  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isRider"]);

  // 3. Check rider verification status
  const riderStatusResult = await riderStatusMiddleware({ 
    request, context, params: {}, unstable_pattern: undefined 
  } as any);
  if (riderStatusResult) {
    console.log('Rider status middleware redirected:', riderStatusResult);
    return riderStatusResult;
  }

  console.log('No redirection - returning user data');
  return user;
}

export default function Home ({loaderData}: Route.ComponentProps) {
  const user = loaderData;
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className='w-full h-20'>
          <div>
            Rider Dashboard
          </div>
        </section>
      </SidebarLayout>
    </UserProvider>
  )
}