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
        background: #f97316; /* ← Change this color */
        position: fixed;
        z-index: 1031;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #f97316, 0 0 5px #f97316; /* ← And these two */
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
      #nprogress .spinner {
        display: none;
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

// ✅ Modified NProgress Wrapper - ONLY for navigation elements
function RouteChangeProgress() {
  const location = useLocation();
  
  useEffect(() => {
    // Configure NProgress with orange color
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 200,
      minimum: 0.08,
      easing: 'ease',
      speed: 500,
    });

    // Store the current location pathname for comparison
    const currentPath = location.pathname + location.search;

    // Helper to check if we should exclude an element
    const shouldExcludeElement = (element: HTMLElement): boolean => {
      // Exclude dropdown elements
      const isDropdown = 
        element.closest('[role="menu"], [role="listbox"], [data-dropdown], [data-menu], .dropdown, .menu, [aria-haspopup="true"]') !== null;
      
      // Exclude button elements (unless they're inside an anchor)
      const isButton = element.tagName === 'BUTTON' && !element.closest('a');
      
      // Exclude elements with specific data attributes
      const hasExcludeDataAttr = element.closest('[data-no-progress], [data-exclude-progress]') !== null;
      
      return isDropdown || isButton || hasExcludeDataAttr;
    };

    // Helper to check if element should trigger navigation progress
    const shouldTriggerProgress = (element: HTMLElement): boolean => {
      // If it's an excluded element, don't trigger progress
      if (shouldExcludeElement(element)) {
        return false;
      }

      // Find the closest anchor element
      const anchor = element.closest('a');
      
      // Check for valid navigation anchor
      if (anchor) {
        // Skip if anchor has target="_blank" (external link)
        if (anchor.target === '_blank') {
          return false;
        }
        
        // Skip if anchor doesn't have href or has empty href
        if (!anchor.href || anchor.href === '#' || anchor.href === 'javascript:void(0)') {
          return false;
        }
        
        // Skip if it's a same-page anchor (hash link)
        if (anchor.hash && !anchor.pathname && !anchor.search) {
          return false;
        }
        
        // Check if it's a same-origin link
        try {
          const targetUrl = new URL(anchor.href);
          const currentUrl = new URL(window.location.href);
          
          // Only trigger for same-origin navigation
          if (targetUrl.origin === currentUrl.origin) {
            // Check if it's actually a different route
            const targetPath = targetUrl.pathname + targetUrl.search;
            return targetPath !== currentPath;
          }
        } catch (e) {
          return false;
        }
      }
      
      // Check for React Router Link components (they have data-router-link attribute)
      const isRouterLink = element.closest('[data-router-link], [data-link]') !== null;
      
      return isRouterLink;
    };

    // Handle click events
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Only trigger progress for valid navigation elements
      if (shouldTriggerProgress(target)) {
        // Small delay to ensure we're actually navigating
        setTimeout(() => {
          if (window.location.pathname + window.location.search !== currentPath) {
            NProgress.start();
          }
        }, 50);
      }
    };

    // Handle programmatic navigation via useNavigate
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Wrap history methods to detect programmatic navigation
    history.pushState = function(...args) {
      NProgress.start();
      return originalPushState.apply(this, args);
    };

    history.replaceState = function(...args) {
      NProgress.start();
      return originalReplaceState.apply(this, args);
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [location]);

  useEffect(() => {
    // Complete progress when location changes
    NProgress.done();
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