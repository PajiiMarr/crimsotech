// app/routes/home.tsx
import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import SearchForm from '~/components/customer/search-bar'
import { ProductCard } from '~/components/customer/product-card'
import { ProductCategory } from '~/components/customer/product-category'
import { UserProvider } from '~/components/providers/user-role-provider'
import { useState, useEffect } from "react"
import AxiosInstance from "~/components/axios/Axios"

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
// Get image URL helper
// ----------------------------
// Update the getImageUrl function to better handle different URL formats:

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
// Home Component
// ----------------------------
export default function Home({ loaderData }: any) {
  const user = loaderData
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

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
        // In home.tsx, update the product mapping section:

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
          <div className="p-6 text-center text-gray-500">Loading products...</div>
        ) : (
          <section className="w-full p-4">
            {/* Search bar */}
            <div className="mb-6">
              <SearchForm />
            </div>

            {/* Categories */}
            <h2 className="mb-4 text-lg font-semibold text-gray-700">Categories</h2>
            <div className="flex gap-4 overflow-x-auto py-2 px-1">
              {categories.map(cat => (
                <ProductCategory 
                  key={cat.id} 
                  title={cat.name} 
                  image="/default-category.jpg" // You might want to update this if categories have images
                />
              ))}
            </div>

            {/* Suggested Products */}
            <h2 className="mt-5 mb-4 text-lg font-semibold text-gray-700">Suggested For You</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 px-2">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={{
                      ...product,
                      // Ensure image is properly formatted
                      image: getProductImage(product),
                    }} 
                  />
                ))
              ) : (
                <div className="text-gray-500 col-span-full text-center py-8">
                  No products found.
                </div>
              )}
            </div>
          </section>
        )}
      </SidebarLayout>
    </UserProvider>
  )
}