import type { Route } from './+types/personal-listing';
import { useState } from "react";
import { useNavigate, Link } from "react-router";
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from "~/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription } from "~/components/ui/alert";

import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Tag,
  MoreHorizontal,
  Package,
  Upload,
  InfoIcon,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

// ================================
// Meta function - page title
// ================================
export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Personal Listings",
    },
  ];
}

// ================================
// Loader function - UI ONLY
// ================================
export async function loader({ request, context }: Route.LoaderArgs) {
  // For UI demo only - return dummy user with correct User type
  return {
    id: "demo-user-123",
    name: "Demo User",
    email: "demo@example.com",
    isCustomer: true,
    isAdmin: false,
    isRider: false,
    isModerator: false,
    // Add any other minimal data needed for SidebarLayout
  };
}

// ================================
// Product type interfaces
// ================================
interface VariantOption {
  id: string;
  title: string;
  quantity: number;
  price: string;
}

interface Variant {
  id: string;
  title: string;
  options: VariantOption[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  used_for?: string;
  status: string;
  condition: string;
  upload_status: string;
  is_in_shop: boolean;
  is_shop_visible: boolean;
  shop: {
    id: string;
    name: string;
  } | null;
  category_admin: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  variants?: Variant[];
  created_at: string;
  updated_at: string;
}

// ================================
// PersonalListingsContent Component - UI ONLY
// ================================
function PersonalListingsContent() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([
    // Sample data for UI display
    {
      id: "1",
      name: "Apple iPhone 13 Pro",
      description: "256GB, Sierra Blue, Excellent condition",
      price: "45000",
      quantity: 1,
      used_for: "Personal use",
      status: "active",
      condition: "excellent",
      upload_status: "completed",
      is_in_shop: true,
      is_shop_visible: true,
      shop: { id: "shop1", name: "My Electronics Shop" },
      category_admin: { id: "cat1", name: "Smartphones" },
      category: { id: "cat2", name: "Electronics" },
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-20T14:25:00Z"
    },
    {
      id: "2",
      name: "Samsung Galaxy Watch 4",
      description: "44mm, Black, Bluetooth",
      price: "12000",
      quantity: 0,
      status: "inactive",
      condition: "good",
      upload_status: "completed",
      is_in_shop: false,
      is_shop_visible: false,
      shop: null,
      category_admin: { id: "cat3", name: "Wearables" },
      category: { id: "cat4", name: "Accessories" },
      created_at: "2024-01-10T09:15:00Z",
      updated_at: "2024-01-18T11:45:00Z"
    },
    {
      id: "3",
      name: "MacBook Air M1",
      description: "8GB RAM, 256GB SSD, 2020 model",
      price: "55000",
      quantity: 1,
      status: "active",
      condition: "excellent",
      upload_status: "completed",
      is_in_shop: true,
      is_shop_visible: true,
      shop: { id: "shop1", name: "My Electronics Shop" },
      category_admin: { id: "cat5", name: "Laptops" },
      category: { id: "cat2", name: "Electronics" },
      variants: [
        {
          id: "var1",
          title: "Color",
          options: [
            { id: "opt1", title: "Space Gray", quantity: 1, price: "55000" },
            { id: "opt2", title: "Gold", quantity: 0, price: "56000" }
          ]
        }
      ],
      created_at: "2024-01-05T14:20:00Z",
      updated_at: "2024-01-22T16:30:00Z"
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mock listing limit info for UI display
  const listingLimitInfo = {
    current_count: 3,
    limit: 10,
    remaining: 7
  };
  
  const hasShop = true; // Mock value for UI

  // Helper functions
  const formatPrice = (price: string) => {
    const priceNumber = parseFloat(price);
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(priceNumber);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryName = (product: Product) => {
    return product.category_admin?.name || product.category?.name || 'No Category';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      inactive: { variant: "secondary" as const, label: "Inactive" },
      draft: { variant: "outline" as const, label: "Draft" },
      sold: { variant: "secondary" as const, label: "Sold" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { variant: "outline" as const, label: status };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getVariantSummary = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return null;

    const totalOptions = product.variants.reduce((sum, variant) => 
      sum + (variant.options?.length || 0), 0);
    
    const variantTypes = product.variants.map(v => v.title).join(', ') || '';

    return (
      <div className="text-xs text-muted-foreground mt-1">
        <Package className="h-3 w-3 inline mr-1" />
        Variants: {variantTypes} ({totalOptions} options)
      </div>
    );
  };

  // Mock fetch listings - UI ONLY
  const fetchListings = () => {
    // No API call - just simulate loading
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const handleEditListing = (productId: string) => {
    alert(`Edit listing ${productId} - This would navigate to edit page`);
    navigate(`/personal-listings/edit/${productId}`);
  };

  const handleViewListing = (productId: string) => {
    alert(`View listing ${productId} - This would navigate to listing page`);
    navigate(`/listings/${productId}`);
  };

  const handleDeleteListing = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    // Mock delete - just remove from local state
    setProducts(prev => prev.filter(p => p.id !== productId));
    
    // Update limit info (mock)
    if (listingLimitInfo) {
      alert('Listing deleted successfully');
    }
  };

  const handleAddToShop = async (productId: string) => {
    // Mock add to shop - just update local state
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, is_shop_visible: true } : p
    ));
    
    alert('Listing added to your shop successfully');
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    // Mock toggle - just update local state
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, status: newStatus } : p
    ));
    
