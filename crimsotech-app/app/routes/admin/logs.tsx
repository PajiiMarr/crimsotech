import type { Route } from "./+types/users"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Logs | Admin",
        }
    ]
}

interface LoaderData {
    user: any;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isAdmin"]);

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    return { user };
}

export default function Refunds({ loaderData}: { loaderData: LoaderData }){
    const { user } = loaderData;

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div>
                    hello
                </div>
                {/* <RefundsTable /> */}
            </SidebarLayout>
        </UserProvider>
    )
}