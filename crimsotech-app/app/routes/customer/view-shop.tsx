import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Star,
  Heart,
  Share2,
  MapPin,
  Clock,
  Shield,
  Truck,
  ArrowRight,
  Filter,
  Search,
  ShoppingBag,
  X
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';

// Mock data types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  image: string;
  shop?: {
    id: string;
    name: string;
    shop_picture: string | null;
    avg_rating: number;
  };
  condition?: string;
  quantity?: number;
  status?: string;
  category?: any;
}

interface ShopInfo {
  id: string;
  name: string;
  description: string;
  shop_picture: string | null;
  address: string;
  avg_rating: number;
  follower_count: number;
  product_count: number;
  total_sales: number;
  joined_date: string;
  response_time: string;
  shipping_policy: string;
  return_policy: string;
  warranty_policy: string;
}

interface Review {
  id: string;
  user: {
    name: string;
    avatar: string | null;
  };
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

const ViewShop: React.FC = () => {
  const { shopName } = useParams<{ shopName: string }>();
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState('All Products');
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock categories
  const shopCategories = [
    'All Products', 'Electronics', 'Clothing', 'Home & Garden', 'Books', 'Toys'
  ];

  // Mock shop policies
  const shopPolicies = [
    { icon: <Truck className="h-5 w-5" />, title: 'Shipping', description: 'Free shipping on orders over $50' },
    { icon: <Clock className="h-5 w-5" />, title: 'Returns', description: '30-day return policy' },
    { icon: <Shield className="h-5 w-5" />, title: 'Warranty', description: '1-year manufacturer warranty' },
    { icon: <Clock className="h-5 w-5" />, title: 'Response Time', description: 'Within 24 hours' },
  ];

  // Simulate fetching shop data
  useEffect(() => {
    const fetchShopData = async () => {
      // In a real app, you would fetch based on shopName
      setLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        // Mock data - replace with actual API call
        const mockShopInfo: ShopInfo = {
          id: '1',
          name: 'Tech Haven',
          description: 'Premium electronics and gadgets store. Specializing in high-quality tech products with warranty.',
          shop_picture: null,
          address: 'San Francisco, CA',
          avg_rating: 4.7,
          follower_count: 847,
          product_count: 156,
          total_sales: 12500,
          joined_date: '2022',
          response_time: 'Within 24 hours',
          shipping_policy: 'Free shipping on orders over $50',
          return_policy: '30-day return policy',
          warranty_policy: '1-year manufacturer warranty'
        };

        const mockProducts: Product[] = [
          {
            id: '1',
            name: 'Premium Wireless Headphones',
            description: 'Noise cancelling headphones with premium sound quality',
            price: 199.99,
            discount: 20,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
            condition: 'New',
            quantity: 10,
            status: 'In Stock',
            category: { name: 'Electronics' }
          },
          {
            id: '2',
            name: 'Mechanical Gaming Keyboard',
            description: 'RGB mechanical keyboard with customizable keys',
            price: 129.99,
            image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400',
            condition: 'New',
            quantity: 15,
            status: 'In Stock',
            category: { name: 'Electronics' }
          },
          {
            id: '3',
            name: 'Wireless Ergonomic Mouse',
            description: 'Ergonomic design for comfortable use',
            price: 79.99,
            image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400',
            condition: 'New',
            quantity: 0,
            status: 'Out of Stock',
            category: { name: 'Electronics' }
          },
          {
            id: '4',
            name: 'Bluetooth Portable Speaker',
            description: 'Waterproof portable speaker with 12h battery',
            price: 89.99,
            discount: 15,
            image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
            condition: 'New',
            quantity: 8,
            status: 'In Stock',
            category: { name: 'Electronics' }
          },
          {
            id: '5',
            name: 'USB-C Multiport Hub',
            description: '7-in-1 USB-C hub with 4K HDMI',
            price: 49.99,
            image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
            condition: 'New',
            quantity: 25,
            status: 'In Stock',
            category: { name: 'Accessories' }
          },
          {
            id: '6',
            name: 'Noise Cancelling Earbuds',
            description: 'True wireless earbuds with active noise cancellation',
            price: 149.99,
            image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
            condition: 'New',
            quantity: 12,
            status: 'In Stock',
            category: { name: 'Electronics' }
          },
        ];

        const mockReviews: Review[] = [
          {
            id: '1',
            user: { name: 'Alex Johnson', avatar: null },
            rating: 5,
            comment: 'Excellent products and fast shipping! The headphones are amazing quality.',
            date: '2 weeks ago',
            verified: true
          },
          {
            id: '2',
            user: { name: 'Maria Garcia', avatar: null },
            rating: 4,
            comment: 'Good prices and customer service was very helpful when I had questions.',
            date: '1 month ago',
            verified: true
          },
          {
            id: '3',
            user: { name: 'David Chen', avatar: null },
            rating: 5,
            comment: 'My go-to shop for all tech accessories. Never disappointed!',
            date: '2 months ago',
            verified: true
          },
        ];

        setShopInfo(mockShopInfo);
        setProducts(mockProducts);
        setReviews(mockReviews);
        setLoading(false);
      }, 1000);
    };

    fetchShopData();
  }, [shopName]);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === 'All Products' || 
      product.category?.name === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get image URL helper
  const getImageUrl = (url: string | null | undefined): string => {
    const baseUrl = import.meta.env.VITE_MEDIA_URL || 'http://127.0.0.1:8000';
    
    if (!url) {
      return '/default-product.jpg';
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
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!shopInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Shop Not Found</h2>
          <p className="text-gray-600 mb-4">The shop you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link to="/">Go Back Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shop Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Shop Avatar */}
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={getImageUrl(shopInfo.shop_picture)} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                {shopInfo.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Shop Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{shopInfo.name}</h1>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="font-semibold">{shopInfo.avg_rating.toFixed(1)}</span>
                      <span className="text-gray-600">({shopInfo.total_sales.toLocaleString()})</span>
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-4 max-w-3xl">{shopInfo.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{shopInfo.follower_count.toLocaleString()} followers</span>
                    </div>
                    <div className="flex items-center">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      <span>{shopInfo.product_count} products</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{shopInfo.address}</span>
                    </div>
                    <div className="flex items-center">
                      <span>Shop since {shopInfo.joined_date}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 min-w-[200px]">
                  <Button 
                    size="lg"
                    className="w-full"
                    onClick={() => setIsFollowing(!isFollowing)}
                    variant={isFollowing ? "outline" : "default"}
                  >
                    {isFollowing ? (
                      <>
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5 mr-2" />
                        <span>Follow Shop</span>
                      </>
                    )}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="flex-1">
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="flex-1">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            {/* Search and Filter */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {shopCategories.map((category) => (
                    <Button
                      key={category}
                      variant={activeCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory(category)}
                      className="whitespace-nowrap"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {activeCategory} ({filteredProducts.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
                      <Link to={`/product/${product.id}`}>
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          {product.discount && (
                            <Badge className="absolute top-2 left-2 bg-red-600 hover:bg-red-700">
                              -{product.discount}%
                            </Badge>
                          )}
                          {product.status === 'Out of Stock' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Badge variant="destructive" className="text-sm">
                                Out of Stock
                              </Badge>
                            </div>
                          )}
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Handle wishlist
                            }}
                          >
                            <Heart className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1 min-h-[40px]">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            {product.condition && (
                              <Badge variant="outline" className="text-xs">
                                {product.condition}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              {product.discount ? (
                                <>
                                  <span className="text-lg font-bold text-gray-900">
                                    ₱{(product.price * (1 - product.discount / 100)).toFixed(2)}
                                  </span>
                                  <span className="text-sm text-gray-500 line-through ml-2">
                                    ₱{product.price.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold text-gray-900">
                                  ₱{product.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? `No products matching "${searchTerm}" in ${activeCategory}`
                    : `No products available in ${activeCategory}`
                  }
                </p>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="text-lg font-semibold">{shopInfo.avg_rating.toFixed(1)}</span>
                    <span className="text-gray-600">({reviews.length} reviews)</span>
                  </div>
                </div>
                <Button>Write a Review</Button>
              </div>
              
              <div className="space-y-6">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={review.user.avatar || undefined} />
                            <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium text-gray-900">{review.user.name}</h4>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                              {review.verified && (
                                <Badge variant="secondary" className="text-xs">
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">About {shopInfo.name}</h2>
                <div className="space-y-4">
                  <p className="text-gray-600">{shopInfo.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Shop Details</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          Location: {shopInfo.address}
                        </li>
                        <li className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Followers: {shopInfo.follower_count.toLocaleString()}
                        </li>
                        <li className="flex items-center">
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          Products: {shopInfo.product_count}
                        </li>
                        <li className="flex items-center">
                          <span>Shop since: {shopInfo.joined_date}</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Performance</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center">
                          <Star className="h-4 w-4 mr-2 text-yellow-400 fill-current" />
                          Rating: {shopInfo.avg_rating.toFixed(1)} / 5.0
                        </li>
                        <li>Total Sales: {shopInfo.total_sales.toLocaleString()}</li>
                        <li>Response Time: {shopInfo.response_time}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop Policies</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {shopPolicies.map((policy, index) => (
                    <Card key={index} className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                            {policy.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">{policy.title}</h3>
                            <p className="text-gray-600">{policy.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ViewShop;