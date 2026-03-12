import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import AxiosInstance from '~/components/axios/Axios';
import { redirect } from "react-router";

export async function registrationMiddleware(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { request } = args;
  const { getSession, commitSession } = await import("../sessions.server");
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userId")) return null;

  const userId = session.get("userId");

  // Use cached registration data if available
  const cachedUserData = session.get("userData");
  if (cachedUserData) {
    if (cachedUserData.isCustomer && (cachedUserData.registration_stage ?? 0) >= 4) {
      return redirect("/home");
    }
    if (cachedUserData.isRider && (cachedUserData.registration_stage ?? 0) >= 4) {
      return redirect("/rider");
    }
    if (cachedUserData.isModerator) return redirect("/moderator");
    if (cachedUserData.isAdmin) return redirect("/admin");
  }

  // Only hit the API if no cache
  let response;
  try {
    response = await AxiosInstance.get('/login/', {
      headers: { "X-User-Id": userId }
    });

    const data = response.data;

    if (data.is_customer === true) {
      if (data.registration_stage < 4) throw new Error('Customer registration not complete');
      return redirect("/home");
    } else if (data.is_rider === true) {
      if (data.registration_stage < 4) throw new Error('Rider registration not complete');
      return redirect("/rider");
    } else if (data.is_moderator === true) {
      return redirect("/moderator");
    } else if (data.is_admin === true) {
      return redirect("/admin");
    }
  } catch (error) {
    try {
      response = await AxiosInstance.get('/get-registration/', {
        headers: { "X-User-Id": userId }
      });

      const data = response.data;
      const currentPath = new URL(request.url).pathname;

      if (data.is_rider) {
        if (data.registration_stage == 1 && currentPath !== '/signup') return redirect('/signup');
        if (data.registration_stage == 2 && currentPath !== '/profiling') return redirect('/profiling');
        if (data.registration_stage == 3 && currentPath !== '/number') return redirect('/number');
        if (data.registration_stage == 4) return null;
      } else if (data.is_customer) {
        if (data.registration_stage == 1) return redirect('/profiling');
        if (data.registration_stage == 2) return redirect('/number');
        if (data.registration_stage == 4) return redirect('/home');
      }
    } catch (regError) {
      console.log("Could not fetch user data for redirection");
    }
  }

  return null;
}