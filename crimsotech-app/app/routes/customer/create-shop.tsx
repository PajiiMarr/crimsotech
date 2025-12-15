import type { Route } from './+types/create-shop'
import { UserProvider } from '~/components/providers/user-role-provider';
import { CreateShopForm } from '~/components/customer/create-shop-form';
import AxiosInstance from '~/components/axios/Axios';
import { cleanInput } from '~/clean/clean';
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";
export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Customer | Create Shop",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return user;
}

export async function action({ request }: Route.ActionArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const { data, redirect } = await import('react-router');

  const formData = await request.formData();

  // Get text fields
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const province = String(formData.get("province"));
  const city = String(formData.get("city"));
  const barangay = String(formData.get("barangay"));
  const street = String(formData.get("street"));
  const contact_number = String(formData.get("contact_number"));

  // Get file
  const shop_picture = formData.get("shop_picture") as File | null;

  // Clean inputs
  cleanInput(name);
  cleanInput(description);
  cleanInput(province);
  cleanInput(city);
  cleanInput(barangay);
  cleanInput(street);
  cleanInput(contact_number);

  const errors: Record<string, string> = {};

  // Validation
  if (!name.trim()) errors.name = "Shop name is required";
  else if (name.length < 2) errors.name = "Shop name should be at least 2 characters";
  else if (name.length > 100) errors.name = "Shop name should be at most 100 characters";

  if (!description.trim()) errors.description = "Description is required";
  else if (description.length < 10) errors.description = "Description should be at least 10 characters";
  else if (description.length > 500) errors.description = "Description should be at most 500 characters";

  if (!province.trim()) errors.province = "Province is required";
  if (!city.trim()) errors.city = "City is required";
  if (!barangay.trim()) errors.barangay = "Barangay is required";
  if (!street.trim()) errors.street = "Street address is required";

  if (!contact_number.trim()) errors.contact_number = "Contact number is required";
  else if (!/^\+?[\d\s-()]{10,}$/.test(contact_number)) errors.contact_number = "Please enter a valid contact number";

  // Validate file
  if (shop_picture && shop_picture.size > 0) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(shop_picture.type)) errors.shop_picture = "Please upload a valid image (JPEG, PNG, GIF, WebP)";
    if (shop_picture.size > 5 * 1024 * 1024) errors.shop_picture = "Image size should be less than 5MB";
  }

  if (Object.keys(errors).length > 0) {
    console.log("Shop validation errors:", errors);
    return data({ errors }, { status: 400 });
  }

  try {
    const userId = session.get("userId");
    if (!userId) return data({ errors: { message: "User not authenticated" } }, { status: 401 });

    // FormData for API
    const apiFormData = new FormData();
    apiFormData.append('name', name);
    apiFormData.append('description', description);
    apiFormData.append('province', province);
    apiFormData.append('city', city);
    apiFormData.append('barangay', barangay);
    apiFormData.append('street', street);
    apiFormData.append('contact_number', contact_number);
    apiFormData.append('customer', userId);

    if (shop_picture && shop_picture.size > 0) apiFormData.append('shop_picture', shop_picture);

    console.log("Creating shop with FormData");

    const response = await AxiosInstance.post('/customer-shops/', apiFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.success) {
      const shopId = response.data.id || response.data.shop?.id;
      console.log(" Shop created successfully, ID:", shopId);

      return redirect("/shop-list", {
  headers: { "Set-Cookie": await commitSession(session) },
});

    } else {
      throw new Error(response.data.message || "Shop creation failed");
    }
  } catch (error: any) {
    console.error("Shop creation failed:", error.response?.data || error.message);

    let errorMessage = "Shop creation failed";

    if (error.response?.data) {
      const apiErrors = error.response.data;
      if (typeof apiErrors === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach(field => {
          if (Array.isArray(apiErrors[field]) && apiErrors[field].length > 0) {
            fieldErrors[field] = apiErrors[field][0];
          } else {
            fieldErrors[field] = apiErrors[field];
          }
        });
        return data({ errors: fieldErrors }, { status: 400 });
      } else if (typeof apiErrors === 'string') {
        errorMessage = apiErrors;
      }
    }

    return data({ errors: { message: errorMessage, details: error.response?.data || error.message } }, { status: 500 });
  }
}

export default function CreateShop({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  return (
    <UserProvider user={user}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b bg-white px-4 py-6 sm:px-6 lg:px-8 mb-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to shop List
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Create Shop</h1>
              <p className="text-sm text-gray-500">Fill out the following to create your shop</p>
            </div>
            <div className="w-24"></div> {/* Spacer for alignment */}
          </div>
        </div>
        <CreateShopForm />
      </div>
    </UserProvider>
  );
}
