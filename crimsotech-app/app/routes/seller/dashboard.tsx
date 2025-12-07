import type { Route } from './+types/dashboard'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { data } from "react-router";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller | Dashboard",
    },
  ];
}

export async function loader({ request, context}: Route.LoaderArgs) {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");
    const { userContext } = await import("~/contexts/user-role");

    let user = (context as any).get(userContext);
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isCustomer"]);

    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    const shopId = session.get("shopId");
    console.log("Loader Session Shop ID:", shopId);

    return data({ 
      user,
      shopId 
    });
}

function DashboardContent({ user, shopId }: { user: any, shopId: string | undefined }) {
  return (
    <section className='w-full p-6'>
      <div>
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        {shopId ? (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">Currently managing shop ID: {shopId}</p>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700">No shop selected. Please select a shop first.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function SellerDashboard({ loaderData }: Route.ComponentProps) {
  return (
    <UserProvider user={loaderData.user}>
      <SellerSidebarLayout>
        <DashboardContent user={loaderData.user} shopId={loaderData.shopId} />
      </SellerSidebarLayout>
    </UserProvider>
  )
}