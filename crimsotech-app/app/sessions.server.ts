// app/sessions.server.ts
import { createCookieSessionStorage } from "react-router";

type SessionData = {
  userId: string;
  riderId: string;
  registration_stage: number;
  isCustomer: boolean;
  isRider: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  shopId?: string;
  
  // User profile data - store basic info in session
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
        secrets: ["s3cret1"],
        secure: true,
      },
    },
  );

export { getSession, commitSession, destroySession };