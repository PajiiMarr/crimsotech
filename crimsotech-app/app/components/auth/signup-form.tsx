import { useFetcher } from "react-router"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Link } from "react-router"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  let fetcher = useFetcher();
  const errors = fetcher.data?.errors;
  return (
    <div>
      <fetcher.Form method="post" className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="username">Username</Label>
            <Input id="username" type="text" name="username" />
            {errors?.username && (
              <p className="px-1 text-xs text-red-600">
                {errors.username}
              </p>
            )}
          </div>
          <div className="grid gap-3">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input id="password" type="password" name="password" />
            {errors?.password && (
              <p className="px-1 text-xs text-red-600">
                {errors.password}
              </p>
            )}
          </div>
          <div className="grid gap-3">
            <div className="flex items-center">
              <Label htmlFor="confirm_password">Confirm Password</Label>
            </div>
            <Input id="confirm_password" type="password" name="confirm_password" />
          </div>
            {errors?.server && (
              <p className="px-1 text-xs text-red-600">
                {errors.server}
              </p>
            )}
          <Button type="submit" className="w-full">
            Create
          </Button>
        </div>
        <div className="text-center text-sm">
            Already have an account?{" "}
            
            <Link to="/login" className="underline underline-offset-4">
              Sign in
            </Link>
          </div>
      </fetcher.Form>
    </div>
  )
}