    alert(`Listing ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category_admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (loading) {
    return (
      <div className="w-full p-6 flex justify-center items-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          Loading your listings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Personal Listings</h1>
          <p className="text-gray-600 mt-1">
            Manage your personal item listings
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={refreshing}
            className="flex items-center gap-2"
            size="default"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            asChild 
            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            size="default"
            disabled={listingLimitInfo?.remaining === 0}
          >
            <Link to="/customer-create-product">
              <Plus className="w-4 h-4" />
              Add New Listing
            </Link>
          </Button>
        </div>
      </div>



      {/* Info Alert */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          You can list up to 10 items personally. {hasShop && "If you have a shop, you can choose to also display these items in your shop."}
        </AlertDescription>
      </Alert>

      {/* Search (simplified) */}
      <div className="mb-4">
        <div className="max-w-md">
          <div className="flex items-center gap-2 border rounded-md px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Listings</CardTitle>
          <CardDescription>
            {filteredProducts.length} listing{filteredProducts.length !== 1 ? 's' : ''} found
            {listingLimitInfo && ` • ${listingLimitInfo.remaining} listings remaining`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {products.length === 0 ? (
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="p-3 bg-muted rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No listings yet
                    </h3>
                    <p className="text-muted-foreground text-sm mb-6">
                      Create your first personal listing to start selling items.
                    </p>
                  </div>
                  <Button 
                    asChild 
                    className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                    size="lg"
                    disabled={listingLimitInfo?.remaining === 0}
                  >
                    <Link to="/personal-listings/create">
                      <Plus className="w-4 h-4" />
                      Create Your First Listing
                    </Link>
                  </Button>
                </div>
              ) : (
                'No listings match your search.'
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shop Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                          <Tag className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{product.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </div>
                          {product.used_for && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Used for: {product.used_for}
                            </div>
                          )}
                          {getVariantSummary(product)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryName(product)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(product.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={product.quantity === 0 ? 'text-red-600 font-medium' : ''}>
                        {product.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {product.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(product.status)}
                    </TableCell>
                    <TableCell>
                      {hasShop && product.is_shop_visible ? (
                        <Badge variant="default" className="bg-green-600">
                          In Shop
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not in Shop</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(product.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewListing(product.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditListing(product.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Listing
                          </DropdownMenuItem>
                          {hasShop && !product.is_shop_visible && product.status === 'active' && (
                            <DropdownMenuItem 
                              onClick={() => handleAddToShop(product.id)}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Add to Shop
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleToggleStatus(product.id, product.status)}
                          >
                            {product.status === 'active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteListing(product.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Listing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


    </div>
  );
}

// ================================
// Default component - UI ONLY
// ================================
export default function PersonalListings({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <PersonalListingsContent />
      </SidebarLayout>
    </UserProvider>
  );
}