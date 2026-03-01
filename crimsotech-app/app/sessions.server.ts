// app/sessions.server.ts
import { createCookieSessionStorage } from "react-router";
import type { User } from "./contexts/user-role";

type SessionData = {
  userId: string;
  userData: User;
  shopId?: string;
  riderId?: string;
  registration_stage?: number;
  isCustomer?: boolean;
  isRider?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>(
    {
      cookie: {
        name: "__session",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
        sameSite: "lax",
        secrets: [process.env.SESSION_SECRET || "s3cr3t"],
        secure: process.env.NODE_ENV === "production",
      },
    }
  );

export { getSession, commitSession, destroySession };