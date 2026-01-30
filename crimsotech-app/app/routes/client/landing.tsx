import type { Route } from './+types/landing';
import { Header } from '~/components/client/header';
import { HeroParallax } from '~/components/ui/hero-parallax';
import AxiosInstance from '~/components/axios/Axios';

// Define interfaces for the API response
interface CategoryData {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  shop_id?: string | null;
  user_id?: string | null;
}

interface ProductData {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_price?: number | null;
  shop_name: string;
  shop_id: string | null;
  category_id?: string | null;
  category_name?: string | null;
  image_url: string | null;
  created_at?: string;
}

interface ShopData {
  id: string;
  name: string;
  description: string;
  follower_count: number;
  active_product_count?: number;
  total_sales: number;
  city: string;
  verified?: boolean;
  status?: string;
}

interface StatsData {
  products_count: number;
  shops_count: number;
  boosted_count: number;
  avg_rating: number;
}

interface HeroProduct {
  title: string;
  link: string;
  thumbnail?: string;
  description: string;
}

interface TrustBadge {
  title: string;
  description: string;
  icon: string;
}

interface LandingData {
  stats: StatsData;
  categories: CategoryData[];
  featured_products: ProductData[];
  trending_shops: ShopData[];
  ui_data: {
    hero_products: HeroProduct[];
    trust_badges: TrustBadge[];
  };
}

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "CrimsoTech Marketplace",
      description: "Discover, buy, and sell products. Connect with shops, find deals, and boost your products."
    }
  ]
}

export async function loader() {
  try {
    const response = await AxiosInstance.get('/landing/');
    const landingData: LandingData = response.data;
    
    // Transform featured products for HeroParallax component
    const heroProducts = landingData.featured_products.map((product, index) => ({
      title: product.title,
      link: `/products/${product.id}`,
      thumbnail: product.image_url || getProductImage(index),
      description: product.description
    }));

    // If we don't have enough featured products, supplement with hero sections
    if (heroProducts.length < 5 && landingData.ui_data.hero_products.length > 0) {
      landingData.ui_data.hero_products.forEach((heroSection, index) => {
        if (heroProducts.length < 8) {
          heroProducts.push({
            title: heroSection.title,
            link: heroSection.link,
            thumbnail: getHeroSectionImage(heroSection.title),
            description: heroSection.description
          });
        }
      });
    }

    return {
      stats: landingData.stats,
      categories: landingData.categories,
      featuredProducts: landingData.featured_products,
      trendingShops: landingData.trending_shops,
      heroProducts: heroProducts,
      uiData: landingData.ui_data
    };
  } catch (error) {
    console.error('Error fetching landing page data:', error);
    
    // Minimal fallback data
    return {
      stats: {
        products_count: 0,
        shops_count: 0,
        boosted_count: 0,
        avg_rating: 4.8
      },
      categories: [],
      featuredProducts: [],
      trendingShops: [],
      heroProducts: getFallbackHeroProducts(),
      uiData: {
        hero_products: [],
        trust_badges: []
      }
    };
  }
}

// Helper function to get appropriate Unsplash images for products
function getProductImage(index: number): string {
  const images = [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2058&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2065&auto=format&fit=crop"
  ];
  return images[index % images.length];
}

// Helper function to get images for hero sections
function getHeroSectionImage(title: string): string {
  const imageMap: Record<string, string> = {
    'Trending Shops': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
    'Boosted Products': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop',
    'Best Deals': 'https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=2070&auto=format&fit=crop',
    'New Arrivals': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
    'Top Rated': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=2070&auto=format&fit=crop',
    'Verified Stores': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop'
  };
  
  return imageMap[title] || getProductImage(Math.floor(Math.random() * 10));
}

// Fallback hero products for when API fails
function getFallbackHeroProducts() {
  return [
    {
      title: "Welcome to Marketplace",
      link: "/products",
      thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
      description: "Discover amazing products"
    },
    {
      title: "Start Shopping",
      link: "/categories",
      thumbnail: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
      description: "Browse all categories"
    },
    {
      title: "Join Our Community",
      link: "/register",
      thumbnail: "https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=2070&auto=format&fit=crop",
      description: "Create your account today"
    }
  ];
}

