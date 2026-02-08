// app/routes/seller.select-boost-product.tsx
import type { Route } from "./+types/seller-select-boost-product";
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link, useLoaderData, useNavigate, useParams } from "react-router";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
import { 
  Search, 
  ArrowLeft, 
  Zap, 
  Package, 
  Clock, 
  Check, 
  AlertCircle,
  Loader2,
  Grid,
  List,
  TrendingUp,
  Plus,
  Sparkles
} from "lucide-react";
import { DataTable } from "~/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import AxiosInstance from '~/components/axios/Axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Select Product to Boost | Seller",
    },
  ];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  status: string;
  condition: string;
  upload_status: string;
  shop: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  is_removed?: boolean;
  removal_reason?: string;
  boost_active?: boolean;
  boost_end_date?: string;
}

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  time_unit: 'hours' | 'days' | 'weeks' | 'months';
  status: 'active' | 'inactive' | 'archived';
  features: any[];
  created_at: string;
  description: string;
  position: number;
  color: string;
  icon: string;
  popular: boolean;
  product_limit?: number;
}

interface LoaderData {
  user: any;
  userId: string | undefined;
  shopId: string | undefined;
  planId: string | undefined;
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  
  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  
  await requireRole(request, context, ["isCustomer"]);
  
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  
  const userId = session.get("userId");
  const shopId = session.get("shopId");
  
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  let planId: string | undefined;
  const pathSegments = pathname.split('/').filter(Boolean);
  const planIndex = pathSegments.indexOf('seller-boosts');
  
  if (planIndex !== -1 && planIndex + 1 < pathSegments.length) {
    planId = pathSegments[planIndex + 1];
  }
  
  return { user, userId, shopId, planId };
}

