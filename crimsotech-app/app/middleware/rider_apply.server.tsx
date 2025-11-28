import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import AxiosInstance from '~/components/axios/Axios';
import { redirect } from "react-router";

export async function riderStatusMiddleware(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { request } = args;

  // Run only on the server
  const { getSession } = await import("../sessions.server");
  const session = await getSession(request.headers.get("Cookie"));

  if (session.has("userId")) {
    let response;
    
    try {
      response = await AxiosInstance.get('/rider-status/get_rider_status/', {
        headers: {
          "X-User-Id": session.get("userId")
        }
      });

      console.log('Rider status response:', response.data); // Debug log

      // FIXED: Check if rider is NOT verified (rider_status === false)
      if (response.data.success && response.data.rider_status === false) {
        console.log('Redirecting to pendings - rider not verified');
        return redirect("/rider/pendings");
      }
      
      // FIXED: Check if rider IS verified (rider_status === true)
      if (response.data.success && response.data.rider_status === true) {
        console.log('Rider is verified - allowing access');
        return null; // Allow access to /rider
      }
      
    } catch (error) {
      console.error("Error checking rider status:", error);
      // If there's an error, allow access but log it
    }
  }
  
  return null;
}