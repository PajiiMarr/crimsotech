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
} from "react-router";
import { sessionMiddleware } from "./middleware";
import { Toaster } from "~/components/ui/sonner";
import { Button } from '~/components/ui/button'
import type { Route } from "./+types/root";
import "./app.css";
// ✅ NProgress
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
  // ✅ Add custom NProgress CSS with orange color
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
      /* Smooth animations */
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

// Define loader return type
type LoaderData = {
  user: User | null;
};

// ✅ Add loader to get user from session
export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const { getSession } = await import("./sessions.server");
  const session = await getSession(request.headers.get("Cookie"));
  
  const userId = session.get("userId");
  const userData = session.get("userData");
  
  if (userId && userData) {
    // Ensure userData matches the User interface
    const user: User = {
      ...userData,
      id: userId,
      user_id: userId,
      isAdmin: userData.isAdmin || false,
      isCustomer: userData.isCustomer || false,
      isRider: userData.isRider || false,
      isModerator: userData.isModerator || false,
    };
    return { user };
  }
  
  return { user: null };
}

// ✅ Enhanced NProgress Wrapper that catches all navigation types
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
        
        if (anchor.target === '_blank' || 
            !anchor.href || 
            anchor.href === '#' || 
            anchor.href.includes('javascript:')) {
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
  
  const navigateWithProgress = useCallback((
    to: string | number,
    options?: { replace?: boolean; state?: any }
  ) => {
    NProgress.start();
    
    setTimeout(() => {
      if (typeof to === 'number') {
        navigate(to);
      } else {
        navigate(to, options);
      }
    }, 50);
  }, [navigate]);

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

// ✅ Wrap the entire app with UserProvider - SINGLE SOURCE OF TRUTH
export default function App({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData as LoaderData;
  
  return (
    <>
      <UserProvider user={user}>
        <RouteChangeProgress />
        <Outlet />
      </UserProvider>
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
        <Button
          onClick={() => navigateWithProgress(-1)}
          variant='secondary'
        >
          Go Back
        </Button>
        <ProgressLink to='/'>
          <Button>
            Go Home
          </Button>
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