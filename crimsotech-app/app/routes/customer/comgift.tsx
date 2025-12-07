"use client";

import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import SearchForm from '~/components/customer/search-bar'
import { GiftProductCard } from '~/components/customer/product-gifts'
import { ProductCategory } from '~/components/customer/product-category'
import { TopProductCard } from '~/components/customer/top-product'
import { UserProvider } from '~/components/providers/user-role-provider'
import { Search, X, Gift, Zap, Clock, MapPin, CheckCircle } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { useState } from "react"
import { useNavigate } from 'react-router'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Comgift - Free Electronics",
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

// Gift Product type
interface GiftProduct {
  id: string
  name: string
  description: string
  category: string
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'
  seller: {
    id: string
    name: string
    rating: number
    location: string
  }
  image: string
  claimed: boolean
  claimExpiry?: string // When claim expires
  pickupLocation: string
  postedTime: string // e.g., "2 hours ago"
  views: number
  claims: number
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
          placeholder="Search free electronics..."
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
// Compact Gift Card
// ----------------------------
const CompactGiftCard = ({ gift }: { gift: GiftProduct }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate(`/gift/${gift.id}`);
  };

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Claim gift:", gift.id);
    // API call to claim gift
  };

  // Condition badge color
  const getConditionColor = (condition: string) => {
    switch(condition) {
      case 'New': return 'bg-green-100 text-green-800';
      case 'Like New': return 'bg-blue-100 text-blue-800';
      case 'Good': return 'bg-yellow-100 text-yellow-800';
      case 'Fair': return 'bg-orange-100 text-orange-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] h-full flex flex-col relative group"
    >
      {/* FREE badge */}
      <div className="absolute top-1 left-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10 flex items-center gap-0.5">
        <Gift className="h-2.5 w-2.5" />
        FREE
      </div>
      
      {/* Condition badge */}
      <div className={`absolute top-1 right-1 ${getConditionColor(gift.condition)} text-[10px] font-medium px-1.5 py-0.5 rounded z-10`}>
        {gift.condition}
      </div>
      
      {/* Image */}
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={gift.image}
          alt={gift.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Overlay if claimed */}
        {gift.claimed && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-white mx-auto mb-2" />
              <span className="text-white text-sm font-semibold">Claimed</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px]">
          {gift.name}
        </h3>
        
        {/* Description snippet */}
        <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">
          {gift.description.substring(0, 50)}...
        </p>
        
        {/* Seller info */}
        <div className="flex items-center gap-1 mb-2">
          <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-[8px] font-medium">{gift.seller.name.charAt(0)}</span>
          </div>
          <span className="text-[10px] text-gray-600">{gift.seller.name}</span>
          <span className="text-[8px] text-gray-400">• {gift.seller.rating}⭐</span>
        </div>
        
        {/* Location & Time */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
          <div className="flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            <span>{gift.pickupLocation.split(',')[0]}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            <span>{gift.postedTime}</span>
          </div>
        </div>
        
        {/* Stats & Claim Button */}
        <div className="mt-auto pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">
                👁 {gift.views} views
              </span>
              <span className="text-[10px] text-gray-500">
                ✋ {gift.claims} claims
              </span>
            </div>
            
            <Button
              onClick={handleClaim}
              disabled={gift.claimed}
              size="sm"
              className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
            >
              {gift.claimed ? 'Claimed' : 'Claim'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------
// Filter Bar
// ----------------------------
const FilterBar = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  
  const filters = [
    { id: 'all', label: 'All Gifts' },
    { id: 'available', label: 'Available' },
    { id: 'nearby', label: 'Nearby' },
    { id: 'new', label: 'New Items' },
    { id: 'popular', label: 'Popular' },
    { id: 'ending', label: 'Ending Soon' },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto mb-4 pb-2 scrollbar-hide">
      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => setActiveFilter(filter.id)}
          className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full transition-colors ${
            activeFilter === filter.id 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

// ----------------------------
// Sample Gift Products
// ----------------------------
const sampleGiftProducts: GiftProduct[] = [
  {
    id: '1',
    name: 'Samsung Galaxy S10',
    description: 'Good condition, minor scratches on screen, works perfectly',
    category: 'Smartphones',
    condition: 'Good',
    seller: {
      id: 'seller1',
      name: 'TechRecycler',
      rating: 4.8,
      location: 'Manila'
    },
    image: '/api/placeholder/300/300',
    claimed: false,
    pickupLocation: 'Quezon City, Manila',
    postedTime: '2 hours ago',
    views: 124,
    claims: 8
  },
  {
    id: '2',
    name: 'Dell Latitude Laptop',
    description: '2019 model, i5 processor, 8GB RAM, needs new battery',
    category: 'Laptops',
    condition: 'Fair',
    seller: {
      id: 'seller2',
      name: 'OfficeClearance',
      rating: 4.5,
      location: 'Makati'
    },
    image: '/api/placeholder/300/300',
    claimed: false,
    pickupLocation: 'Makati Central',
    postedTime: '1 day ago',
    views: 89,
    claims: 12
  },
  {
    id: '3',
    name: 'Apple iPad Air 3',
    description: 'Like new, includes case and charger',
    category: 'Tablets',
    condition: 'Like New',
    seller: {
      id: 'seller3',
      name: 'GadgetGiver',
      rating: 4.9,
      location: 'Taguig'
    },
    image: '/api/placeholder/300/300',
    claimed: true,
    pickupLocation: 'BGC, Taguig',
    postedTime: '5 hours ago',
    views: 256,
    claims: 45
  },
  {
    id: '4',
    name: 'Sony Wireless Headphones',
    description: 'WH-1000XM3, excellent sound quality',
    category: 'Audio',
    condition: 'Good',
    seller: {
      id: 'seller4',
      name: 'AudioEnthusiast',
      rating: 4.7,
      location: 'Pasig'
    },
    image: '/api/placeholder/300/300',
    claimed: false,
    pickupLocation: 'Ortigas, Pasig',
    postedTime: '3 days ago',
    views: 67,
    claims: 5
  },
  {
    id: '5',
    name: 'Logitech Webcam',
    description: 'C920, perfect for online meetings',
    category: 'Accessories',
    condition: 'New',
    seller: {
      id: 'seller5',
      name: 'WFHSetup',
      rating: 4.6,
      location: 'Mandaluyong'
    },
    image: '/api/placeholder/300/300',
    claimed: false,
    pickupLocation: 'Shaw Blvd, Mandaluyong',
    postedTime: 'Just now',
    views: 23,
    claims: 3
  },
  {
    id: '6',
    name: 'Canon DSLR Camera',
    description: 'EOS 700D, with 18-55mm lens, needs sensor cleaning',
    category: 'Cameras',
    condition: 'Fair',
    seller: {
      id: 'seller6',
      name: 'PhotoHobbyist',
      rating: 4.4,
      location: 'Paranaque'
    },
    image: '/api/placeholder/300/300',
    claimed: false,
    pickupLocation: 'Alabang, Paranaque',
    postedTime: '6 hours ago',
    views: 142,
    claims: 9
  },
  {
    id: '7',
    name: 'Gaming Mouse RGB',
    description: 'Razer DeathAdder, still works fine',
    category: 'Gaming',
    condition: 'Poor',
    seller: {
      id: 'seller7',
      name: 'GamerUpgrade',
      rating: 4.3,
      location: 'Pasay'
    },
    image: '/api/placeholder/300/300',
    claimed: false,
    pickupLocation: 'MOA, Pasay',
    postedTime: '1 week ago',
    views: 45,
    claims: 2
  },
  {
    id: '8',
    name: 'Smart TV 32"',
    description: 'TCL Android TV, remote included',
    category: 'TVs',
    condition: 'Good',
    seller: {
      id: 'seller8',
      name: 'HomeUpgrade',
      rating: 4.8,
      location: 'Marikina'
    },
    image: '/api/placeholder/300/300',
    claimed: false,
    pickupLocation: 'Marikina Heights',
    postedTime: '2 days ago',
    views: 178,
    claims: 21
  },
];

// ----------------------------
// Comgift Component
// ----------------------------
export default function Comgift({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const [gifts] = useState<GiftProduct[]>(sampleGiftProducts);

  // Filter gifts based on search
  const filteredGifts = gifts.filter(gift =>
    searchTerm === "" ||
    gift.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gift.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gift.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gift.seller.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableGifts = gifts.filter(gift => !gift.claimed).length;

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className="w-full p-3">
          {/* Compact Search bar */}
          <div className="mb-4">
            <CompactSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>

          {/* Page Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-md">
              <Gift className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Comgift - Free Electronics</h1>
              <p className="text-xs text-gray-500">
                Claim free electronics from sellers • {availableGifts} items available
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-blue-600">Total Gifts</div>
              <div className="text-sm font-bold">{gifts.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-xs text-green-600">Available</div>
              <div className="text-sm font-bold">{availableGifts}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <div className="text-xs text-yellow-600">Claimed</div>
              <div className="text-sm font-bold">{gifts.length - availableGifts}</div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Zap className="h-4 w-4 text-green-600" />
              How it works
            </h3>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="text-center">
                <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-green-100 flex items-center justify-center">1</div>
                <div>Sellers gift unused electronics</div>
              </div>
              <div className="text-center">
                <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-green-100 flex items-center justify-center">2</div>
                <div>Browse and claim free items</div>
              </div>
              <div className="text-center">
                <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-green-100 flex items-center justify-center">3</div>
                <div>Pick up from seller's location</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <FilterBar />

          {/* Gift Your Item Button */}
          <div className="flex justify-end mb-4">
            <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600">
              <Gift className="h-3.5 w-3.5 mr-1" />
              Gift Your Electronics
            </Button>
          </div>

          {/* Gift Products Grid */}
          {filteredGifts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700">
                  {searchTerm ? `Search results for "${searchTerm}"` : "Available Electronics"}
                </h2>
                <span className="text-xs text-gray-500">
                  {filteredGifts.length} items
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {filteredGifts.map(gift => (
                  <CompactGiftCard 
                    key={gift.id} 
                    gift={gift} 
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                <Gift className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matching gifts found' : 'No gifts available'}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
                {searchTerm 
                  ? `No free electronics matching "${searchTerm}"` 
                  : "Check back later for free electronics from sellers"}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              ) : (
                <div className="flex gap-2 justify-center">
                  <button className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
                    Refresh
                  </button>
                  <button className="text-sm border border-green-600 text-green-600 hover:bg-green-50 px-4 py-2 rounded-md">
                    Gift Your Item
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </SidebarLayout>
    </UserProvider>
  );
}