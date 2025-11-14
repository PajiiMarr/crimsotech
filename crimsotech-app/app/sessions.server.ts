import { createCookieSessionStorage } from "react-router";

type SessionData = {
  userId: string;
  riderId: string;
  registration_stage: number;
  isCustomer: boolean;
  isRider: boolean;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>(
    {
      cookie: {
        name: "__session",
        // domain: "reactrouter.com", // ❌ REMOVE THIS LINE
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // Also increased to 1 week (was 60 seconds!)
        path: "/",
        sameSite: "lax",
        secrets: ["s3cret1"],
        secure: true,
      },
    },
  );

export { getSession, commitSession, destroySession };