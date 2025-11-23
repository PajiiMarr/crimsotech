import type { Route } from './+types/login';
import { SignupForm } from '~/components/auth/signup-form';
import { Card } from '~/components/ui/card';
import { Link } from 'react-router';
import { redirect, data } from 'react-router';
import { cleanInput } from '~/clean/clean';
import AxiosInstance from '~/components/axios/Axios';


export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Signup",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  if (session.has("userId")) {
    const response = await AxiosInstance.get('/register/', {
      headers: {
        "X-User-Id": session.get("userId")
      }
    });

    if(response.data.is_rider == true) {
      if(response.data.registration_stage == 1) return
      if(response.data.registration_stage == 2) throw redirect('/profiling')
      if(response.data.registration_stage == 3) throw redirect('/number')
      if(response.data.registration_stage == 4) throw redirect('/rider')
      }
    if(response.data.registration_stage == 1) throw redirect('/profiling')
    if(response.data.registration_stage == 2) throw redirect('/number')
    if(response.data.registration_stage == 4) throw redirect('/home')
  }

  return data({}, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}


export async function action({ request }: Route.ActionArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const isRider = session.has("riderId");
  const registration_stage = isRider ? 2 : 1;

  const formData = await request.formData();
  const username = String(formData.get("username"));
  const password = String(formData.get("password"));
  const confirm_password = String(formData.get("confirm_password"));

  const existingUsersRes = await AxiosInstance.get('/register');
  const existingUsers = existingUsersRes.data.map((u: any) => u.username);

  cleanInput(username);
  cleanInput(password);
  cleanInput(confirm_password);

  const errors: Record<string, string> = {};

  if (!username.trim()) {
    errors.username = "Username is required";
  } else if (existingUsers.includes(username)) {
    errors.username = "Username is already taken";
  } else if (username.length < 3) {
    errors.username = "Username should be at least 3 characters";
  } else if (username.length > 100) {
    errors.username = "Username should be at most 100 characters";
  }

  if (!password.trim()) {
    errors.password = "Password is required";
  } else if (password.length < 3) {
    errors.password = "Password should be at least 3 characters";
  } else if (password.length > 100) {
    errors.password = "Password should be at most 100 characters";
  } else if (password !== confirm_password) {
    errors.password = "Passwords do not match";
  }

  if (Object.keys(errors).length > 0) {
    console.log("❌ Validation errors:", errors);
    return data({ errors }, { status: 400 });
  }

  try {
    const payload: any = {
      username,
      password,
      registration_stage
    };

    if (!isRider) {
      payload.is_customer = true;
    }
    
    let response;
    if(isRider) {
      response = await AxiosInstance.put('/register/', payload, {
        headers: {
          "X-User-Id": session.get("userId")
        }
      });
    } else {
      response = await AxiosInstance.post('/register/', payload);
    }

    const userId = response.data.user_id;

    // Set session data
    session.set("userId", userId);
    session.set("registration_stage", registration_stage);

    // If user is not a rider, clear any old riderId
    if (!isRider) {
      session.unset("riderId");

      return redirect("/profiling", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }

  } catch (error: any) {
    if (error.response) {
      console.error("Django API Error Response:", error.response);
      console.error("❌ Error Data:", error.response.data);
    } else {
      console.error("❌ Network/Error:", error.message);
    }

    return data(
      { errors: { message: "Signup failed", details: error.response?.data || error.message } },
      { status: 500 }
    );
  }
}



export default function SignupPage({
  loaderData
}: Route.ComponentProps) {
  
  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="w-full flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center">
          <Link to="/" className='flex items-center gap-2 font-medium'>
            CrimsoTech
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {}
            <SignupForm />
          </div>
        </div>
      </div>
    </div>
  )
}