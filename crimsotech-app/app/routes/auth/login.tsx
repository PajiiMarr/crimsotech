import type { Route } from './+types/login';
import { LoginForm } from '~/components/auth/login-form';
import { Card } from '~/components/ui/card';
import { Link } from 'react-router';

import { GalleryVerticalEnd } from "lucide-react"
import { i } from 'motion/react-client';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Login",
    },
  ];
}

export default function LoginPage() {
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
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="public/crimsonity.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
