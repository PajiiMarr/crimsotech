// app/routes/admin/shops.tsx
import type { Route } from './+types/shops'
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { 
  Store,
  Users,
  Star,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  TrendingUp,
  Package,
  Heart,
  MessageSquare
} from 'lucide-react';
import { useState } from 'react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Shops | Admin",
    },
  ];
}

// Define proper types
interface Shop {
  id: number;
  name: string;
  owner: string;
  location: string;
  followers: number;
  products: number;
  rating: number;
  totalRatings: number;
  status: string;
  joinedDate: string;
  totalSales: number;
  activeBoosts: number;
  verified: boolean;
}

interface ShopProduct {
  id: number;
  name: string;
  price: number;
  sales: number;
  rating: number;
}

interface ShopReview {
  id: number;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

interface LoaderData {
  user: any;
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");
  let user = (context as any).get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  await requireRole(request, context, ["isAdmin"]);
  
  return { user };
}

// Mock data
const mockShops: Shop[] = [
  {
    id: 1,
    name: "Tech Haven",
    owner: "John Doe",
    location: "Manila",
    followers: 1250,
    products: 45,
    rating: 4.8,
    totalRatings: 234,
    status: "Active",
    joinedDate: "2023-01-15",
    totalSales: 15680,
    activeBoosts: 3,
    verified: true
  },
  {
    id: 2,
    name: "Gadget World",
    owner: "Jane Smith",
    location: "Quezon City",
    followers: 890,
    products: 32,
    rating: 4.5,
    totalRatings: 178,
    status: "Active",
    joinedDate: "2023-03-22",
    totalSales: 12340,
    activeBoosts: 1,
    verified: true
  },
  {
    id: 3,
    name: "KeyClack",
    owner: "Mike Johnson",
    location: "Cebu",
    followers: 2100,
    products: 28,
    rating: 4.9,
    totalRatings: 456,
    status: "Active",
    joinedDate: "2022-11-08",
    totalSales: 23450,
    activeBoosts: 5,
    verified: true
  },
  {
    id: 4,
    name: "Display Masters",
    owner: "Sarah Lee",
    location: "Manila",
    followers: 670,
    products: 18,
    rating: 4.7,
    totalRatings: 145,
    status: "Active",
    joinedDate: "2023-06-12",
    totalSales: 9870,
    activeBoosts: 0,
    verified: false
  },
  {
    id: 5,
    name: "Connect Tech",
    owner: "David Wong",
    location: "Davao",
    followers: 450,
    products: 22,
    rating: 4.2,
    totalRatings: 89,
    status: "Active",
    joinedDate: "2023-08-05",
    totalSales: 5670,
    activeBoosts: 2,
    verified: true
  },
  {
    id: 6,
    name: "Fashion Hub",
    owner: "Maria Garcia",
    location: "Manila",
    followers: 1580,
    products: 67,
    rating: 4.6,
    totalRatings: 312,
    status: "Active",
    joinedDate: "2023-02-20",
    totalSales: 18900,
    activeBoosts: 4,
    verified: true
  }
];

const topShopsByRating = [
  { name: 'KeyClack', rating: 4.9, followers: 2100 },
  { name: 'Tech Haven', rating: 4.8, followers: 1250 },
  { name: 'Display Masters', rating: 4.7, followers: 670 },
  { name: 'Fashion Hub', rating: 4.6, followers: 1580 },
  { name: 'Gadget World', rating: 4.5, followers: 890 },
];

const topShopsByFollowers = [
  { name: 'KeyClack', followers: 2100, rating: 4.9 },
  { name: 'Fashion Hub', followers: 1580, rating: 4.6 },
  { name: 'Tech Haven', followers: 1250, rating: 4.8 },
  { name: 'Gadget World', followers: 890, rating: 4.5 },
  { name: 'Display Masters', followers: 670, rating: 4.7 },
];

const shopsByLocation = [
  { name: 'Manila', value: 3 },
  { name: 'Quezon City', value: 1 },
  { name: 'Cebu', value: 1 },
  { name: 'Davao', value: 1 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Shops({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;
  const [shops, setShops] = useState<Shop[]>(mockShops);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading shops...</div>
      </div>
    );
  }

  // Filter shops
  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shop.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === 'all' || shop.location === selectedLocation;
    return matchesSearch && matchesLocation;
  });

  const handleDeleteShop = (shopId: number) => {
    setShops(shops.filter(shop => shop.id !== shopId));
  };

