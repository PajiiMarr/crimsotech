import type { Route } from './+types/customer-create-gift';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { redirect, data } from "react-router";
import { cleanInput } from '~/clean/clean';
import AxiosInstance from '~/components/axios/Axios';
import CreateGiftForm from '~/components/customer/customer-create-gift-form';
import { Button } from '~/components/ui/button';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Create Gift",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));


  const { requireAuth } = await import("~/middleware/auth.server");
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  // Fetch global categories and model classes
  let globalCategories = [];
  let modelClasses: string[] = [];
  
  try {
    const categoriesResponse = await AxiosInstance.get('/customer-products-viewset/global-categories/');
    if (categoriesResponse.data.success) {
      globalCategories = categoriesResponse.data.categories || [];
    }
    
    // Get model class names used by the classifier
    const classesResponse = await AxiosInstance.get('/classes/');
    if (classesResponse.data && Array.isArray(classesResponse.data.classes)) {
      modelClasses = classesResponse.data.classes;
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
  
  return data({ 
    user,
    globalCategories,
    modelClasses
  }, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const formData = await request.formData();

  console.log('this is a formdata: ', formData);

  // Get basic gift fields
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const condition = String(formData.get("condition"));
  const category_admin_id = String(formData.get("category_admin_id") || "");
  const category_admin_name = String(formData.get("category_admin_name") || "");

  // Get critical stock trigger
  const critical_stock = formData.get("critical_stock");

  // Get media files
  const media_files = formData.getAll("media_files") as File[];

  // Clean inputs
  cleanInput(name);
  cleanInput(description);
  cleanInput(condition);

  const errors: Record<string, string> = {};

  // Validation
  if (!name.trim()) {
    errors.name = "Gift name is required";
  } else if (name.length < 2) {
    errors.name = "Gift name should be at least 2 characters";
  } else if (name.length > 100) {
    errors.name = "Gift name should be at most 100 characters";
  }

  if (!description.trim()) {
    errors.description = "Description is required";
  } else if (description.length < 10) {
    errors.description = "Description should be at least 10 characters";
  } else if (description.length > 1000) {
    errors.description = "Description should be at most 1000 characters";
  }

  if (!condition.trim()) {
    errors.condition = "Condition is required";
  }

  // Validate variants
  const variantsRaw = formData.get('variants');
  if (!variantsRaw) {
    errors.variants = "Gifts must have at least one variant";
  } else {
    try {
      const variants = JSON.parse(String(variantsRaw));
      
      if (!Array.isArray(variants) || variants.length === 0) {
        errors.variants = "Gifts must have at least one variant";
      } else {
        // Validate each variant has required fields
        variants.forEach((variant, index) => {
          if (!variant.title || !variant.title.trim()) {
            errors[`variant_${index}_title`] = "Variant title is required";
          }
          if (!variant.quantity || variant.quantity === '' || Number(variant.quantity) <= 0) {
            errors[`variant_${index}_quantity`] = "Variant quantity must be greater than 0";
          }
        });
      }
    } catch (e) {
      errors.variants = "Invalid variants format";
    }
  }

  // Validate media files
  media_files.forEach((file, index) => {
    if (file.size > 0) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
      if (!validTypes.includes(file.type)) {
        errors[`media_${index}`] = "Please upload images or MP4 videos only (JPEG, PNG, GIF, WebP, MP4)";
      }
      if (file.size > 50 * 1024 * 1024) {
        errors[`media_${index}`] = "File size should be less than 50MB";
      }
    }
  });

  if (Object.keys(errors).length > 0) {
    console.log("Gift validation errors:", errors);
    return data({ errors }, { status: 400 });
  }

  try {
    const userId = session.get("userId");
    if (!userId) return data({ errors: { message: "User not authenticated" } }, { status: 401 });

    // Create FormData for API request
    const apiFormData = new FormData();
    
    // Append basic fields - NO SHOP FIELD
    apiFormData.append('name', name.trim());
    apiFormData.append('description', description.trim());
    apiFormData.append('condition', condition.trim());
    apiFormData.append('status', "active");
    apiFormData.append('upload_status', "draft");
    apiFormData.append('customer_id', userId);

    // IMPORTANT: Set price to 0 for gifts
    apiFormData.append('price', '0');
    
    // Set refundable to false for gifts
    apiFormData.append('is_refundable', 'false');
    apiFormData.append('refundable', 'false');
    
    // Set refund_days to 0
    apiFormData.append('refund_days', '0');

    // Add critical stock if provided
    if (critical_stock) {
      apiFormData.append('critical_stock', String(critical_stock));
    }

    // Handle category
    if (category_admin_id.trim() && category_admin_id !== "none" && category_admin_id !== "undefined") {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(category_admin_id.trim())) {
        apiFormData.append('category_admin_id', category_admin_id.trim());
        console.log("Appending category_admin_id (valid UUID):", category_admin_id.trim());
      } else {
        apiFormData.append('category_admin_name', category_admin_id.trim());
        console.log("Appending category_admin_name (not a UUID):", category_admin_id.trim());
      }
    } else if (category_admin_name.trim() && category_admin_name.toLowerCase() !== 'none') {
      apiFormData.append('category_admin_name', category_admin_name.trim());
      console.log("Appending category_admin_name:", category_admin_name.trim());
    }

    // Append media files
    media_files.forEach(file => {
      if (file.size > 0) {
        apiFormData.append('media_files', file);
      }
    });

    // Handle variants - set price to 0 and refundable to false
    if (variantsRaw) {
      const variants = JSON.parse(String(variantsRaw));
      
      const processedVariants = variants.map((v: any) => ({
        ...v,
        price: 0,
        compare_price: null,
        is_refundable: false,
        refundable: false,
        refund_days: 0
      }));
      
      apiFormData.append('variants', JSON.stringify(processedVariants));
    }

    // Handle variant images
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('variant_image_')) {
        const file = value as File;
        if (file && file.size > 0) {
          apiFormData.append(key, file);
        }
      }
    }

    console.log("Sending gift data to API with user ID:", userId);

    const response = await AxiosInstance.post('/customer-products-viewset/create_product/', apiFormData, {
      headers: {
        'X-User-Id': userId
      }
    });
    
    if (response.data.success) {
      console.log("Gift created successfully:", response.data);
      
      return redirect('/comgift', {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    } else {
      throw new Error(response.data.message || "Gift creation failed");
    }
  } catch (error: any) {
    console.error("Gift creation failed:", error.response?.data || error.message);

    let errorMessage = "Gift creation failed";

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

    return data({ errors: { message: errorMessage } }, { status: 500 });
  }
}

interface FormErrors {
  message?: string;
  name?: string;
  description?: string;
  condition?: string;
  category_admin_id?: string;
  variants?: string;
  [key: string]: string | undefined;
}

interface Category {
  id: string;
  name: string;
  shop: null;
  user: {
    id: string;
    username: string;
  };
}

export default function CreateGift({ loaderData, actionData }: Route.ComponentProps) {
  const { user, globalCategories, modelClasses } = loaderData;
  const errors: FormErrors = actionData?.errors || {};

  return (
    <UserProvider user={user}>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        
        {/* BACK BUTTON */}
        <div className="mb-6">
            <Link to="/comgift">
                <Button variant="outline" className="text-gray-600 hover:text-gray-900 border-gray-300">
                    <span className="mr-2">←</span> Back to Gift List
                </Button>
            </Link>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight mb-6">Create New Gift</h1>
        
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12">
            <CreateGiftForm 
              globalCategories={globalCategories}
              modelClasses={modelClasses}
              errors={errors}
            />
          </div>
        </div>
      </div>
    </UserProvider>
  );
}