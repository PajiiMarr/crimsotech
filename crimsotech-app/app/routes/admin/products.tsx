// app/routes/admin/products.tsx
import { toast } from "sonner";
import type { Route } from "./+types/products";
import SidebarLayout from "~/components/layouts/sidebar";
import { UserProvider } from "~/components/providers/user-role-provider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "~/components/ui/card";
import { DataTable } from "~/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Plus,
  Eye,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Zap,
  ArrowUpDown,
  RefreshCw,
  Tag,
  CheckCircle,
  Clock,
  Archive,
  Ban,
  XCircle,
  Circle,
  PlayCircle,
  PauseCircle,
  AlertOctagon,
  ShieldCheck,
  ShieldOff,
  User,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import AxiosInstance from "~/components/axios/Axios";
import DateRangeFilter from "~/components/ui/date-range-filter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
      title: "Products | Admin",
    },
  ];
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  shop: string;
  price: string; // Already formatted: "₱30,972.34"
  min_price: string;
  max_price: string;
  total_stock: number;
  condition: number; // 1=New, 2=Like New, 3=Good, 4=Fair
  status: string;
  upload_status: string;
  views: number;
  purchases: number;
  favorites: number;
  rating: number;
  total_reviews: number;
  boost: string | null;
  variants_count: number;
  active_variants: number;
  low_stock_variants: number;
  out_of_stock_variants: number;
  issues_count: number;
  low_stock: boolean;
  is_removed: boolean;
  is_refundable: boolean;
  refund_days: number;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
  removal_reason: string | null;
  customer: Customer;
}

interface Category {
  id: string;
  name: string;
  shop_id: string | null;
  shop_name: string | null;
  user_id: string | null;
  username: string | null;
}

interface FilterOptions {
  categories: string[];
  statuses: string[];
  shops: string[];
  boostPlans: string[];
  conditions: string[];
}

interface ProductMetrics {
  total_products: number;
  low_stock_alert: number;
  active_boosts: number;
  avg_rating: number;
  has_data: boolean;
  top_products?: any[];
  rating_distribution?: any[];
  growth_metrics?: {
    product_growth?: number;
    low_stock_growth?: number;
    previous_period_total?: number;
    previous_period_low_stock?: number;
    period_days?: number;
  };
  date_range?: {
    start_date: string;
    end_date: string;
    range_type: string;
  };
}

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
}

interface LoaderData {
  user: any;
  productMetrics: ProductMetrics;
  products: Product[];
  categories: Category[];
  filterOptions?: FilterOptions;
  dateRange?: {
    start: string;
    end: string;
    rangeType: string;
  };
}

// ─── Condition Helpers ───────────────────────────────────────────────────────

const getConditionLabel = (condition: number): string => {
  switch (condition) {
    case 1:
      return "New";
    case 2:
      return "Like New";
    case 3:
      return "Good";
    case 4:
      return "Fair";
    default:
      return "Unknown";
  }
};

