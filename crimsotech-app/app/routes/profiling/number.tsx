"use client";
import React, { useState, useEffect } from "react";
import type { Route } from "./+types/number";
import { useFetcher, redirect, useLoaderData } from "react-router";
import { data } from "react-router";
import { cleanInput } from "~/clean/clean";
import AxiosInstance from "~/components/axios/Axios";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "~/components/ui/input-otp";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Verify Number",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getSession } = await import("~/sessions.server");
  const session = await getSession(request.headers.get("Cookie"));
  
  if(!session.has("userId")){
    throw redirect('/signup')
  }

  const userId = session.get("userId");
  const currentPath = new URL(request.url).pathname;

  if (session.has("userId")) {
    let response;
    
    // Try to get user data from login endpoint first (for role-based redirection)
    try {
      response = await AxiosInstance.get('/login/', {
        headers: {
          "X-User-Id": session.get("userId")
        }
      });

      // Role-based redirection for completed registrations
      if (response.data.is_customer === true) {
        if (response.data.registration_stage < 4) {
          // Throw an error to jump to the catch block and try registration endpoint
          throw new Error('Customer registration not complete');
        }
        return redirect("/home");
      } else if (response.data.is_rider === true) {
        if (response.data.registration_stage < 4) {
          // Throw an error to jump to the catch block and try registration endpoint
          throw new Error('Rider registration not complete');
        }
        return redirect("/rider");
      } else if (response.data.is_moderator === true) {
        return redirect("/moderator");
      } else if (response.data.is_admin === true) {
        return redirect("/admin");
      }
    } catch (error) {
      // If login endpoint fails or doesn't have role data, try registration endpoint
      try {
        response = await AxiosInstance.get('/get-registration/', {
          headers: {
            "X-User-Id": session.get("userId")
          }
        });

        const userProfiling = await AxiosInstance.get("/verify/user/", {
          headers: { "X-User-Id": userId },
        });

        // Registration stage redirection - with current path check to prevent loops
        if(response.data.is_rider == true) {
          if(response.data.registration_stage == 1 && currentPath !== '/signup') {
            return redirect('/signup');
          }
          if(response.data.registration_stage == 2 && currentPath !== '/profiling') {
            return redirect('/profiling');
          }
          if(response.data.registration_stage == 3 && currentPath !== '/number') {
            return redirect('/number');
          }
          if(response.data.registration_stage == 4 && currentPath !== '/rider') {
            return redirect('/rider');
          }
          // If we're on the correct page for this stage, return the data
          if(response.data.registration_stage == 3 && currentPath === '/number') {
            return data({ userId, profilingData: userProfiling.data });
          }
        } else {
          // Customer flow
          if(response.data.registration_stage == 1 && currentPath !== '/profiling') {
            return redirect('/profiling');
          }
          if(response.data.registration_stage == 2 && currentPath !== '/number') {
            return redirect('/number');
          }
          if(response.data.registration_stage == 4 && currentPath !== '/home') {
            return redirect('/home');
          }
          // If we're on the correct page for this stage, return the data
          if(response.data.registration_stage == 2 && currentPath === '/number') {
            return data({ userId, profilingData: userProfiling.data });
          }
        }
      } catch (regError) {
        // If both endpoints fail, continue without redirection
        console.log("Could not fetch user data for redirection");
      }
    }
  }

  // Default return - show the number verification page
  try {
    const userProfiling = await AxiosInstance.get("/verify/user/", {
      headers: { "X-User-Id": userId },
    });
    return data({ userId, profilingData: userProfiling.data });
  } catch (error) {
    return data({ userId, profilingData: null });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const { getSession, commitSession } = await import("~/sessions.server");
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  const formData = await request.formData();
  const actionType = formData.get("action_type");
  const number = cleanInput(String(formData.get("number")));
  const otp = cleanInput(String(formData.get("otp")));

  const errors: Record<string, string> = {};

  if (actionType === "send_otp") {
    if (!number.trim()) {
      errors.number = "Contact number is required";
    } else if (!number.startsWith("+63")) {
      errors.number = "Must start with +63";
    } else if (number.length !== 13) {
      errors.number = "Contact number must have 10 digits after +63";
    }
  } else if (actionType === "verify_otp") {
    if (!number.trim()) {
      errors.number = "Contact number is required";
    }
    if (!otp.trim() || otp.length !== 6) {
      errors.otp = "Valid 6-digit OTP is required";
    }
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  if (!userId) {
    return data({ errors: { number: "Unauthorized" } }, { status: 401 });
  }

  try {
    const payload = {
      action_type: actionType,
      contact_number: number.replace("+63", ""),
      ...(actionType === "verify_otp" && { otp_code: otp }),
      registration_stage: 4,
    };

    const response = await AxiosInstance.post(
      "/verify/verify_number/",
      payload,
      {
        headers: {
          "X-User-Id": userId,
        },
      }
    );

    if (actionType === "send_otp" && response.data.message?.includes("OTP sent successfully")) {
      return data({ success: true, message: response.data.message });
    } else if (actionType === "verify_otp" && response.data.message?.includes("verified successfully")) {
      // Update registration stage
      await AxiosInstance.put('/profiling/', 
        {
          registration_stage: 4
        },
        {
          headers: {
            "X-User-Id": session.get("userId")
          }
        }
      );

      session.set("registration_stage", 4);

      // Check if user is rider to determine redirect destination
      const userResponse = await AxiosInstance.get('/get-registration/', {
        headers: {
          "X-User-Id": userId
        }
      });

      const isRider = userResponse.data.is_rider === true;
      
      return redirect(isRider ? "/rider" : "/home", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    } else {
      return data(
        { errors: { general: response.data.message || "Operation failed" } },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("API Error:", error);
    return data(
      {
        errors: {
          general: error.response?.data?.error || "An error occurred.",
        },
      },
      { status: 500 }
    );
  }
}

type ActionData = 
  | { errors: Record<string, string> }
  | { success: boolean; message?: string; registration_stage?: number }
  | undefined;

export default function NumberVerification({
  loaderData,
}: Route.ComponentProps) {
  const fetcher = useFetcher<ActionData>();
  const [showOtp, setShowOtp] = useState(false);
  const [contactNumber, setContactNumber] = useState("+63");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const errors = fetcher.data && 'errors' in fetcher.data ? fetcher.data.errors : undefined;
  const successData = fetcher.data && 'success' in fetcher.data ? fetcher.data : undefined;

  // Countdown logic for resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // When OTP is sent successfully → show OTP input
  useEffect(() => {
    if (successData?.success && !showOtp) {
      setShowOtp(true);
      setCooldown(60);
    }
  }, [successData, showOtp]);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (!value.startsWith("+63")) {
      value = "+63" + value.replace(/\D/g, "");
    }

    // Limit to +63 + 10 digits
    if (value.length > 13) value = value.slice(0, 13);

    setContactNumber(value);
  };

  const handleSendOtp = () => {
    const formData = new FormData();
    formData.append("action_type", "send_otp");
    formData.append("number", contactNumber);
    fetcher.submit(formData, { method: "post" });
  };

  const handleVerifyOtp = () => {
    const formData = new FormData();
    formData.append("action_type", "verify_otp");
    formData.append("number", contactNumber);
    formData.append("otp", otp);
    fetcher.submit(formData, { method: "post" });
  };

  const handleResendOtp = () => {
    if (cooldown === 0) {
      handleSendOtp();
      setCooldown(60);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-lg p-4 space-y-6">
        <h2 className="text-orange-400 text-center font-semibold">
          Verify your Contact Number
        </h2>

        {/* Number Input Section */}
        <div className="grid gap-2">
          <Label htmlFor="contact_number">Contact number</Label>
          <div className="flex gap-3">
            <Input
              id="contact_number"
              type="text"
              name="number"
              value={contactNumber}
              onChange={handleNumberChange}
              disabled={showOtp}
            />
            {!showOtp ? (
              <Button 
                type="button" 
                onClick={handleSendOtp}
                disabled={fetcher.state === "submitting"}
              >
                {fetcher.state === "submitting" ? "Sending..." : "Send OTP"}
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={handleResendOtp}
                disabled={cooldown > 0 || fetcher.state === "submitting"}
                variant="outline"
              >
                {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend OTP"}
              </Button>
            )}
          </div>
          {errors?.number && (
            <p className="text-xs text-red-600 mt-1">{errors.number}</p>
          )}
        </div>

        {showOtp && (
          <div className="grid gap-2">
            <Label htmlFor="otp">Enter OTP</Label>
            <div className="flex flex-col gap-3">
              <InputOTP 
                maxLength={6} 
                id="otp" 
                name="otp"
                value={otp}
                onChange={setOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              
              <Button 
                type="button" 
                onClick={handleVerifyOtp}
                disabled={fetcher.state === "submitting" || otp.length !== 6}
              >
                {fetcher.state === "submitting" ? "Verifying..." : "Verify OTP"}
              </Button>
            </div>
            {errors?.otp && (
              <p className="text-xs text-red-600 mt-1">{errors.otp}</p>
            )}
          </div>
        )}

        {errors?.general && (
          <p className="text-xs text-red-600 mt-1 text-center">{errors.general}</p>
        )}

        {successData?.message && (
          <p className="text-xs text-green-600 mt-1 text-center">{successData.message}</p>
        )}
      </div>
    </div>
  );
}