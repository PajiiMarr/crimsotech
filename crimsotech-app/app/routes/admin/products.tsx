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
  MoreHorizontal,
  Layers,
  ShoppingBag,
  DollarSign,
  Percent,
  TrendingUp as TrendingUpIcon,
  AlertCircle,
  ThumbsUp,
  Gift,
} from "lucide-react";
import { useState, useEffect } from "react";
import AxiosInstance from "~/components/axios/Axios";
import DateRangeFilter from "~/components/ui/date-range-filter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Progress } from "~/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

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
  price: string;
  min_price: string;
  max_price: string;
  total_stock: number;
  condition: number;
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

// ─── Action Configs ──────────────────────────────────────────────────────────

const actionConfigs: Record<
  string,
  {
    title: string;
    description: string;
    confirmText: string;
    variant: "default" | "destructive" | "outline";
    needsReason: boolean;
    needsSuspensionDays: boolean;
  }
> = {
  publish: {
    title: "Publish Product",
    description: "Are you sure you want to publish this product? This will make it visible to customers.",
    confirmText: "Publish",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  unpublish: {
    title: "Unpublish Product",
    description: "This will unpublish the product and make it invisible to customers.",
    confirmText: "Unpublish",
    variant: "outline",
    needsReason: false,
    needsSuspensionDays: false,
  },
  archive: {
    title: "Archive Product",
    description: "This will archive the product. It can be restored later if needed.",
    confirmText: "Archive",
    variant: "outline",
    needsReason: false,
    needsSuspensionDays: false,
  },
  restore: {
    title: "Restore Product",
    description: "This will restore the product to its previous state.",
    confirmText: "Restore",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  remove: {
    title: "Remove Product",
    description: "This will remove the product from the platform. This action can be reversed.",
    confirmText: "Remove",
    variant: "destructive",
    needsReason: true,
    needsSuspensionDays: false,
  },
  restoreRemoved: {
    title: "Restore Product",
    description: "This will restore the removed product and make it available again.",
    confirmText: "Restore",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  suspend: {
    title: "Suspend Product",
    description: "This will suspend the product temporarily. Customers won't be able to view or purchase it.",
    confirmText: "Suspend",
    variant: "destructive",
    needsReason: true,
    needsSuspensionDays: true,
  },
  unsuspend: {
    title: "Unsuspend Product",
    description: "This will unsuspend the product and make it available to customers again.",
    confirmText: "Unsuspend",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  deleteDraft: {
    title: "Delete Draft",
    description: "Are you sure you want to delete this draft product? This action cannot be undone.",
    confirmText: "Delete",
    variant: "destructive",
    needsReason: false,
    needsSuspensionDays: false,
  },
};

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

const getCategoryColor = (category: string): string => {
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
  const hash = category.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
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
      return uploadStatus.charAt(0).toUpperCase() + uploadStatus.slice(1).toLowerCase();
  }
};

const getStatusConfig = (status: string) => {
  const normalizedStatus = normalizeStatus(status);
  switch (normalizedStatus) {
    case "Active":
    case "Published":
      return {
        variant: "default" as const,
        className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
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
      return {
        variant: "destructive" as const,
        className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        icon: AlertTriangle,
        iconClassName: "text-amber-600",
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
        className: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
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
        className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        icon: Clock,
        iconClassName: "text-amber-600",
      };
    case "Out of Stock":
      return {
        variant: "secondary" as const,
        className: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
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
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
        icon: PlayCircle,
        iconClassName: "text-emerald-600",
      };
    case "draft":
      return {
        variant: "secondary" as const,
        className: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
        icon: PauseCircle,
        iconClassName: "text-slate-600",
      };
    case "archived":
      return {
        variant: "outline" as const,
        className: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
        icon: Archive,
        iconClassName: "text-violet-600",
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

function StatusBadge({ status, type = "status" }: { status: string; type?: "status" | "upload" | "removed" }) {
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
    <Badge variant={config.variant} className={`flex items-center gap-1.5 text-xs ${config.className}`}>
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {status}
    </Badge>
  );
}

// ─── Add Category Modal/Drawer ───────────────────────────────────────────────

function AddCategoryModalDrawer({ onCategoryAdded, userId }: { onCategoryAdded?: () => void; userId: string }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "" });

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
      const response = await AxiosInstance.post("/admin-products/add_category/", payload, {
        headers: { "X-User-Id": sessionUserId },
      });

      if (response.data.success) {
        toast.success(response.data.message || "Category added successfully!");
        setFormData({ name: "" });
        setOpen(false);
        if (onCategoryAdded) onCategoryAdded();
      } else {
        toast.error(response.data.message || "Failed to add category");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to add category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add Category
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new product category. Name is required (max 50 characters).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Electronics, Clothing, Books"
                required
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Maximum 50 characters. {50 - formData.name.length} characters remaining.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="mt-6 sm:flex-row flex-col gap-2">
            <AlertDialogCancel onClick={() => setOpen(false)} className="mt-0 sm:w-auto w-full order-2 sm:order-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isLoading} className="sm:w-auto w-full order-1 sm:order-2">
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Category"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Interactive Number Card Component ───────────────────────────────────────

interface InteractiveNumberCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  breakdown: {
    label: string;
    value: number;
    percentage?: number;
    color?: string;
  }[];
  totalLabel?: string;
  onViewDetails?: () => void;
}

function InteractiveNumberCard({
  title,
  value,
  icon,
  color,
  breakdown,
  totalLabel = "Total",
  onViewDetails,
}: InteractiveNumberCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClick = () => {
    setIsDialogOpen(true);
    if (onViewDetails) onViewDetails();
  };

  const totalBreakdownValue = breakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <>
      <Card
        className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
        onClick={handleClick}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Click for breakdown</p>
            </div>
            <div className={`p-2 sm:p-3 ${color} rounded-full`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`p-2 ${color} rounded-full`}>
                {icon}
              </div>
              {title} Breakdown
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of {title.toLowerCase()} - Total: {value.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall {title}</p>
                  <p className="text-3xl font-bold">{value.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{totalLabel}</p>
                  <p className="text-sm font-medium">{totalBreakdownValue.toLocaleString()} accounted</p>
                </div>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Breakdown by Category</h4>
              {breakdown.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color || color.replace('bg-', 'bg-').replace('/10', '')}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{item.value.toLocaleString()}</span>
                      {item.percentage !== undefined && (
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {item.percentage !== undefined && (
                    <Progress value={item.percentage} className="h-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Chart Visualization */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-lg mb-3">Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {breakdown.map((item, index) => {
                  const percentage = item.percentage || (totalBreakdownValue > 0 ? (item.value / totalBreakdownValue) * 100 : 0);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50"
                    >
                      <div className={`w-2 h-2 rounded-full ${item.color || color.replace('bg-', 'bg-').replace('/10', '')}`} />
                      <span className="text-xs">{item.label}</span>
                      <span className="text-xs font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
              {onViewDetails && (
                <Button onClick={() => {
                  setIsDialogOpen(false);
                  onViewDetails();
                }}>
                  View All {title}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Actions Cell ────────────────────────────────────────────────────────────

function ActionsCell({ product, user, onRefresh }: { product: Product; user: any; onRefresh: () => void }) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [processing, setProcessing] = useState(false);

  const currentConfig = activeAction ? actionConfigs[activeAction] : null;

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
    setReason("");
    setSuspensionDays(7);
    setShowDialog(true);
  };

  const handleCancel = () => {
    if (processing) return;
    setShowDialog(false);
    setActiveAction(null);
    setReason("");
    setSuspensionDays(7);
  };

  const handleConfirm = async () => {
    if (!activeAction || !currentConfig) return;
    if (currentConfig.needsReason && !reason.trim()) {
      toast.error("Please provide a reason for this action");
      return;
    }

    setProcessing(true);
    try {
      const adminId = user?.id || user?.user_id || localStorage.getItem("userId") || "";

      if (!adminId) {
        toast.error("User authentication required. Please log in again.");
        setProcessing(false);
        return;
      }

      const payload: any = {
        product_id: product.id,
        action_type: activeAction,
        user_id: adminId,
      };

      if (reason.trim()) payload.reason = reason;
      if (activeAction === "suspend") payload.suspension_days = suspensionDays;

      const response = await AxiosInstance.put("/admin-products/update_product_status/", payload, {
        headers: { "X-User-Id": adminId },
      });

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || "Product status updated successfully");
        onRefresh();
      } else {
        toast.error(response.data.error || "Failed to update product status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to update product status");
    } finally {
      setProcessing(false);
      handleCancel();
    }
  };

  const getAvailableActions = () => {
    const actions: { label: string; id: string; destructive: boolean }[] = [];
    const normalizedStatus = normalizeStatus(product.status);
    const normalizedUploadStatus = normalizeUploadStatus(product.upload_status);

    if (normalizedUploadStatus === "Draft" && !product.is_removed) {
      actions.push({ label: "Publish", id: "publish", destructive: false });
      actions.push({ label: "Delete Draft", id: "deleteDraft", destructive: true });
    }

    if (normalizedUploadStatus === "Published" && !product.is_removed) {
      if (normalizedStatus === "Active") {
        actions.push({ label: "Unpublish", id: "unpublish", destructive: false });
        actions.push({ label: "Archive", id: "archive", destructive: false });
        actions.push({ label: "Suspend", id: "suspend", destructive: true });
        actions.push({ label: "Remove", id: "remove", destructive: true });
      } else if (normalizedStatus === "Suspended") {
        actions.push({ label: "Unsuspend", id: "unsuspend", destructive: false });
        actions.push({ label: "Remove", id: "remove", destructive: true });
      }
    }

    if (normalizedUploadStatus === "Archived" && !product.is_removed) {
      actions.push({ label: "Restore", id: "restore", destructive: false });
      actions.push({ label: "Remove", id: "remove", destructive: true });
    }

    if (product.is_removed) {
      actions.push({ label: "Restore Product", id: "restoreRemoved", destructive: false });
    }

    return actions;
  };

  const actions = getAvailableActions();
  const safeActions = actions.filter((a) => !a.destructive);
  const dangerActions = actions.filter((a) => a.destructive);

  return (
    <>
      <div className="flex items-center gap-1">
        <Link
          to={`/admin/products/${product.id}`}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>
              Copy Product ID
            </DropdownMenuItem>

            {safeActions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {safeActions.map((a) => (
                  <DropdownMenuItem key={a.id} onClick={() => handleActionClick(a.id)} className="cursor-pointer">
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {dangerActions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {dangerActions.map((a) => (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => handleActionClick(a.id)}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDialog} onOpenChange={!processing ? setShowDialog : undefined}>
        <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
          {currentConfig && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{currentConfig.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{currentConfig.description}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">Product: {product.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <StatusBadge status={product.status} type="status" />
                  <StatusBadge status={product.upload_status} type="upload" />
                  {product.is_removed && <StatusBadge status="Removed" type="removed" />}
                  <span className="text-xs text-muted-foreground">Stock: {product.total_stock} units</span>
                </div>
              </div>

              {currentConfig.needsReason && (
                <div className="space-y-2">
                  <Label htmlFor={`reason-${product.id}`} className="text-sm font-medium">
                    Reason for{" "}
                    {activeAction === "suspend"
                      ? "Suspension"
                      : activeAction === "remove"
                        ? "Removal"
                        : activeAction === "reject"
                          ? "Rejection"
                          : "Action"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`reason-${product.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={`Enter reason for ${activeAction}ing this product...`}
                    className="h-10"
                    disabled={processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason will be recorded and may be shared with the seller.
                  </p>
                </div>
              )}

              {activeAction === "suspend" && (
                <div className="space-y-2">
                  <Label htmlFor={`days-${product.id}`} className="text-sm font-medium">
                    Suspension Duration
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id={`days-${product.id}`}
                      type="number"
                      min="1"
                      max="365"
                      value={suspensionDays}
                      onChange={(e) => setSuspensionDays(Math.max(1, parseInt(e.target.value) || 7))}
                      className="h-10 w-24"
                      disabled={processing}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The product will be automatically unsuspended after this period.
                  </p>
                </div>
              )}

              {currentConfig.variant === "destructive" && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Warning: This action may have consequences
                  </p>
                  {activeAction === "deleteDraft" && (
                    <p className="text-xs text-destructive mt-1">This draft will be permanently deleted.</p>
                  )}
                  {activeAction === "remove" && (
                    <p className="text-xs text-destructive mt-1">The product will be hidden from customers.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter className="mt-6 sm:flex-row flex-col gap-2">
            <AlertDialogCancel
              onClick={handleCancel}
              disabled={processing}
              className="mt-0 sm:w-auto w-full order-2 sm:order-1"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={processing || (currentConfig?.needsReason === true && !reason.trim())}
              className={`sm:w-auto w-full order-1 sm:order-2 ${
                currentConfig?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }`}
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                currentConfig?.confirmText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
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
    params.append("start_date", startDate || defaultStartDate.toISOString().split("T")[0]);
    params.append("end_date", endDate || defaultEndDate.toISOString().split("T")[0]);
    if (rangeType) params.append("range_type", rangeType);

    const metricsResponse = await AxiosInstance.get(`/admin-products/get_metrics/?${params.toString()}`, {
      headers: { "X-User-Id": session.get("userId") },
    });
    if (metricsResponse.data.success) {
      productMetrics = metricsResponse.data.metrics;
    }

    const categoriesResponse = await AxiosInstance.get(`/admin-products/get_categories/`, {
      headers: { "X-User-Id": session.get("userId") },
    });
    if (categoriesResponse.data.success) {
      categoriesList = categoriesResponse.data.categories;
    }

    const productsParams = new URLSearchParams(params);
    const productsResponse = await AxiosInstance.get(`/admin-products/get_products_list/?${productsParams.toString()}`, {
      headers: { "X-User-Id": session.get("userId") },
    });

    if (productsResponse.data.success) {
      productsList = productsResponse.data.products.map((product: Product) => ({
        ...product,
        status: normalizeStatus(product.status),
        upload_status: normalizeUploadStatus(product.upload_status),
      }));

      if (productsList.length > 0) {
        filterOptions = {
          categories: [...new Set(productsList.map((p: Product) => p.category))].filter(Boolean) as string[],
          statuses: [...new Set(productsList.map((p: Product) => p.status))].filter(Boolean) as string[],
          shops: [...new Set(productsList.map((p: Product) => p.shop))].filter(Boolean) as string[],
          boostPlans: ["Basic", "Premium", "Ultimate", "None"],
          conditions: [...new Set(productsList.map((p: Product) => getConditionLabel(p.condition)))].filter(Boolean) as string[],
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
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  const [dateRange, setDateRange] = useState({
    start: initialDateRange?.start ? new Date(initialDateRange.start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: initialDateRange?.end ? new Date(initialDateRange.end) : new Date(),
    rangeType: (initialDateRange?.rangeType as "daily" | "weekly" | "monthly" | "yearly" | "custom") || "weekly",
  });

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

  const fetchProductData = async (start: Date, end: Date, rangeType: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("start_date", start.toISOString().split("T")[0]);
      params.append("end_date", end.toISOString().split("T")[0]);
      params.append("range_type", rangeType);

      const [metricsRes, categoriesRes, productsRes] = await Promise.all([
        AxiosInstance.get(`/admin-products/get_metrics/?${params.toString()}`),
        AxiosInstance.get(`/admin-products/get_categories/`),
        AxiosInstance.get(`/admin-products/get_products_list/?${params.toString()}`),
      ]);

      if (metricsRes.data.success) setProductMetrics(metricsRes.data.metrics);
      if (categoriesRes.data.success) setCategories(categoriesRes.data.categories);

      if (productsRes.data.success) {
        const normalized = productsRes.data.products.map((p: Product) => ({
          ...p,
          status: normalizeStatus(p.status),
          upload_status: normalizeUploadStatus(p.upload_status),
        }));
        setProducts(normalized);

        if (normalized.length > 0) {
          setFilterOptions({
            categories: [...new Set(normalized.map((p: Product) => p.category))].filter(Boolean) as string[],
            statuses: [...new Set(normalized.map((p: Product) => p.status))].filter(Boolean) as string[],
            shops: [...new Set(normalized.map((p: Product) => p.shop))].filter(Boolean) as string[],
            boostPlans: ["Basic", "Premium", "Ultimate", "None"],
            conditions: [...new Set(normalized.map((p: Product) => getConditionLabel(p.condition)))].filter(Boolean) as string[],
          });
        }
      }
    } catch (error) {
      console.error("Error fetching product data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as any,
    });
    fetchProductData(range.start, range.end, range.rangeType);
  };

  const refreshCategories = async () => {
    setIsLoading(true);
    try {
      const categoriesResponse = await AxiosInstance.get(`/admin-products/get_categories/`);
      if (categoriesResponse.data.success) {
        setCategories(categoriesResponse.data.categories);
        toast.success("Categories refreshed successfully");
      }
      await fetchProductData(dateRange.start, dateRange.end, dateRange.rangeType);
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

  // Calculate breakdowns for each metric
  const calculateProductBreakdown = () => {
    const statusBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    const conditionBreakdown: Record<string, number> = {};

    products.forEach((product) => {
      // Status breakdown
      const status = product.status;
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

      // Category breakdown
      const category = product.category || "Uncategorized";
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;

      // Condition breakdown
      const condition = getConditionLabel(product.condition);
      conditionBreakdown[condition] = (conditionBreakdown[condition] || 0) + 1;
    });

    return {
      byStatus: Object.entries(statusBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: (value / metrics.total_products) * 100,
        color: "bg-blue-500",
      })),
      byCategory: Object.entries(categoryBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: (value / metrics.total_products) * 100,
        color: "bg-green-500",
      })),
      byCondition: Object.entries(conditionBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: (value / metrics.total_products) * 100,
        color: "bg-purple-500",
      })),
    };
  };

  const calculateLowStockBreakdown = () => {
    const lowStockProducts = products.filter(p => p.low_stock);
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    lowStockProducts.forEach((product) => {
      const category = product.category || "Uncategorized";
      byCategory[category] = (byCategory[category] || 0) + 1;

      const status = product.status;
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return {
      byCategory: Object.entries(byCategory).map(([label, value]) => ({
        label,
        value,
        percentage: metrics.low_stock_alert > 0 ? (value / metrics.low_stock_alert) * 100 : 0,
        color: "bg-red-500",
      })),
      byStatus: Object.entries(byStatus).map(([label, value]) => ({
        label,
        value,
        percentage: metrics.low_stock_alert > 0 ? (value / metrics.low_stock_alert) * 100 : 0,
        color: "bg-orange-500",
      })),
    };
  };

  const calculateBoostBreakdown = () => {
    const boostedProducts = products.filter(p => p.boost);
    const byBoostType: Record<string, number> = {};

    boostedProducts.forEach((product) => {
      const boostType = product.boost || "Unknown";
      byBoostType[boostType] = (byBoostType[boostType] || 0) + 1;
    });

    return {
      byType: Object.entries(byBoostType).map(([label, value]) => ({
        label,
        value,
        percentage: metrics.active_boosts > 0 ? (value / metrics.active_boosts) * 100 : 0,
        color: "bg-yellow-500",
      })),
    };
  };

  const calculateRatingBreakdown = () => {
    const ratingRanges = {
      "5★": 0,
      "4★": 0,
      "3★": 0,
      "2★": 0,
      "1★": 0,
      "No Rating": 0,
    };

    products.forEach((product) => {
      if (product.rating >= 4.5) ratingRanges["5★"]++;
      else if (product.rating >= 3.5) ratingRanges["4★"]++;
      else if (product.rating >= 2.5) ratingRanges["3★"]++;
      else if (product.rating >= 1.5) ratingRanges["2★"]++;
      else if (product.rating >= 0.5) ratingRanges["1★"]++;
      else ratingRanges["No Rating"]++;
    });

    return {
      byRating: Object.entries(ratingRanges).map(([label, value]) => ({
        label,
        value,
        percentage: (value / products.length) * 100,
        color: 
          label === "5★" ? "bg-yellow-500" :
          label === "4★" ? "bg-lime-500" :
          label === "3★" ? "bg-blue-500" :
          label === "2★" ? "bg-orange-500" :
          label === "1★" ? "bg-red-500" : "bg-gray-500",
      })),
    };
  };

  const productBreakdown = calculateProductBreakdown();
  const lowStockBreakdown = calculateLowStockBreakdown();
  const boostBreakdown = calculateBoostBreakdown();
  const ratingBreakdown = calculateRatingBreakdown();

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
          </div>

          <DateRangeFilter onDateRangeChange={handleDateRangeChange} isLoading={isLoading} />

          {/* Interactive Number Cards */}
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
                <InteractiveNumberCard
                  title="Total Products"
                  value={metrics.total_products}
                  icon={<Package className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-blue-600"
                  breakdown={[
                    { label: "By Status", value: metrics.total_products, color: "bg-blue-500" },
                    ...productBreakdown.byStatus.slice(0, 5),
                  ]}
                  totalLabel="Total Products"
                />

                <InteractiveNumberCard
                  title="Low Stock Alert"
                  value={metrics.low_stock_alert}
                  icon={<AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-red-600"
                  breakdown={[
                    { label: "By Category", value: metrics.low_stock_alert, color: "bg-red-500" },
                    ...lowStockBreakdown.byCategory.slice(0, 5),
                  ]}
                  totalLabel="Low Stock Products"
                />

                <InteractiveNumberCard
                  title="Active Boosts"
                  value={metrics.active_boosts}
                  icon={<Zap className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-yellow-600"
                  breakdown={[
                    { label: "By Boost Type", value: metrics.active_boosts, color: "bg-yellow-500" },
                    ...boostBreakdown.byType.slice(0, 5),
                  ]}
                  totalLabel="Active Boosts"
                />

                <InteractiveNumberCard
                  title="Avg Rating"
                  value={metrics.avg_rating > 0 ? parseFloat(metrics.avg_rating.toFixed(1)) : 0}
                  icon={<Star className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-yellow-500"
                  breakdown={[
                    { label: "Rating Distribution", value: products.length, color: "bg-yellow-500" },
                    ...ratingBreakdown.byRating,
                  ]}
                  totalLabel="Total Products"
                />
              </>
            )}
          </div>

          {/* Categories Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Product Categories
                  </CardTitle>
                  <CardDescription>
                    Total categories: {categories.length} | Total products: {products.length}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={refreshCategories} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <AddCategoryModalDrawer onCategoryAdded={refreshCategories} userId={user?.id || ""} />
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
                      onClick={() => setSelectedCategory(category.name === selectedCategory ? "all" : category.name)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5" />
                          <span className="font-medium text-sm">{category.name}</span>
                        </div>
                        <Badge variant="secondary" className="ml-2 bg-white/50 text-xs">
                          {category.count}
                        </Badge>
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-current opacity-50"
                          style={{ width: `${Math.min(category.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs mt-1 opacity-75">{category.percentage.toFixed(1)}% of total</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex p-3 rounded-full bg-gray-100 mb-4">
                    <Tag className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Categories Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    No product categories have been created yet. Add your first category to get started.
                  </p>
                  <AddCategoryModalDrawer onCategoryAdded={refreshCategories} userId={user?.id || ""} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Products</CardTitle>
              <CardDescription>
                {isLoading ? "Loading products..." : `${products.length} products found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={buildColumns(user, () => fetchProductData(dateRange.start, dateRange.end, dateRange.rangeType))}
                data={products}
                filterConfig={{
                  category: { options: filterOptions.categories, placeholder: "Category" },
                  status: { options: filterOptions.statuses, placeholder: "Status" },
                  shop: { options: filterOptions.shops, placeholder: "Shop" },
                }}
                searchConfig={{ column: "name", placeholder: "Search products..." }}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}

// ─── Columns Factory ─────────────────────────────────────────────────────────

function buildColumns(user: any, onRefresh: () => void): ColumnDef<Product>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
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
              <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5" title={product.description}>
                {product.description}
              </div>
            )}
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {product.customer.first_name} {product.customer.last_name}
              </span>
              <span className="text-xs text-blue-600">@{product.customer.username}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "shop",
      header: "Shop",
      cell: ({ row }) => <div className="text-sm whitespace-nowrap">{row.getValue("shop")}</div>,
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => {
        const condition = row.getValue("condition") as number;
        return (
          <Badge variant="outline" className={`text-xs ${getConditionColor(condition)}`}>
            {getConditionLabel(condition)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium text-sm whitespace-nowrap">{row.getValue("price")}</div>,
      sortingFn: (rowA, rowB) => parseFloat(rowA.original.min_price) - parseFloat(rowB.original.min_price),
    },
    {
      accessorKey: "total_stock",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${product.low_stock ? "text-red-600" : ""}`}>
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
                {product.low_stock_variants > 0 && <span className="text-amber-600 ml-1">· {product.low_stock_variants} low</span>}
                {product.out_of_stock_variants > 0 && <span className="text-red-600 ml-1">· {product.out_of_stock_variants} OOS</span>}
              </div>
            )}
          </div>
        );
      },
    },
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
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <Star className={`w-4 h-4 ${product.rating > 0 ? "text-yellow-500 fill-current" : "text-gray-300"}`} />
              <span className="text-sm">{product.rating > 0 ? product.rating.toFixed(1) : "—"}</span>
            </div>
            {product.total_reviews > 0 && (
              <div className="text-xs text-muted-foreground">
                {product.total_reviews} review{product.total_reviews !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "refund",
      header: "Refund",
      cell: ({ row }) => {
        const product = row.original;
        if (product.is_refundable) {
          return (
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                {product.refund_days}d
              </Badge>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1">
            <ShieldOff className="w-3.5 h-3.5 text-gray-400" />
            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-xs">
              None
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <ActionsCell product={row.original} user={user} onRefresh={onRefresh} />,
    },
  ];
}