import type { Route } from './+types/vehicle';
import { useState } from "react"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Link, redirect, data } from "react-router"
import { useFetcher } from "react-router"
import AxiosInstance from '~/components/axios/Axios';
import { cleanInput } from '~/clean/clean';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Apply",
    }
  ]
}

interface VehicleTypeSelectorProps {
  selected: string
  onSelect: (id: string) => void
  error?: string
}

function VehicleTypeSelector({ selected, onSelect, error }: VehicleTypeSelectorProps) {
  const vehicles = [
    { id: "car", name: "Car", img: "/car.png" },
    { id: "motorcycle", name: "Motorcycle", img: "/motorcycle.png" },
    { id: "bicycle", name: "Bicycle", img: "/bicycle.png" },
    { id: "scooter", name: "Scooter", img: "/scooter.png" },
    { id: "van", name: "Van", img: "/delivery.png" },
    { id: "truck", name: "Truck", img: "/truck.png" },
  ];
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center transition ${
              selected === v.id ? "border-blue-600 bg-blue-50" : "border-gray-300"
            }`}
          >
            <img src={v.img} alt={v.name} className="w-16 h-16 object-contain mb-2" />
            <span className="text-sm font-medium">{v.name}</span>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

export async function loader({request}: Route.ActionArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"))

  // If rider already has a vehicle, redirect to signup
  if (session.has("riderId")) {
    return redirect("/signup");
  }

  return data({}, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  
  const formData = await request.formData();
  
  // Extract form data
  const vehicle_type = String(formData.get("vehicle_type"));
  const plate_number = String(formData.get("plate_number"));
  const vehicle_brand = String(formData.get("vehicle_brand"));
  const vehicle_model = String(formData.get("vehicle_model"));
  const license_number = String(formData.get("license_number"));
  const vehicle_image = formData.get("vehicle_image") as File;
  const license_image = formData.get("license_image") as File;

  // Clean inputs
  cleanInput(plate_number);
  cleanInput(vehicle_brand);
  cleanInput(vehicle_model);
  cleanInput(license_number);

  const errors: Record<string, string> = {};

  // Vehicle Type validation
  if (!vehicle_type.trim()) {
    errors.vehicle_type = "Vehicle type is required";
  } else if (!["car", "motorcycle", "bicycle", "scooter", "van", "truck"].includes(vehicle_type)) {
    errors.vehicle_type = "Please select a valid vehicle type";
  }

  // Plate Number validation
  if (!plate_number.trim()) {
    errors.plate_number = "Plate number is required";
  } else if (plate_number.length > 20) {
    errors.plate_number = "Plate number should be at most 20 characters";
  }

  // Vehicle Brand validation
  if (!vehicle_brand.trim()) {
    errors.vehicle_brand = "Vehicle brand is required";
  } else if (vehicle_brand.length > 50) {
    errors.vehicle_brand = "Vehicle brand should be at most 50 characters";
  }

  // Vehicle Model validation
  if (!vehicle_model.trim()) {
    errors.vehicle_model = "Vehicle model is required";
  } else if (vehicle_model.length > 50) {
    errors.vehicle_model = "Vehicle model should be at most 50 characters";
  }

  // License Number validation
  if (!license_number.trim()) {
    errors.license_number = "License number is required";
  } else if (license_number.length > 20) {
    errors.license_number = "License number should be at most 20 characters";
  }

  // Vehicle Image validation
  if (!vehicle_image || vehicle_image.size === 0) {
    errors.vehicle_image = "Vehicle image is required";
  } else if (vehicle_image.size > 5 * 1024 * 1024) { // 5MB limit
    errors.vehicle_image = "Vehicle image should be less than 5MB";
  } else if (!vehicle_image.type.startsWith('image/')) {
    errors.vehicle_image = "Please upload a valid image file";
  }

  // License Image validation
  if (!license_image || license_image.size === 0) {
    errors.license_image = "License image is required";
  } else if (license_image.size > 5 * 1024 * 1024) { // 5MB limit
    errors.license_image = "License image should be less than 5MB";
  } else if (!license_image.type.startsWith('image/')) {
    errors.license_image = "Please upload a valid image file";
  }

  if (Object.keys(errors).length > 0) {
    console.log("❌ Vehicle validation errors:", errors);
    return data({ errors }, { status: 400 });
  }

  try {
    // Create FormData for file upload
    const uploadData = new FormData();
    uploadData.append('vehicle_type', vehicle_type);
    uploadData.append('plate_number', plate_number);
    uploadData.append('vehicle_brand', vehicle_brand);
    uploadData.append('vehicle_model', vehicle_model);
    uploadData.append('license_number', license_number);
    uploadData.append('vehicle_image', vehicle_image);
    uploadData.append('license_image', license_image);

    const response = await AxiosInstance.post('/rider/register/', uploadData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (response.status === 200) {
      const riderId = response.data?.rider_id;
      const userId = response.data?.user_id;

      session.set("riderId", riderId);
      session.set("userId", userId);
      session.set("registration_stage", 1);

      return redirect("/signup", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }
 3

  } catch (error: any) {
    console.error("❌ Vehicle submission error:", error);

    let errorMessage = "Failed to submit vehicle information";
    
    if (error.response?.data) {
      // Handle Django validation errors
      const djangoErrors = error.response.data;
      
      if (typeof djangoErrors === 'object') {
        // Map Django field errors to our error format
        const fieldErrors: Record<string, string> = {};
        
        Object.keys(djangoErrors).forEach(field => {
          if (Array.isArray(djangoErrors[field])) {
            fieldErrors[field] = djangoErrors[field][0];
          } else {
            fieldErrors[field] = djangoErrors[field];
          }
        });
        
        return data({ errors: fieldErrors }, { status: 400 });
      } else if (typeof djangoErrors === 'string') {
        errorMessage = djangoErrors;
      }
    }

    return data(
      { errors: { general: errorMessage } },
      { status: 500 }
    );
  }
}

type ActionData = 
  | { errors: Record<string, string> }
  | undefined;

export default function Apply() {
  const fetcher = useFetcher<ActionData>();
  const progress = 45;
  const [vehicleType, setVehicleType] = useState<string>("");
  const [vehicleImagePreview, setVehicleImagePreview] = useState<string>("");
  const [licenseImagePreview, setLicenseImagePreview] = useState<string>("");

  const errors = fetcher.data?.errors;

  const handleVehicleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setVehicleImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLicenseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLicenseImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Add vehicle_type to form data when submitting
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!vehicleType) {
      e.preventDefault();
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    formData.set("vehicle_type", vehicleType);
  };

  return (
    <div>
      <fetcher.Form
        method="post"
        encType="multipart/form-data"
        className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900"
        onSubmit={handleSubmit}
      >
        <div className="w-full max-w-xl mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <Card className="w-full max-w-xl shadow-lg">
          <CardHeader>
            <CardTitle>Tell Us About Your Vehicle</CardTitle>
            <CardDescription>
              Enter your vehicle and license details to apply as a rider
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-6">
              {/* Vehicle Type selector */}
              <div className="grid gap-2">
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <VehicleTypeSelector 
                  selected={vehicleType} 
                  onSelect={setVehicleType}
                  error={errors?.vehicle_type}
                />
                <input type="hidden" name="vehicle_type" value={vehicleType} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="plate_number">Plate Number</Label>
                <Input 
                  id="plate_number" 
                  name="plate_number" 
                  placeholder="e.g., ABC-1234" 
                  required 
                />
                {errors?.plate_number && (
                  <p className="text-xs text-red-600 mt-1">{errors.plate_number}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="vehicle_brand">Vehicle Brand</Label>
                <Input 
                  id="vehicle_brand" 
                  name="vehicle_brand" 
                  placeholder="e.g., Honda, Yamaha" 
                />
                {errors?.vehicle_brand && (
                  <p className="text-xs text-red-600 mt-1">{errors.vehicle_brand}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="vehicle_model">Vehicle Model</Label>
                <Input 
                  id="vehicle_model" 
                  name="vehicle_model" 
                  placeholder="e.g., Click 125i, Mio Sporty" 
                />
                {errors?.vehicle_model && (
                  <p className="text-xs text-red-600 mt-1">{errors.vehicle_model}</p>
                )}
              </div>

              {/* VEHICLE IMAGE */}
              <div className="grid gap-2">
                <Label htmlFor="vehicle_image">Vehicle Image</Label>
                <Input
                  id="vehicle_image"
                  name="vehicle_image"
                  type="file"
                  accept="image/*"
                  onChange={handleVehicleImageChange}
                />
                {errors?.vehicle_image && (
                  <p className="text-xs text-red-600 mt-1">{errors.vehicle_image}</p>
                )}
                {vehicleImagePreview && (
                  <img
                    src={vehicleImagePreview}
                    alt="Vehicle preview"
                    className="mt-2 w-full h-48 object-cover rounded border"
                  />
                )}
              </div>

              {/* LICENSE NUMBER */}
              <div className="grid gap-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input 
                  id="license_number" 
                  name="license_number" 
                  placeholder="e.g., D01-23-456789" 
                  required 
                />
                {errors?.license_number && (
                  <p className="text-xs text-red-600 mt-1">{errors.license_number}</p>
                )}
              </div>

              {/* LICENSE IMAGE */}
              <div className="grid gap-2">
                <Label htmlFor="license_image">License Image</Label>
                <Input
                  id="license_image"
                  name="license_image"
                  type="file"
                  accept="image/*"
                  onChange={handleLicenseImageChange}
                  required
                />
                {errors?.license_image && (
                  <p className="text-xs text-red-600 mt-1">{errors.license_image}</p>
                )}
                {licenseImagePreview && (
                  <img
                    src={licenseImagePreview}
                    alt="License preview"
                    className="mt-2 w-full h-48 object-cover rounded border"
                  />
                )}
              </div>

              {/* General errors */}
              {errors?.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button 
              type="submit" 
              className="w-full"
              disabled={fetcher.state === "submitting" || !vehicleType}
            >
              {fetcher.state === "submitting" ? "Submitting..." : "Submit"}
            </Button>
            <Link to="/rider" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Back
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </fetcher.Form>
    </div>
  );
}