const getConditionColor = (condition: number): string => {
  switch (condition) {
    case 1:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case 2:
      return "bg-blue-50 text-blue-700 border-blue-200";
    case 3:
      return "bg-amber-50 text-amber-700 border-amber-200";
    case 4:
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

// ─── Status Helpers ──────────────────────────────────────────────────────────

const normalizeStatus = (status: string): string => {
  if (!status) return "Unknown";
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case "active":
    case "published":
      return "Active";
    case "delivered":
      return "Delivered";
    case "suspended":
      return "Suspended";
    case "draft":
      return "Draft";
    case "archived":
      return "Archived";
    case "removed":
    case "is_removed":
      return "Removed";
    case "pending":
    case "processing":
      return "Pending";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "out of stock":
    case "out_of_stock":
      return "Out of Stock";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

const normalizeUploadStatus = (uploadStatus: string): string => {
  if (!uploadStatus) return "Unknown";
  const lowerStatus = uploadStatus.toLowerCase();
  switch (lowerStatus) {
    case "published":
      return "Published";
    case "draft":
      return "Draft";
    case "archived":
      return "Archived";
    case "scheduled":
      return "Scheduled";
    default:
      return (
        uploadStatus.charAt(0).toUpperCase() +
        uploadStatus.slice(1).toLowerCase()
      );
  }
};

const getStatusConfig = (status: string) => {
  const normalizedStatus = normalizeStatus(status);
  switch (normalizedStatus) {
    case "Active":
    case "Published":
      return {
        variant: "default" as const,
        className:
          "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        icon: CheckCircle,
        iconClassName: "text-green-600",
      };
    case "Delivered":
    case "Completed":
      return {
        variant: "default" as const,
        className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        icon: CheckCircle,
        iconClassName: "text-blue-600",
      };
    case "Suspended":
    case "Banned":
      return {
        variant: "destructive" as const,
        className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        icon: Ban,
        iconClassName: "text-red-600",
      };
    case "Draft":
      return {
        variant: "secondary" as const,
        className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        icon: Clock,
        iconClassName: "text-gray-600",
      };
    case "Archived":
      return {
        variant: "outline" as const,
        className:
          "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
        icon: Archive,
        iconClassName: "text-purple-600",
      };
    case "Removed":
    case "Cancelled":
      return {
        variant: "destructive" as const,
        className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
        icon: XCircle,
        iconClassName: "text-rose-600",
      };
    case "Pending":
    case "Processing":
      return {
        variant: "secondary" as const,
        className:
          "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        icon: Clock,
        iconClassName: "text-amber-600",
      };
    case "Out of Stock":
      return {
        variant: "secondary" as const,
        className:
          "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
        icon: AlertTriangle,
        iconClassName: "text-orange-600",
      };
    default:
      return {
        variant: "secondary" as const,
        className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        icon: Circle,
        iconClassName: "text-gray-600",
      };
  }
};

const getUploadStatusConfig = (uploadStatus: string) => {
  if (!uploadStatus)
    return {
      variant: "secondary" as const,
      className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
      icon: Circle,
      iconClassName: "text-gray-600",
    };
  const lowerStatus = uploadStatus.toLowerCase();
  switch (lowerStatus) {
    case "published":
      return {
        variant: "default" as const,
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
        icon: PlayCircle,
        iconClassName: "text-emerald-600",
      };
    case "draft":
      return {
        variant: "secondary" as const,
        className:
          "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
        icon: PauseCircle,
        iconClassName: "text-slate-600",
      };
    case "archived":
      return {
        variant: "outline" as const,
        className:
          "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
        icon: Archive,
        iconClassName: "text-violet-600",
      };
    case "scheduled":
      return {
        variant: "secondary" as const,
        className: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
        icon: Clock,
        iconClassName: "text-cyan-600",
      };
    default:
      return {
        variant: "secondary" as const,
        className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        icon: Circle,
        iconClassName: "text-gray-600",
      };
  }
};

const getRemovedStatusConfig = () => ({
  variant: "destructive" as const,
  className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  icon: AlertOctagon,
  iconClassName: "text-rose-600",
});

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  type = "status",
}: {
  status: string;
  type?: "status" | "upload" | "removed";
}) {
  let config;
  if (type === "removed") {
    config = getRemovedStatusConfig();
  } else if (type === "upload") {
    config = getUploadStatusConfig(status);
  } else {
    config = getStatusConfig(status);
  }
  const Icon = config.icon;
  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1.5 text-xs ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {status}
    </Badge>
  );
}

