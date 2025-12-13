"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { CheckCircle2, XCircle, Info, ArrowRight, Download } from "lucide-react";
import { cn } from "~/lib/utils";

import type { Route } from './+types/subscription-plan'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
// import { requireRole } from '~/middleware/role-require.server';
// import { userContext } from '~/contexts/user-role';
import AxiosInstance from "~/components/axios/Axios";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Subscription Plan",
    },
  ];
}

type Feature = {
  text: string;
  included: boolean;
};

type Plan = {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  billedYearlyText: string;
  discount?: string;
  isPopular?: boolean;
  buttonText: string;
  buttonColorClass: string;
  features: Feature[];
  additionalFeatures: Feature[];
};

const plans: Plan[] = [
  {
    name: "Basic",
    description: "Start your shop with a budget-friendly product highlight.",
    priceMonthly: 29,
    priceYearly: 588, // Monthly * 12 (simple calculation)
    billedYearlyText: "Billed at ₱588 /yr",
    discount: "No Discount",
    buttonText: "Purchase",
    buttonColorClass: "bg-[#007bff] hover:bg-[#0069d9] text-white",
    features: [
      { text: "Highlights a single product", included: true },
      { text: "Valid for 30 days", included: true },
      { text: "Gain improved visibility in search results", included: true }
    ],
    additionalFeatures: [
      { text: "Lorem ipsum dolor sit amet", included: true },
      { text: "Consectetur adipiscing elit", included: false }
    ]
  },
  {
    name: "Pro",
    description: "Boost your shop's presence with affordable product highlights.",
    priceMonthly: 99,
    priceYearly: 1188, // Monthly * 12 (simple calculation)
    billedYearlyText: "Billed at ₱1188 /yr",
    discount: "No Discount",
    isPopular: true,
    buttonText: "Purchase",
    buttonColorClass: "bg-[#8a2be2] hover:bg-[#7a24cc] text-white",
    features: [
      { text: "Highlights 5 products", included: true },
      { text: "Valid for 30 days", included: true },
      { text: "Enjoy improved visibility in search results", included: true }
    ],
    additionalFeatures: [
      { text: "Sed do eiusmod tempor incididunt", included: true },
      { text: "Ut labore et dolore magna aliqua", included: true }
    ]
  },
  {
    name: "Premium",
    description: "Enhance the visibility of your products with priority placement.",
    priceMonthly: 249,
    priceYearly: 2988, // Monthly * 12 (simple calculation)
    billedYearlyText: "Billed at ₱2988 /yr",
    discount: "No Discount",
    buttonText: "Purchase",
    buttonColorClass: "bg-[#ffc107] hover:bg-[#e0a800] text-black",
    features: [
      { text: "Highlights 15 products", included: true },
      { text: "Valid for 30 days", included: true },
      { text: "Gain higher ranking in search results", included: true }
    ],
    additionalFeatures: [
      { text: "Quis nostrud exercitation ullamco", included: true },
      { text: "Laboris nisi ut aliquip ex ea commodo", included: true }
    ]
  }
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireAuth } = await import("~/middleware/auth.server");
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  let data;
  try {
    data = await AxiosInstance.get('/customer-boost-plans/get_boost_plans/')

    console.log(data)
  } catch {

  }

  return user;
}


export default function SubscriptionPlan ({loaderData}: Route.ComponentProps) {
  const user = loaderData;
  const [isYearly, setIsYearly] = useState(true);
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 space-y-4 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">Subscription Plan</h1>
          <p className="text-muted-foreground text-lg text-balance">
            Boost your product for higher visiblity
          </p>
        </header>

        <div className="mb-12 text-center">
          <div className="bg-muted inline-flex items-center rounded-full p-1">
            <button
              className={cn(
                "rounded-full px-6 py-2 text-sm font-medium transition-colors",
                !isYearly ? "bg-gray-200" : "text-muted-foreground"
              )}
              onClick={() => setIsYearly(false)}>
              Monthly
            </button>
            <button
              className={cn(
                "rounded-full px-6 py-2 text-sm font-medium transition-colors",
                isYearly ? "bg-black text-white" : "text-muted-foreground"
              )}
              onClick={() => setIsYearly(true)}>
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "bg-muted relative flex flex-col rounded-xl border p-6",
                plan.isPopular && "border-2 border-[#8a2be2] shadow-xl"
              )}>
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#8a2be2] px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <h2 className="mb-2 text-2xl font-semibold">{plan.name}</h2>
              <p className="text-muted-foreground mb-4 text-sm">{plan.description}</p>

              {plan.discount && (
                <div
                  className={cn(
                    "absolute top-6 right-6 rounded-full px-2 py-1 text-xs font-semibold",
                    plan.name === "Basic" && "bg-background text-[#007bff]",
                    plan.name === "Pro" && "bg-background text-[#8a2be2]",
                    plan.name === "Premium" && "bg-background text-[#ffc107]"
                  )}>
                  {plan.discount}
                </div>
              )}

              <div className="mb-6 flex items-baseline">
                <span className="text-5xl font-bold">
                  ₱{isYearly ? plan.priceYearly : plan.priceMonthly}
                </span>
                <span className="text-muted-foreground text-xl">
                  {isYearly ? "/yr" : "/mo"}
                </span>
              </div>
              <p className="text-muted-foreground mb-6 text-sm">
                {isYearly ? plan.billedYearlyText : "Billed monthly"}
              </p>

              <Button className={cn("font-medium", plan.buttonColorClass)}>
                {plan.buttonText} <ArrowRight />
              </Button>

              <div className="text-muted-foreground mt-4 mb-6 flex items-center justify-center text-xs">
                <Info className="mr-1 size-3" />
                <span>7-day money-back guarantee</span>
              </div>

              <div className="flex-grow">
                <ul className="text-muted-foreground space-y-3 text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      {feature.included ? (
                        <CheckCircle2 className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4 flex-shrink-0 text-red-500" />
                      )}
                      {feature.text}
                    </li>
                  ))}
                </ul>

                {plan.additionalFeatures.length > 0 && (
                  <>
                    <h3 className="mt-6 mb-3 text-sm font-semibold">Additional Features:</h3>
                    <ul className="text-muted-foreground space-y-3 text-left">
                      {plan.additionalFeatures.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          {feature.included ? (
                            <CheckCircle2 className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4 flex-shrink-0 text-red-500" />
                          )}
                          {feature.text}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <Button variant="ghost" className="text-muted-foreground hover: mt-8 w-full">
                Compare plans <Download className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
      </SidebarLayout>
    </UserProvider>
  )
}