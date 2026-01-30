import type { Route } from './+types/landing';
import { Header } from '~/components/client/header';
import { HeroParallax } from '~/components/ui/hero-parallax';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "CrimsoTech Marketplace",
      description: "Dipscover, buy, and sell products. Connect with shops, find deals, and boost your products."
    }
  ]
}

export default function LandingPage() {
  return (
    <div className="min-h-svh flex flex-col">
      <Header />
      <HeroParallax products={products} />
      
      {/* Value Proposition Section */}
      <section className=" px-4 bg-gradient-to-b from-transparent to-orange-100/30">
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
              <div className="text-3xl font-bold text-orange-600">10,000+</div>
              <p className="text-orange-700 mt-2">Products Listed</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl font-bold text-orange-600">500+</div>
              <p className="text-orange-700 mt-2">Active Shops</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl font-bold text-orange-600">2,000+</div>
              <p className="text-orange-700 mt-2">Boosted Products</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl font-bold text-orange-600">4.8★</div>
              <p className="text-orange-700 mt-2">Average Rating</p>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
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
        </div>
      </section>
      
      {/* Quick Categories */}
      <section className="py-12 px-4 bg-orange-50/50">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-2xl font-bold text-orange-900 mb-6 text-center">Popular Categories</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`/category/${category.slug}`}
                className="px-4 py-2 bg-white hover:bg-orange-100 text-orange-700 hover:text-orange-900 rounded-full transition-all duration-300 border border-orange-200 hover:border-orange-400 hover:shadow-md"
              >
                {category.name}
              </a>
            ))}
          </div>
        </div>
      </section>
      
      {/* Trust & Safety Section */}
      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 text-xl">✓</span>
              </div>
              <h4 className="text-lg font-semibold text-orange-900 mb-2">Verified Shops</h4>
              <p className="text-orange-700">All shops undergo verification process</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 text-xl">🛡️</span>
              </div>
              <h4 className="text-lg font-semibold text-orange-900 mb-2">Secure Payments</h4>
              <p className="text-orange-700">Protected transactions with refund options</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 text-xl">🚚</span>
              </div>
              <h4 className="text-lg font-semibold text-orange-900 mb-2">Verified Riders</h4>
              <p className="text-orange-700">Background-checked delivery partners</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 bg-orange-900 text-orange-100">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-orange-200">
            © 2024 CrimsoTech Marketplace. All rights reserved.
          </p>
          <p className="text-orange-300 text-sm mt-2">
            Secure payments • Verified shops • 24/7 support
          </p>
        </div>
      </footer>
    </div>
  )
}

export const products = [
  {
    title: "Trending Shops",
    link: "/shops/trending",
    thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
    description: "Discover the most popular shops this week"
  },
  {
    title: "Boosted Products",
    link: "/boosts",
    thumbnail: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
    description: "Featured products with maximum visibility"
  },
  {
    title: "Best Deals",
    link: "/deals",
    thumbnail: "https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=2070&auto=format&fit=crop",
    description: "Save big on amazing offers"
  },
  {
    title: "New Arrivals",
    link: "/products/new",
    thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
    description: "Fresh products just added"
  },
  {
    title: "Top Rated",
    link: "/products/top-rated",
    thumbnail: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=2070&auto=format&fit=crop",
    description: "5-star favorites from the community"
  },
  {
    title: "Swap Zone",
    link: "/swap",
    thumbnail: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?q=80&w=2070&auto=format&fit=crop",
    description: "Trade products directly"
  },
  {
    title: "Verified Stores",
    link: "/shops/verified",
    thumbnail: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop",
    description: "Trusted and verified shops"
  },
  {
    title: "Flash Sales",
    link: "/flash-sales",
    thumbnail: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
    description: "Limited time offers"
  },
  {
    title: "Local Picks",
    link: "/local",
    thumbnail: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2058&auto=format&fit=crop",
    description: "Support shops near you"
  },
  {
    title: "Electronics",
    link: "/category/electronics",
    thumbnail: "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2070&auto=format&fit=crop",
    description: "Latest gadgets and tech"
  },
  {
    title: "Fashion",
    link: "/category/fashion",
    thumbnail: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop",
    description: "Trendy clothes and accessories"
  },
  {
    title: "Home & Living",
    link: "/category/home-living",
    thumbnail: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2058&auto=format&fit=crop",
    description: "Everything for your home"
  },
  {
    title: "Rider Services",
    link: "/riders",
    thumbnail: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=2070&auto=format&fit=crop",
    description: "Verified delivery partners"
  },
  {
    title: "AI Recommendations",
    link: "/recommendations",
    thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2065&auto=format&fit=crop",
    description: "Personalized for you"
  },
  {
    title: "Moderated Listings",
    link: "/moderated",
    thumbnail: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop",
    description: "Quality checked products"
  }
];

const categories = [
  { id: 1, name: "Electronics", slug: "electronics" },
  { id: 2, name: "Fashion", slug: "fashion" },
  { id: 3, name: "Home & Living", slug: "home-living" },
  { id: 4, name: "Beauty", slug: "beauty" },
  { id: 5, name: "Sports", slug: "sports" },
  { id: 6, name: "Books", slug: "books" },
  { id: 7, name: "Gaming", slug: "gaming" },
  { id: 8, name: "Automotive", slug: "automotive" },
  { id: 9, name: "Toys", slug: "toys" },
  { id: 10, name: "Digital", slug: "digital" },
];  