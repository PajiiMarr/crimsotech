import type { Route } from './+types/seller-create-product';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { redirect, data } from "react-router";
import { cleanInput } from '~/clean/clean';
import AxiosInstance from '~/components/axios/Axios';
import CreateProductForm from '~/components/customer/seller-create-product-form';
import { useState } from 'react';
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

    const shop = shopsResponse.data.shop

    const selectedShop = shop

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

  console.log('this is a formdata: ', formData)

  // Get basic product fields
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const quantity = String(formData.get("quantity"));
  const used_for = String(formData.get("used_for") || "General use");
  const price = String(formData.get("price"));
  const original_price = String(formData.get("original_price") || "");
  const usage_time = String(formData.get("usage_time") || "");
  const usage_unit = String(formData.get("usage_unit") || "months");

  // Detect if variants/skus are provided in the form; if so, product-level quantity/price can be optional
  const hasVariants = Boolean(formData.get('variants') || formData.get('skus') || Array.from(formData.keys()).some(k => k.startsWith('variant_') || k.startsWith('sku_')));
  console.log('Detected variants/skus in submission:', hasVariants);
  const condition = String(formData.get("condition"));
  const category_admin_id = String(formData.get("category_admin_id") || "");
  const category_admin_name = String(formData.get("category_admin_name") || "");

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

  // Quantity & price validation: If variants/skus are present, product-level price/quantity are optional
  // Use a tolerant sanitizer to handle commas and whitespace (e.g., '1,000')
  const sanitizeNumber = (s: string) => String(s || '').replace(/,/g, '').replace(/[^0-9.\-]/g, '').trim();
  const rawQuantity = sanitizeNumber(quantity);
  const rawPrice = sanitizeNumber(price);
  const rawOriginalPrice = sanitizeNumber(original_price);
  const rawUsageTime = sanitizeNumber(usage_time);
  
  console.log('Quantity (raw):', quantity, '=> sanitized:', rawQuantity);
  console.log('Price (calculated):', price, '=> sanitized:', rawPrice);
  console.log('Original Price:', original_price, '=> sanitized:', rawOriginalPrice);
  console.log('Usage Time:', usage_time, '=> sanitized:', rawUsageTime);

  // Validate original price (required field)
  if (!rawOriginalPrice) {
    errors.original_price = "Original price is required";
  } else if (isNaN(Number(rawOriginalPrice)) || Number(rawOriginalPrice) <= 0) {
    errors.original_price = "Please enter a valid original price";
  }

  // Validate usage time (required field)
  if (!rawUsageTime) {
    errors.usage_time = "Usage time is required";
  } else if (isNaN(Number(rawUsageTime)) || Number(rawUsageTime) < 0) {
    errors.usage_time = "Please enter a valid usage time";
  }

  // Validate calculated price (required for non-variant products)
  if (!hasVariants) {
    if (!rawQuantity) {
      errors.quantity = "Quantity is required";
    } else if (isNaN(Number(rawQuantity)) || Number(rawQuantity) < 0) {
      errors.quantity = "Please enter a valid quantity";
    }

    if (!rawPrice) {
      errors.price = "Calculated price is required";
    } else if (isNaN(Number(rawPrice)) || Number(rawPrice) < 0) {
      errors.price = "Please enter a valid calculated price";
    }
  } else {
    // Variants present: if product-level quantity/price provided, validate; otherwise it's allowed to be empty
    if (rawQuantity && (isNaN(Number(rawQuantity)) || Number(rawQuantity) < 0)) {
      errors.quantity = "Please enter a valid quantity";
    }
    if (rawPrice && (isNaN(Number(rawPrice)) || Number(rawPrice) < 0)) {
      errors.price = "Please enter a valid calculated price";
    }
  }

  if (!condition.trim()) {
    errors.condition = "Condition is required";
  }

  // Validate usage unit
  if (usage_unit && !['months', 'years'].includes(usage_unit)) {
    errors.usage_unit = "Usage unit must be either 'months' or 'years'";
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

  // Validate critical threshold if provided
  if (critical_threshold) {
    const threshold = Number(critical_threshold);
    if (isNaN(threshold) || threshold <= 0) {
      errors.critical_threshold = "Critical threshold must be a positive number";
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
    
    // Append basic fields
    apiFormData.append('name', name.trim());
    apiFormData.append('description', description.trim());
    
    // If variants/skus are present, default product-level quantity/price to 0 when not provided.
    // Use sanitized numeric values so backend receives clean numbers.
    const apiQuantity = (hasVariants && !rawQuantity) ? '0' : (rawQuantity || '0');
    const apiPrice = (hasVariants && !rawPrice) ? '0' : (rawPrice || '0');

    apiFormData.append('quantity', apiQuantity);
    apiFormData.append('used_for', used_for.trim());
    apiFormData.append('price', apiPrice);
    
    // Append new pricing fields
    apiFormData.append('original_price', rawOriginalPrice);
    apiFormData.append('usage_time', rawUsageTime);
    apiFormData.append('usage_unit', usage_unit);
    
    apiFormData.append('condition', condition.trim());
    apiFormData.append('shop', shop_id ?? "");
    apiFormData.append('status', "active");
    apiFormData.append('customer_id', userId);

    // Product-level refundable flag (for non-variant products)
    // Read either key and send both to backend to avoid mismatch
    const refundableValue = String(formData.get('is_refundable') || formData.get('refundable') || 'false');
    apiFormData.append('is_refundable', refundableValue);
    apiFormData.append('refundable', refundableValue);

    // Add category_admin_id if provided and not "none"
    if (category_admin_id.trim() && category_admin_id !== "none") {
      apiFormData.append('category_admin_id', category_admin_id.trim());
    } else if (category_admin_name.trim() && category_admin_name.toLowerCase() !== 'none') {
      // Forward suggested name so backend can create a global Category (shop=None, user=None)
      apiFormData.append('category_admin_name', category_admin_name.trim());
    }

    console.log("Category admin ID:", category_admin_id);
    console.log("Category admin name:", category_admin_name);

    // Append dimension fields if provided
    if (length) apiFormData.append('length', String(length));
    if (width) apiFormData.append('width', String(width));
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
    console.log("Original Price:", rawOriginalPrice);
    console.log("Usage Time:", rawUsageTime);
    console.log("Usage Unit:", usage_unit);

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
  original_price?: string;
  usage_time?: string;
  usage_unit?: string;
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