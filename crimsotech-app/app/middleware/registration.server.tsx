import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import AxiosInstance from '~/components/axios/Axios';
import { redirect } from "react-router";

export async function registrationMiddleware(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { request, context } = args;

  // Check if we already have user data in context (from previous middleware like fetchUserRole)
  if (context?.user) {
    console.log("Using cached user data from context");
    return handleUserRedirection(context.user, request.url);
  }

  // Run only on the server
  const { getSession } = await import("../sessions.server");
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) return null; // No user logged in, continue to public routes

  let userData;
  let usedEndpoint = '';
  
  // Determine which endpoint to call based on the current path
  const currentPath = new URL(request.url).pathname;
  const isRegistrationFlow = ['/signup', '/profiling', '/number'].includes(currentPath);
  
  // If we're in the registration flow, try get-registration first
  if (isRegistrationFlow) {
    console.log("In registration flow, trying get-registration first");
    try {
      const response = await AxiosInstance.get('/get-registration/', {
        headers: { "X-User-Id": userId }
      });
      userData = response.data;
      usedEndpoint = 'get-registration';
      
      // Store in context for future middleware/loaders
      if (context) context.user = userData;
      
      return handleRegistrationRedirection(userData, request.url);
    } catch (regError) {
      console.log("Get-registration failed, falling back to login");
      // Fall back to login endpoint
      try {
        const response = await AxiosInstance.get('/login/', {
          headers: { "X-User-Id": userId }
        });
        userData = response.data;
        usedEndpoint = 'login';
        
        // Store in context for future middleware/loaders
        if (context) context.user = userData;
        
        return handleUserRedirection(userData, request.url);
      } catch (loginError) {
        console.log("Both endpoints failed for registration flow");
        return null;
      }
    }
  } else {
    // For non-registration flows, try login first (role-based)
    console.log("Not in registration flow, trying login first");
    try {
      const response = await AxiosInstance.get('/login/', {
        headers: { "X-User-Id": userId }
      });
      userData = response.data;
      usedEndpoint = 'login';
      
      // Store in context for future middleware/loaders
      if (context) context.user = userData;
      
      return handleUserRedirection(userData, request.url);
    } catch (error) {
      console.log("Login failed, trying get-registration");
      // If login fails (incomplete registration, etc.), try registration endpoint
      try {
        const response = await AxiosInstance.get('/get-registration/', {
          headers: { "X-User-Id": userId }
        });
        userData = response.data;
        usedEndpoint = 'get-registration';
        
        // Store in context for future middleware/loaders
        if (context) context.user = userData;
        
        return handleRegistrationRedirection(userData, request.url);
      } catch (regError) {
        // If both endpoints fail, continue without redirection
        console.log("Could not fetch user data for redirection from either endpoint");
        return null;
      }
    }
  }
}

// Helper function for role-based redirection (from login endpoint)
function handleUserRedirection(userData: any, currentUrl: string) {
  const currentPath = new URL(currentUrl).pathname;
  
  if (userData.is_customer === true) {
    if (userData.registration_stage < 4) {
      // Redirect based on registration stage for customers
      if (userData.registration_stage === 1 && currentPath !== '/profiling') {
        return redirect('/profiling');
      }
      if (userData.registration_stage === 2 && currentPath !== '/number') {
        return redirect('/number');
      }
      // If stage 3, maybe continue registration flow
      if (userData.registration_stage === 3) {
        return null; // Let registration flow handle it
      }
    }
    return redirect("/home");
  } 
  
  if (userData.is_rider === true) {
    if (userData.registration_stage < 4) {
      // For incomplete rider registration, let registration flow handle it
      return null;
    }
    return redirect("/rider");
  } 
  
  if (userData.is_moderator === true) {
    return redirect("/moderator");
  } 
  
  if (userData.is_admin === true) {
    return redirect("/admin");
  }
  
  return null;
}

// Helper function for registration flow redirection (from get-registration endpoint)
function handleRegistrationRedirection(userData: any, currentUrl: string) {
  const currentPath = new URL(currentUrl).pathname;
  
  if (userData.is_rider) {
    if (userData.registration_stage === 1 && currentPath !== '/signup') {
      return redirect('/signup');
    }
    if (userData.registration_stage === 2 && currentPath !== '/profiling') {
      return redirect('/profiling');
    }
    if (userData.registration_stage === 3 && currentPath !== '/number') {
      return redirect('/number');
    }
    if (userData.registration_stage === 4) {
      // Registration complete, check role for final redirect
      return redirect('/rider');
    }
  } else if (userData.is_customer) {
    if (userData.registration_stage === 1 && currentPath !== '/profiling') {
      return redirect('/profiling');
    }
    if (userData.registration_stage === 2 && currentPath !== '/number') {
      return redirect('/number');
    }
    if (userData.registration_stage === 3) {
      // Maybe additional customer registration step
      return null;
    }
    if (userData.registration_stage === 4) {
      return redirect('/home');
    }
  }
  
  return null;
}