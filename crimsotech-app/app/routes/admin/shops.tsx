// app/routes/admin/shops.tsx
import { toast } from "sonner";
import type { Route } from "./+types/shops";
import SidebarLayout from "~/components/layouts/sidebar";
import { UserProvider } from "~/components/providers/user-role-provider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import { Link } from "react-router";
import {
  Store,
  Users,
  Star,
  MapPin,
  TrendingUp,
  Package,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Ban,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import AxiosInstance from "~/components/axios/Axios";
import DateRangeFilter from "~/components/ui/date-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  Legend,
} from "recharts";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Shops | Admin",
    },
  ];
}

interface Shop {
  id: string;
  name: string;
  owner: string;
  owner_id?: string;
  location: string;
  followers: number;
  products: number;
  rating: number;
  totalRatings: number;
  status:
    | "Active"
    | "Inactive"
    | "Suspended"
    | "Pending"
    | "Banned"
    | "Deleted";
  joinedDate: string;
  totalSales: number;
  activeBoosts: number;
  verified: boolean;
  email?: string;
  phone?: string;
  description?: string;
  is_removed?: boolean;
  suspension_reason?: string;
  suspension_end_date?: string;
}

interface ShopMetrics {
  total_shops: number;
  total_followers: number;
  avg_rating: number;
  verified_shops: number;
  top_shop_name: string;
  active_shops: number;
  suspended_shops: number;
  pending_shops: number;
  growth_metrics?: {
    shop_growth?: number;
    previous_period_total?: number;
    period_days?: number;
  };
}

interface LoaderData {
  user: any;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// Helper function to normalize status
const normalizeShopStatus = (status: string): string => {
  if (!status) return "Unknown";
  const lowerStatus = status.toLowerCase();

  switch (lowerStatus) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "suspended":
      return "Suspended";
    case "pending":
    case "pending_verification":
      return "Pending";
    case "banned":
      return "Banned";
    case "deleted":
    case "removed":
      return "Deleted";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

// Helper function to get status badge variant and styling
const getShopStatusConfig = (status: string) => {
  const normalizedStatus = normalizeShopStatus(status);

  switch (normalizedStatus) {
    case "Active":
      return {
        variant: "default" as const,
        className:
          "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        icon: CheckCircle,
        iconClassName: "text-green-600",
      };
    case "Verified":
      return {
        variant: "default" as const,
        className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        icon: ShieldCheck,
        iconClassName: "text-blue-600",
      };
    case "Inactive":
      return {
        variant: "secondary" as const,
        className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        icon: Activity,
        iconClassName: "text-gray-600",
      };
    case "Suspended":
      return {
        variant: "destructive" as const,
        className:
          "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        icon: AlertTriangle,
        iconClassName: "text-amber-600",
      };
    case "Pending":
      return {
        variant: "secondary" as const,
        className:
          "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
        icon: Activity,
        iconClassName: "text-yellow-600",
      };
    case "Banned":
      return {
        variant: "destructive" as const,
        className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        icon: Ban,
        iconClassName: "text-red-600",
      };
    case "Deleted":
      return {
        variant: "destructive" as const,
        className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
        icon: XCircle,
        iconClassName: "text-rose-600",
      };
    default:
      return {
        variant: "secondary" as const,
        className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        icon: Activity,
        iconClassName: "text-gray-600",
      };
  }
};

// Status Badge Component for shops
function ShopStatusBadge({ status }: { status: string }) {
  const config = getShopStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1.5 ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {normalizeShopStatus(status)}
    </Badge>
  );
}

export async function loader({
  request,
  context,
}: Route.LoaderArgs): Promise<LoaderData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  return { user };
}

