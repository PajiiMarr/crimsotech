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
  media_files?: { file_url: string }[]
  shop?: { shop_picture?: string }
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

        const mappedProducts = response.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: parseFloat(p.price),
          image: p.shop?.shop_picture || "/default.jpg",
          discount: p.discount,
        }))

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
                  image="/public/default-category.jpg"
                />
              ))}
            </div>

            {/* Suggested Products */}
            <h2 className="mt-5 mb-4 text-lg font-semibold text-gray-700">Suggested For You</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 px-2">

              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
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
