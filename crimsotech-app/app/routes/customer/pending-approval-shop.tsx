import type { Route } from "./+types/pending-approval-shop"
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { Button } from '~/components/ui/button';
import { Store } from 'lucide-react';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Pending Approval | Shop",
        }
    ]
}

interface LoaderData {
    user: any;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
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

export default function PendingApprovalShop({ loaderData}: { loaderData: LoaderData }){
    const { user } = loaderData;

    return (
        <UserProvider user={user}>
            <main className="flex flex-col items-center justify-center min-h-screen text-center px-6 bg-gray-50">
                {/* Logo/Brand */}
                <div className="mb-8">
                    <img 
                        className="h-32 w-32 mx-auto" 
                        src="/crimsonity.png" 
                        alt="Crimsonity Logo" 
                    />
                </div>

                {/* Status Icon */}
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Store className="w-12 h-12 text-yellow-600" />
                </div>

                {/* Main Content */}
                <h1 className="text-4xl font-bold text-gray-800 mb-4">
                    Shop Application Under Review
                </h1>
                
                <h2 className="text-xl font-semibold text-gray-700 mb-6">
                    Verification in Progress
                </h2>
                
                <p className="text-gray-600 max-w-md mb-8 text-lg leading-relaxed">
                    Your shop application is currently being reviewed by our administration team. 
                    We'll verify your business details to ensure the quality and safety of our marketplace.
                </p>

                {/* Information Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mb-8">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <span className="text-yellow-500 text-lg">ℹ️</span>
                        </div>
                        <div className="ml-3 text-left">
                            <h3 className="text-sm font-medium text-yellow-800 mb-2">
                                What to Expect Next
                            </h3>
                            <ul className="text-sm text-yellow-700 space-y-1">
                                <li>• Shop verification typically takes 24-48 hours</li>
                                <li>• You'll receive a notification once approved</li>
                                <li>• Check your email for updates on your application</li>
                                <li>• You can start adding products once approved</li>
                                <li>• Contact support if pending for more than 3 days</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 justify-center">
                    <Button
                        onClick={() => window.location.reload()}
                        variant="secondary"
                        className="px-6 py-2"
                    >
                        Check Status
                    </Button>
                    
                    <Link to="/">
                        <Button className="px-6 py-2">
                            Go to Homepage
                        </Button>
                    </Link>
                </div>

                {/* Support Information */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                        Need help with your shop application?{" "}
                        <Link 
                            to="/contact-support" 
                            className="text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                            Contact Support
                        </Link>
                    </p>
                </div>
            </main>
        </UserProvider>
    );
}