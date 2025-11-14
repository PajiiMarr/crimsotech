// app/hooks/use-user-role.ts
import { useLoaderData } from "react-router";

export function useUserRole() {
  const user = useLoaderData() as {
    isAdmin: boolean;
    isCustomer: boolean;
    isRider: boolean;
    isModerator: boolean;
  };
  return user;
}