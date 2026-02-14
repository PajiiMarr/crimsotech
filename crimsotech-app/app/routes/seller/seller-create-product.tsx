import type { Route } from './+types/seller-create-product';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { redirect, data } from "react-router";
import { cleanInput } from '~/clean/clean';
import AxiosInstance from '~/components/axios/Axios';
import CreateProductForm from '~/components/customer/seller-create-product-form';
import { Button } from '~/components/ui/button';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Create Product",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireAuth } = await import("~/middleware/auth.server");
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  const shopId = session.get("shopId");

  await requireRole(request, context, ["isCustomer"]);

  // Fetch shops for the form
  try {
    const shopsResponse = await AxiosInstance.get('/shop-add-product/get_shop/',
      { 
        headers: {  
          'X-Shop-Id': shopId || '',
        }
      }
    );

    const shop = shopsResponse.data.shop;
    const selectedShop = shop;

    // Fetch global categories
    let globalCategories = [];
    // Fetch model class names
    let modelClasses: string[] = [];
    try {
      const categoriesResponse = await AxiosInstance.get('/seller-products/global-categories/');
      if (categoriesResponse.data.success) {
        globalCategories = categoriesResponse.data.categories || [];
      }
      // Get model class names used by the classifier
      const classesResponse = await AxiosInstance.get('/classes/');
      if (classesResponse.data && Array.isArray(classesResponse.data.classes)) {
        modelClasses = classesResponse.data.classes;
      }
    } catch (categoryError) {
      console.error('Failed to fetch global categories:', categoryError);
      // Continue without categories - the form will still work
    }
    
    return data({ 
      user,
      selectedShop: selectedShop,
      globalCategories: globalCategories,
      modelClasses
    }, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    // Even if shops fail, try to fetch categories
    let globalCategories = [];
    let modelClasses: string[] = [];
    try {
      const categoriesResponse = await AxiosInstance.get('/seller-products/global-categories/');
      if (categoriesResponse.data.success) {
        globalCategories = categoriesResponse.data.categories || [];
      }
      const classesResponse = await AxiosInstance.get('/classes/');
      if (classesResponse.data && Array.isArray(classesResponse.data.classes)) {
        modelClasses = classesResponse.data.classes;
      }
    } catch (categoryError) {
      console.error('Failed to fetch global categories:', categoryError);
    }

    return data({ 
      user,
      shops: [],
      selectedShop: null,
      globalCategories: globalCategories,
      modelClasses
    }, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const formData = await request.formData();

  console.log('this is a formdata: ', formData);

  // Get basic product fields
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const condition = String(formData.get("condition"));
  const category_admin_id = String(formData.get("category_admin_id") || "");
  const category_admin_name = String(formData.get("category_admin_name") || "");

  // Get media files
  const media_files = formData.getAll("media_files") as File[];

  // Clean inputs
  cleanInput(name);
  cleanInput(description);
  cleanInput(condition);

  const errors: Record<string, string> = {};

  // Validation
  if (!name.trim()) {
    errors.name = "Product name is required";
  } else if (name.length < 2) {
    errors.name = "Product name should be at least 2 characters";
  } else if (name.length > 100) {
    errors.name = "Product name should be at most 100 characters";
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
    errors.variants = "Products must have at least one variant";
  } else {
    try {
      const variants = JSON.parse(String(variantsRaw));
      
      if (!Array.isArray(variants) || variants.length === 0) {
        errors.variants = "Products must have at least one variant";
      } else {
        // Validate each variant has required fields
        variants.forEach((variant, index) => {
          if (!variant.title || !variant.title.trim()) {
            errors[`variant_${index}_title`] = "Variant title is required";
          }
          if (!variant.price || variant.price === '' || Number(variant.price) <= 0) {
            errors[`variant_${index}_price`] = "Variant price must be greater than 0";
          }
          if (!variant.quantity || variant.quantity === '' || Number(variant.quantity) <= 0) {
            errors[`variant_${index}_quantity`] = "Variant quantity must be greater than 0";
          }
          
          // Validate depreciation fields if present
          if (variant.original_price || variant.usage_period || variant.depreciation_rate) {
            if (variant.original_price && Number(variant.original_price) <= 0) {
              errors[`variant_${index}_original_price`] = "Original price must be greater than 0";
            }
            if (variant.usage_period && Number(variant.usage_period) < 0) {
              errors[`variant_${index}_usage_period`] = "Usage period cannot be negative";
            }
            if (variant.depreciation_rate && (Number(variant.depreciation_rate) < 0 || Number(variant.depreciation_rate) > 100)) {
              errors[`variant_${index}_depreciation_rate`] = "Depreciation rate must be between 0 and 100";
            }
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
    console.log("Product validation errors:", errors);
    return data({ errors }, { status: 400 });
  }

  try {
    const userId = session.get("userId");
    if (!userId) return data({ errors: { message: "User not authenticated" } }, { status: 401 });

    const shop_id = session.get("shopId");

    // Create FormData for API request
    const apiFormData = new FormData();
    
    // Append basic fields
    apiFormData.append('name', name.trim());
    apiFormData.append('description', description.trim());
    apiFormData.append('condition', condition.trim());
    apiFormData.append('shop', shop_id ?? "");
    apiFormData.append('status', "active");
    apiFormData.append('customer_id', userId);

    // IMPORTANT FIX: Only append ONE category field - prefer ID over name
    if (category_admin_id.trim() && category_admin_id !== "none" && category_admin_id !== "undefined") {
      // Validate that it looks like a UUID before sending
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(category_admin_id.trim())) {
        apiFormData.append('category_admin_id', category_admin_id.trim());
        console.log("Appending category_admin_id (valid UUID):", category_admin_id.trim());
      } else {
        // If it's not a UUID, treat it as a name
        apiFormData.append('category_admin_name', category_admin_id.trim());
        console.log("Appending category_admin_name (not a UUID):", category_admin_id.trim());
      }
    } else if (category_admin_name.trim() && category_admin_name.toLowerCase() !== 'none') {
      apiFormData.append('category_admin_name', category_admin_name.trim());
      console.log("Appending category_admin_name:", category_admin_name.trim());
    }

    console.log("Category admin ID from form:", category_admin_id);
    console.log("Category admin name from form:", category_admin_name);

    // Append media files
    media_files.forEach(file => {
      if (file.size > 0) {
        apiFormData.append('media_files', file);
      }
    });

    // Handle variants
    if (variantsRaw) {
      const variants = JSON.parse(String(variantsRaw));
      
      // Ensure each variant has is_refundable flag
      const processedVariants = variants.map((v: any) => ({
        ...v,
        is_refundable: v.refundable !== undefined ? v.refundable : true
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

    console.log("Sending product data to API with user ID:", userId);

    // Debug: inspect entries in apiFormData before sending to API
    try {
      for (const [k, v] of (apiFormData as any).entries()) {
        const valPreview = (v && typeof v === 'object' && 'name' in v) 
          ? { name: v.name, size: v.size, type: v.type } 
          : String(v).slice(0, 200);
        console.log('apiFormData entry ->', k, valPreview);
      }
    } catch (err) {
      console.log('Failed to iterate apiFormData entries for debug:', err);
    }
    
    const response = await AxiosInstance.post('/seller-products/', apiFormData);
    
    if (response.data.success) {
      console.log("Product created successfully:", response.data);
      
      // SSR Redirect to product list page
      return redirect('/seller/seller-product-list', {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    } else {
      throw new Error(response.data.message || "Product creation failed");
    }
  } catch (error: any) {
    console.error("Product creation failed:", error.response?.data || error.message);

    let errorMessage = "Product creation failed";

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

// Define the errors type
interface FormErrors {
  message?: string;
  name?: string;
  description?: string;
  condition?: string;
  shop?: string;
  category_admin_id?: string;
  variants?: string;
  [key: string]: string | undefined;
}

// Define category type
interface Category {
  id: string;
  name: string;
  shop: null;
  user: {
    id: string;
    username: string;
  };
}

export default function CreateProduct({ loaderData, actionData }: Route.ComponentProps) {
  const { user, selectedShop, globalCategories, modelClasses } = loaderData;
  const errors: FormErrors = actionData?.errors || {};

  return (
    <UserProvider user={user}>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        
        {/* BACK BUTTON */}
        <div className="mb-6">
            <Link to="/seller/seller-product-list">
                <Button variant="outline" className="text-gray-600 hover:text-gray-900 border-gray-300">
                    <span className="mr-2">←</span> Back to Product List
                </Button>
            </Link>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight mb-6">Create New Product</h1>
        
        {/* Single Column Layout - All forms visible */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Form (full width) */}
          <div className="col-span-12">
            <CreateProductForm 
              selectedShop={selectedShop}
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