// ─── Loader ──────────────────────────────────────────────────────────────────

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
  const { getSession } = await import("~/sessions.server");
  const session = await getSession(request.headers.get("Cookie"));

  const url = new URL(request.url);
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const rangeType = url.searchParams.get("range_type") || "weekly";

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 7);
  const defaultEndDate = new Date();

  let productMetrics = null;
  let productsList: Product[] = [];
  let categoriesList: Category[] = [];
  let filterOptions: FilterOptions = {
    categories: [],
    statuses: [],
    shops: [],
    boostPlans: [],
    conditions: [],
  };

  try {
    const params = new URLSearchParams();
    params.append(
      "start_date",
      startDate || defaultStartDate.toISOString().split("T")[0],
    );
    params.append(
      "end_date",
      endDate || defaultEndDate.toISOString().split("T")[0],
    );
    if (rangeType) params.append("range_type", rangeType);

    const metricsResponse = await AxiosInstance.get(
      `/admin-products/get_metrics/?${params.toString()}`,
      {
        headers: { "X-User-Id": session.get("userId") },
      },
    );
    if (metricsResponse.data.success) {
      productMetrics = metricsResponse.data.metrics;
    }

    const categoriesResponse = await AxiosInstance.get(
      `/admin-products/get_categories/`,
      {
        headers: { "X-User-Id": session.get("userId") },
      },
    );
    if (categoriesResponse.data.success) {
      categoriesList = categoriesResponse.data.categories;
    }

    const productsParams = new URLSearchParams(params);
    const productsResponse = await AxiosInstance.get(
      `/admin-products/get_products_list/?${productsParams.toString()}`,
      {
        headers: { "X-User-Id": session.get("userId") },
      },
    );

    if (productsResponse.data.success) {
      productsList = productsResponse.data.products.map((product: Product) => ({
        ...product,
        status: normalizeStatus(product.status),
        upload_status: normalizeUploadStatus(product.upload_status),
      }));

      if (productsList.length > 0) {
        filterOptions = {
          categories: [
            ...new Set(productsList.map((p: Product) => p.category)),
          ].filter(Boolean) as string[],
          statuses: [
            ...new Set(productsList.map((p: Product) => p.status)),
          ].filter(Boolean) as string[],
          shops: [...new Set(productsList.map((p: Product) => p.shop))].filter(
            Boolean,
          ) as string[],
          boostPlans: ["Basic", "Premium", "Ultimate", "None"],
          conditions: [
            ...new Set(
              productsList.map((p: Product) => getConditionLabel(p.condition)),
            ),
          ].filter(Boolean) as string[],
        };
      }
    }
  } catch (error) {
    console.error("Error fetching product data:", error);
    productMetrics = {
      total_products: 0,
      low_stock_alert: 0,
      active_boosts: 0,
      avg_rating: 0,
      has_data: false,
      growth_metrics: {},
    };
  }

  return {
    user,
    productMetrics,
    products: productsList,
    categories: categoriesList,
    filterOptions,
    dateRange: {
      start: startDate || defaultStartDate.toISOString().split("T")[0],
      end: endDate || defaultEndDate.toISOString().split("T")[0],
      rangeType,
    },
  };
}

// ─── Add Category Modal/Drawer ───────────────────────────────────────────────

