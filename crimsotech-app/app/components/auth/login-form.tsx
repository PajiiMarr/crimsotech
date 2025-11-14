import { div } from "motion/react-client"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Link } from "react-router"
import { useFetcher } from "react-router"

export function LoginForm({
}: React.ComponentProps<"form">) {
  let fetcher = useFetcher();
  const errors = fetcher.data?.errors;
  
  return (
    <div>
        <fetcher.Form className="flex flex-col gap-6" method="post">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Login to your account</h1>
          </div>
          <div className="grid gap-6">
            <div className="grid gap-3">
              <div className="flex items-center">
                <Label htmlFor="username">Username</Label>
                {errors?.username && (
                  <p className="ml-2 text-xs text-red-600">
                    {errors.username}
                  </p>
                )}
              </div>
              <Input id="username" type="text" name="username" required />
            </div>
            <div className="grid gap-3">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {errors?.password && (
                  <p className="ml-2 text-xs text-red-600">
                    {errors.password}
                  </p>
                )}
                <a
                  href="#"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input id="password" type="password" name="password" required />
            </div>
            {errors?.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm text-center">
                  {errors.general}
                </p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={fetcher.state === "submitting"}>
              {fetcher.state === "submitting" ? "Logging in..." : "Login"}
            </Button>
          </div>
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </fetcher.Form>
    </div>
  )
}