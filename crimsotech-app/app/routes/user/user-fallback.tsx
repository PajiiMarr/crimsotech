// app/routes/user/user-fallback.tsx
import type { Route } from "./+types/user-fallback"
import { useSearchParams, Link } from "react-router";

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Access Restricted",
        }
    ]
}

export default function FallbackPage() {
    const [searchParams] = useSearchParams();
    const reason = searchParams.get('reason');
    
    let title = "Access Restricted";
    let message = "You don't have permission to access this page.";
    let details = "";
    
    if (reason === 'admin_required') {
        title = "Admin Access Required";
        message = "This area is restricted to administrators only.";
        details = "You need administrator privileges to access this page.";
    } else if (reason === 'moderator_required') {
        title = "Moderator Access Required";
        message = "This area is restricted to moderators and administrators only.";
        details = "You need moderator or administrator privileges to access this page.";
    } else if (reason === 'customer_account') {
        title = "Customer Access Denied";
        message = "This area is for administrators and moderators only.";
        details = "Customer accounts cannot access the admin panel.";
    } else if (reason === 'rider_account') {
        title = "Rider Access Denied";
        message = "This area is for administrators and moderators only.";
        details = "Rider accounts cannot access the admin panel.";
    } else if (reason === 'not_logged_in') {
        title = "Authentication Required";
        message = "Please log in to access the admin panel.";
        details = "You need to be logged in as an administrator or moderator.";
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="max-w-md w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-red-50 p-6 border-b border-red-100">
                    <div className="flex items-center justify-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                            <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        {title}
                    </h1>
                    
                    <p className="text-gray-600 mb-2">
                        {message}
                    </p>
                    
                    {details && (
                        <p className="text-sm text-orange-600 font-medium mb-6">
                            {details}
                        </p>
                    )}
                    
                    <div className="space-y-3">
                        <Link
                            to="/logout"
                            replace
                            className="block w-full px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-center"
                        >
                            Logout
                        </Link>
                        
                        <Link
                            to="/"
                            replace
                            className="block w-full px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
                        >
                            Go to Homepage
                        </Link>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Need access?{' '}
                            <Link to="/contact" className="text-orange-600 hover:text-orange-700 font-medium">
                                Contact Support
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}