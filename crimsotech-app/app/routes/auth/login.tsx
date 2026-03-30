import type { Route } from './+types/login';
import { LoginForm } from '~/components/auth/login-form';
import { useFetcher, useActionData } from 'react-router';
import { Card } from '~/components/ui/card';
import { Link } from 'react-router';
import { GalleryVerticalEnd } from "lucide-react"
import { i } from 'motion/react-client';
import AxiosInstance from '~/components/axios/Axios';
import { redirect, data } from 'react-router';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Login",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  
  // Apply the middleware and return its result
  const middlewareResult = await registrationMiddleware({ 
    request, 
    context, 
    params: {}, 
    unstable_pattern: undefined 
  } as any);
  
  // If middleware returned a redirect, return it
  if (middlewareResult) {
    return middlewareResult;
  }

  // If no redirect, return empty data
  return data({}, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const username = String(formData.get("username"));
  const password = String(formData.get("password"));
  const errors: Record<string, string> = {};

  if (!username.trim()) errors.username = "Username is required";
  if (!password.trim()) errors.password = "Password is required";

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  try {
    const payload = { username, password };
    const response = await AxiosInstance.post('/login/', payload);
    console.log("Login successful:", response.data)
    
    const { getSession, commitSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    
    // IMPORTANT: Set the userId
    session.set("userId", response.data.user_id);
    
    // IMPORTANT: Set the complete userData object (this is what root.tsx expects)
    session.set("userData", {
      username: response.data.username,
      email: response.data.email,
      isAdmin: response.data.is_admin,
      isCustomer: response.data.is_customer,
      isRider: response.data.is_rider,
      isModerator: response.data.is_moderator,
      registration_stage: response.data.registration_stage,
    });
    
    // Also set individual flags for convenience
    session.set("isRider", response.data.is_rider);
    session.set("isCustomer", response.data.is_customer);
    session.set("isAdmin", response.data.is_admin);
    session.set("isModerator", response.data.is_moderator);
    
    console.log("Session data after setting:", {
      userId: session.get("userId"),
      userData: session.get("userData"),
      isRider: session.get("isRider"),
      isCustomer: session.get("isCustomer"),
    });
    
    // Redirect based on user role
    if (response.data.is_customer) {
      console.log("Redirecting to /home");
      return redirect("/home", {
        headers: { "Set-Cookie": await commitSession(session) }
      });
    } else if (response.data.is_rider) {
      console.log("Redirecting to /rider");
      return redirect("/rider", {
        headers: { "Set-Cookie": await commitSession(session) }
      });
    } else if (response.data.is_moderator) {
      console.log("Redirecting to /moderator");
      return redirect("/moderator", {
        headers: { "Set-Cookie": await commitSession(session) }
      });
    } else if (response.data.is_admin) {
      console.log("Redirecting to /admin");
      return redirect("/admin", {
        headers: { "Set-Cookie": await commitSession(session) }
      });
    }
    
    // Fallback redirect
    return redirect("/home", {
      headers: { "Set-Cookie": await commitSession(session) }
    });
    
  } catch (error: any) {
    console.error("Login error:", error);
    
    if (error.response) {
      return data(
        { errors: { general: error.response.data.error || "Login failed" } },
        { status: error.response.status }
      );
    }
    
    return data(
      { errors: { general: "Something went wrong. Please try again later." } },
      { status: 500 }
    );
  }
}

export default function LoginPage({}: Route.ComponentProps ) {
  const actionData = useActionData<typeof action>();
  console.log("Action Data:", actionData)
  
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center">
          <Link to="/" className='flex items-center gap-2 font-medium'>
            CrimsoTech
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
            {actionData?.errors?.general && (
              <p className="text-red-600 text-sm text-center mt-2">
                {actionData.errors.general}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="Crimsotech.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}