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
  if (session.has("userId")) {
    const response = await AxiosInstance.get('/register/', {
    headers: {
        "X-User-Id": userId
      }
    });

    if(response.data.is_rider == true) {
      if(response.data.registration_stage == 1) return redirect('/signup')
      if(response.data.registration_stage == 2) return redirect('/profiling')
      if(response.data.registration_stage == 4) return redirect('/rider')
      }
    if(response.data.registration_stage == 1) return redirect('/profiling')
    if(response.data.registration_stage == 4) return redirect('/home')
  }

  const userProfiling = await AxiosInstance.get("/verify/user/", {
    headers: { "X-User-Id": userId },
  });

  return data({ userId, profilingData: userProfiling.data });
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

    // const isRider = session.has("riderId");
    // session.set("registration_stage", isRider ? 3 : 2);
    //     return redirect("/dashboard", {
    //   headers: {
    //     "Set-Cookie": await commitSession(session),
    //   },
    // });


    if (actionType === "send_otp" && response.data.message?.includes("OTP sent successfully")) {
      return data({ success: true, message: response.data.message });
    } else if (actionType === "verify_otp" && response.data.message?.includes("verified successfully")) {
      await AxiosInstance.put('/profiling/', 
        {
          registration_stage: 4
        },
        {
          headers: {
            "X-User-Id": session.get("userId")
          }
        }
      )

      return redirect('/home')
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

  useEffect(() => {
    if (successData?.success && successData.registration_stage === 3) {
      redirect('/home')
    }
  }, [successData]);

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