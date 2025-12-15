// app/routes/home.tsx
import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { useState } from "react"
import { Search, X } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { useNavigate } from 'react-router'
import AxiosInstance from '~/components/axios/Axios'
// ----------------------------
// Meta
// ----------------------------
export function meta(): Route.MetaDescriptors {
  return [{ title: "Home" }]
}

// ----------------------------
// Product type
// ----------------------------
interface Product {
  id: string
  name: string
  description: string
  price: number
  media_files?: Array<{
    id: string
    file_data: string
    file_type: string
    product: string
  }>
  primary_image?: {
    id: string
    url: string
    file_type: string
  } | null
  shop?: {
    id: string
    name: string
    shop_picture: string | null
    address: string
    avg_rating: number
  }
  condition?: string
  created_at?: string
  updated_at?: string
  quantity?: number
  used_for?: string
  status?: string
  upload_status?: string
  customer?: string
  category_admin?: any
  category?: any
  variants?: any[]
  discount?: number
}

// ----------------------------
// Category type
// ----------------------------
interface Category {
  id: string
  name: string
  shop: any
  user: {
    id: string
    username: string
  } | null
}

// ----------------------------
// Compact Search Bar Component
// ----------------------------
const CompactSearchBar = ({ 
  searchTerm, 
  setSearchTerm 
}: { 
  searchTerm: string
  setSearchTerm: (term: string) => void 
}) => {
  return (
    <div className="mb-4">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 h-8 text-sm border-gray-300 rounded-md"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ----------------------------
// Get image URL helper
// ----------------------------
const getImageUrl = (url: string | null | undefined): string => {
  const baseUrl = import.meta.env.VITE_MEDIA_URL || 'http://127.0.0.1:8000';
  
  if (!url) {
    return '../../../public/crimsonity.png';
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('/media/')) {
    return `${baseUrl}${url}`;
  }
  
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  
  return `${baseUrl}/media/${url}`;
}

// ----------------------------
// Get product image helper
// ----------------------------
const getProductImage = (product: Product): string => {
  if (product.primary_image?.url) {
    return getImageUrl(product.primary_image.url);
  }
  
  if (product.media_files && product.media_files.length > 0) {
    return getImageUrl(product.media_files[0].file_data);
  }
  
  if (product.shop?.shop_picture) {
    return getImageUrl(product.shop.shop_picture);
  }
  
  return '/crimsonity.png';
}

// ----------------------------
// Compact Product Card
// ----------------------------
const CompactProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col"
    >
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px]">
          {product.name}
        </h3>
        
        {product.shop?.name && (
          <p className="text-[10px] text-gray-500 truncate mb-1">
            {product.shop.name}
          </p>
        )}
        
        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">
              ₱{product.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------
// Loader - ALL REQUESTS HERE
// ----------------------------
export async function loader({ request, context }: Route.LoaderArgs) {
  const { fetchUserRole } = await import("~/middleware/role.server")
  const { requireRole } = await import("~/middleware/role-require.server");
  const { userContext } = await import("~/contexts/user-role")

  // Get user from context or fetch
  let user = context.get(userContext)
  if (!user) {
    user = await fetchUserRole({ request, context })
  }

  // Only allow customers
  await requireRole(request, context, ["isCustomer"])

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const userId = session.get('userId')

  console.log(userId)

  console.log(userId)

  const productsResponse = await AxiosInstance(`/public-products/`, {
    headers: {
      'X-User-Id': userId,
      'Content-Type': 'application/json',
    },
  });

  let products: Product[] = [];
  if (productsResponse.status === 200) {
    const productsData = productsResponse.data;
    products = productsData.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: parseFloat(p.price),
      media_files: p.media_files,
      primary_image: p.primary_image,
      shop: p.shop,
      condition: p.condition,
      created_at: p.created_at,
      updated_at: p.updated_at,
      quantity: p.quantity,
      used_for: p.used_for,
      status: p.status,
      upload_status: p.upload_status,
      customer: p.customer,
      category_admin: p.category_admin,
      category: p.category,
      variants: p.variants,
      discount: 0,
    }));
  }

  // Fetch categories
  const categoriesResponse = await AxiosInstance(`/customer-products/global-categories/`);
  let categories: Category[] = [];
  const categoriesData = await categoriesResponse.data;
  categories = categoriesData.categories || [];

  return {
    user,
    products,
    categories,
  };
}

// ----------------------------
// Home Component - NO API CALLS
// ----------------------------
export default function Home({ loaderData }: any) {
  const { user, products, categories } = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Filter products locally
  const filteredProducts: Product[] = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className="w-full p-3">
          <CompactSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

          <h2 className="mb-2 text-sm font-semibold text-gray-700">Categories</h2>
          <div className="flex gap-2 overflow-x-auto py-1 mb-4">
            {categories.map((cat: Category) => (
              <div 
                key={cat.id} 
                onClick={() => navigate(`/category/${cat.id}`)}
                className="flex-shrink-0 w-16 text-center cursor-pointer"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    {cat.name.charAt(0)}
                  </span>
                </div>
                <span className="text-xs text-gray-600 truncate block">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>

          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {searchTerm ? `Results for "${searchTerm}"` : "Suggested For You"}
            <span className="ml-1 text-xs text-gray-500">
              ({filteredProducts.length})
            </span>
          </h2>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <CompactProductCard 
                  key={product.id} 
                  product={product} 
                />
              ))
            ) : (
              <div className="col-span-full text-center py-6">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  {searchTerm ? `No results for "${searchTerm}"` : "No products available"}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </SidebarLayout>
    </UserProvider>
  )
}