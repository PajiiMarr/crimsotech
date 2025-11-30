import type { Route } from './+types/seller-product-list'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
import SearchForm from '~/components/customer/search-bar'
import { ProductCard } from '~/components/customer/product-card'
import { ProductCategory } from '~/components/customer/product-category'
import { TopProductCard } from '~/components/customer/top-product'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useNavigate, Link } from "react-router";
import AxiosInstance from '~/components/axios/Axios';
import { useEffect, useState } from 'react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Product-list",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
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

  return user;
}

export default function ProductList({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await AxiosInstance.get('/seller-products/');
      if (response.data.success) {
        setProducts(response.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  return (
    <UserProvider user={user}>
      <SellerSidebarLayout>
        <section className='w-full p-6'>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Seller Products</h1>
            <Link 
              to="/seller/seller-create-product" 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create Product
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2 text-left">Quantity</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Condition</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => (
                  <tr key={product.id} className="border-b">
                    <td className="px-4 py-2">{product.name}</td>
                    <td className="px-4 py-2">{product.description}</td>
                    <td className="px-4 py-2">${product.price}</td>
                    <td className="px-4 py-2">{product.quantity}</td>
                    <td className="px-4 py-2">{product.status}</td>
                    <td className="px-4 py-2">{product.condition}</td>
                    <td className="px-4 py-2">
                      <button className="text-blue-500 hover:text-blue-700 mr-2">
                        Edit
                      </button>
                      <button className="text-red-500 hover:text-red-700">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {products.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No products found. Create your first product!
              </div>
            )}
          </div>
        </section>
      </SellerSidebarLayout>
    </UserProvider>
  )
}