export default function LandingPage({ loaderData }: { loaderData: any }) {
  const {
    stats,
    categories,
    heroProducts,
    uiData,
    featuredProducts,
    trendingShops
  } = loaderData;

  // Format numbers for display
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M+`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k+`;
    return count > 0 ? `${count}+` : '0';
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="min-h-svh flex flex-col">
      <Header />
      <HeroParallax products={heroProducts} />
      
      {/* Value Proposition Section */}
      <section className="px-4 my-5 bg-gradient-to-b from-transparent to-orange-100/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-orange-900 mb-4">
              Discover. Buy. Boost. Earn.
            </h2>
            <p className="text-xl text-orange-700 max-w-3xl mx-auto">
              A marketplace built for sellers and smart buyers
            </p>
          </div>
          
          {/* Marketplace Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl font-bold text-orange-600">
                {formatCount(stats.products_count)}
              </div>
              <p className="text-orange-700 mt-2">Products Listed</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl font-bold text-orange-600">
                {formatCount(stats.shops_count)}
              </div>
              <p className="text-orange-700 mt-2">Active Shops</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl font-bold text-orange-600">
                {formatCount(stats.boosted_count)}
              </div>
              <p className="text-orange-700 mt-2">Boosted Products</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl font-bold text-orange-600">
                {stats.avg_rating.toFixed(1)}★
              </div>
              <p className="text-orange-700 mt-2">Average Rating</p>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <a 
              href="/products" 
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-300"
            >
              Browse Products
            </a>
            <a 
              href="/shops" 
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-amber-300"
            >
              Explore Shops
            </a>
            <a 
              href="/sell" 
              className="px-8 py-3 bg-white hover:bg-orange-50 text-orange-700 font-semibold rounded-full transition-all duration-300 transform hover:scale-105 border-2 border-orange-300 hover:border-orange-400"
            >
              Start Selling
            </a>
          </div>
          
          {/* Featured Products Preview */}
          {featuredProducts.length > 0 && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-orange-900 mb-6 text-center">New Arrivals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {featuredProducts.slice(0, 5).map((product: ProductData) => (
                  <a
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="bg-white rounded-lg border border-orange-200 p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="h-40 bg-orange-100 rounded-md mb-3 flex items-center justify-center">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.title}
                          className="h-full w-full object-cover rounded-md"
                        />
                      ) : (
                        <span className="text-orange-400">No image</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-orange-900 truncate">{product.title}</h4>
                    <p className="text-orange-600 font-bold">{formatPrice(product.price)}</p>
                    <p className="text-sm text-orange-700 truncate">{product.shop_name}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      
      {/* Quick Categories */}
      <section className="py-12 px-4 bg-orange-50/50">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-2xl font-bold text-orange-900 mb-6 text-center">Popular Categories</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.length > 0 ? (
              categories.slice(0, 10).map((category: CategoryData) => (
                <a
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="px-4 py-2 bg-white hover:bg-orange-100 text-orange-700 hover:text-orange-900 rounded-full transition-all duration-300 border border-orange-200 hover:border-orange-400 hover:shadow-md"
                >
                  {category.name} ({formatCount(category.product_count)})
                </a>
              ))
            ) : (
              <p className="text-orange-600 text-center w-full">
                No categories available yet. Check back soon!
              </p>
            )}
          </div>
        </div>
      </section>
      
      {/* Trending Shops */}
      {trendingShops.length > 0 && (
        <section className="py-12 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <h3 className="text-2xl font-bold text-orange-900 mb-6 text-center">Trending Shops</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {trendingShops.slice(0, 5).map((shop: ShopData) => (
                <a
                  key={shop.id}
                  href={`/shops/${shop.id}`}
                  className="bg-orange-50 rounded-xl border border-orange-200 p-5 hover:shadow-lg transition-all hover:border-orange-300"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-orange-600 font-bold text-lg">
                        {shop.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-orange-900">{shop.name}</h4>
                      <p className="text-sm text-orange-600">{shop.city}</p>
                    </div>
                  </div>
                  <p className="text-orange-700 text-sm mb-3 line-clamp-2">
                    {shop.description || `Shop in ${shop.city}`}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">
                      {formatCount(shop.follower_count)} followers
                    </span>
                    {shop.verified && (
                      <span className="text-green-600 font-semibold">✓ Verified</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Trust & Safety Section */}
      <section className="py-12 px-4 bg-orange-50/30">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-2xl font-bold text-orange-900 mb-8 text-center">Why Choose Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {uiData.trust_badges.length > 0 ? (
              uiData.trust_badges.map((badge: TrustBadge, index: number) => (
                <div key={index} className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-orange-600 text-2xl">{badge.icon}</span>
                  </div>
                  <h4 className="text-lg font-semibold text-orange-900 mb-2">{badge.title}</h4>
                  <p className="text-orange-700">{badge.description}</p>
                </div>
              ))
            ) : (
              <>
                <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-sm">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-orange-600 text-2xl">✓</span>
                  </div>
                  <h4 className="text-lg font-semibold text-orange-900 mb-2">Secure Platform</h4>
                  <p className="text-orange-700">Your safety is our top priority</p>
                </div>
                <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-sm">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-orange-600 text-2xl">🛡️</span>
                  </div>
                  <h4 className="text-lg font-semibold text-orange-900 mb-2">Quality Products</h4>
                  <p className="text-orange-700">All items are carefully vetted</p>
                </div>
                <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-sm">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-orange-600 text-2xl">🚚</span>
                  </div>
                  <h4 className="text-lg font-semibold text-orange-900 mb-2">Fast Delivery</h4>
                  <p className="text-orange-700">Reliable shipping options</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 bg-orange-900 text-orange-100 mt-auto">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-orange-200 text-xl font-semibold mb-2">
              CrimsoTech Marketplace
            </p>
            <p className="text-orange-300">
              © 2024 CrimsoTech Marketplace. All rights reserved.
            </p>
            <p className="text-orange-300 text-sm mt-2">
              Secure payments • Verified shops • 24/7 support
            </p>
            <div className="mt-4 flex justify-center gap-6">
              <a href="/about" className="text-orange-200 hover:text-white transition-colors">About</a>
              <a href="/contact" className="text-orange-200 hover:text-white transition-colors">Contact</a>
              <a href="/privacy" className="text-orange-200 hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="text-orange-200 hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}