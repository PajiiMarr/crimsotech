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
  const name = String(formData.get("name") || "");
  const description = String(formData.get("description") || "");
  const condition = String(formData.get("condition") || "");
  const isRefundable = formData.get("is_refundable") === "true";
  const refundDays = parseInt(String(formData.get("refund_days") || "0"));
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

  // Validate condition (now integer 1-5)
  if (!condition || condition === '') {
    errors.condition = "Condition is required";
  } else {
    const conditionNum = parseInt(condition);
    if (isNaN(conditionNum) || conditionNum < 1 || conditionNum > 5) {
      errors.condition = "Condition must be between 1 and 5 (1=Poor, 5=Like New)";
    }
  }

  // Validate refund days if product is refundable
  if (isRefundable) {
    if (refundDays <= 0) {
      errors.refund_days = "Refund days must be greater than 0 for refundable products";
    } else if (refundDays > 365) {
      errors.refund_days = "Refund days cannot exceed 365";
    }
  }

  // Validate media files - require at least 3 images
  const validImageFiles = media_files.filter(file => 
    file.size > 0 && file.type.startsWith('image/')
  );
  
  if (validImageFiles.length < 3) {
    errors.media = "Please upload at least 3 product images";
  }

  // Validate each media file
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
          // Required fields
          if (!variant.title || !variant.title.trim()) {
            errors[`variant_${index}_title`] = "Variant title is required";
          }
          if (!variant.price || variant.price === '' || Number(variant.price) <= 0) {
            errors[`variant_${index}_price`] = "Variant price must be greater than 0";
          }
          if (!variant.quantity || variant.quantity === '' || Number(variant.quantity) <= 0) {
            errors[`variant_${index}_quantity`] = "Variant quantity must be greater than 0";
          }
          
          // SKU validation - optional but if provided, should be valid
          if (variant.sku_code && variant.sku_code.length > 100) {
            errors[`variant_${index}_sku_code`] = "SKU code must be at most 100 characters";
          }
          
          // Weight validation - optional but if provided
          if (variant.weight) {
            const weightNum = Number(variant.weight);
            if (isNaN(weightNum) || weightNum <= 0) {
              errors[`variant_${index}_weight`] = "Weight must be greater than 0 if provided";
            }
          }
          
          // Weight unit validation - only required if weight is provided
          if (variant.weight && !variant.weight_unit) {
            errors[`variant_${index}_weight_unit`] = "Weight unit is required when weight is provided";
          } else if (variant.weight_unit && !['g', 'kg', 'lb', 'oz'].includes(variant.weight_unit)) {
            errors[`variant_${index}_weight_unit`] = "Invalid weight unit";
          }
          
          // Critical trigger validation - optional
          if (variant.critical_trigger) {
            const triggerNum = Number(variant.critical_trigger);
            if (isNaN(triggerNum) || triggerNum < 0) {
              errors[`variant_${index}_critical_trigger`] = "Low stock alert cannot be negative";
            }
          }
          
          // Validate depreciation fields
          if (variant.original_price) {
            const originalPrice = Number(variant.original_price);
            if (isNaN(originalPrice) || originalPrice <= 0) {
              errors[`variant_${index}_original_price`] = "Original price must be greater than 0";
            } else if (variant.price && Number(variant.price) > originalPrice) {
              errors[`variant_${index}_price`] = "Current price cannot be greater than original price";
            }
          }
          
          if (variant.usage_period) {
            const usagePeriod = Number(variant.usage_period);
            if (isNaN(usagePeriod) || usagePeriod < 0) {
              errors[`variant_${index}_usage_period`] = "Usage period cannot be negative";
            } else if (usagePeriod > 1000) {
              errors[`variant_${index}_usage_period`] = "Usage period seems too high";
            }
          }
          
          if (variant.usage_unit && !['weeks', 'months', 'years'].includes(variant.usage_unit)) {
            errors[`variant_${index}_usage_unit`] = "Invalid usage unit";
          }
          
          if (variant.depreciation_rate) {
            const rateNum = Number(variant.depreciation_rate);
            if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
              errors[`variant_${index}_depreciation_rate`] = "Depreciation rate must be between 0 and 100";
            }
          }
          
          // Validate compare price if provided
          if (variant.compare_price) {
            const comparePrice = Number(variant.compare_price);
            if (isNaN(comparePrice) || comparePrice < 0) {
              errors[`variant_${index}_compare_price`] = "Compare price must be greater than or equal to 0";
            } else if (variant.price && comparePrice < Number(variant.price)) {
              errors[`variant_${index}_compare_price`] = "Compare price should be higher than regular price";
            }
          }
          
          // Validate swap fields if allow_swap is true
          if (variant.allow_swap) {
            if (!variant.swap_type || !['direct_swap', 'swap_plus_payment'].includes(variant.swap_type)) {
              errors[`variant_${index}_swap_type`] = "Swap type is required when swap is allowed";
            }
            
            if (variant.swap_type === 'swap_plus_payment') {
              if (variant.minimum_additional_payment) {
                const minPayment = Number(variant.minimum_additional_payment);
                if (isNaN(minPayment) || minPayment < 0) {
                  errors[`variant_${index}_minimum_additional_payment`] = "Minimum additional payment must be 0 or greater";
                }
              }
              
              if (variant.maximum_additional_payment) {
                const maxPayment = Number(variant.maximum_additional_payment);
                if (isNaN(maxPayment) || maxPayment < 0) {
                  errors[`variant_${index}_maximum_additional_payment`] = "Maximum additional payment must be 0 or greater";
                }
              }
              
              if (variant.minimum_additional_payment && variant.maximum_additional_payment) {
                if (Number(variant.minimum_additional_payment) > Number(variant.maximum_additional_payment)) {
                  errors[`variant_${index}_payment_range`] = "Minimum payment cannot be greater than maximum payment";
                }
              }
            }
          }
          
          // Validate purchase date
          if (variant.purchase_date) {
            const purchaseDate = new Date(variant.purchase_date);
            if (isNaN(purchaseDate.getTime())) {
              errors[`variant_${index}_purchase_date`] = "Invalid purchase date";
            } else if (purchaseDate > new Date()) {
              errors[`variant_${index}_purchase_date`] = "Purchase date cannot be in the future";
            }
          }
        });
      }
    } catch (e) {
      console.error("Error parsing variants:", e);
      errors.variants = "Invalid variants format";
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
    apiFormData.append('condition', condition.trim()); // Now sending integer 1-5
    apiFormData.append('shop', shop_id ?? "");
    apiFormData.append('is_refundable', String(isRefundable));
    apiFormData.append('refund_days', String(refundDays));
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
      
      // Ensure each variant has required fields and proper types
      const processedVariants = variants.map((v: any) => ({
        ...v,
        price: v.price ? Number(v.price) : null,
        compare_price: v.compare_price ? Number(v.compare_price) : null,
        quantity: v.quantity ? Number(v.quantity) : 0,
        weight: v.weight ? Number(v.weight) : null,
        critical_trigger: v.critical_trigger ? Number(v.critical_trigger) : null,
        original_price: v.original_price ? Number(v.original_price) : null,
        usage_period: v.usage_period ? Number(v.usage_period) : null,
        depreciation_rate: v.depreciation_rate ? Number(v.depreciation_rate) : null,
        minimum_additional_payment: v.minimum_additional_payment ? Number(v.minimum_additional_payment) : 0,
        maximum_additional_payment: v.maximum_additional_payment ? Number(v.maximum_additional_payment) : 0,
        is_active: v.is_active !== false,
        is_refundable: v.refundable !== undefined ? v.refundable : isRefundable,
        allow_swap: v.allow_swap || false,
      }));
      
      apiFormData.append('variants', JSON.stringify(processedVariants));
    }

    // Handle variant images and proof images
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('variant_image_')) {
        const file = value as File;
        if (file && file.size > 0) {
          apiFormData.append(key, file);
        }
      }
      // Add support for proof_image field
      if (key.startsWith('proof_image_')) {
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
    } else if (error.message) {
      errorMessage = error.message;
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
  upload_status?: string;
  is_refundable?: string;
  refund_days?: string;
  shop?: string;
  category_admin_id?: string;
  variants?: string;
  media?: string;
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