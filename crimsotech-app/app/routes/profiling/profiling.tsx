"use client";

import React from 'react';
import { CalendarIcon } from "lucide-react"
import { useFetcher, useLoaderData } from 'react-router';
import { Link } from 'react-router';
import type { Route } from './+types/profiling';
import AxiosInstance from '~/components/axios/Axios';
import  AddressDropdowns from '~/components/address/address_dropdowns';
import { redirect, data } from 'react-router';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '~/components/ui/dropdown-menu';

import { cleanInput } from '~/clean/clean';
import { p } from 'motion/react-client';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Profiling",
    },
  ];
}

// Function to format date for display (June 01, 2025)
function formatDate(date: Date | undefined) { 
    if (!date) {
        return ""
    }
    return date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })
}

function formatDateForAPI(date: Date | undefined): string {
    if (!date) {
        return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false
  }
  return !isNaN(date.getTime())
}

// Function to calculate age from date of birth
function calculateAge(dateOfBirth: Date | undefined): string {
  if (!dateOfBirth || !isValidDate(dateOfBirth)) {
    return "";
  }
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age.toString();
}

export async function loader({ request }: Route.LoaderArgs) {
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));


  if(!session.has("userId")){
    throw redirect('/signup')
  }

  const userId = session.get("userId");

  const userProfiling = await AxiosInstance.get('/profiling/', {
    headers: {
    'X-User-Id': userId,
    },
  });
    
  if (session.has("userId")) {
    const response = await AxiosInstance.get('/register/', {
      headers: {
        "X-User-Id": userId
      }
    });

    if(response.data.is_rider == true) {
      if(response.data.registration_stage == 1) throw redirect('/signup')
      if(response.data.registration_stage == 2) return { profilingData: userProfiling.data }; 
      if(response.data.registration_stage == 3) throw redirect('/number')
      if(response.data.registration_stage == 4) throw redirect('/rider')
      }
    if(response.data.registration_stage == 2) throw redirect('/number')
    if(response.data.registration_stage == 4) throw redirect('/home')

  }


  return { profilingData: userProfiling.data };
}


export async function action ({ request }: Route.ActionArgs) {
    const { getSession, commitSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");
    const formData = await request.formData();

    const isRider = session.has("riderId");
    const registration_stage = isRider ? 3 : 2;
    
    const profilingData: Record<string, any> = {};
    formData.forEach((value, key) => {
        cleanInput(value as string);
        profilingData[key] = value;
        console.log(`Key: ${key}, Value: ${value}`);
    });

    const errors: Record<string, string> = {};

    // Basic validation examplesfp
    if (!profilingData.first_name || profilingData.first_name.trim() === "") {
        errors.first_name = "First name is required";
    }

    if (!profilingData.last_name || profilingData.last_name.trim() === "") {
        errors.last_name = "Last name is required";
    }

    if (!profilingData.email || profilingData.email.trim() === "") {
        errors.email = "Email is required";
    } else {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(profilingData.email)) {
            errors.email = "Invalid email format";
        }
    }

    // Parse the display date format and convert to API format
    let apiDateOfBirth = "";
    if (profilingData.date_of_birth && profilingData.date_of_birth.trim() !== "") {
        try {
            const parsedDate = new Date(profilingData.date_of_birth);
            if (isValidDate(parsedDate)) {
                apiDateOfBirth = formatDateForAPI(parsedDate);
            } else {
                errors.date_of_birth = "Invalid date format";
            }
        } catch (error) {
            errors.date_of_birth = "Invalid date format";
        }
    } else {
        errors.date_of_birth = "Date of birth is required";
    }

    if (!profilingData.sex || profilingData.sex.trim() === "") {
        errors.sex = "Sex is required";
    }
    
    if (!profilingData.age || profilingData.age.trim() === "") {
        errors.age = "Age is required";
    } else if (parseInt(profilingData.age) < 15) {
        errors.age = "You must be at least 15 years old!"
    }
    
    if (!profilingData.province || profilingData.province.trim() === "") {
        errors.province = "Province is required";
    }

    if (!profilingData.city || profilingData.city.trim() === "") {
        errors.city = "City is required";
    }

    if (!profilingData.barangay || profilingData.barangay.trim() === "") {
        errors.barangay = "Barangay is required";
    }
    
    if (Object.keys(errors).length > 0) {
        console.log("Validation errors:", errors);
        return { errors };
    }

    console.log("Submitting profiling data:", profilingData);
    console.log("API Date of Birth:", apiDateOfBirth);
    
    try {
    const response = await AxiosInstance.put('/profiling/',
        {
            userId,
            ...profilingData,
            date_of_birth: apiDateOfBirth, 
            registration_stage
        },
        {
            headers: {
                'X-User-Id': userId,
            }
        });

        
        const isRider = session.has("riderId");
        session.set("registration_stage", isRider ? 3 : 2);
        
        return redirect("/number", {
            headers: {
                "Set-Cookie": await commitSession(session),
            },
        });
        console.log("inexecute ko tong redirect")        
    } catch (error: any) {
        if (error.response) {
            console.error("Django API Error Response:", error.response);
            console.error("Error Data:", error.response.data);
            errors.response_data = error.response.data
        } else {
            console.error("Network/Error:", error.message);
        }
        
        return data(
            { errors: { message: "Profiling update failed", details: error.response?.data || error.message } },
            { status: 500 }
        );
    }
}

