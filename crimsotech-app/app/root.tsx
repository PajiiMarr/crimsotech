// app/root.tsx
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
  useNavigation,
  redirect,
} from "react-router";
import { sessionMiddleware } from "./middleware";
import { Toaster } from "~/components/ui/sonner";
import { Button } from '~/components/ui/button';
import type { Route } from "./+types/root";
import "./app.css";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useEffect, useRef, useCallback } from "react";
import { UserProvider } from "./components/providers/user-role-provider";
import type { User } from "./contexts/user-role";

export const unstable_middleware = [sessionMiddleware];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "icon",
    href: "Crimsotech.png",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  {
    rel: "stylesheet",
    href: "data:text/css," + encodeURIComponent(`
      #nprogress {
        pointer-events: none;
      }
      #nprogress .bar {
        background: linear-gradient(to right, #f97316, #ea580c, #dc2626);
        position: fixed;
        z-index: 1031;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        box-shadow: 0 0 10px #f97316, 0 0 5px #f97316;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #f97316, 0 0 5px #f97316;
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
      #nprogress .spinner {
        display: none !important;
      }
      #nprogress .bar {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
    `)
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

type LoaderData = {
  user: User | null;
};

/**
 * Routes that are publicly accessible without any authentication or admin role.
 * All other routes require the user to be either an admin OR a moderator.
 */
const PUBLIC_ROUTES = [
  '/login',
  '/logout',
  '/fallback',
  '/unauthorized',
  '/404',
  '/',
  '/about',
  '/riders',
  '/signup',
  '/apply',
];

/**
 * Check if a pathname matches any of the public routes.
 * Supports exact matches and prefix matches (e.g. /login/callback).
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData | Response> {
  const { getSession } = await import("./sessions.server");
  const session = await getSession(request.headers.get("Cookie"));

  const userId = session.get("userId");
  const userData = session.get("userData");

  let user: User | null = null;

  if (userId && userData) {
    // userData should already be in camelCase from the login action
    user = {
      id: userId,
      user_id: userId,
      ...userData,
      isAdmin: userData.isAdmin || false,
      isCustomer: userData.isCustomer || false,
      isRider: userData.isRider || false,
      isModerator: userData.isModerator || false,
    };
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  console.log("=========================================");
  console.log("🔐 ACCESS CONTROL CHECK");
  console.log("Current path:", pathname);
  console.log("User authenticated:", !!user);
  if (user) {
    console.log("User roles:", {
      isAdmin: user.isAdmin,
      isModerator: user.isModerator,
      isCustomer: user.isCustomer,
      isRider: user.isRider,
    });
  }
  console.log("=========================================");

  // ─── Public routes: always allow through ────────────────────────────────────
  if (isPublicRoute(pathname)) {
    console.log("✅ Public route, access granted:", pathname);
    return { user };
  }

  // ─── Global admin/moderator gate ────────────────────────────────────────────
  // Every non-public route requires the user to be logged in AND be either an admin OR a moderator.
  if (!user) {
    console.log("❌ No session – redirecting to /login");
    const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
    console.log("Redirecting to:", redirectUrl);
    return redirect(redirectUrl);
  }

  // Check if user is either admin OR moderator
  const hasAccess = user.isAdmin === true || user.isModerator === true;
  
  if (!hasAccess) {
    console.log("🚫 Non-admin/non-moderator user attempted to access", pathname);
    console.log(`User isAdmin: ${user.isAdmin}, isModerator: ${user.isModerator}`);
    console.log("Redirecting to /fallback?reason=access_denied");
    return redirect('/fallback?reason=access_denied');
  }

  // ─── Fine-grained sub-role checks (optional - for admin-only routes) ────────
  // If you have routes that only admins should access (not moderators), check here
  const isAdminOnlyRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  if (isAdminOnlyRoute && user.isAdmin !== true) {
    console.log("⚠️ Non-admin user attempted to access admin-only route", pathname);
    console.log("Redirecting to /fallback?reason=admin_required");
    return redirect('/fallback?reason=admin_required');
  }

  console.log("✅ Access granted to", pathname);
  return { user };
}

function RouteChangeProgress() {
  const location = useLocation();
  const navigation = useNavigation();
  const progressStarted = useRef(false);
  const navigationStartTime = useRef<number | null>(null);

  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 100,
      minimum: 0.08,
      easing: 'ease',
      speed: 400,
      trickle: true,
    });
  }, []);

  useEffect(() => {
    if (navigation.state === "loading" || navigation.state === "submitting") {
      if (!progressStarted.current) {
        NProgress.start();
        progressStarted.current = true;
        navigationStartTime.current = Date.now();
        setTimeout(() => NProgress.inc(0.2), 50);
      }
    } else if (navigation.state === "idle" && progressStarted.current) {
      const navigationTime = navigationStartTime.current
        ? Date.now() - navigationStartTime.current
        : 0;

      const delay = Math.max(100, Math.min(300, navigationTime / 3));

      setTimeout(() => {
        NProgress.done();
        progressStarted.current = false;
        navigationStartTime.current = null;
      }, delay);
    }
  }, [navigation.state]);

  useEffect(() => {
    const handlePopState = () => {
      if (!progressStarted.current) {
        NProgress.start();
        progressStarted.current = true;
        navigationStartTime.current = Date.now();
        setTimeout(() => NProgress.inc(0.2), 50);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest('a, button, [role="button"], [data-navigate], [onClick]');
      if (!clickable) return;

      if (clickable.closest('[data-no-progress]')) return;

      if (clickable.tagName === 'A') {
        const anchor = clickable as HTMLAnchorElement;

        if (
          anchor.target === '_blank' ||
          !anchor.href ||
          anchor.href === '#' ||
          anchor.href.includes('javascript:')
        ) {
          return;
        }

        try {
          const targetUrl = new URL(anchor.href);
          const currentUrl = new URL(window.location.href);

          if (targetUrl.origin === currentUrl.origin) {
            const targetPath = targetUrl.pathname + targetUrl.search;
            const currentPath = location.pathname + location.search;

            if (targetPath !== currentPath && !progressStarted.current) {
              NProgress.start();
              progressStarted.current = true;
              navigationStartTime.current = Date.now();
              setTimeout(() => NProgress.inc(0.2), 10);
            }
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }

      if (clickable.closest('[data-discover="true"]')) {
        if (!progressStarted.current) {
          NProgress.start();
          progressStarted.current = true;
          navigationStartTime.current = Date.now();
          setTimeout(() => NProgress.inc(0.2), 10);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [location.pathname, location.search]);

  return null;
}

export function useNavigationWithProgress() {
  const navigate = useNavigate();

  const navigateWithProgress = useCallback(
    (to: string | number, options?: { replace?: boolean; state?: any }) => {
      NProgress.start();

      setTimeout(() => {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      }, 50);
    },
    [navigate]
  );

  return navigateWithProgress;
}

export function ProgressLink({
  to,
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof Link>) {
  const location = useLocation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof to === 'string') {
      try {
        const targetUrl = new URL(to, window.location.origin);
        const currentPath = location.pathname + location.search;
        const targetPath = targetUrl.pathname + targetUrl.search;

        if (targetPath !== currentPath) {
          NProgress.start();
          setTimeout(() => NProgress.inc(0.2), 10);
        }
      } catch (e) {
        if (to !== location.pathname + location.search) {
          NProgress.start();
          setTimeout(() => NProgress.inc(0.2), 10);
        }
      }
    }

    onClick?.(e);
  };

  return (
    <Link to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}

// Global WebSocket manager that doesn't require any interaction from child components
function GlobalWebSocketManager({ user }: { user: User | null }) {
  const notificationSocket = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const connectWebSocket = useCallback(() => {
    if (!user || !mounted.current) return;

    const wsUrl = `${import.meta.env.VITE_WEBSOCKET_URL}/ws/notifications/`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected - Global notifications active');
      if (mounted.current) {
        ws.send(
          JSON.stringify({
            type: 'authenticate',
            user_id: user.id,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'authenticated') {
          console.log('WebSocket authenticated - Ready to receive notifications');
        } else if (data.type === 'new_notification') {
          console.log('New notification received:', data);
          window.dispatchEvent(
            new CustomEvent('new-notification', { detail: data })
          );
        } else if (data.type === 'unread_count') {
          console.log('Unread count updated:', data.count);
          window.dispatchEvent(
            new CustomEvent('unread-count-update', { detail: { count: data.count } })
          );
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (mounted.current) {
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    notificationSocket.current = ws;
  }, [user]);

  useEffect(() => {
    mounted.current = true;
    connectWebSocket();

    return () => {
      mounted.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (notificationSocket.current) {
        notificationSocket.current.close();
        notificationSocket.current = null;
      }
    };
  }, [connectWebSocket]);

  return null;
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  if (!loaderData || !('user' in loaderData)) {
    return null;
  }

  return (
    <UserProvider user={user}>
      {/* Global WebSocket manager - works automatically for all child routes */}
      <GlobalWebSocketManager user={user} />
      <RouteChangeProgress />
      <Outlet />
    </UserProvider>
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
  const navigateWithProgress = useNavigationWithProgress();

  let message = "Something went wrong";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    message = status === 404 ? "Page Not Found" : "Error";
    details =
      status === 404
        ? "The page you're looking for doesn't exist or has been moved."
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
        <Button onClick={() => navigateWithProgress(-1)} variant='secondary'>
          Go Back
        </Button>
        <ProgressLink to='/'>
          <Button>Go Home</Button>
        </ProgressLink>
      </div>
      {stack && (
        <pre className="mt-8 p-4 text-left text-sm text-gray-700 bg-gray-100 rounded-lg overflow-x-auto w-full max-w-2xl">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}