function AddCategoryModalDrawer({
  onCategoryAdded,
  userId,
}: {
  onCategoryAdded?: () => void;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "" });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (formData.name.length > 50) {
      toast.error("Category name must be 50 characters or less");
      return;
    }
    if (!userId) {
      toast.error("User authentication required. Please log in again.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = { name: formData.name.trim(), user_id: userId };
      const sessionUserId = localStorage.getItem("userId") || userId;
      const response = await AxiosInstance.post(
        "/admin-products/add_category/",
        payload,
        {
          headers: { "X-User-Id": sessionUserId },
        },
      );

      if (response.data.success) {
        toast.success(response.data.message || "Category added successfully!");
        setFormData({ name: "" });
        setOpen(false);
        if (onCategoryAdded) onCategoryAdded();
      } else {
        toast.error(response.data.message || "Failed to add category");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to add category. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const FormFields = () => (
    <div className="space-y-2">
      <Label htmlFor="category-name">Category Name *</Label>
      <Input
        id="category-name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g., Electronics, Clothing, Books"
        required
        maxLength={50}
        autoComplete="off"
      />
      <p className="text-xs text-muted-foreground">
        Maximum 50 characters. {50 - formData.name.length} characters remaining.
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Add New Category</DrawerTitle>
            <DrawerDescription>
              Create a new product category. Name is required (max 50
              characters).
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmit} className="px-4 space-y-4">
            <FormFields />
          </form>
          <DrawerFooter className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Category"
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Create a new product category. Name is required (max 50 characters).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFields />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Products({ loaderData }: { loaderData: LoaderData }) {
  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading products...</div>
      </div>
    );
  }

  const {
    user,
    productMetrics: initialMetrics,
    products: initialProducts,
    categories: initialCategories,
    filterOptions: initialFilterOptions,
    dateRange: initialDateRange,
  } = loaderData;

  const [productMetrics, setProductMetrics] = useState(initialMetrics);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(
    initialFilterOptions || {
      categories: [],
      statuses: [],
      shops: [],
      boostPlans: [],
      conditions: [],
    },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  const [dateRange, setDateRange] = useState({
    start: initialDateRange?.start
      ? new Date(initialDateRange.start)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: initialDateRange?.end ? new Date(initialDateRange.end) : new Date(),
    rangeType:
      (initialDateRange?.rangeType as
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly"
        | "custom") || "weekly",
  });

  // Calculate category stats
  useEffect(() => {
    const categoryProductCount: Record<string, number> = {};
    const sourceCategories = categories.length > 0 ? categories : [];

    sourceCategories.forEach((category) => {
      categoryProductCount[category.name] = 0;
    });

    products.forEach((product) => {
      const name = product.category || "Uncategorized";
      categoryProductCount[name] = (categoryProductCount[name] || 0) + 1;
    });

    const totalProducts = products.length;
    const stats = Object.entries(categoryProductCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalProducts > 0 ? (count / totalProducts) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    setCategoryStats(stats);
  }, [categories, products]);

  const fetchProductData = async (
    start: Date,
    end: Date,
    rangeType: string,
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("start_date", start.toISOString().split("T")[0]);
      params.append("end_date", end.toISOString().split("T")[0]);
      params.append("range_type", rangeType);

      const [metricsRes, categoriesRes, productsRes] = await Promise.all([
        AxiosInstance.get(`/admin-products/get_metrics/?${params.toString()}`),
        AxiosInstance.get(`/admin-products/get_categories/`),
        AxiosInstance.get(
          `/admin-products/get_products_list/?${params.toString()}`,
        ),
      ]);

      if (metricsRes.data.success) setProductMetrics(metricsRes.data.metrics);
      if (categoriesRes.data.success)
        setCategories(categoriesRes.data.categories);

      if (productsRes.data.success) {
        const normalized = productsRes.data.products.map((p: Product) => ({
          ...p,
          status: normalizeStatus(p.status),
          upload_status: normalizeUploadStatus(p.upload_status),
        }));
        setProducts(normalized);

        if (normalized.length > 0) {
          setFilterOptions({
            categories: [
              ...new Set(normalized.map((p: Product) => p.category)),
            ].filter(Boolean) as string[],
            statuses: [
              ...new Set(normalized.map((p: Product) => p.status)),
            ].filter(Boolean) as string[],
            shops: [...new Set(normalized.map((p: Product) => p.shop))].filter(
              Boolean,
            ) as string[],
            boostPlans: ["Basic", "Premium", "Ultimate", "None"],
            conditions: [
              ...new Set(
                normalized.map((p: Product) => getConditionLabel(p.condition)),
              ),
            ].filter(Boolean) as string[],
          });
        }
      }
    } catch (error) {
      console.error("Error fetching product data:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
    fetchProductData(range.start, range.end, range.rangeType);
  };

  const refreshCategories = async () => {
    setIsLoading(true);
    try {
      const categoriesResponse = await AxiosInstance.get(
        `/admin-products/get_categories/`,
      );
      if (categoriesResponse.data.success) {
        setCategories(categoriesResponse.data.categories);
        toast.success("Categories refreshed successfully");
      }
      await fetchProductData(
        dateRange.start,
        dateRange.end,
        dateRange.rangeType,
      );
    } catch (error) {
      toast.error("Failed to refresh categories");
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = productMetrics || {
    total_products: 0,
    low_stock_alert: 0,
    active_boosts: 0,
    avg_rating: 0,
    has_data: false,
    growth_metrics: {},
  };

  const formatPercentage = (value: number) => {
    if (value === undefined || value === null) return "N/A";
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const growthMetrics = metrics.growth_metrics || {};

  const productFilterConfig = {
    category: { options: filterOptions.categories, placeholder: "Category" },
    status: { options: filterOptions.statuses, placeholder: "Status" },
    shop: { options: filterOptions.shops, placeholder: "Shop" },
  };

  const getCategoryColor = (category: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-green-100 text-green-800 border-green-200",
      "bg-purple-100 text-purple-800 border-purple-200",
      "bg-yellow-100 text-yellow-800 border-yellow-200",
      "bg-pink-100 text-pink-800 border-pink-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200",
      "bg-red-100 text-red-800 border-red-200",
      "bg-teal-100 text-teal-800 border-teal-200",
      "bg-orange-100 text-orange-800 border-orange-200",
      "bg-cyan-100 text-cyan-800 border-cyan-200",
    ];
    const hash = category
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Build columns with access to user context
  const columns = buildColumns(user);

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Products</h1>
            </div>
          </div>

          {/* Date Range Filter */}
          <DateRangeFilter
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Products
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {isLoading ? "..." : metrics.total_products}
                    </p>
                    {!isLoading &&
                      growthMetrics.product_growth !== undefined && (
                        <div
                          className={`flex items-center gap-1 mt-2 text-sm ${growthMetrics.product_growth >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {growthMetrics.product_growth >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {formatPercentage(growthMetrics.product_growth)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            vs previous {growthMetrics.period_days || 7} days
                          </span>
                        </div>
                      )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Across all categories
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Low Stock Alert
                    </p>
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {isLoading ? "..." : metrics.low_stock_alert}
                    </p>
                    {!isLoading &&
                      growthMetrics.low_stock_growth !== undefined && (
                        <div
                          className={`flex items-center gap-1 mt-2 text-sm ${growthMetrics.low_stock_growth >= 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          {growthMetrics.low_stock_growth >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {formatPercentage(growthMetrics.low_stock_growth)}
                          </span>
                        </div>
                      )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Need restocking
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Active Boosts
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {isLoading ? "..." : metrics.active_boosts}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Running now
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Zap className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold mt-1">
                      {isLoading
                        ? "..."
                        : metrics.avg_rating > 0
                          ? `${metrics.avg_rating.toFixed(1)}★`
                          : "No ratings"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Overall quality
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Star className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categories Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Product Categories
                  </CardTitle>
                  <CardDescription>
                    Total categories: {categories.length} | Total products:{" "}
                    {products.length}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshCategories}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                  <AddCategoryModalDrawer
                    onCategoryAdded={refreshCategories}
                    userId={user?.id || ""}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24 rounded-full" />
                  ))}
                </div>
              ) : categoryStats.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {categoryStats.map((category) => (
                    <div
                      key={category.name}
                      className={`group relative px-4 py-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${getCategoryColor(category.name)} ${selectedCategory === category.name ? "ring-2 ring-offset-1 ring-current" : ""}`}
                      onClick={() =>
                        setSelectedCategory(
                          category.name === selectedCategory
                            ? "all"
                            : category.name,
                        )
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5" />
                          <span className="font-medium text-sm">
                            {category.name}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="ml-2 bg-white/50 text-xs"
                        >
                          {category.count}
                        </Badge>
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-current opacity-50"
                          style={{
                            width: `${Math.min(category.percentage, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs mt-1 opacity-75">
                        {category.percentage.toFixed(1)}% of total
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-gray-300">
                          {category.count} products
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex p-3 rounded-full bg-gray-100 mb-4">
                    <Tag className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    No Categories Found
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    No product categories have been created yet. Add your first
                    category to get started.
                  </p>
                  <AddCategoryModalDrawer
                    onCategoryAdded={refreshCategories}
                    userId={user?.id || ""}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>All Products</CardTitle>
                  <CardDescription>
                    {dateRange.start && dateRange.end
                      ? `Products from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`
                      : "Showing all products"}
                  </CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    `${products.length} products found`
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={products}
                  filterConfig={productFilterConfig}
                  searchConfig={{
                    column: "name",
                    placeholder: "Search products...",
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

// ─── Columns Factory ─────────────────────────────────────────────────────────

function buildColumns(user: any): ColumnDef<Product>[] {
  const handleAction = async (product: Product, actionType: string) => {
    let reason = "";
    let suspensionDays = 7;

    if (actionType === "remove" || actionType === "suspend") {
      reason =
        prompt(
          `Enter reason for ${actionType === "remove" ? "removal" : "suspension"}:`,
        ) || "";
      if (!reason) {
        toast.error("Reason is required");
        return;
      }

      if (actionType === "suspend") {
        const daysInput = prompt("Enter suspension days (default: 7):", "7");
        suspensionDays = parseInt(daysInput || "7", 10);
        if (isNaN(suspensionDays) || suspensionDays <= 0) suspensionDays = 7;
      }
    }

    // Resolve the admin user ID with fallbacks
    const adminId =
      user?.id || user?.user_id || localStorage.getItem("userId") || "";

    if (!adminId) {
      toast.error("User authentication required. Please log in again.");
      return;
    }

    try {
      const payload = {
        product_id: product.id,
        action_type: actionType,
        user_id: adminId, // ← was user?.id (could be undefined)
        ...(reason && { reason }),
        ...(actionType === "suspend" && { suspension_days: suspensionDays }),
      };

      const response = await AxiosInstance.put(
        "/admin-products/update_product_status/",
        payload,
        {
          headers: { "X-User-Id": adminId }, // ← was user?.id (could be undefined)
        },
      );

      if (response.data.success || response.data.message) {
        toast.success(
          response.data.message || "Product status updated successfully",
        );
        window.location.reload();
      } else {
        toast.error(response.data.error || "Failed to update product status");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to update product status",
      );
    }
  };

  const getAvailableActions = (product: Product) => {
    const actions: {
      label: string;
      action: string;
      variant: "default" | "secondary" | "outline" | "destructive";
    }[] = [];
    const normalizedStatus = normalizeStatus(product.status);
    const normalizedUploadStatus = normalizeUploadStatus(product.upload_status);

    if (normalizedUploadStatus === "Draft" && !product.is_removed) {
      actions.push({ label: "Publish", action: "publish", variant: "default" });
      actions.push({
        label: "Delete",
        action: "deleteDraft",
        variant: "destructive",
      });
    }

    if (normalizedUploadStatus === "Published" && !product.is_removed) {
      if (normalizedStatus === "Active") {
        actions.push({
          label: "Unpublish",
          action: "unpublish",
          variant: "secondary",
        });
        actions.push({
          label: "Archive",
          action: "archive",
          variant: "outline",
        });
        actions.push({
          label: "Suspend",
          action: "suspend",
          variant: "destructive",
        });
        actions.push({
          label: "Remove",
          action: "remove",
          variant: "destructive",
        });
      } else if (normalizedStatus === "Suspended") {
        actions.push({
          label: "Unsuspend",
          action: "unsuspend",
          variant: "default",
        });
        actions.push({
          label: "Remove",
          action: "remove",
          variant: "destructive",
        });
      }
    }

    if (normalizedUploadStatus === "Archived" && !product.is_removed) {
      actions.push({ label: "Restore", action: "restore", variant: "default" });
      actions.push({
        label: "Remove",
        action: "remove",
        variant: "destructive",
      });
    }

    if (product.is_removed) {
      actions.push({
        label: "Restore",
        action: "restoreRemoved",
        variant: "default",
      });
    }

    return actions;
  };

  return [
    // ── Product Name + Seller ──
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="min-w-[180px]">
            <div className="font-medium text-sm">{product.name}</div>
            {product.description && (
              <div
                className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5"
                title={product.description}
              >
                {product.description}
              </div>
            )}
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {product.customer.first_name} {product.customer.last_name}
              </span>
              <span className="text-xs text-blue-600">
                @{product.customer.username}
              </span>
            </div>
          </div>
        );
      },
    },

    // ── Category ──
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {row.getValue("category")}
        </Badge>
      ),
    },

    // ── Shop ──
    {
      accessorKey: "shop",
      header: "Shop",
      cell: ({ row }) => (
        <div className="text-sm whitespace-nowrap">{row.getValue("shop")}</div>
      ),
    },

    // ── Condition ──
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => {
        const condition = row.getValue("condition") as number;
        return (
          <Badge
            variant="outline"
            className={`text-xs ${getConditionColor(condition)}`}
          >
            {getConditionLabel(condition)}
          </Badge>
        );
      },
    },

    // ── Price ──
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        // Price is already formatted from backend e.g. "₱30,972.34"
        return (
          <div className="font-medium text-sm whitespace-nowrap">
            {row.getValue("price")}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        return (
          parseFloat(rowA.original.min_price) -
          parseFloat(rowB.original.min_price)
        );
      },
    },

    // ── Stock ──
    {
      accessorKey: "total_stock",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${product.low_stock ? "text-red-600" : ""}`}
              >
                {product.total_stock}
              </span>
              {product.low_stock && (
                <span title="Low stock">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </span>
              )}
            </div>
            {product.variants_count > 1 && (
              <div className="text-xs text-muted-foreground">
                {product.variants_count} variants
                {product.low_stock_variants > 0 && (
                  <span className="text-amber-600 ml-1">
                    · {product.low_stock_variants} low
                  </span>
                )}
                {product.out_of_stock_variants > 0 && (
                  <span className="text-red-600 ml-1">
                    · {product.out_of_stock_variants} OOS
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        if (value === "all") return true;
        const p = row.original;
        if (value === "low") return p.low_stock;
        if (value === "in-stock") return !p.low_stock && p.total_stock > 0;
        if (value === "out-of-stock") return p.total_stock === 0;
        return true;
      },
    },

    // ── Status ──
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const product = row.original;
        return (
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <StatusBadge status={status} type="status" />
            <StatusBadge status={product.upload_status} type="upload" />
            {product.is_removed && (
              <div className="flex flex-col gap-0.5">
                <StatusBadge status="Removed" type="removed" />
                {product.removal_reason && (
                  <span
                    className="text-xs text-muted-foreground truncate max-w-[120px] cursor-help"
                    title={`Reason: ${product.removal_reason}`}
                  >
                    {product.removal_reason}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },

    // ── Rating & Reviews ──
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <Star
                className={`w-4 h-4 ${product.rating > 0 ? "text-yellow-500 fill-current" : "text-gray-300"}`}
              />
              <span className="text-sm">
                {product.rating > 0 ? product.rating.toFixed(1) : "—"}
              </span>
            </div>
            {product.total_reviews > 0 && (
              <div className="text-xs text-muted-foreground">
                {product.total_reviews} review
                {product.total_reviews !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        );
      },
    },

    // ── Refund Policy ──
    {
      id: "refund",
      header: "Refund",
      cell: ({ row }) => {
        const product = row.original;
        if (product.is_refundable) {
          return (
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 text-xs"
              >
                {product.refund_days}d
              </Badge>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1">
            <ShieldOff className="w-3.5 h-3.5 text-gray-400" />
            <Badge
              variant="outline"
              className="bg-gray-50 text-gray-500 border-gray-200 text-xs"
            >
              None
            </Badge>
          </div>
        );
      },
    },

    // ── Actions ──
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const product = row.original;
        const actions = getAvailableActions(product);

        return (
          <div className="flex items-center gap-2">
            <Link
              to={`/admin/products/${product.id}`}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </Link>

            {actions.length > 0 && (
              <Select onValueChange={(value) => handleAction(product, value)}>
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
}