export default function SelectBoostProduct({ loaderData }: { loaderData: LoaderData }) {
  const { user, userId, shopId, planId } = loaderData;
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [boostPlan, setBoostPlan] = useState<BoostPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [applyBoostDialogOpen, setApplyBoostDialogOpen] = useState(false);
  const [applyingBoost, setApplyingBoost] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [planProductLimit, setPlanProductLimit] = useState<number>(1);

  useEffect(() => {
    const fetchBoostPlan = async () => {
      if (!planId) {
        setError('No boost plan specified');
        setIsLoadingPlan(false);
        return;
      }

      try {
        setIsLoadingPlan(true);
        setError(null);
        
        const response = await AxiosInstance.get(`/seller-boosts/${planId}/plan_detail/`);
        
        if (response.data.success) {
          const plan = response.data.plan;
          setBoostPlan(plan);
          setPlanProductLimit(plan.product_limit || 1);
        } else {
          setError(`Failed to load boost plan: ${response.data.message}`);
        }
      } catch (error: any) {
        setError(error.response?.data?.message || `Error loading boost plan: ${error.message}`);
      } finally {
        setIsLoadingPlan(false);
      }
    };

    fetchBoostPlan();
  }, [planId]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!userId || !shopId) {
        setIsLoadingProducts(false);
        return;
      }

      try {
        setIsLoadingProducts(true);
        
        const response = await AxiosInstance.get('/seller-products/', {
          params: { customer_id: userId, shop_id: shopId }
        });
        
        if (response.data.success) {
          const productsData = response.data.products || [];
          setProducts(productsData);
          setFilteredProducts(productsData);
          
          const categoryNames: string[] = [];
          productsData.forEach((product: Product) => {
            if (product.category?.name) {
              categoryNames.push(product.category.name);
            }
          });
          
          const uniqueCategories = Array.from(new Set(categoryNames));
          setCategories(uniqueCategories);
        } else {
          setProducts([]);
          setFilteredProducts([]);
        }
      } catch (error: any) {
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [userId, shopId]);

  useEffect(() => {
    let result = products;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((product: Product) =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter((product: Product) => product.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter((product: Product) => product.category?.name === categoryFilter);
    }
    
    setFilteredProducts(result);
  }, [searchQuery, statusFilter, categoryFilter, products]);

  useEffect(() => {
    setIsLoading(isLoadingPlan || isLoadingProducts);
  }, [isLoadingPlan, isLoadingProducts]);

  const handleApplyBoost = async () => {
    if (!selectedProduct || !planId || !userId || !shopId) return;
    
    try {
      setApplyingBoost(true);
      
      const activeBoostsResponse = await AxiosInstance.get('/seller-boosts/active/', {
        params: { customer_id: userId, shop_id: shopId }
      });
      
      if (activeBoostsResponse.data.success) {
        const planActiveBoosts = activeBoostsResponse.data.boosts.filter(
          (boost: any) => boost.boost_plan_id === planId
        );
        
        if (planActiveBoosts.length >= planProductLimit) {
          alert(`You have reached the limit of ${planProductLimit} product${planProductLimit !== 1 ? 's' : ''} for this boost plan.`);
          setApplyingBoost(false);
          return;
        }
      }
      
      const response = await AxiosInstance.post('/seller-boosts/create/', {
        product_id: selectedProduct,
        boost_plan_id: planId,
        customer_id: userId,
        shop_id: shopId
      });
      
      if (response.data.success) {
        alert('Boost successfully applied to product!');
        navigate(-1);
      } else {
        const errorMsg = response.data.errors 
          ? `${response.data.message}\n\n${response.data.errors.join('\n')}`
          : response.data.message;
        alert(`Failed to apply boost: ${errorMsg}`);
      }
    } catch (error: any) {
      alert(`Failed to apply boost: ${error.response?.data?.message || 'Network error'}`);
    } finally {
      setApplyingBoost(false);
      setApplyBoostDialogOpen(false);
    }
  };

  const formatPrice = (price: string) => {
    return `₱${parseFloat(price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active", color: '#10b981' },
      inactive: { variant: "secondary" as const, label: "Inactive", color: '#6b7280' },
      draft: { variant: "outline" as const, label: "Draft", color: '#f59e0b' },
      sold: { variant: "secondary" as const, label: "Sold", color: '#8b5cf6' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: "outline" as const, label: status, color: '#6b7280' };
    
    return (
      <Badge 
        variant={config.variant}
        className="text-xs px-2 capitalize"
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        {config.label}
      </Badge>
    );
  };

  const getTimeUnitDisplay = (unit: string, duration: number) => {
    const plural = duration > 1 ? 's' : '';
    switch(unit) {
      case 'hours': return `Hour${plural}`;
      case 'days': return `Day${plural}`;
      case 'weeks': return `Week${plural}`;
      case 'months': return `Month${plural}`;
      default: return unit;
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <div className="font-medium">{product.name}</div>
              <div className="text-xs text-muted-foreground">{product.category?.name || 'No Category'}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <div className="font-medium">{formatPrice(row.getValue("price") as string)}</div>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Stock",
      cell: ({ row }) => {
        const quantity = row.getValue("quantity") as number;
        const color = quantity === 0 ? 'text-red-600' : quantity < 10 ? 'text-yellow-600' : 'text-green-600';
        return <div className={`font-medium ${color}`}>{quantity}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status") as string),
    },
    {
      accessorKey: "created_at",
      header: "Date Added",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at") as string);
        return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const product = row.original;
        const isSelected = selectedProduct === product.id;
        const canBoost = product.status === 'active' && !product.boost_active && product.quantity > 0;
        
        return (
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (isSelected) {
                setSelectedProduct(null);
              } else {
                setSelectedProduct(product.id);
              }
            }}
            disabled={!canBoost}
          >
            {isSelected ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Selected
              </>
            ) : product.boost_active ? (
              'Already Boosted'
            ) : !canBoost ? (
              'Cannot Boost'
            ) : (
              'Select'
            )}
          </Button>
        );
      },
    },
  ];

  if (error) {
    return (
      <UserProvider user={user}>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Select Product to Boost</h1>
          </div>
          
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Boost Plan</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <Loader2 className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </UserProvider>
    );
  }

  if (isLoading) {
    return (
      <UserProvider user={user}>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[400px] rounded-lg" />
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (!planId || !boostPlan) {
    return (
      <UserProvider user={user}>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Select Product to Boost</h1>
          </div>
          
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Boost Plan Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The boost plan you're trying to select doesn't exist or is no longer available.
              </p>
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={user}>
      <div className="p-6 flex flex-col h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Select Product to Boost</h1>
              <p className="text-sm text-muted-foreground">
                Choose a product to apply the "{boostPlan.name}" boost
                {planProductLimit > 1 && ` (Limit: ${planProductLimit} products)`}
              </p>
            </div>
          </div>
          
          {selectedProduct && (
            <Button 
              size="lg"
              onClick={() => setApplyBoostDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Zap className="h-5 w-5 mr-2" />
              Apply Boost
            </Button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left: Boost Plan Summary Card */}
          <div className="lg:col-span-1 flex flex-col">
            <Card className="h-full flex flex-col">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {boostPlan.name}
                </CardTitle>
                <CardDescription className="text-white/80">
                  Boost Plan Summary
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold text-center mb-2">
                      ₱{boostPlan.price.toFixed(2)}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      for {boostPlan.duration} {getTimeUnitDisplay(boostPlan.time_unit, boostPlan.duration)}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Duration</div>
                        <div className="text-sm text-muted-foreground">
                          {boostPlan.duration} {boostPlan.time_unit}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">Product Limit</div>
                        <div className="text-sm text-muted-foreground">
                          {planProductLimit} product{planProductLimit !== 1 ? 's' : ''} at a time
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">Features</div>
                        <div className="text-sm text-muted-foreground">
                          {boostPlan.features?.length || 0} premium features
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">What you get:</h4>
                    <ul className="space-y-2 text-sm">
                      {boostPlan.features?.slice(0, 5).map((feature: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {feature.value || feature.feature_name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Product Selection Area - Scrollable */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
              {/* Filters and Search */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products by name, description, or category..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex border rounded-lg">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="h-9 px-3"
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="h-9 px-3"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Display */}
              <Card className="flex-1 min-h-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Select a Product</CardTitle>
                      <CardDescription>
                        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                        {selectedProduct && ` • 1 product selected (Limit: ${planProductLimit} product${planProductLimit !== 1 ? 's' : ''})`}
                      </CardDescription>
                    </div>
                    {selectedProduct && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedProduct(null)}
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[calc(100vh-450px)]">
                  {isLoadingProducts ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p>Loading products...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                          ? 'Try adjusting your search or filters'
                          : 'You have no products available for boosting'}
                      </p>
                      {(!searchQuery && statusFilter === 'all' && categoryFilter === 'all') && (
                        <Button asChild>
                          <Link to="/seller/seller-create-product">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Product
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : viewMode === 'grid' ? (
                    // Grid View
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProducts.map((product) => {
                        const isSelected = selectedProduct === product.id;
                        const isBoosted = product.boost_active;
                        const canBoost = product.status === 'active' && !isBoosted && product.quantity > 0;
                        
                        return (
                          <Card 
                            key={product.id} 
                            className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                              isSelected ? 'ring-2 ring-blue-500' : ''
                            } ${!canBoost ? 'opacity-75' : ''}`}
                            onClick={() => {
                              if (canBoost) {
                                if (isSelected) {
                                  setSelectedProduct(null);
                                } else {
                                  setSelectedProduct(product.id);
                                }
                              }
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-md bg-gray-100 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium truncate max-w-[180px]">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">{product.category?.name || 'No Category'}</div>
                                  </div>
                                </div>
                                {isBoosted && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Boosted
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Price:</span>
                                  <span className="font-medium">{formatPrice(product.price)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Stock:</span>
                                  <span className={`font-medium ${
                                    product.quantity === 0 ? 'text-red-600' : 
                                    product.quantity < 10 ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    {product.quantity} units
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Status:</span>
                                  {getStatusBadge(product.status)}
                                </div>
                              </div>
                              
                              <Button
                                className="w-full"
                                variant={isSelected ? "default" : "outline"}
                                disabled={!canBoost}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Selected
                                  </>
                                ) : isBoosted ? (
                                  'Already Boosted'
                                ) : !canBoost ? (
                                  'Cannot Boost'
                                ) : (
                                  'Select Product'
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    // List View (DataTable)
                    <DataTable
                      columns={columns}
                      data={filteredProducts}
                      searchConfig={{
                        column: "name",
                        placeholder: "Search products..."
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Boost Confirmation Dialog */}
      <Dialog open={applyBoostDialogOpen} onOpenChange={setApplyBoostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Confirm Boost Application
            </DialogTitle>
            <DialogDescription>
              You are about to apply the "{boostPlan.name}" boost to your product.
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-md bg-blue-100 flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {products.find((p: Product) => p.id === selectedProduct)?.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {products.find((p: Product) => p.id === selectedProduct)?.category?.name}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Current Price</div>
                    <div className="font-medium">
                      {formatPrice(products.find((p: Product) => p.id === selectedProduct)?.price || '0')}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Stock</div>
                    <div className="font-medium">
                      {products.find((p: Product) => p.id === selectedProduct)?.quantity} units
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{boostPlan.name} Boost</div>
                  <div className="text-lg font-bold text-blue-600">
                    ₱{boostPlan.price.toFixed(2)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {boostPlan.duration} {getTimeUnitDisplay(boostPlan.time_unit, boostPlan.duration)} • Plan Limit: {planProductLimit} product{planProductLimit !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                By confirming, you agree to the boost terms and authorize payment.
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setApplyBoostDialogOpen(false)}
              disabled={applyingBoost}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyBoost}
              disabled={applyingBoost}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {applyingBoost ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying Boost...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Confirm & Apply Boost
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserProvider>
  );
}