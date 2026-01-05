import type { Route } from './+types/customer-create-gift';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link } from "react-router";
import { redirect, data } from "react-router";
import { cleanInput } from '~/clean/clean';
import AxiosInstance from '~/components/axios/Axios';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import CreateGiftForm from '~/components/customer/customer-create-gift-form';

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

  // Fetch global categories for the form
  let globalCategories = [];
  try {
    const categoriesResponse = await AxiosInstance.get('/customer-gift/global-categories/');
    if (categoriesResponse.data && categoriesResponse.data.success) {
      globalCategories = categoriesResponse.data.categories || [];
    }
  } catch (err) {
    console.error('Failed to fetch categories for customer gift form:', err);
  }

  return data({ user, globalCategories }, { headers: { "Set-Cookie": await commitSession(session) } });
}

export async function action({ request }: Route.ActionArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const formData = await request.formData();

  // Basic fields
  const name = String(formData.get('name') || '');
  const description = String(formData.get('description') || '');
  const quantity = String(formData.get('quantity') || '0');
  const used_for = String(formData.get('used_for') || 'General use');
  const condition = String(formData.get('condition') || '');
  const category_admin_id = String(formData.get('category_admin_id') || '');

  // Validate
  const errors: Record<string, string> = {};
  cleanInput(name);
  cleanInput(description);

  if (!name.trim()) errors.name = 'Gift name is required';
  if (!description.trim()) errors.description = 'Description is required';
  if (!quantity.trim() || isNaN(parseInt(quantity)) || parseInt(quantity) < 0) errors.quantity = 'Please enter a valid quantity';
  if (!condition.trim()) errors.condition = 'Condition is required';

  // Validate media files
  const media_files = formData.getAll('media_files') as File[];
  media_files.forEach((file, idx) => {
    if (file && (file as any).size > 0) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
      if (!validTypes.includes((file as any).type)) {
        errors[`media_${idx}`] = 'Please upload images or MP4 videos only';
      }
    }
  });

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  try {
    const userId = session.get('userId');
    if (!userId) return data({ errors: { message: 'User not authenticated' } }, { status: 401 });

    // Build API form data for customer product (gift)
    const apiFormData = new FormData();
    apiFormData.append('name', name.trim());
    apiFormData.append('description', description.trim());
    apiFormData.append('quantity', quantity);
    apiFormData.append('used_for', used_for.trim());
    apiFormData.append('price', '0'); // gifts are zero-priced
    apiFormData.append('condition', condition.trim());
    apiFormData.append('status', 'active');
    apiFormData.append('customer_id', userId);

    if (category_admin_id && category_admin_id !== 'none') apiFormData.append('category_admin_id', category_admin_id);

    // append media
    media_files.forEach(file => {
      if (file && (file as any).size > 0) apiFormData.append('media_files', file);
    });

    // Forward skus/variants payloads if present
    const variantsRaw = formData.get('variants');
    if (variantsRaw) apiFormData.append('variants', String(variantsRaw));
    const skusRaw = formData.get('skus');
    if (skusRaw) apiFormData.append('skus', String(skusRaw));

    // Append variant and sku images forwarded from form
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('variant_image_') || key.startsWith('sku_image_')) {
        const file = value as File;
        if (file && (file as any).size > 0) apiFormData.append(key, file);
      }
    }

    // Append other optional fields
    const length = formData.get('length');
    const width = formData.get('width');
    const height = formData.get('height');
    const weight = formData.get('weight');
    if (length) apiFormData.append('length', String(length));
    if (width) apiFormData.append('width', String(width));
    if (height) apiFormData.append('height', String(height));
    if (weight) apiFormData.append('weight', String(weight));

    const response = await AxiosInstance.post('/customer-gift/create_gift/', apiFormData);

    if (response.data && response.data.success) {
      return redirect('/comgift', { headers: { 'Set-Cookie': await commitSession(session) } });
    } else {
      throw new Error(response.data.message || 'Gift creation failed');
    }
  } catch (err: any) {
    console.error('Customer gift creation failed:', err.response?.data || err.message);
    let message = 'Gift creation failed';
    if (err.response?.data) {
      const apiErrors = err.response.data;
      if (typeof apiErrors === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach(k => {
          if (Array.isArray(apiErrors[k]) && apiErrors[k].length > 0) fieldErrors[k] = apiErrors[k][0];
          else fieldErrors[k] = apiErrors[k];
        });
        return data({ errors: fieldErrors }, { status: 400 });
      } else if (typeof apiErrors === 'string') {
        message = apiErrors;
      }
    }

    return data({ errors: { message } }, { status: 500 });
  }
}



export default function CustomerCreateGift({ loaderData }: Route.ComponentProps) {
  const { user, globalCategories } = loaderData;

  return (
    <UserProvider user={user}>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
         {/* BACK BUTTON */}
        <div className="">
            <Link to="/comgift">
                <Button variant="outline" className="text-gray-600 hover:text-gray-900 border-gray-300">
                    <span className="mr-2">←</span> Back to Product List
                </Button>
            </Link>
        </div>
        <div className="">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Gift Your Electronics</h1>
            <p className="text-sm text-gray-500">Create a free gift listing (no shop required)</p>
          </div>

          {/* Create Gift Form */}
          <div className="bg-white rounded-md p-4 shadow-sm">
            <CreateGiftForm globalCategories={globalCategories} errors={{}} />
          </div>
        </div>
      </div>
    </UserProvider>
  );
}