export default function ProfilingRoute({loaderData}: Route.ComponentProps) {
    let user = useLoaderData<typeof loader>();
    let fetcher = useFetcher()
    const errors = fetcher.data?.errors;

    const [open, setOpen] = React.useState(false)
    const [date, setDate] = React.useState<Date | undefined>(
        new Date("2025-06-01")
    )
    const [month, setMonth] = React.useState<Date | undefined>(date)
    const [value, setValue] = React.useState(formatDate(date))

    // Change from position to sex state with actual values
    const [sex, setSex] = React.useState("")

    const age = React.useMemo(() => calculateAge(date), [date]);

    // Function to get display text for the dropdown trigger
    const getSexDisplayText = () => {
        switch (sex) {
            case "male":
                return "Male";
            case "female":
                return "Female";
            case "prefer_not_to_say":
                return "Prefer not to say";
            default:
                return "Select";
        }
    }

    return (
        <div className="flex justify-center items-center h-screen">
            <fetcher.Form method='put' className='w-lg md:w-4xl p-4 '>
                <div className="flex flex-col justify-center p-4 w-full">
                    <h1 className="text-2xl font-bold text-center">Welcome {user.profilingData.username}</h1>
                    <p className='text-center'>Setup your account first!</p>
                </div>

                {/* Basic Information */}
                <div className='grid grid-cols-1'>
                    <h2 className='text-orange-400 text-center font-semibold'>Account profile</h2>
                    <div className="grid grid-cols-1 my-2 gap-4 md:grid-cols-3">
                        <div className="grid gap-3 w-full">
                            <div className="flex items-center">
                                <Label htmlFor="first_name">First Name</Label>
                                {errors?.first_name && (
                                    <p className="px-1 text-xs text-red-600">
                                        {errors.first_name}
                                    </p>
                                )}
                            </div>
                            <Input id="first_name" type="text" name="first_name" />
                        </div>
                        <div className="grid gap-3 w-full">
                            <div className="flex items-center">
                                <Label htmlFor="last_name">Last Name</Label>
                                {errors?.last_name && (
                                <p className="px-1 text-xs text-red-600">
                                    {errors.last_name}
                                </p>
                                )}
                            </div>
                            <Input id="last_name" type="text" name="last_name" />
                        </div>
                        <div className="grid gap-3 w-full">
                            <div className="flex items-center">
                                <Label htmlFor="middle_name">Middle Name</Label>
                                {errors?.middle_name && (
                                <p className="px-1 text-xs text-red-600">
                                    {errors.middle_name}
                                </p>
                                )}
                            </div>
                            <Input id="middle_name" type="text" name="middle_name" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 ">
                        <div className="grid gap-3 w-full col-span-2">
                            <div className="flex items-center">
                                <Label htmlFor="email">Email</Label>
                                {errors?.email && (
                                <p className="px-1 text-xs text-red-600">
                                    {errors.email}
                                </p>
                                )}
                            </div>
                            <Input id="email" type="text" name="email" />
                        </div>


                        <div className="grid gap-3">
                            <div className="flex items-center">
                                <Label htmlFor="sex">Sex</Label>
                                {errors?.sex && (
                                <p className="px-1 text-xs text-red-600">
                                    {errors.sex}
                                </p>
                                )}
                            </div>
                            <Input type="hidden" name="sex" value={sex} />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="outline">{getSexDisplayText()}</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                <DropdownMenuRadioGroup value={sex} onValueChange={setSex}>
                                    <DropdownMenuRadioItem value="male">Male</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="female">Female</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="prefer_not_to_say">Prefer not to say</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                    </div>

                    <div className="grid grid-cols-3 gap-3 my-2">
                        <div className="grid col-span-2 relative gap-3">
                            <div className="flex items-center">
                                <Label htmlFor="date_of_birth">Date of Birth</Label>
                                {errors?.date_of_birth && (
                                <p className="px-1 text-xs text-red-600">
                                    {errors.date_of_birth}
                                </p>
                                )}
                            </div>
                            <Input
                                id="date_of_birth"
                                name="date_of_birth"
                                value={value}
                                placeholder="June 01, 2025"
                                className="bg-background pr-10"
                                onChange={(e) => {
                                const date = new Date(e.target.value)
                                setValue(e.target.value)
                                if (isValidDate(date)) {
                                    setDate(date)
                                    setMonth(date)
                                }
                                }}
                                onKeyDown={(e) => {
                                if (e.key === "ArrowDown") {
                                    e.preventDefault()
                                    setOpen(true)
                                }
                                }}
                            />
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date-picker"
                                    variant="ghost"
                                    className="absolute top-1/2 right-2 size-6 -translate-y-1/50"
                                >
                                    <CalendarIcon className="size-3.5" />
                                    <span className="sr-only">Select date</span>
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    captionLayout="dropdown"
                                    month={month}
                                    onMonthChange={setMonth}
                                    onSelect={(selectedDate) => {
                                    setDate(selectedDate)
                                    setValue(formatDate(selectedDate))
                                    setOpen(false)
                                    }}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid gap-3 w-full">
                            <div className="flex items-center">
                                <Label htmlFor="age">Age</Label>
                                {errors?.age && (
                                <p className="px-1 text-xs text-red-600">
                                    {errors.age}
                                </p>
                                )}
                            </div>
                            <Input disabled id="age" type="text" name="age" value={age} />
                            <input type="hidden" name="age" value={age} />
                        </div>
                    </div>
                </div>

                {/* Address Information */}
                <div className='grid grid-cols-1 mt-5'>
                    <h2 className='text-orange-400 text-center font-semibold'>Address</h2>
                    <AddressDropdowns errors={errors} />
                </div>
                {errors?.details && typeof errors.details === 'object' && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="text-red-600 text-sm space-y-1">
                            {Object.values(errors.details).map((errorMessage, index) => (
                                <p key={index}>{String(errorMessage)}</p>
                            ))}
                        </div>
                    </div>
                )}
                <Button type='submit' className='w-full'>Next</Button>
            </fetcher.Form>
        </div>
    );
}