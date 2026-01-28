import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  Link,
  useLocation,
} from "react-router";
import { Toaster } from "~/components/ui/sonner";

import { Button } from '~/components/ui/button'

import type { Route } from "./+types/root";
import "./app.css";

// ✅ NProgress
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useEffect } from "react";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "icon",
    href: "crimsonity.png",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-inter bg-gray-50 text-gray-800">
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// ✅ NProgress Wrapper Component
function RouteChangeProgress() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();
    // Stop progress after a tick (simulates page loaded)
    setTimeout(() => NProgress.done(), 300); 
  }, [location]);

  return null;
}

export default function App() {
  return (
    <>
      <RouteChangeProgress />
      <Outlet />
    </>
  );
}

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Error"
    },
  ];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const navigate = useNavigate();
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    message = status === 404 ? "Page Not Found" : "Error";
    details =
      status === 404
        ? "The page you’re looking for doesn’t exist or has been moved."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center px-6">
      <img className="h-50 w-50" src="/crimsonity.png" alt="" />

      <h1 className="text-5xl font-bold text-gray-800 mb-2">{status}</h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-4">{message}</h2>
      <p className="text-gray-500 max-w-md mb-6">{details}</p>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => navigate(-1)}
          variant='secondary'
        >
          Go Back
        </Button>
        <Link to='/'>
          <Button>
            Go Home
          </Button>
        </Link>
      </div>

      {stack && (
        <pre className="mt-8 p-4 text-left text-sm text-gray-700 bg-gray-100 rounded-lg overflow-x-auto w-full max-w-2xl">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