  // Calculate metrics
  const totalFollowers = shops.reduce((acc, shop) => acc + shop.followers, 0);
  const avgRating = shops.reduce((acc, shop) => acc + shop.rating, 0) / shops.length;
  const verifiedShops = shops.filter(shop => shop.verified).length;

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Shops</h1>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Shops</p>
                    <p className="text-2xl font-bold mt-1">{shops.length}</p>
                    <p className="text-xs text-muted-foreground mt-2">{verifiedShops} verified</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Store className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Followers</p>
                    <p className="text-2xl font-bold mt-1">{totalFollowers.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Across all shops</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold mt-1">{avgRating.toFixed(1)}★</p>
                    <p className="text-xs text-muted-foreground mt-2">Overall quality</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Top Shop</p>
                    <p className="text-2xl font-bold mt-1 truncate">{topShopsByRating[0].name}</p>
                    <p className="text-xs text-muted-foreground mt-2">{topShopsByRating[0].rating}★ rating</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Shops by Rating */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Shops by Rating</CardTitle>
                <CardDescription>Highest rated shops on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topShopsByRating} layout="vertical">
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="rating" fill="#10b981" name="Rating" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Shops by Followers */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Shops by Followers</CardTitle>
                <CardDescription>Most followed shops on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topShopsByFollowers}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="followers" fill="#3b82f6" name="Followers" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Shops by Location */}
          <Card>
            <CardHeader>
              <CardTitle>Shops by Location</CardTitle>
              <CardDescription>Geographic distribution of shops</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={shopsByLocation}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {shopsByLocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Shops Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Shops</CardTitle>
              <CardDescription>
                Manage shop listings and vendor information
              </CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search shops or owners..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="Manila">Manila</SelectItem>
                    <SelectItem value="Quezon City">Quezon City</SelectItem>
                    <SelectItem value="Cebu">Cebu</SelectItem>
                    <SelectItem value="Davao">Davao</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShops.map((shop) => (
                    <TableRow key={shop.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{shop.name}</div>
                          {shop.verified && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{shop.owner}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {shop.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {shop.followers.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          {shop.products}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span>{shop.rating}</span>
                          <span className="text-xs text-muted-foreground">({shop.totalRatings})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={shop.status === 'Active' ? 'default' : 'secondary'}>
                          {shop.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedShop(shop)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <ShopDetailsDialog shop={selectedShop} />
                          </Dialog>

                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {shop.name}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteShop(shop.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

// Shop Details Dialog Component
interface ShopDetailsDialogProps {
  shop: Shop | null;
}

function ShopDetailsDialog({ shop }: ShopDetailsDialogProps) {
  if (!shop) return null;

  const mockProducts: ShopProduct[] = [
    { id: 1, name: "Gaming Laptop Pro", price: 1299.99, sales: 89, rating: 4.8 },
    { id: 2, name: "Wireless Mouse", price: 49.99, sales: 234, rating: 4.5 },
    { id: 3, name: "Mechanical Keyboard", price: 149.99, sales: 156, rating: 4.9 },
  ];

  const mockFollowers = [
    { id: 1, name: "Alice Johnson", joinedDate: "2023-05-10", orders: 5 },
    { id: 2, name: "Bob Smith", joinedDate: "2023-06-15", orders: 3 },
    { id: 3, name: "Carol White", joinedDate: "2023-07-20", orders: 8 },
  ];

  const mockReviews: ShopReview[] = [
    { id: 1, customerName: "Alice J.", rating: 5, comment: "Excellent service and quality products!", date: "2023-11-10" },
    { id: 2, customerName: "Bob S.", rating: 4, comment: "Fast shipping, good communication.", date: "2023-11-08" },
    { id: 3, customerName: "Carol W.", rating: 5, comment: "Best shop on the platform!", date: "2023-11-05" },
  ];

  const ratingDistribution = [
    { name: '5 Stars', value: 150 },
    { name: '4 Stars', value: 60 },
    { name: '3 Stars', value: 18 },
    { name: '2 Stars', value: 4 },
    { name: '1 Star', value: 2 },
  ];

  return (
    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {shop.name}
          {shop.verified && (
            <Badge variant="secondary" className="text-xs">Verified</Badge>
          )}
        </DialogTitle>
        <DialogDescription>
          Complete shop details, products, followers, and reviews
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-3">Shop Information</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Owner:</strong> {shop.owner}</p>
              <p><strong>Location:</strong> {shop.location}</p>
              <p><strong>Joined:</strong> {new Date(shop.joinedDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> <Badge variant="outline">{shop.status}</Badge></p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Shop Metrics</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Followers:</strong> {shop.followers.toLocaleString()}</p>
              <p><strong>Products:</strong> {shop.products}</p>
              <p><strong>Total Sales:</strong> ₱{shop.totalSales.toLocaleString()}</p>
              <p><strong>Active Boosts:</strong> {shop.activeBoosts}</p>
            </div>
          </div>
        </div>

        {/* Rating Information */}
        <div>
          <h4 className="font-semibold mb-3">Rating & Reviews</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{shop.rating}</div>
                <div className="flex items-center justify-center gap-1 my-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < Math.floor(shop.rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">{shop.totalRatings} ratings</div>
              </div>
            </div>
            <div className="space-y-1">
              {ratingDistribution.map((rating, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="w-16">{rating.name}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${(rating.value / shop.totalRatings) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-muted-foreground">{rating.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shop Products */}
        <div>
          <h4 className="font-semibold mb-3">Shop Products (Top 3)</h4>
          <div className="space-y-2">
            {mockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>₱{product.price.toFixed(2)}</span>
                    <span>•</span>
                    <span>{product.sales} sales</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span>{product.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Followers */}
        <div>
          <h4 className="font-semibold mb-3">Recent Followers (Sample)</h4>
          <div className="space-y-2">
            {mockFollowers.map((follower) => (
              <div key={follower.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{follower.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Followed: {new Date(follower.joinedDate).toLocaleDateString()} • {follower.orders} orders
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div>
          <h4 className="font-semibold mb-3">Recent Reviews</h4>
          <div className="space-y-3">
            {mockReviews.map((review) => (
              <div key={review.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{review.customerName}</span>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}