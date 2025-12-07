// app/routes/home.tsx
import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import SearchForm from '~/components/customer/search-bar'
import { ProductCard } from '~/components/customer/product-card'
import { ProductCategory } from '~/components/customer/product-category'
import { UserProvider } from '~/components/providers/user-role-provider'
import { useState, useEffect } from "react"
import AxiosInstance from "~/components/axios/Axios"
import { Search, X } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { useNavigate } from 'react-router'

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
    // ... other shop properties
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
// Compact Search Bar Component - LEFT ALIGNED
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
    return '/default-product.jpg';
  }
  
  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it starts with /media/, prepend base URL
  if (url.startsWith('/media/')) {
    return `${baseUrl}${url}`;
  }
  
  // If it starts with just /, prepend base URL
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  
  // If it's just a filename, prepend media path
  return `${baseUrl}/media/${url}`;
}

// ----------------------------
// Get product image helper
// ----------------------------
const getProductImage = (product: Product): string => {
  // Priority 1: Use primary_image if available
  if (product.primary_image?.url) {
    return getImageUrl(product.primary_image.url);
  }
  
  // Priority 2: Use first media file if available
  if (product.media_files && product.media_files.length > 0) {
    return getImageUrl(product.media_files[0].file_data);
  }
  
  // Priority 3: Use shop picture
  if (product.shop?.shop_picture) {
    return getImageUrl(product.shop.shop_picture);
  }
  
  // Fallback to default image
  return '/default-product.jpg';
}

// ----------------------------
// Get product gallery images
// ----------------------------
const getProductGalleryImages = (product: Product): string[] => {
  const images: string[] = [];
  
  // Add primary image first if available
  if (product.primary_image?.url) {
    images.push(getImageUrl(product.primary_image.url));
  }
  
  // Add all media files
  if (product.media_files && product.media_files.length > 0) {
    product.media_files.forEach(media => {
      const url = getImageUrl(media.file_data);
      // Avoid duplicates if primary image is also in media_files
      if (!images.includes(url)) {
        images.push(url);
      }
    });
  }
  
  // If no images found, add default
  if (images.length === 0) {
    images.push('/default-product.jpg');
  }
  
  return images;
}

// ----------------------------
// Loader
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

  return user
}

// ----------------------------
// Compact Product Card
// ----------------------------
const CompactProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // This ensures clicking the card navigates to product details
    navigate(`/product/${product.id}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col"
    >
      {/* Image - Compact */}
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Content - Minimal */}
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
// Home Component
// ----------------------------
export default function Home({ loaderData }: any) {
  const user = loaderData
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const navigate = useNavigate()

  // ----------------------------
  // Fetch Categories
  // ----------------------------
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await AxiosInstance.get("/customer-products/global-categories/")
        setCategories(response.data.categories)
      } catch (err) {
        console.error("Error loading categories:", err)
      }
    }

    fetchCategories()
  }, [])

  // ----------------------------
  // Fetch Products
  // ----------------------------
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await AxiosInstance.get("/public-products/")

        // Map the API response to Product type
        const mappedProducts: Product[] = response.data.map((p: any) => {
          // Get the image URL first
          const imageUrl = getProductImage(p);
          
          return {
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
            // Add the image property
            image: imageUrl,
            // Also add galleryImages if needed
            galleryImages: getProductGalleryImages(p),
            discount: 0,
          }
        })

        setProducts(mappedProducts)
      } catch (err) {
        console.error("Error fetching products:", err)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // ----------------------------
  // Filter products
  // ----------------------------
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <section className="w-full p-3">
            {/* Compact Search bar - LEFT ALIGNED */}
            <div className="mb-4">
              <CompactSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            </div>

            {/* Categories - More Compact */}
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Categories</h2>
            <div className="flex gap-2 overflow-x-auto py-1 mb-4">
              {categories.map(cat => (
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

            {/* Products Grid - More Dense */}
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
        )}
      </SidebarLayout>
    </UserProvider>
  )
}