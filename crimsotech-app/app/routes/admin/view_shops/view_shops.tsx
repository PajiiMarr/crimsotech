import type { Route } from "./+types/view_shops";
import SidebarLayout from "~/components/layouts/sidebar";
import { UserProvider } from "~/components/providers/user-role-provider";
import { useState, useEffect } from "react";
import AxiosInstance from "~/components/axios/Axios";

// shadcn imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Package,
  Tag,
  Users,
  Star,
  AlertCircle,
  CheckCircle,
  MapPin,
  Phone,
  Calendar,
  BarChart3,
  Shield,
  Gift,
  MoreVertical,
  ChevronLeft,
  Store,
  Eye,
  Ban,
  Trash2,
  XCircle,
  ShieldAlert,
  TrendingUp,
  Heart,
  Clock,
  FileText,
  ZoomIn,
  Wallet,
  PhilippinePeso,
} from "lucide-react";
import { DataTable } from "~/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Progress } from "~/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/hooks/use-toast";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Shop Details",
    },
  ];
}

// Format currency helper
const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format compact currency
const formatCompactCurrency = (amount: number): string => {
  if (amount === undefined || amount === null) return "₱0";
  if (amount >= 1000000) {
    return `₱${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `₱${(amount / 1000).toFixed(1)}K`;
  }
  return `₱${amount.toLocaleString()}`;
};

// Updated interfaces to match API response
interface Customer {
  id: string;
  username: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  contact_number: string;
  product_limit: number;
  current_product_count: number;
}

interface Shop {
  id: string;
  shop_picture: string | null;
  customer: Customer | null;
  description: string | null;
  name: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  contact_number: string;
  verified: boolean;
  status: string;
  total_sales: number;
  created_at: string;
  updated_at: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  suspended_until: string | null;
  active_report_count: number;
  favorites_count: number;
  followers_count: number;
  categories?: Category[];
  // Sales breakdown fields
  completed_revenue?: number;
  pending_revenue?: number;
  total_revenue?: number;
  incoming_balance?: number;
  platform_fees?: number;
  shipping_fees?: number;
  completed_orders?: number;
  pending_orders?: number;
  total_orders?: number;
  order_status_breakdown?: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    completed: number;
    cancelled: number;
    refunded: number;
  };
  // Legal documents
  business_registration_type: string | null;
  business_registration_number: string | null;
  business_registration_image: string | null;
  government_id_type: string | null;
  government_id_number: string | null;
  government_id_image_front: string | null;
  government_id_image_back: string | null;
  business_permit_number: string | null;
  business_permit_image: string | null;
  legal_documents_complete: boolean;
}

interface Variant {
  id: string;
  title: string;
  price: number;
  compare_price: number | null;
  quantity: number;
  sku_code: string;
  is_active: boolean;
  is_refundable: boolean;
  refund_days: number;
  allow_swap: boolean;
  swap_type: string;
  original_price: number | null;
  purchase_date: string | null;
  usage_period: number | null;
  usage_unit: string | null;
  depreciation_rate: number | null;
  minimum_additional_payment: number;
  maximum_additional_payment: number;
  swap_description: string;
  image: string | null;
  proof_image: string | null;
  critical_stock: number | null;
  weight: number | null;
  weight_unit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimension_unit: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  thumbnail: string | null;
  images: Array<{ id: string; url: string; file_type: string }>;
  price: number;
  max_price: number;
  price_display: string;
  stock: number;
  stock_status: string;
  total_quantity_sold: number;
  status: string;
  upload_status: string;
  condition: number;
  is_refundable: boolean;
  refund_days: number;
  created_at: string;
  updated_at: string;
  category: { id: string; name: string } | null;
  shop: { id: string; name: string } | null;
  customer: { id: string; name: string } | null;
  variants: Variant[];
  variants_count: number;
  has_variants: boolean;
  reviews: {
    average_rating: number;
    total_reviews: number;
    rating_distribution: Record<number, number>;
  };
  favorites_count: number;
  view_count: number;
  total_orders: number;
  total_revenue: number;
  active_boost: { is_boosted: boolean; boost_id?: string; plan_name?: string; end_date?: string };
  is_removed: boolean;
  removal_reason: string | null;
  removed_at: string | null;
}

interface Category {
  id: string;
  name: string;
  product_count?: number;
}

interface Review {
  id: string;
  customer: Customer | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Voucher {
  id: string;
  name: string;
  code: string;
  discount_type: string;
  value: number;
  valid_until: string;
  is_active: boolean;
}

interface Boost {
  id: string;
  product: { id: string | null; name: string | null };
  boost_plan: { id: string | null; name: string | null; price: number } | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

interface Report {
  id: string;
  reporter?: { first_name?: string; last_name?: string };
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface ShopDetailsData {
  shop: Shop;
  products: Product[];
  categories: Category[];
  reviews: Review[];
  vouchers: Voucher[];
  boosts: Boost[];
  reports: Report[];
}

interface LoaderData {
  user: any;
  shopId: string;
  shopData: ShopDetailsData | null;
  error: string | null;
}

export async function loader({
  request,
  context,
  params,
}: Route.LoaderArgs): Promise<LoaderData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  const shopId = params.shop_id || "";

  if (!shopId) {
    return {
      user,
      shopId: "",
      shopData: null,
      error: "Shop ID is required",
    };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(shopId)) {
    return {
      user,
      shopId,
      shopData: null,
      error: "Invalid shop ID format",
    };
  }

  try {
    const [
      shopResponse,
      productsResponse,
      categoriesResponse,
      reviewsResponse,
      vouchersResponse,
      boostsResponse,
      reportsResponse,
    ] = await Promise.allSettled([
      AxiosInstance.get(`/admin-shops/${shopId}/get_shop_details/`),
      AxiosInstance.get(`/admin-shops/${shopId}/get_products/`),
      AxiosInstance.get(`/admin-shops/${shopId}/get_categories/`),
      AxiosInstance.get(`/admin-shops/${shopId}/get_reviews/`),
      AxiosInstance.get(`/admin-shops/${shopId}/get_vouchers/`),
      AxiosInstance.get(`/admin-shops/${shopId}/get_boosts/`),
      AxiosInstance.get(`/admin-shops/${shopId}/get_reports/`),
    ]);

    if (shopResponse.status === "rejected") {
      console.error("Shop fetch failed:", shopResponse.reason);
      throw new Error("Failed to fetch shop details");
    }

    const shopData: ShopDetailsData = {
      shop: shopResponse.value.data.shop,
      products:
        productsResponse.status === "fulfilled"
          ? productsResponse.value.data.products || []
          : [],
      categories:
        categoriesResponse.status === "fulfilled"
          ? [
              { id: "all", name: "All Products" },
              ...(categoriesResponse.value.data.categories || []),
            ]
          : [{ id: "all", name: "All Products" }],
      reviews:
        reviewsResponse.status === "fulfilled"
          ? reviewsResponse.value.data.reviews || []
          : [],
      vouchers:
        vouchersResponse.status === "fulfilled"
          ? vouchersResponse.value.data.vouchers || []
          : [],
      boosts:
        boostsResponse.status === "fulfilled"
          ? boostsResponse.value.data.boosts || []
          : [],
      reports:
        reportsResponse.status === "fulfilled"
          ? reportsResponse.value.data.reports || []
          : [],
    };

    return {
      user,
      shopId,
      shopData,
      error: null,
    };
  } catch (error: any) {
    console.error("Error fetching shop data:", error);
    return {
      user,
      shopId,
      shopData: null,
      error: error.response?.data?.error || error.message || "Failed to load shop data",
    };
  }
}

// Action configurations
const actionConfigs = {
  verify: {
    title: "Verify Shop",
    description: "This will verify the shop and add a verification badge.",
    confirmText: "Verify",
    variant: "default" as const,
    icon: Shield,
    needsReason: false,
    needsSuspensionDays: false,
  },
  unverify: {
    title: "Remove Verification",
    description: "This will remove the verification badge from the shop.",
    confirmText: "Remove Verification",
    variant: "outline" as const,
    icon: ShieldAlert,
    needsReason: false,
    needsSuspensionDays: false,
  },
  approve: {
    title: "Approve Shop",
    description: "This will approve the shop and set its status to Active.",
    confirmText: "Approve",
    variant: "default" as const,
    icon: CheckCircle,
    needsReason: false,
    needsSuspensionDays: false,
  },
  reject: {
    title: "Reject Shop",
    description: "This will reject the shop application.",
    confirmText: "Reject",
    variant: "destructive" as const,
    icon: XCircle,
    needsReason: true,
    needsSuspensionDays: false,
  },
  suspend: {
    title: "Suspend Shop",
    description: "This will suspend the shop temporarily.",
    confirmText: "Suspend",
    variant: "outline" as const,
    icon: Ban,
    needsReason: true,
    needsSuspensionDays: true,
  },
  unsuspend: {
    title: "Unsuspend Shop",
    description: "This will unsuspend the shop and make it available again.",
    confirmText: "Unsuspend",
    variant: "outline" as const,
    icon: CheckCircle,
    needsReason: false,
    needsSuspensionDays: false,
  },
  delete: {
    title: "Delete Shop",
    description: "This action cannot be undone. This will permanently delete the shop.",
    confirmText: "Delete Shop",
    variant: "destructive" as const,
    icon: Trash2,
    needsReason: true,
    needsSuspensionDays: false,
  },
};

// Product table columns
const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Product Name",
    cell: ({ row }) => {
      const product = row.original;
      const isLowStock = product.stock_status === "low_stock";
      const isOutOfStock = product.stock_status === "out_of_stock";
      return (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
              {product.name}
              {isLowStock && (
                <Badge variant="destructive" className="text-xs">
                  Low Stock
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs">
                  Out of Stock
                </Badge>
              )}
              {product.has_variants && (
                <Badge variant="secondary" className="text-xs">
                  {product.variants_count} Variants
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[200px]">
              {product.description?.substring(0, 50)}
              {product.description?.length > 50 ? "..." : ""}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category;
      return (
        <div className="hidden sm:block">
          <Badge variant="outline" className="text-xs">
            {category?.name || "Uncategorized"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "price_display",
    header: "Price",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="font-medium text-sm">{product.price_display}</div>
      );
    },
  },
  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="hidden md:block">
          <span className={product.stock <= 10 ? "text-red-500 font-medium" : ""}>
            {product.stock}
          </span>
          {product.stock <= 10 && product.stock > 0 && (
            <span className="ml-1 text-xs text-red-500">Low</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "reviews.average_rating",
    header: "Rating",
    cell: ({ row }) => {
      const rating = row.original.reviews?.average_rating ?? 0;
      return (
        <div className="hidden lg:flex items-center gap-1">
          <Star
            className={`h-3 w-3 ${rating > 0 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
          <span className="text-sm">{rating > 0 ? rating.toFixed(1) : "—"}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "favorites_count",
    header: "Favorites",
    cell: ({ row }) => {
      const favorites = row.original.favorites_count;
      return (
        <div className="hidden xl:block">
          <div className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-red-500" />
            <span className="font-medium">{favorites}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "upload_status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.upload_status;
      return (
        <div className="hidden xl:block">
          <Badge
            variant={
              status === "published" ? "default" : status === "draft" ? "secondary" : "outline"
            }
            className="text-xs"
          >
            {status}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>
              Copy Product ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit Product</DropdownMenuItem>
            <DropdownMenuItem>View Reports</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Mobile product columns
const mobileProductColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center overflow-hidden">
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{product.name}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {product.category?.name || "Uncategorized"}
              </Badge>
              <span className="text-xs font-medium">{product.price_display}</span>
              {product.stock_status === "low_stock" && (
                <Badge variant="destructive" className="text-xs">
                  Low
                </Badge>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
];

export default function ShopDetails({ loaderData }: { loaderData: LoaderData }) {
  const { user, shopData, error } = loaderData;
  const [shop, setShop] = useState<Shop | null>(shopData?.shop || null);
  const [products, setProducts] = useState<Product[]>(shopData?.products || []);
  const [categories, setCategories] = useState<Category[]>(shopData?.categories || []);
  const [reviews, setReviews] = useState<Review[]>(shopData?.reviews || []);
  const [vouchers, setVouchers] = useState<Voucher[]>(shopData?.vouchers || []);
  const [boosts, setBoosts] = useState<Boost[]>(shopData?.boosts || []);
  const [reports, setReports] = useState<Report[]>(shopData?.reports || []);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [processing, setProcessing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    }
  }, [error]);

  if (error && !shop) {
    return (
      <UserProvider user={user}>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <Store className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Shop Not Found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild>
              <a href="/admin/shops">Back to Shops</a>
            </Button>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (!shop) {
    return (
      <UserProvider user={user}>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading shop details...</p>
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  // Get sales data from shop
  const completedRevenue = shop.completed_revenue || 0;
  const pendingRevenue = shop.pending_revenue || 0;
  const totalRevenue = shop.total_revenue || (completedRevenue + pendingRevenue);
  const platformFees = shop.platform_fees || 0;

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((product) => product.category?.id === selectedCategory);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / reviews.length
      : 0;

  const totalProducts = products.length;
  const totalCategories = categories.length - 1;
  const activeReports = reports.filter(
    (r) => r.status === "pending" || r.status === "under_review"
  ).length;
  const totalFavorites = products.reduce((sum, product) => sum + (product.favorites_count || 0), 0);

  const categoryDistribution = categories
    .filter((cat) => cat.id !== "all")
    .map((category) => ({
      ...category,
      count: products.filter((p) => p.category?.id === category.id).length,
    }));

  const getColumns = () => {
    if (typeof window === "undefined") return productColumns;
    if (window.innerWidth < 768) return mobileProductColumns;
    if (window.innerWidth < 1024) return productColumns.slice(0, 5);
    return productColumns;
  };

  const [columns, setColumns] = useState(getColumns());

  const getAvailableActions = () => {
    const actions = [];

    if (shop.status === "Pending") {
      actions.push({ id: "approve", label: "Approve Shop", icon: CheckCircle, variant: "default" as const });
      actions.push({ id: "reject", label: "Reject Shop", icon: XCircle, variant: "destructive" as const });
    } else {
      if (shop.verified) {
        actions.push({ id: "unverify", label: "Remove Verification", icon: ShieldAlert, variant: "outline" as const });
      } else {
        actions.push({ id: "verify", label: "Verify Shop", icon: Shield, variant: "default" as const });
      }

      if (shop.is_suspended) {
        actions.push({ id: "unsuspend", label: "Unsuspend Shop", icon: CheckCircle, variant: "outline" as const });
      } else {
        actions.push({ id: "suspend", label: "Suspend Shop", icon: Ban, variant: "outline" as const });
      }
    }

    actions.push({ id: "delete", label: "Delete Shop", icon: Trash2, variant: "destructive" as const });
    return actions;
  };

  const availableActions = getAvailableActions();
  const currentAction = activeAction ? actionConfigs[activeAction as keyof typeof actionConfigs] : null;

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
    setReason("");
    setSuspensionDays(7);
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    if (!activeAction || !shop) return;

    const needsReason = ["suspend", "reject", "delete"].includes(activeAction);
    if (needsReason && !reason.trim()) {
      toast({ title: "Validation Error", description: "Please provide a reason for this action", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const response = await AxiosInstance.post(`/admin-shops/${shop.id}/execute_action/`, {
        action: activeAction,
        reason: reason,
        suspension_days: suspensionDays,
        user_id: user?.user_id || user?.id,
      });

      toast({ title: "Success", description: `${currentAction?.confirmText} action completed successfully` });

      if (response.data.shop) {
        setShop((prev) => ({ ...prev, ...response.data.shop }));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to complete action.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowDialog(false);
      setActiveAction(null);
      setReason("");
      setSuspensionDays(7);
    }
  };

  const handleCancel = () => {
    if (processing) return;
    setShowDialog(false);
    setActiveAction(null);
    setReason("");
    setSuspensionDays(7);
  };

  const renderDialogContent = () => {
    if (!currentAction || !shop) return null;

    return (
      <>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{currentAction.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{currentAction.description}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Shop: {shop.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {shop.status === "Pending" && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  <Clock className="w-3 h-3 mr-1" /> Pending Approval
                </Badge>
              )}
              <Badge variant={shop.verified ? "default" : "secondary"} className="text-xs">
                {shop.verified ? "Verified" : "Unverified"}
              </Badge>
              <span className="text-xs text-muted-foreground">{shop.followers_count?.toLocaleString() || 0} followers</span>
            </div>
          </div>

          {(activeAction === "suspend" || activeAction === "reject" || activeAction === "delete") && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason for {activeAction === "suspend" ? "Suspension" : activeAction === "reject" ? "Rejection" : "Deletion"} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Enter reason for ${activeAction}ing this shop...`}
                className="h-10"
                required
              />
              <p className="text-xs text-muted-foreground">This reason will be recorded and may be shared with the shop owner.</p>
            </div>
          )}

          {activeAction === "suspend" && (
            <div className="space-y-2">
              <Label htmlFor="suspension-days" className="text-sm font-medium">Suspension Duration</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="suspension-days"
                  type="number"
                  min="1"
                  max="365"
                  value={suspensionDays}
                  onChange={(e) => setSuspensionDays(Math.max(1, parseInt(e.target.value) || 7))}
                  className="h-10 w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground">The shop will be automatically unsuspended after this period.</p>
            </div>
          )}

          {currentAction.variant === "destructive" && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Warning: This action cannot be undone
              </p>
              {activeAction === "delete" && (
                <p className="text-xs text-destructive mt-1">All products, orders, and shop data will be permanently deleted.</p>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  useEffect(() => {
    const handleResize = () => setColumns(getColumns());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <UserProvider user={user}>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {processing && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Processing action...</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
            <a href="/admin" className="hover:text-primary hover:underline flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Admin
            </a>
            <span>&gt;</span>
            <a href="/admin/shops" className="hover:text-primary hover:underline">Shops</a>
            <span>&gt;</span>
            <span className="text-foreground font-medium">{shop.name}</span>
          </nav>

          {availableActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4 mr-2" /> Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {availableActions.map((action, index) => {
                  const isDestructive = action.variant === "destructive";
                  const prevAction = availableActions[index - 1];
                  const needsSeparator = isDestructive && prevAction && prevAction.variant !== "destructive";

                  return (
                    <div key={action.id}>
                      {needsSeparator && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => handleActionClick(action.id)}
                        className={`flex items-center gap-2 cursor-pointer ${isDestructive ? "text-destructive" : ""}`}
                      >
                        <action.icon className="w-4 h-4" /> {action.label}
                      </DropdownMenuItem>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Shop Overview */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <Avatar className="h-28 w-28 mx-auto sm:mx-0">
                    {shop.shop_picture && <AvatarImage src={shop.shop_picture} />}
                    <AvatarFallback><Store className="h-10 w-10" /></AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h1 className="text-2xl font-bold">{shop.name}</h1>
                        <div className="flex flex-wrap gap-1">
                          {shop.status === "Pending" && (
                            <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
                          )}
                          {shop.verified && <Badge className="bg-green-100 text-green-800"><Shield className="h-3 w-3 mr-1" /> Verified</Badge>}
                          <Badge variant={shop.status === "Active" ? "default" : shop.status === "Suspended" ? "destructive" : "secondary"}>{shop.status}</Badge>
                        </div>
                      </div>
                      <p className="text-gray-600">{shop.description}</p>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-6 flex-wrap justify-center sm:justify-start">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                        ))}
                        <span className="text-sm text-muted-foreground">{(avgRating || 0).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{shop.favorites_count?.toLocaleString() || 0} favorites</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{shop.followers_count?.toLocaleString() || 0} followers</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-gray-500"><MapPin className="h-4 w-4" /> Location</div>
                        <p className="font-medium text-sm">{shop.street}, {shop.barangay}, {shop.city}, {shop.province}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-gray-500"><Phone className="h-4 w-4" /> Contact</div>
                        <p className="font-medium">{shop.contact_number}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-gray-500"><Calendar className="h-4 w-4" /> Created</div>
                        <p className="font-medium">{new Date(shop.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-gray-500"><PhilippinePeso className="h-4 w-4" /> Total Sales</div>
                        <p className="font-medium">{formatCurrency(shop.total_sales || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats - Enhanced with Revenue info */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Products</p>
                      <p className="text-2xl font-bold">{totalProducts}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>


              {/* Received Balance Card - Green */}
              <Card className="overflow-hidden border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <p className="text-xs text-green-700 font-medium">Received</p>
                      </div>
                      <p className="text-xl font-bold text-green-700">{formatCompactCurrency(completedRevenue)}</p>
                      <p className="text-xs text-green-600">{shop.completed_orders || 0} orders</p>
                    </div>
                    <Wallet className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Receivable Balance Card - Yellow */}
              <Card className="overflow-hidden border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="h-3 w-3 text-yellow-600" />
                        <p className="text-xs text-yellow-700 font-medium">Receivable</p>
                      </div>
                      <p className="text-xl font-bold text-yellow-700">{formatCompactCurrency(pendingRevenue)}</p>
                      <p className="text-xs text-yellow-600">{shop.pending_orders || 0} orders</p>
                    </div>
                    <Wallet className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mini Revenue Bar */}
            {totalRevenue > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Total Revenue: {formatCurrency(totalRevenue)}</span>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Received: {((completedRevenue / totalRevenue) * 100).toFixed(0)}%</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Receivable: {((pendingRevenue / totalRevenue) * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: `${(completedRevenue / totalRevenue) * 100}%` }} />
                  <div className="bg-yellow-500 h-full" style={{ width: `${(pendingRevenue / totalRevenue) * 100}%` }} />
                </div>
                {platformFees > 0 && (
                  <p className="text-xs text-gray-400 mt-2">Platform fees: {formatCurrency(platformFees)} (5% of completed)</p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Owner Info */}
          <div className="space-y-6">
            {shop.customer && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Shop Owner</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback>{shop.customer.first_name?.[0]}{shop.customer.last_name?.[0]}</AvatarFallback></Avatar>
                    <div><div className="font-medium">{shop.customer.first_name} {shop.customer.last_name}</div><div className="text-sm text-gray-500">@{shop.customer.username}</div></div>
                  </div>
                  <div><p className="text-sm text-gray-500">Email:</p><p className="font-medium">{shop.customer.email}</p></div>
                  <div><p className="text-sm text-gray-500">Contact:</p><p className="font-medium">{shop.customer.contact_number}</p></div>
                  <Button variant="outline" size="sm" className="w-full" asChild><a href={`/admin/users/${shop.customer.id}`}>View Full Profile</a></Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Shop Status Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Approval Status</p><Badge variant={shop.status === "Active" ? "default" : "secondary"}>{shop.status}</Badge></div>
                  <div className="text-center p-3 border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Verification</p><Badge variant={shop.verified ? "default" : "secondary"}>{shop.verified ? "Verified" : "Unverified"}</Badge></div>
                  <div className="text-center p-3 border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Followers</p><p className="font-bold text-lg">{shop.followers_count?.toLocaleString() || 0}</p></div>
                  <div className="text-center p-3 border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Total Orders</p><p className="font-bold text-lg">{shop.total_orders || 0}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Products Section */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>{filteredProducts.length} products in this shop</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
              <ScrollArea className="w-full pb-2">
                <TabsList className="inline-flex h-auto w-auto items-center justify-start rounded-lg bg-muted p-1">
                  {categories.map((category) => (
                    <TabsTrigger key={category.id} value={category.id} className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {category.name}
                      {category.id !== "all" && <Badge variant="secondary" className="ml-1 text-xs">{products.filter(p => p.category?.id === category.id).length}</Badge>}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>

              {categories.map((category) => (
                <TabsContent key={category.id} value={category.id} className="mt-4">
                  {filteredProducts.length > 0 ? (
                    <DataTable columns={columns} data={filteredProducts} />
                  ) : (
                    <div className="text-center py-8"><Package className="h-12 w-12 mx-auto text-gray-400 mb-4" /><p className="text-gray-500">No products in this category</p></div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Bottom Tabs */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
            <TabsTrigger value="boosts">Boosts</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="legal"><FileText className="w-3 h-3 mr-1" /> Legal</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Customer Reviews</CardTitle><CardDescription>{reviews.length} total reviews • {(avgRating || 0).toFixed(1)} average rating</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">{Array(5).fill(0).map((_, i) => (<Star key={i} className={`w-3 h-3 ${i + 1 <= (review.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />))}</div>
                      <span className="text-sm font-medium">{review.customer?.first_name} {review.customer?.last_name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm">{review.comment || "No comment provided"}</p>
                  </div>
                ))}
                {reviews.length === 0 && <p className="text-center text-muted-foreground py-8">No reviews yet for this shop.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vouchers" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5" /> Active Vouchers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vouchers.filter(v => v.is_active).map((voucher) => (
                    <div key={voucher.id} className="border rounded-lg p-3">
                      <div className="flex justify-between mb-2"><span className="font-medium">{voucher.name}</span><Badge variant="outline">{voucher.discount_type === "percentage" ? `${voucher.value}%` : `₱${voucher.value}`}</Badge></div>
                      <div className="text-xs text-gray-500">Code: <code className="bg-gray-100 px-1 rounded">{voucher.code}</code></div>
                      <div className="text-xs text-gray-500 mt-1">Valid until: {new Date(voucher.valid_until).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {vouchers.filter(v => v.is_active).length === 0 && <p className="text-center text-muted-foreground py-8">No active vouchers for this shop.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="boosts" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Active Boosts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {boosts.map((boost) => (
                    <div key={boost.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3"><BarChart3 className="h-8 w-8 text-purple-600" /><div><div className="font-medium">{boost.product?.name || "Unknown Product"}</div><div className="text-sm text-gray-500">Plan: {boost.boost_plan?.name || "No Plan"} • ₱{boost.boost_plan?.price || 0}</div></div></div>
                      <div className="flex items-center gap-4"><Badge variant={boost.status === "active" ? "default" : "secondary"}>{boost.status}</Badge><div className="text-sm text-gray-500">Ends: {boost.end_date ? new Date(boost.end_date).toLocaleDateString() : "N/A"}</div></div>
                    </div>
                  ))}
                  {boosts.length === 0 && <p className="text-center text-muted-foreground py-8">No active boosts for this shop.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Reports & Moderation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4"><div><p className="text-sm text-muted-foreground">Active Reports</p><p className={`font-medium ${activeReports > 0 ? "text-red-600" : "text-green-600"}`}>{activeReports} active</p></div><div><p className="text-sm text-muted-foreground">Total Reports</p><p className="font-medium">{reports.length} total</p></div><div><p className="text-sm text-muted-foreground">Shop Reports</p><p className="font-medium">{shop.active_report_count || 0} active</p></div></div>
                {reports.length > 0 && <div><p className="text-sm font-medium mb-2">Recent Reports:</p><div className="space-y-2">{reports.slice(0, 2).map((report) => (<div key={report.id} className="border rounded p-2"><div className="flex justify-between mb-1"><span className="font-medium capitalize text-sm">{report.reason.replace(/_/g, " ")}</span><Badge variant={report.status === "pending" ? "secondary" : "default"}>{report.status}</Badge></div>{report.description && <p className="text-xs text-gray-600">{report.description}</p>}<div className="text-xs text-gray-500 mt-1">{new Date(report.created_at).toLocaleDateString()}</div></div>))}</div></div>}
                <div className="flex gap-2"><Button variant="outline" size="sm" asChild><a href={`/admin/shops/${shop.id}/reports`}>View All Reports</a></Button><Button variant="outline" size="sm" asChild><a href={`/admin/shops/${shop.id}/moderate`}>Moderate Shop</a></Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legal" className="space-y-4">
            <Card>
              <CardHeader><div className="flex justify-between"><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Legal Documents</CardTitle><Badge variant={shop.legal_documents_complete ? "default" : "secondary"} className={shop.legal_documents_complete ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{shop.legal_documents_complete ? "Complete" : "Incomplete"}</Badge></div><CardDescription>Documents submitted during shop registration for admin review.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div><h3 className="text-sm font-semibold mb-3">Business Registration ({shop.business_registration_type || "N/A"})</h3><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-muted-foreground">Registration Number</p><p className="text-sm font-medium">{shop.business_registration_number || <span className="italic text-muted-foreground">Not provided</span>}</p></div><div><p className="text-xs text-muted-foreground">Certificate Upload</p>{shop.business_registration_image ? <button onClick={() => setLightboxImage(shop.business_registration_image)} className="relative w-full h-32 rounded-lg overflow-hidden border hover:border-primary"><img src={shop.business_registration_image} alt="Certificate" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center"><ZoomIn className="w-6 h-6 text-white" /></div></button> : <div className="w-full h-24 rounded-lg border-2 border-dashed flex items-center justify-center"><p className="text-xs text-muted-foreground">No image uploaded</p></div>}</div></div></div>
                <Separator />
                <div><h3 className="text-sm font-semibold mb-3">Government ID ({shop.government_id_type || "N/A"})</h3><div><p className="text-xs text-muted-foreground">ID Number</p><p className="text-sm font-medium">{shop.government_id_number || <span className="italic text-muted-foreground">Not provided</span>}</p></div><div className="grid grid-cols-2 gap-4 mt-3"><div><p className="text-xs text-muted-foreground">Front of ID</p>{shop.government_id_image_front ? <button onClick={() => setLightboxImage(shop.government_id_image_front)} className="relative w-full h-32 rounded-lg overflow-hidden border"><img src={shop.government_id_image_front} alt="ID Front" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center"><ZoomIn className="w-6 h-6 text-white" /></div></button> : <div className="w-full h-24 rounded-lg border-2 border-dashed flex items-center justify-center"><p className="text-xs text-muted-foreground">No image uploaded</p></div>}</div><div><p className="text-xs text-muted-foreground">Back of ID</p>{shop.government_id_image_back ? <button onClick={() => setLightboxImage(shop.government_id_image_back)} className="relative w-full h-32 rounded-lg overflow-hidden border"><img src={shop.government_id_image_back} alt="ID Back" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center"><ZoomIn className="w-6 h-6 text-white" /></div></button> : <div className="w-full h-24 rounded-lg border-2 border-dashed flex items-center justify-center"><p className="text-xs text-muted-foreground italic">Not provided</p></div>}</div></div></div>
                <Separator />
                <div><h3 className="text-sm font-semibold mb-3">Business Permit</h3><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-muted-foreground">Permit Number</p><p className="text-sm font-medium">{shop.business_permit_number || <span className="italic text-muted-foreground">Not provided</span>}</p></div><div><p className="text-xs text-muted-foreground">Permit Upload</p>{shop.business_permit_image ? <button onClick={() => setLightboxImage(shop.business_permit_image)} className="relative w-full h-32 rounded-lg overflow-hidden border"><img src={shop.business_permit_image} alt="Permit" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center"><ZoomIn className="w-6 h-6 text-white" /></div></button> : <div className="w-full h-24 rounded-lg border-2 border-dashed flex items-center justify-center"><p className="text-xs text-muted-foreground">No image uploaded</p></div>}</div></div></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {(shop.is_suspended || shop.suspension_reason) && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" /> Suspension History</CardTitle></CardHeader>
            <CardContent>
              {shop.is_suspended && (
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><div><div className="font-medium">Currently Suspended</div>{shop.suspension_reason && <div className="text-sm text-gray-600">Reason: {shop.suspension_reason}</div>}{shop.suspended_until && <div className="text-sm text-gray-600">Until: {new Date(shop.suspended_until).toLocaleString()}</div>}</div></div>
                  <Button variant="outline" size="sm" onClick={() => handleActionClick("unsuspend")}>Lift Suspension</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showDialog} onOpenChange={!processing ? setShowDialog : undefined}>
          <AlertDialogContent>{renderDialogContent()}<AlertDialogFooter><AlertDialogCancel onClick={handleCancel} disabled={processing}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirm} disabled={processing || ((activeAction === "suspend" || activeAction === "reject" || activeAction === "delete") && !reason.trim())} className={currentAction?.variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : ""}>{processing ? "Processing..." : currentAction?.confirmText}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>

        {lightboxImage && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh]"><img src={lightboxImage} alt="Document" className="max-w-full max-h-[85vh] object-contain rounded-lg" /><Button variant="outline" size="icon" className="absolute top-2 right-2 bg-white" onClick={() => setLightboxImage(null)}><XCircle className="w-4 h-4" /></Button></div>
          </div>
        )}
      </div>
    </UserProvider>
  );
}