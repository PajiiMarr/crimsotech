import type { Route } from './+types/customer-create-product';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { redirect, data } from "react-router";
import { cleanInput } from '~/clean/clean';
import AxiosInstance from '~/components/axios/Axios';
import CreateProductForm from '~/components/customer/customer-create-product-form';
import { useState } from 'react';
import { Button } from '~/components/ui/button';

// --- BACKEND/SERVER FUNCTIONS (UNCHANGED) ---

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Create Product",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  // ... (Loader content remains exactly the same) ...
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

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

  const shopId = session.get("shopId");
  console.log("Loader Session Shop ID:", shopId);

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

    const shop = shopsResponse.data.shop
    console.log('ShopId', shop)

    const selectedShop = shop

    // Fetch global categories
    let globalCategories = [];
    try {
      const categoriesResponse = await AxiosInstance.get('/customer-products/global-categories/');
      if (categoriesResponse.data.success) {
        globalCategories = categoriesResponse.data.categories || [];
        console.log('Global categories loaded:', globalCategories.length);
      }
    } catch (categoryError) {
      console.error('Failed to fetch global categories:', categoryError);
      // Continue without categories - the form will still work
    }
    
    return data({ 
      user,
      selectedShop: selectedShop,
      globalCategories: globalCategories
    }, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    // Even if shops fail, try to fetch categories
    let globalCategories = [];
    try {
      const categoriesResponse = await AxiosInstance.get('/seller-products/global-categories/');
      if (categoriesResponse.data.success) {
        globalCategories = categoriesResponse.data.categories || [];
      }
    } catch (categoryError) {
      console.error('Failed to fetch global categories:', categoryError);
    }

    return data({ 
      user,
      shops: [],
      selectedShop: null,
      globalCategories: globalCategories
    }, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  // ... (Action content remains exactly the same) ...
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const formData = await request.formData();

  // Get basic product fields
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const quantity = String(formData.get("quantity"));
  const used_for = String(formData.get("used_for"));
  const price = String(formData.get("price"));
  const condition = String(formData.get("condition"));
  const category_admin_id = String(formData.get("category_admin_id"));

  // Get variant fields
  const variant_title = String(formData.get("variant_title"));
  const variant_option_title = String(formData.get("variant_option_title"));
  const variant_option_quantity = String(formData.get("variant_option_quantity"));
  const variant_option_price = String(formData.get("variant_option_price"));

  // Get media files
  const media_files = formData.getAll("media_files") as File[];

  // Clean inputs
  cleanInput(name);
  cleanInput(description);
  cleanInput(used_for);
  cleanInput(condition);
  cleanInput(variant_title);
  cleanInput(variant_option_title);

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

  if (!quantity.trim()) {
    errors.quantity = "Quantity is required";
  } else if (isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
    errors.quantity = "Please enter a valid quantity";
  }

  if (!price.trim()) {
    errors.price = "Price is required";
  } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    errors.price = "Please enter a valid price";
  }

  if (!condition.trim()) {
    errors.condition = "Condition is required";
  }

  // Validate media files
  media_files.forEach((file, index) => {
    if (file.size > 0) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
      if (!validTypes.includes(file.type)) {
        errors[`media_${index}`] = "Please upload valid image or video files (JPEG, PNG, GIF, WebP, MP4)";
      }
      if (file.size > 50 * 1024 * 1024) {
        errors[`media_${index}`] = "File size should be less than 50MB";
      }
    }
  });

  // Validate variants (if any variant field is filled, all should be filled)
  if (variant_title || variant_option_title || variant_option_quantity || variant_option_price) {
    if (!variant_title.trim()) {
      errors.variant_title = "Variant title is required";
    }
    if (!variant_option_title.trim()) {
      errors.variant_option_title = "Variant option title is required";
    }
    if (!variant_option_quantity.trim() || isNaN(parseInt(variant_option_quantity)) || parseInt(variant_option_quantity) < 0) {
      errors.variant_option_quantity = "Please enter a valid variant quantity";
    }
    if (!variant_option_price.trim() || isNaN(parseFloat(variant_option_price)) || parseFloat(variant_option_price) <= 0) {
      errors.variant_option_price = "Please enter a valid variant price";
    }
  }

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
    
    // Append individual fields directly
    apiFormData.append('name', name.trim());
    apiFormData.append('description', description.trim());
    apiFormData.append('quantity', quantity);
    apiFormData.append('used_for', used_for.trim() || "General use");
    apiFormData.append('price', price);
    apiFormData.append('condition', condition.trim());
    apiFormData.append('shop', shop_id ?? "");
    apiFormData.append('status', "active");
    apiFormData.append('customer_id', userId);

    // Add category_admin_id if provided and not "none"
    if (category_admin_id.trim() && category_admin_id !== "none") {
      apiFormData.append('category_admin_id', category_admin_id.trim());
    }

    // Append product-level dimensions and weight unit when provided
    const length = formData.get('length');
    const width = formData.get('width');
    const height = formData.get('height');
    const weight = formData.get('weight');
    const weightUnit = formData.get('weight_unit');
    if (length) apiFormData.append('length', String(length));
    if (width) apiFormData.append('width', String(width));
    if (height) apiFormData.append('height', String(height));
    if (weight) apiFormData.append('weight', String(weight));
    if (weightUnit) apiFormData.append('weight_unit', String(weightUnit));

    // Add variants if provided
    if (variant_title.trim() && variant_option_title.trim()) {
      apiFormData.append('variant_title', variant_title.trim());
      apiFormData.append('variant_option_title', variant_option_title.trim());
      apiFormData.append('variant_option_quantity', variant_option_quantity);
      apiFormData.append('variant_option_price', variant_option_price);
    }

    // Append media files
    media_files.forEach(file => {
      if (file.size > 0) {
        apiFormData.append('media_files', file);
      }
    });

    console.log("Sending product data to API with user ID:", userId);
    console.log("Category admin ID:", category_admin_id);
    
    const response = await AxiosInstance.post('/seller-products/', apiFormData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.success) {
      console.log("Product created successfully:", response.data);
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

// --- TYPES (UNCHANGED) ---

// Define the errors type
interface FormErrors {
  message?: string;
  name?: string;
  description?: string;
  quantity?: string;
  price?: string;
  condition?: string;
  shop?: string;
  category_admin_id?: string;
  variant_title?: string;
  variant_option_title?: string;
  variant_option_quantity?: string;
  variant_option_price?: string;
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

// --- COMPONENT (MODIFIED - All forms shown, no next button) ---

export default function CreateProduct({ loaderData, actionData }: Route.ComponentProps) {
  const { user, selectedShop, globalCategories } = loaderData;
  const errors: FormErrors = actionData?.errors || {};

  return (
    <UserProvider user={user}>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        
        {/* BACK BUTTON */}
        <div className="mb-6">
            <Link to="/personal-listing">
                <Button variant="outline" className="text-gray-600 hover:text-gray-900 border-gray-300">
                    <span className="mr-2">←</span> Back to Product List
                </Button>
            </Link>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight mb-6">Create New Product</h1>
        
        {/* Single Column Layout - All forms visible */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: All Form Content */}
          <div className="col-span-12 lg:col-span-9 xl:col-span-10"> 
            <CreateProductForm 
              selectedShop={selectedShop}
              globalCategories={globalCategories}
              errors={errors}
            />
          </div>

          {/* RIGHT COLUMN: Quick Navigation */}
          <div className="col-span-12 lg:col-span-3 xl:col-span-2 lg:sticky lg:top-8 h-fit">
            <div className="space-y-2 p-4 border rounded-lg shadow-md bg-white">
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-gray-700">Quick Navigation</h3>
              <div className="space-y-1">
                <a href="#basic-information" className="block py-1.5 px-2 rounded-md hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-900">
                  1. Basic Information
                </a>
                <a href="#variations" className="block py-1.5 px-2 rounded-md hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-900">
                  2. Variations
                </a>
                <a href="#pricing" className="block py-1.5 px-2 rounded-md hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-900">
                  3. Pricing
                </a>
                <a href="#stock" className="block py-1.5 px-2 rounded-md hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-900">
                  4. Stock
                </a>
              </div>
            </div>
          </div>
          
        </div>
      </div>
  
    </UserProvider>
  );
}