import type { Route } from './+types/seller-create-product';
import SellerSidebarLayout from '~/components/layouts/seller-sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { redirect, data } from "react-router";
import { cleanInput } from '~/clean/clean';
import AxiosInstance from '~/components/axios/Axios';

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
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  // Fetch shops for the form
  try {
    const shopsResponse = await AxiosInstance.get('/customer-shops/');
    const shops = shopsResponse.data.success ? shopsResponse.data.shops : [];
    
    // Auto-select the first shop if available
    const selectedShop = shops.length > 0 ? shops[0] : null;
    
    return data({ 
      user,
      shops: shops,
      selectedShop: selectedShop
    }, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    return data({ 
      user,
      shops: [],
      selectedShop: null
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

  // Get basic product fields
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const quantity = String(formData.get("quantity"));
  const used_for = String(formData.get("used_for"));
  const price = String(formData.get("price"));
  const condition = String(formData.get("condition"));
  const category = String(formData.get("category"));

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

    // Get the first shop automatically
    const shopsResponse = await AxiosInstance.get('/customer-shops/');
    const shops = shopsResponse.data.success ? shopsResponse.data.shops : [];
    
    if (shops.length === 0) {
      return data({ errors: { message: "No shops found. Please create a shop first." } }, { status: 400 });
    }

    const firstShop = shops[0];

    // Prepare payload
    const payload: any = {
      name: name.trim(),
      description: description.trim(),
      quantity: parseInt(quantity),
      used_for: used_for.trim() || "General use",
      price: parseFloat(price),
      condition: condition.trim(),
      shop: firstShop.id, // Automatically use the first shop
      status: "active",
      customer: userId
    };

    // Add category if provided
    if (category.trim()) {
      payload.category = category.trim();
    }

    // Add variants if provided
    if (variant_title.trim() && variant_option_title.trim()) {
      payload.variants = [{
        title: variant_title.trim(),
        options: [{
          title: variant_option_title.trim(),
          quantity: parseInt(variant_option_quantity),
          price: parseFloat(variant_option_price)
        }]
      }];
    }

    console.log("Creating product with payload:", payload);

    // Create FormData for file upload
    const apiFormData = new FormData();
    
    // Append all product data as JSON
    apiFormData.append('data', JSON.stringify(payload));
    
    // Append media files
    media_files.forEach(file => {
      if (file.size > 0) {
        apiFormData.append('media_files', file);
      }
    });

    const response = await AxiosInstance.post('/seller-products/', apiFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    if (response.data.success) {
      console.log("Product created successfully:", response.data);
      return redirect('/seller/product-list', {
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
  quantity?: string;
  price?: string;
  condition?: string;
  shop?: string;
  category?: string;
  variant_title?: string;
  variant_option_title?: string;
  variant_option_quantity?: string;
  variant_option_price?: string;
  [key: string]: string | undefined;
}

export default function CreateProduct({ loaderData, actionData }: Route.ComponentProps) {
  const { user, shops, selectedShop } = loaderData;
  const errors: FormErrors = actionData?.errors || {};

  return (
    <UserProvider user={user}>
      <SellerSidebarLayout>
        <section className='w-full p-6'>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Create Product</h1>
            <Link 
              to="/seller/product-list" 
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Products
            </Link>
          </div>

          {errors.message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{errors.message}</p>
            </div>
          )}

          {/* Selected Shop Info */}
          {selectedShop && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800">Creating Product For:</h3>
              <p className="text-blue-700">Shop: {selectedShop.name}</p>
              {selectedShop.description && (
                <p className="text-blue-600 text-sm mt-1">{selectedShop.description}</p>
              )}
            </div>
          )}
          
          {!selectedShop && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-700">No shops found. Please create a shop first.</p>
              <Link 
                to="/seller/create-shop" 
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mt-2 inline-block"
              >
                Create Shop
              </Link>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow p-6">
            <form method="post" encType="multipart/form-data" className="space-y-6">
              {/* Basic Product Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter product name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition *
                  </label>
                  <select
                    name="condition"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select condition</option>
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                    <option value="Refurbished">Refurbished</option>
                  </select>
                  {errors.condition && <p className="text-red-500 text-sm mt-1">{errors.condition}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter category name"
                  />
                </div>
              </div>

              {/* Used For */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Used For
                </label>
                <input
                  type="text"
                  name="used_for"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What is this product used for?"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product description"
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Media (Images/Videos)
                </label>
                <input
                  type="file"
                  name="media_files"
                  multiple
                  accept="image/*,video/*"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">You can upload multiple images or videos (max 50MB each)</p>
              </div>

              {/* Variants Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Product Variants (Optional)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variant Title
                    </label>
                    <input
                      type="text"
                      name="variant_title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Size, Color"
                    />
                    {errors.variant_title && <p className="text-red-500 text-sm mt-1">{errors.variant_title}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Option Name
                    </label>
                    <input
                      type="text"
                      name="variant_option_title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Small, Red"
                    />
                    {errors.variant_option_title && <p className="text-red-500 text-sm mt-1">{errors.variant_option_title}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Option Quantity
                    </label>
                    <input
                      type="number"
                      name="variant_option_quantity"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    {errors.variant_option_quantity && <p className="text-red-500 text-sm mt-1">{errors.variant_option_quantity}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Option Price
                    </label>
                    <input
                      type="number"
                      name="variant_option_price"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    {errors.variant_option_price && <p className="text-red-500 text-sm mt-1">{errors.variant_option_price}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Link 
                  to="/seller/product-list"
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                  disabled={!selectedShop}
                >
                  {selectedShop ? "Create Product" : "Create Shop First"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </SellerSidebarLayout>
    </UserProvider>
  );
}