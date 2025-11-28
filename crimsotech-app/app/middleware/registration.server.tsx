import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import AxiosInstance from '~/components/axios/Axios';
import { redirect } from "react-router";

export async function registrationMiddleware(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { request } = args;

  // Run only on the server
  const { getSession } = await import("../sessions.server");
  const session = await getSession(request.headers.get("Cookie"));

  if (session.has("userId")) {
    let response;
    
    // Try to get user data from login endpoint first (for role-based redirection)
    try {
      response = await AxiosInstance.get('/login/', {
        headers: {
          "X-User-Id": session.get("userId")
        }
      });

      // Role-based redirection for completed registrations
      if (response.data.is_customer === true) {
        // If customer but registration not complete, break out to try registration endpoint
        if (response.data.registration_stage < 4) {
          // Throw an error to jump to the catch block and try registration endpoint
          throw new Error('Customer registration not complete');
        }
        return redirect("/home");
      } else if (response.data.is_rider === true) {
        if (response.data.registration_stage < 4) {
          // Throw an error to jump to the catch block and try registration endpoint
          throw new Error('Customer registration not complete');
        }
        return redirect("/rider");
      } else if (response.data.is_moderator === true) {
        return redirect("/moderator");
      } else if (response.data.is_admin === true) {
        return redirect("/admin");
      }
    } catch (error) {
      // If login endpoint fails, customer registration incomplete, or doesn't have role data, try registration endpoint
      try {
        response = await AxiosInstance.get('/get-registration/', {
          headers: {
            "X-User-Id": session.get("userId")
          }
        });

        // Registration stage redirection
        if (response.data.is_rider) {
          if (response.data.registration_stage == 1) return redirect('/signup');
          if (response.data.registration_stage == 2) return redirect('/profiling'); 
          if (response.data.registration_stage == 3) return redirect('/number');
          if (response.data.registration_stage == 4) return null;
        } else if (response.data.is_customer) {
          if (response.data.registration_stage == 1) return redirect('/profiling');
          if (response.data.registration_stage == 2) return redirect('/number');
          if (response.data.registration_stage == 4) return redirect('/home');
        }
      } catch (regError) {
        // If both endpoints fail, continue without redirection
        console.log("Could not fetch user data for redirection");
      }
    }
  }
  
  return null;
}