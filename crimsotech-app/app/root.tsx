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
import { Toaster } from "~/components/ui/sonner";
import { Button } from '~/components/ui/button'
import type { Route } from "./+types/root";
import "./app.css";
// ✅ NProgress
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useEffect, useRef, useCallback } from "react";
import { UserProvider } from "./components/providers/user-role-provider";

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

// ✅ Enhanced NProgress Wrapper that catches all navigation types
function RouteChangeProgress() {
  const location = useLocation();
  const navigation = useNavigation(); // React Router's navigation state
  const progressStarted = useRef(false);
  const navigationStartTime = useRef<number | null>(null);
  
  useEffect(() => {
    // Configure NProgress for faster, smoother animations
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 100,
      minimum: 0.08,
      easing: 'ease',
      speed: 400,
      trickle: true,
    });
  }, []);

  // Track React Router's navigation state
  useEffect(() => {
    if (navigation.state === "loading" || navigation.state === "submitting") {
      if (!progressStarted.current) {
        NProgress.start();
        progressStarted.current = true;
        navigationStartTime.current = Date.now();
        
        // Bump progress slightly for immediate feedback
        setTimeout(() => NProgress.inc(0.2), 50);
      }
    } else if (navigation.state === "idle" && progressStarted.current) {
      // Navigation completed
      const navigationTime = navigationStartTime.current 
        ? Date.now() - navigationStartTime.current 
        : 0;
      
      // Smooth completion with delay based on navigation duration
      const delay = Math.max(100, Math.min(300, navigationTime / 3));
      
      setTimeout(() => {
        NProgress.done();
        progressStarted.current = false;
        navigationStartTime.current = null;
      }, delay);
    }
  }, [navigation.state]);

  // Handle browser back/forward buttons
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

  // Handle click events on all navigation elements
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check for any clickable element that might trigger navigation
      const clickable = target.closest('a, button, [role="button"], [data-navigate], [onClick]');
      if (!clickable) return;

      // Skip excluded elements
      if (clickable.closest('[data-no-progress]')) return;

      // Handle anchor tags
      if (clickable.tagName === 'A') {
        const anchor = clickable as HTMLAnchorElement;
        
        // Skip external links and non-navigating anchors
        if (anchor.target === '_blank' || 
            !anchor.href || 
            anchor.href === '#' || 
            anchor.href.includes('javascript:')) {
          return;
        }

        // Check if same-origin navigation
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
      
      // Handle React Router Link components (they have data attributes)
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

// ✅ Enhanced hook for programmatic navigation with progress
export function useNavigationWithProgress() {
  const navigate = useNavigate();
  
  const navigateWithProgress = useCallback((
    to: string | number,
    options?: { replace?: boolean; state?: any }
  ) => {
    // Start progress immediately
    NProgress.start();
    
    // Navigate with a tiny delay to ensure progress is visible
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

// ✅ Enhanced Link component that triggers progress
export function ProgressLink({ 
  to, 
  children, 
  onClick,
  ...props 
}: React.ComponentProps<typeof Link>) {
  const location = useLocation();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if it's actually navigating to a different route
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
        // Handle relative paths
        if (to !== location.pathname + location.search) {
          NProgress.start();
          setTimeout(() => NProgress.inc(0.2), 10);
        }
      }
    }
    
    // Call original onClick if provided
    onClick?.(e);
  };

  return (
    <Link to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}

export default function App() {
  return (
    <>
      <UserProvider user={null}> {/* Start with null, let session storage populate */}
          <RouteChangeProgress />
          <Outlet />
      </UserProvider>
    </>
  );
}

// ✅ Example usage component showing different navigation methods
export function NavigationExample() {
  const navigate = useNavigate();
  const navigateWithProgress = useNavigationWithProgress();

  return (
    <div>
      {/* Regular Link - automatically tracked */}
      <Link to="/about">About (Regular Link)</Link>

      {/* Progress Link - enhanced version */}
      <ProgressLink to="/contact">Contact (Progress Link)</ProgressLink>

      {/* Regular button with useNavigate - NOT automatically tracked */}
      <button onClick={() => navigate('/dashboard')}>
        Go to Dashboard (No Progress)
      </button>

      {/* Button with useNavigationWithProgress - tracked */}
      <button onClick={() => navigateWithProgress('/settings')}>
        Go to Settings (With Progress)
      </button>

      {/* Button with manual progress trigger */}
      <button 
        onClick={() => {
          NProgress.start();
          navigate('/profile');
        }}
      >
        Go to Profile (Manual Progress)
      </button>

      {/* Form submission - automatically tracked via navigation.state */}
      <form action="/search" method="get">
        <input type="text" name="q" />
        <button type="submit">Search</button>
      </form>
    </div>
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