export default function Shops({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;

  // State for data
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopMetrics, setShopMetrics] = useState<ShopMetrics>({
    total_shops: 0,
    total_followers: 0,
    avg_rating: 0,
    verified_shops: 0,
    top_shop_name: "No shops",
    active_shops: 0,
    suspended_shops: 0,
    pending_shops: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
    rangeType: "weekly" as "daily" | "weekly" | "monthly" | "yearly" | "custom",
  });

  // Fetch data function
  const fetchShopData = async (
    start: Date,
    end: Date,
    rangeType: string = "weekly",
  ) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.append("start_date", start.toISOString().split("T")[0]);
      params.append("end_date", end.toISOString().split("T")[0]);
      params.append("range_type", rangeType);

      // Fetch all data
      const metricsResponse = await AxiosInstance.get(
        `/admin-shops/get_metrics/?${params.toString()}`,
      );

      if (metricsResponse.data.success) {
        setShopMetrics(metricsResponse.data.metrics);
      }

      // Fetch shops list with date range
      const shopsResponse = await AxiosInstance.get(
        `/admin-shops/get_shops_list/?${params.toString()}`,
      );

      if (shopsResponse.data.success) {
        // Normalize shop statuses for consistency
        const normalizedShops = shopsResponse.data.shops.map((shop: Shop) => ({
          ...shop,
          status: normalizeShopStatus(shop.status),
        }));
        setShops(normalizedShops);
      }
    } catch (error) {
      console.error("Error fetching shop data:", error);
      // Use fallback empty data
      setShopMetrics({
        total_shops: 0,
        total_followers: 0,
        avg_rating: 0,
        verified_shops: 0,
        top_shop_name: "No shops",
        active_shops: 0,
        suspended_shops: 0,
        pending_shops: 0,
      });
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchShopData(dateRange.start, dateRange.end, dateRange.rangeType);
  }, []);

  // Handle date range change
  const handleDateRangeChange = (range: {
    start: Date;
    end: Date;
    rangeType: string;
  }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly"
        | "custom",
    });
    fetchShopData(range.start, range.end, range.rangeType);
  };

  // Function to update shop status
  const updateShopStatus = async (
    shopId: string,
    actionType: string,
    reason?: string,
    suspensionDays?: number,
  ) => {
    setIsLoading(true);
    try {
      const payload = {
        shop_id: shopId,
        action_type: actionType,
        user_id: user?.id,
        ...(reason && { reason }),
        ...(suspensionDays && { suspension_days: suspensionDays }),
      };

      const response = await AxiosInstance.put(
        "/admin-shops/update_shop_status/",
        payload,
        {
          headers: {
            "X-User-Id": user?.id || "",
          },
        },
      );

      if (response.data.success || response.data.message) {
        toast.success(
          response.data.message || "Shop status updated successfully",
        );

        // Refresh the shops data
        await fetchShopData(
          dateRange.start,
          dateRange.end,
          dateRange.rangeType,
        );
        return true;
      } else {
        toast.error(response.data.error || "Failed to update shop status");
        return false;
      }
    } catch (error: any) {
      console.error("Error updating shop status:", error);

      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update shop status");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    if (value === undefined || value === null) return "N/A";
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Get growth metrics
  const growthMetrics = shopMetrics.growth_metrics || {};

  const shopFilterConfig = {
    status: {
      options: [...new Set(shops.map((shop) => shop.status))],
      placeholder: "Status",
    },
    owner: {
      options: [...new Set(shops.map((shop) => shop.owner))],
      placeholder: "Owner",
    },
    location: {
      options: [...new Set(shops.map((shop) => shop.location))],
      placeholder: "Location",
    },
    verification: {
      options: ["Verified", "Unverified"],
      placeholder: "Verification Status",
    },
  };

  // Loading skeleton for metrics
  const MetricCardSkeleton = () => (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mt-1" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Shops</h1>
            </div>
          </div>

          <DateRangeFilter
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Shops
                        </p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {shopMetrics.total_shops}
                        </p>
                        {!isLoading &&
                          growthMetrics.shop_growth !== undefined && (
                            <div
                              className={`flex items-center gap-1 mt-2 text-sm ${
                                growthMetrics.shop_growth >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              <span>
                                {formatPercentage(growthMetrics.shop_growth)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                vs previous {growthMetrics.period_days || 7}{" "}
                                days
                              </span>
                            </div>
                          )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {shopMetrics.verified_shops} verified
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <Store className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Active Shops
                        </p>
                        <p className="text-xl sm:text-2xl font-bold mt-1 text-green-600">
                          {shopMetrics.active_shops}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {shopMetrics.suspended_shops} suspended
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Followers
                        </p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {shopMetrics.total_followers.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Across all shops
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Avg Rating
                        </p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {shopMetrics.avg_rating.toFixed(1)}★
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Overall quality
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                        <Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Shops Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Shops</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading shops..."
                  : `Showing ${shops.length} shops`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md">
                <DataTable
                  columns={columns}
                  data={shops}
                  filterConfig={shopFilterConfig}
                  searchConfig={{
                    column: "name",
                    placeholder: "Search shop...",
                  }}
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

const columns: ColumnDef<Shop>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Shop
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const shop = row.original;
      return (
        <div className="min-w-[180px]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{shop.name}</span>
            {shop.verified && (
              <Badge variant="secondary" className="text-xs">
                Verified
              </Badge>
            )}
          </div>
          {shop.description && (
            <div
              className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5"
              title={shop.description}
            >
              {shop.description}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Store className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-blue-600">{shop.owner}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => {
      const location = row.getValue("location") as string;
      return (
        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          {location}
        </div>
      );
    },
  },
  {
    accessorKey: "followers",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Followers
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const followers = row.getValue("followers") as number;
      return (
        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          {followers.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "products",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Products
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const products = row.getValue("products") as number;
      return (
        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
          <Package className="w-3.5 h-3.5 text-muted-foreground" />
          {products}
        </div>
      );
    },
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => {
      const shop = row.original;
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <Star
              className={`w-4 h-4 ${shop.rating > 0 ? "text-yellow-500 fill-current" : "text-gray-300"}`}
            />
            <span className="text-sm">
              {shop.rating > 0 ? shop.rating.toFixed(1) : "—"}
            </span>
          </div>
          {shop.totalRatings > 0 && (
            <div className="text-xs text-muted-foreground">
              {shop.totalRatings} review
              {shop.totalRatings !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "totalSales",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Total Sales
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const totalSales = parseFloat(row.getValue("totalSales") as string);
      return (
        <div className="font-medium text-sm whitespace-nowrap">
          ₱{totalSales.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const shop = row.original;
      return (
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <ShopStatusBadge status={status} />
          {shop.status === "Suspended" && shop.suspension_reason && (
            <span
              className="text-xs text-muted-foreground truncate max-w-[120px] cursor-help"
              title={`Reason: ${shop.suspension_reason}${shop.suspension_end_date ? ` | Until: ${new Date(shop.suspension_end_date).toLocaleDateString()}` : ""}`}
            >
              {shop.suspension_reason}
            </span>
          )}
          {shop.is_removed && !shop.suspension_reason && (
            <span className="text-xs text-muted-foreground">Removed</span>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const shop = row.original;

      const handleAction = async (actionType: string) => {
        let reason = "";
        let suspensionDays = 7;

        if (
          actionType === "suspend" ||
          actionType === "ban" ||
          actionType === "remove"
        ) {
          reason = prompt(`Enter reason for ${actionType}:`) || "";
          if (!reason) {
            toast.error("Reason is required");
            return;
          }

          if (actionType === "suspend") {
            const daysInput = prompt(
              "Enter suspension days (default: 7):",
              "7",
            );
            suspensionDays = parseInt(daysInput || "7", 10);
            if (isNaN(suspensionDays) || suspensionDays <= 0)
              suspensionDays = 7;
          }
        }

        const adminId =
          localStorage.getItem("userId") || (window as any).user?.id || "";

        if (!adminId) {
          toast.error("User authentication required. Please log in again.");
          return;
        }

        try {
          const payload = {
            shop_id: shop.id,
            action_type: actionType,
            user_id: adminId,
            ...(reason && { reason }),
            ...(suspensionDays && { suspension_days: suspensionDays }),
          };

          const response = await AxiosInstance.put(
            "/admin-shops/update_shop_status/",
            payload,
            {
              headers: { "X-User-Id": adminId },
            },
          );

          if (response.data.success || response.data.message) {
            toast.success(
              response.data.message || "Shop status updated successfully",
            );
            window.location.reload();
          } else {
            toast.error(response.data.error || "Failed to update shop status");
          }
        } catch (error: any) {
          toast.error(
            error.response?.data?.error ||
              error.response?.data?.message ||
              "Failed to update shop status",
          );
        }
      };

      const getAvailableActions = () => {
        const actions: {
          label: string;
          action: string;
          variant: "default" | "secondary" | "outline" | "destructive";
        }[] = [];
        const normalizedStatus = normalizeShopStatus(shop.status);

        if (normalizedStatus === "Active") {
          actions.push({
            label: "Suspend",
            action: "suspend",
            variant: "destructive",
          });
          actions.push({ label: "Ban", action: "ban", variant: "destructive" });
          if (!shop.verified) {
            actions.push({
              label: "Verify",
              action: "verify",
              variant: "default",
            });
          }
        }

        if (normalizedStatus === "Suspended") {
          actions.push({
            label: "Unsuspend",
            action: "unsuspend",
            variant: "default",
          });
          actions.push({ label: "Ban", action: "ban", variant: "destructive" });
        }

        if (normalizedStatus === "Banned") {
          actions.push({ label: "Unban", action: "unban", variant: "default" });
        }

        if (normalizedStatus === "Pending") {
          actions.push({
            label: "Approve",
            action: "approve",
            variant: "default",
          });
          actions.push({
            label: "Reject",
            action: "reject",
            variant: "destructive",
          });
        }

        if (normalizedStatus === "Inactive") {
          actions.push({
            label: "Activate",
            action: "activate",
            variant: "default",
          });
        }

        if (shop.is_removed || normalizedStatus === "Deleted") {
          actions.push({
            label: "Restore",
            action: "restore",
            variant: "default",
          });
        }

        return actions;
      };

      const actions = getAvailableActions();

      return (
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/shops/${shop.id}`}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {actions.length > 0 && (
            <Select onValueChange={(value) => handleAction(value)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Actions" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem
                    key={action.action}
                    value={action.action}
                    className={`text-xs ${action.variant === "destructive" ? "text-red-600 focus:text-red-600" : ""}`}
                  >
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    },
  },
];
