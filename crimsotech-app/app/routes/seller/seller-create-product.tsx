import type { Route } from './+types/seller-create-product';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { redirect, data } from "react-router";
import { cleanInput } from '~/clean/clean';
import AxiosInstance from '~/components/axios/Axios';
import CreateProductForm from '~/components/customer/seller-create-product-form';
import { useState } from 'react';
import { Button } from '~/components/ui/button';

// --- BACKEND/SERVER FUNCTIONS (UPDATED) ---

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

  let user = (context as any).get(userContext);
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

    const shop = shopsResponse.data.shop

    const selectedShop = shop

    // Fetch global categories
    let globalCategories = [];
    try {
      const categoriesResponse = await AxiosInstance.get('/seller-products/global-categories/');
      if (categoriesResponse.data.success) {
        globalCategories = categoriesResponse.data.categories || [];
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
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const formData = await request.formData();

  console.log('this is a formdata: ', formData)

  // Get basic product fields
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const quantity = String(formData.get("quantity"));
  const used_for = String(formData.get("used_for") || "General use");
  const price = String(formData.get("price"));
  const open_for_swap = String(formData.get('open_for_swap') || 'false');
  const condition = String(formData.get("condition"));
  const category_admin_id = String(formData.get("category_admin_id"));

  // Get dimension fields
  const length = formData.get("length");
  const width = formData.get("width");
  const height = formData.get("height");
  const weight = formData.get("weight");

  // Get critical trigger fields
  const critical_threshold = formData.get("critical_threshold");

  // Get media files
  const media_files = formData.getAll("media_files") as File[];

  // Clean inputs
  cleanInput(name);
  cleanInput(description);
  cleanInput(used_for);
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

  if (!quantity.trim()) {
    errors.quantity = "Quantity is required";
  } else if (isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
    errors.quantity = "Please enter a valid quantity";
  }

  if (open_for_swap !== 'true') {
    // For normal products, price is required and must be > 0
    if (!price.trim()) {
      errors.price = "Price is required";
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      errors.price = "Please enter a valid price";
    }
  } else {
    // For swap-only products, accept price 0 or empty and coerce to '0' when sending
    if (price.trim() && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      errors.price = "Please enter a valid price";
    }
  }

  if (!condition.trim()) {
    errors.condition = "Condition is required";
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
    apiFormData.append('quantity', quantity);
    apiFormData.append('used_for', used_for.trim());
    // If this is a swap-only product, send price='0' for compatibility if no positive price provided
    if (open_for_swap === 'true' && (!price.trim() || parseFloat(price) <= 0)) {
      apiFormData.append('price', '0');
    } else {
      apiFormData.append('price', price);
    }
    apiFormData.append('condition', condition.trim());
    apiFormData.append('shop', shop_id ?? "");
    apiFormData.append('status', "active");
    apiFormData.append('customer_id', userId);

    // Add category_admin_id if provided and not "none"
    if (category_admin_id.trim() && category_admin_id !== "none") {
      apiFormData.append('category_admin_id', category_admin_id.trim());
    }

    // Swap-related fields (optional)
    if (String(formData.get('open_for_swap')) === 'true') {
      apiFormData.append('open_for_swap', 'true');
      apiFormData.append('swap_type', String(formData.get('swap_type') || 'direct_swap'));
      // accepted_categories may be sent as multiple values
      const acceptedCategories = formData.getAll('accepted_categories') || [];
      apiFormData.append('accepted_categories', JSON.stringify(acceptedCategories));
      apiFormData.append('minimum_additional_payment', String(formData.get('minimum_additional_payment') || 0));
      apiFormData.append('maximum_additional_payment', String(formData.get('maximum_additional_payment') || 0));
      apiFormData.append('swap_description', String(formData.get('swap_description') || ''));
    }
    if (height) apiFormData.append('height', String(height));
    if (weight) apiFormData.append('weight', String(weight));

    // Add critical threshold if provided
    if (critical_threshold) {
      apiFormData.append('critical_threshold', String(critical_threshold));
    }

    // Append media files
    media_files.forEach(file => {
      if (file.size > 0) {
        apiFormData.append('media_files', file);
      }
    });

    // Handle variants - collect all variant data
    const variantData: any[] = [];
    
    // Parse all form data to find variant groups and options
    const formDataObj: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('variant_')) {
        formDataObj[key] = value;
      }
    }

    // Extract variant structure from form data
    const variantGroups: Map<string, any> = new Map();
    
    for (const [key, value] of Object.entries(formDataObj)) {
      const groupMatch = key.match(/^variant_group_([^_]+)_title$/);
      if (groupMatch) {
        const groupId = groupMatch[1];
        if (!variantGroups.has(groupId)) {
          variantGroups.set(groupId, {
            title: value,
            options: []
          });
        }
      }

      const optionMatch = key.match(/^variant_group_([^_]+)_option_([^_]+)_(.+)$/);
      if (optionMatch) {
        const groupId = optionMatch[1];
        const optionId = optionMatch[2];
        const field = optionMatch[3];

        if (!variantGroups.has(groupId)) {
          variantGroups.set(groupId, {
            title: '',
            options: []
          });
        }

        const group = variantGroups.get(groupId);
        let option = group.options.find((o: any) => o.id === optionId);
        
        if (!option) {
          option = { id: optionId };
          group.options.push(option);
        }

        option[field] = value;
      }
    }

    // Convert variant groups to array format (we will include ids later when sending to API)
    // Build from the map of parsed groups/options
    // (ids are kept in the map keys and option.id fields)

    // Add variants as structural metadata (no numeric fields; SKUs carry numeric/swap data)
    if (variantGroups.size > 0) {
      // include group and option ids so backend can match uploaded variant images
      const variantsWithIds = Array.from(variantGroups.entries()).map(([groupId, group]) => ({
        id: groupId,
        title: group.title,
        options: group.options.map((option: any) => ({
          id: option.id,
          title: option.title,
        }))
      }));

      apiFormData.append('variants', JSON.stringify(variantsWithIds));
    }

    // Forward SKUs payload from the form if provided (the client sends comprehensive per-SKU fields)
    const skusRaw = formData.get('skus');
    if (skusRaw) {
      apiFormData.append('skus', String(skusRaw));
    }

    // Always include the open_for_swap indicator (can be 'true', 'false', or 'variant_specific')
    apiFormData.append('open_for_swap', String(formData.get('open_for_swap') || 'false'));


    // Handle variant images and per-SKU images by forwarding their original keys
    // variant_image_<groupId>_<optionId> and sku_image_<skuId>
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('variant_image_') || key.startsWith('sku_image_')) {
        const file = value as File;
        if (file && (file as any).size > 0) {
          apiFormData.append(key, file);
        }
      }
    }

    // Append product-level dimensions/weight unit if available
    if (length) apiFormData.append('length', String(length));
    if (width) apiFormData.append('width', String(width));
    if (height) apiFormData.append('height', String(height));
    if (weight) apiFormData.append('weight', String(weight));
    const weightUnitVal = String(formData.get('weight_unit') || 'kg');
    apiFormData.append('weight_unit', weightUnitVal);

    // Handle shipping zones
    const shippingZones: any[] = [];
    const shippingZoneIds = new Set<string>();
    
    for (const [key, value] of formData.entries()) {
      const zoneMatch = key.match(/^shipping_zone_([^_]+)_(.+)$/);
      if (zoneMatch) {
        const zoneId = zoneMatch[1];
        const field = zoneMatch[2];
        
        shippingZoneIds.add(zoneId);
        
        let zone = shippingZones.find(z => z.id === zoneId);
        if (!zone) {
          zone = { id: zoneId };
          shippingZones.push(zone);
        }
        
        zone[field] = value;
      }
    }

    // Format shipping zones for API
    const formattedShippingZones = shippingZones.map(zone => ({
      name: zone.name,
      fee: zone.freeShipping === 'true' ? 0 : parseFloat(zone.fee) || 0,
      free_shipping: zone.freeShipping === 'true'
    }));

    if (formattedShippingZones.length > 0) {
      apiFormData.append('shipping_zones', JSON.stringify(formattedShippingZones));
    }

    console.log("Sending product data to API with user ID:", userId);
    console.log("Category admin ID:", category_admin_id);
    console.log("Variants count:", variantGroups.size);
    console.log("Shipping zones count:", formattedShippingZones.length);

    // Debug: inspect entries in apiFormData before sending to API
    try {
      for (const [k, v] of (apiFormData as any).entries()) {
        const valPreview = (v && typeof v === 'object' && 'name' in v) ? { name: v.name, size: v.size, type: v.type } : String(v).slice(0, 200);
        console.log('apiFormData entry ->', k, valPreview);
      }
    } catch (err) {
      console.log('Failed to iterate apiFormData entries for debug:', err);
    }
    
    // NOTE: Do NOT manually set Content-Type for multipart FormData here — Axios will set the proper boundary header for us.
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

export default function CreateProduct({ loaderData, actionData }: Route.ComponentProps) {
  const { user, selectedShop, globalCategories } = loaderData;
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
              errors={errors}
            />
          </div>
          
        </div>
      </div>
  
    </UserProvider>
  );
}