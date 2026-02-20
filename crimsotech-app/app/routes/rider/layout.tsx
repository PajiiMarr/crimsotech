import { Outlet, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/layout";
import AxiosInstance from "~/components/axios/Axios";

export async function loader({ request }: Route.LoaderArgs) {
  const { getSession } = await import("~/sessions.server");
  const session = await getSession(request.headers.get("Cookie"));
  
  // Check if user is logged in
  if (!session.has("userId")) {
    throw redirect("/login");
  }

  const userId = session.get("userId");
  const currentPath = new URL(request.url).pathname;

  try {
    // Get user role first
    const userResponse = await AxiosInstance.get('/get-registration/', {
      headers: {
        "X-User-Id": userId
      }
    });

    // Check if user is a rider
    if (!userResponse.data.is_rider) {
      // If not a rider, redirect to appropriate dashboard
      if (userResponse.data.is_customer) {
        throw redirect("/home");
      } else if (userResponse.data.is_admin) {
        throw redirect("/admin");
      } else if (userResponse.data.is_moderator) {
        throw redirect("/moderator");
      } else {
        throw redirect("/");
      }
    }

    // Check registration stage
    if (userResponse.data.registration_stage < 4) {
      // Registration not complete - redirect to appropriate stage
      if (userResponse.data.registration_stage === 1) {
        throw redirect("/signup");
      } else if (userResponse.data.registration_stage === 2) {
        throw redirect("/profiling");
      } else if (userResponse.data.registration_stage === 3) {
        throw redirect("/number");
      }
    }

    // For completed registration (stage 4), check verification status
    if (userResponse.data.registration_stage === 4) {
      try {
        // Check rider verification status
        const riderResponse = await AxiosInstance.get('/admin-riders/check-verification/', {
          headers: {
            "X-User-Id": userId
          }
        });

        // If not verified and not already on pending page, redirect to pending
        if (!riderResponse.data.verified && !currentPath.includes('/rider/pendings')) {
          throw redirect("/rider/pendings");
        }

        // If verified, allow access to all rider routes
        return {
          verified: riderResponse.data.verified,
          riderStatus: riderResponse.data.rider_status,
          userId
        };
      } catch (error) {
        // If verification check fails, assume not verified and redirect to pending
        if (!currentPath.includes('/rider/pendings')) {
          throw redirect("/rider/pendings");
        }
      }
    }

    return { verified: false, userId };
  } catch (error) {
    // If it's a redirect, rethrow it
    if (error instanceof Response) {
      throw error;
    }
    
    // For other errors, redirect to pending as fallback
    console.error("Rider layout error:", error);
    throw redirect("/rider/pendings");
  }
}

export default function RiderLayout() {
  const data = useLoaderData<typeof loader>();
  
  return <Outlet context={data} />;
}