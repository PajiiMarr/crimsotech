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
import { useEffect, useRef } from "react";

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

// ✅ Modified NProgress Wrapper with immediate start on click
function RouteChangeProgress() {
  const location = useLocation();
  const progressStarted = useRef(false);
  const navigationStartTime = useRef<number | null>(null);
  
  useEffect(() => {
    // Configure NProgress for faster, smoother animations
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 100, // Faster trickle speed
      minimum: 0.08,
      easing: 'ease',
      speed: 400,
      trickle: true,
    });

    // Store the current location pathname for comparison
    const currentPath = location.pathname + location.search;

    // Handle programmatic navigation via useNavigate
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Wrap history methods to detect programmatic navigation
    history.pushState = function(...args) {
      if (!progressStarted.current) {
        NProgress.start();
        progressStarted.current = true;
        navigationStartTime.current = Date.now();
      }
      return originalPushState.apply(this, args);
    };

    history.replaceState = function(...args) {
      if (!progressStarted.current) {
        NProgress.start();
        progressStarted.current = true;
        navigationStartTime.current = Date.now();
      }
      return originalReplaceState.apply(this, args);
    };

    // Enhanced click handler for immediate progress start
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Find the closest anchor or button element
      const clickable = target.closest('a, button, [role="button"], [data-navigate]');
      
      if (!clickable) return;
      
      // Skip excluded elements
      const isExcluded = clickable.closest('[data-no-progress], [data-exclude-progress]') !== null;
      if (isExcluded) return;
      
      // Check if it's an anchor
      if (clickable.tagName === 'A') {
        const anchor = clickable as HTMLAnchorElement;
        
        // Skip if anchor has target="_blank" (external link)
        if (anchor.target === '_blank') return;
        
        // Skip if anchor doesn't have href or has empty href
        if (!anchor.href || anchor.href === '#' || anchor.href === 'javascript:void(0)') return;
        
        // Skip if it's a same-page anchor (hash link)
        if (anchor.hash && !anchor.pathname && !anchor.search) return;
        
        // Check if it's a same-origin link
        try {
          const targetUrl = new URL(anchor.href);
          const currentUrl = new URL(window.location.href);
          
          // Only trigger for same-origin navigation
          if (targetUrl.origin === currentUrl.origin) {
            // Check if it's actually a different route
            const targetPath = targetUrl.pathname + targetUrl.search;
            if (targetPath !== currentPath) {
              // Start progress immediately
              if (!progressStarted.current) {
                NProgress.start();
                progressStarted.current = true;
                navigationStartTime.current = Date.now();
                
                // Add slight delay to ensure it's visible
                setTimeout(() => {
                  NProgress.inc(0.3); // Jump to 30% immediately for better UX
                }, 10);
              }
            }
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
      
      // Check for React Router Link components or buttons with navigation
      const isRouterLink = clickable.closest('[data-router-link], [data-link]') !== null;
      const hasRouterNavigate = clickable.hasAttribute('data-navigate');
      
      if (isRouterLink || hasRouterNavigate) {
        if (!progressStarted.current) {
          NProgress.start();
          progressStarted.current = true;
          navigationStartTime.current = Date.now();
          
          setTimeout(() => {
            NProgress.inc(0.3);
          }, 10);
        }
      }
    };

    // Also handle mousedown for even faster response
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest('a, button, [role="button"], [data-navigate]');
      
      if (!clickable) return;
      
      // Quick start on mouse down for anchor links (optional, can be more aggressive)
      if (clickable.tagName === 'A') {
        const anchor = clickable as HTMLAnchorElement;
        if (anchor.href && !anchor.href.includes('#') && anchor.target !== '_blank') {
          // Start minimal progress on mouse down for immediate feedback
          setTimeout(() => {
            if (!progressStarted.current && e.button === 0) { // Left click only
              NProgress.start();
              NProgress.set(0.1); // Set to 10% immediately
              progressStarted.current = true;
              navigationStartTime.current = Date.now();
            }
          }, 50); // Small delay to ensure it's a real navigation
        }
      }
    };

    // Listen to React Router navigation events
    const handleRouteChangeStart = () => {
      if (!progressStarted.current) {
        NProgress.start();
        progressStarted.current = true;
        navigationStartTime.current = Date.now();
      }
    };

    // Add event listeners
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    
    // Custom event for React Router navigation
    window.addEventListener('react-router:navigation-start', handleRouteChangeStart);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('react-router:navigation-start', handleRouteChangeStart);
      
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [location]);

  useEffect(() => {
    // Complete progress when location changes
    const completeProgress = () => {
      if (progressStarted.current) {
        // Calculate how long the navigation took
        const navigationTime = navigationStartTime.current ? Date.now() - navigationStartTime.current : 0;
        
        // Add a small delay based on navigation time for smoother finish
        const delay = Math.max(100, Math.min(300, navigationTime / 2));
        
        setTimeout(() => {
          NProgress.done();
          progressStarted.current = false;
          navigationStartTime.current = null;
        }, delay);
      }
    };

    // Small delay to ensure page has started loading
    setTimeout(completeProgress, 50);
    
    // Also complete if page takes too long (safety net)
    const timeoutId = setTimeout(() => {
      if (progressStarted.current) {
        NProgress.done();
        progressStarted.current = false;
        navigationStartTime.current = null;
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeoutId);
  }, [location]);

  // Hook to detect page load completion
  useEffect(() => {
    const handleLoad = () => {
      if (progressStarted.current) {
        // Page loaded, complete progress smoothly
        setTimeout(() => {
          NProgress.done();
          progressStarted.current = false;
          navigationStartTime.current = null;
        }, 100);
      }
    };

    window.addEventListener('load', handleLoad);
    
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return null;
}

// Custom hook for programmatic navigation with progress
export function useNavigationWithProgress() {
  const navigate = useNavigate();
  
  const navigateWithProgress = (to: string | number, options?: any) => {
    // Start progress immediately
    NProgress.start();
    
    // Dispatch custom event for route change start
    window.dispatchEvent(new CustomEvent('react-router:navigation-start'));
    
    // Navigate after a tiny delay to ensure progress starts
    setTimeout(() => {
      if (typeof to === 'number') {
        navigate(to);
      } else {
        navigate(to, options);
      }
    }, 10);
  };
  
  return navigateWithProgress;
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