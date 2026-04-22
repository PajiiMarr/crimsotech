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
  Package,
  ArrowUpDown,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Clock,
  AlertCircle,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Zap,
  Wallet,
  Truck,
  DollarSign,
  PiggyBank,
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

export function meta(): Route.MetaDescriptors {
  return [{ title: "Shops | Admin" }];
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
  status: "Active" | "Inactive" | "Suspended" | "Pending" | "Banned" | "Deleted";
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
  sales_summary?: {
    completed_revenue: number;
    pending_revenue: number;
    total_revenue: number;
    platform_fees: number;
    shipping_fees: number;
    incoming_balance: number;
  };
  growth_metrics?: {
    shop_growth?: number;
    previous_period_total?: number;
    period_days?: number;
  };
}

interface LoaderData {
  user: any;
}

// ── Format Currency Helper (shows full number, no K/M abbreviation) ─────────

const formatCurrencyFull = (amount: number): string => {
  if (amount === undefined || amount === null) return "₱0.00";
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── Format Number Helper (for non-currency numbers, shows full number) ───────

const formatNumberFull = (value: number): string => {
  if (value === undefined || value === null) return "0";
  return value.toLocaleString();
};

// ── Sales Card Component ──────────────────────────────────────────────────────

interface SalesCardProps {
  title: string;
  completedRevenue: number;
  pendingRevenue: number;
  totalRevenue: number;
  platformFees: number;
  shippingFees: number;
  isLoading: boolean;
}

function SalesCard({
  title,
  completedRevenue,
  pendingRevenue,
  totalRevenue,
  platformFees,
  shippingFees,
  isLoading,
}: SalesCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mt-1" />
          <Skeleton className="h-3 w-40 mt-2" />
        </CardContent>
      </Card>
    );
  }

  const netEarnings = completedRevenue - platformFees;

  return (
    <>
      <Card
        className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">
                {formatCurrencyFull(totalRevenue)}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Completed: {formatCurrencyFull(completedRevenue)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-500" />
                  Incoming: {formatCurrencyFull(pendingRevenue)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click for breakdown</p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
              <PiggyBank className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-green-600 rounded-full">
                <PiggyBank className="w-4 h-4 text-white" />
              </div>
              Sales & Revenue Breakdown
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of platform sales and revenue for the selected period
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                <p className="text-sm font-medium text-green-700">Total Revenue</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrencyFull(totalRevenue)}</p>
                <p className="text-xs text-green-600 mt-1">
                  {formatCurrencyFull(completedRevenue)} completed + {formatCurrencyFull(pendingRevenue)} incoming
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-700">Net Earnings (After Fees)</p>
                <p className="text-2xl font-bold text-blue-800">{formatCurrencyFull(netEarnings)}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Platform fees: {formatCurrencyFull(platformFees)}
                </p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Revenue Components</h4>
              
              {/* Completed Revenue */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Completed Revenue</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrencyFull(completedRevenue)}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  Orders with status "completed" or "delivered" - fully realized sales
                </p>
              </div>

              {/* Pending Revenue / Incoming Balance */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm font-medium">Incoming Balance (Pending)</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrencyFull(pendingRevenue)}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  Orders with status "pending", "processing", or "shipped" - will be realized when completed
                </p>
              </div>

              {/* Platform Fees */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">Platform Fees (5%)</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrencyFull(platformFees)}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  5% fee applied only to completed orders (pending orders not yet charged)
                </p>
              </div>

              {/* Shipping Fees */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-sm font-medium">Shipping Fees Collected</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrencyFull(shippingFees)}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  Delivery fees from completed orders
                </p>
              </div>
            </div>

            {/* Visual Representation */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-lg mb-3">Revenue Distribution</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Completed Revenue</span>
                    <span>{totalRevenue > 0 ? ((completedRevenue / totalRevenue) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <Progress 
                    value={totalRevenue > 0 ? (completedRevenue / totalRevenue) * 100 : 0} 
                    className="h-2 bg-gray-200"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Incoming Balance</span>
                    <span>{totalRevenue > 0 ? ((pendingRevenue / totalRevenue) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <Progress 
                    value={totalRevenue > 0 ? (pendingRevenue / totalRevenue) * 100 : 0} 
                    className="h-2 bg-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
              <p className="text-xs text-blue-700">
                💡 <span className="font-semibold">Note:</span> Platform fees (5%) are only deducted from completed orders. 
                Incoming balance represents pending orders that will be realized once the transaction is completed.
              </p>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Interactive Number Card Component ─────────────────────────────────────────

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
  suffix?: string;
}

function InteractiveNumberCard({
  title,
  value,
  icon,
  color,
  breakdown,
  totalLabel = "Total",
  onViewDetails,
  suffix = "",
}: InteractiveNumberCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClick = () => {
    setIsDialogOpen(true);
    if (onViewDetails) onViewDetails();
  };

  const totalBreakdownValue = breakdown.reduce((sum, item) => sum + (item.value || 0), 0);

  const formatValue = (val: number) => {
    if (val === undefined || val === null) return "0";
    return val.toLocaleString();
  };

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
              <p className="text-xl sm:text-2xl font-bold mt-1">
                {formatValue(value)}{suffix}
              </p>
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
              Detailed breakdown of {title.toLowerCase()} - Total: {formatValue(value)}{suffix}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall {title}</p>
                  <p className="text-3xl font-bold">{formatValue(value)}{suffix}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{totalLabel}</p>
                  <p className="text-sm font-medium">{formatValue(totalBreakdownValue)} accounted</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Breakdown</h4>
              {breakdown.filter(item => item.value > 0 || item.label.includes("──")).map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {item.color && item.color !== "bg-transparent" && (
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      )}
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{formatValue(item.value)}</span>
                      {item.percentage !== undefined && (
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {item.percentage !== undefined && item.value > 0 && (
                    <Progress value={item.percentage} className="h-2" />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold text-lg mb-3">Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {breakdown.filter(item => item.value > 0 && !item.label.includes("──")).map((item, index) => {
                  const percentage = item.percentage || (totalBreakdownValue > 0 ? (item.value / totalBreakdownValue) * 100 : 0);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50"
                    >
                      {item.color && item.color !== "bg-transparent" && (
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      )}
                      <span className="text-xs">{item.label}</span>
                      <span className="text-xs font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

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

// ── Action configs ─────────────────────────────────────────────────────────────

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
  verify: {
    title: "Verify Shop",
    description: "This will verify the shop and add a verification badge.",
    confirmText: "Verify",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  unverify: {
    title: "Remove Verification",
    description: "This will remove the verification badge from the shop.",
    confirmText: "Remove Verification",
    variant: "outline",
    needsReason: false,
    needsSuspensionDays: false,
  },
  approve: {
    title: "Approve Shop",
    description: "This will approve the shop and set its status to Active.",
    confirmText: "Approve",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  reject: {
    title: "Reject Shop",
    description: "This will reject the shop application.",
    confirmText: "Reject",
    variant: "destructive",
    needsReason: true,
    needsSuspensionDays: false,
  },
  suspend: {
    title: "Suspend Shop",
    description:
      "This will suspend the shop temporarily. Customers won't be able to view or purchase from it.",
    confirmText: "Suspend",
    variant: "destructive",
    needsReason: true,
    needsSuspensionDays: true,
  },
  unsuspend: {
    title: "Unsuspend Shop",
    description: "This will unsuspend the shop and make it available to customers again.",
    confirmText: "Unsuspend",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  ban: {
    title: "Ban Shop",
    description: "This will permanently ban the shop. This action is severe.",
    confirmText: "Ban Shop",
    variant: "destructive",
    needsReason: true,
    needsSuspensionDays: false,
  },
  unban: {
    title: "Unban Shop",
    description: "This will lift the ban and restore the shop.",
    confirmText: "Unban",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  activate: {
    title: "Activate Shop",
    description: "This will set the shop status to Active.",
    confirmText: "Activate",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  restore: {
    title: "Restore Shop",
    description: "This will restore the deleted/removed shop.",
    confirmText: "Restore",
    variant: "default",
    needsReason: false,
    needsSuspensionDays: false,
  },
  delete: {
    title: "Delete Shop",
    description:
      "This action cannot be undone. This will permanently delete the shop and all its products.",
    confirmText: "Delete Shop",
    variant: "destructive",
    needsReason: true,
    needsSuspensionDays: false,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizeShopStatus = (status: string): string => {
  if (!status) return "Unknown";
  switch (status.toLowerCase()) {
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

const getShopStatusConfig = (status: string) => {
  switch (normalizeShopStatus(status)) {
    case "Active":
      return {
        variant: "default" as const,
        className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        icon: CheckCircle,
        iconClassName: "text-green-600",
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
        className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        icon: AlertTriangle,
        iconClassName: "text-amber-600",
      };
    case "Pending":
      return {
        variant: "secondary" as const,
        className: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
        icon: Clock,
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

// ── ActionsCell ───────────────────────────────────────────────────────────────

function ActionsCell({
  shop,
  user,
  onRefresh,
}: {
  shop: Shop;
  user: any;
  onRefresh: () => void;
}) {
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
      const payload: Record<string, any> = {
        shop_id: shop.id,
        action_type: activeAction,
        user_id: user?.user_id || user?.id,
        ...(reason && { reason }),
        ...(activeAction === "suspend" && { suspension_days: suspensionDays }),
      };

      const response = await AxiosInstance.put(
        "/admin-shops/update_shop_status/",
        payload,
        { headers: { "X-User-Id": user?.user_id || user?.id || "" } },
      );

      if (response.data.success || response.data.message) {
        toast.success(response.data.message || "Shop status updated successfully");
        onRefresh();
      } else {
        toast.error(response.data.error || "Failed to update shop status");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to update shop status",
      );
    } finally {
      setProcessing(false);
      handleCancel();
    }
  };

  const getAvailableActions = () => {
    const actions: { label: string; id: string; destructive: boolean }[] = [];
    const status = normalizeShopStatus(shop.status);

    if (status === "Pending") {
      actions.push({ label: "Approve Shop", id: "approve", destructive: false });
      actions.push({ label: "Reject Shop", id: "reject", destructive: true });
    } else {
      shop.verified
        ? actions.push({ label: "Remove Verification", id: "unverify", destructive: false })
        : actions.push({ label: "Verify Shop", id: "verify", destructive: false });

      if (status === "Active") {
        actions.push({ label: "Suspend Shop", id: "suspend", destructive: true });
        actions.push({ label: "Ban Shop", id: "ban", destructive: true });
      }
      if (status === "Suspended") {
        actions.push({ label: "Unsuspend Shop", id: "unsuspend", destructive: false });
        actions.push({ label: "Ban Shop", id: "ban", destructive: true });
      }
      if (status === "Banned") {
        actions.push({ label: "Unban Shop", id: "unban", destructive: false });
      }
      if (status === "Inactive") {
        actions.push({ label: "Activate Shop", id: "activate", destructive: false });
      }
    }

    shop.is_removed || status === "Deleted"
      ? actions.push({ label: "Restore Shop", id: "restore", destructive: false })
      : actions.push({ label: "Delete Shop", id: "delete", destructive: true });

    return actions;
  };

  const actions = getAvailableActions();
  const safeActions = actions.filter((a) => !a.destructive);
  const dangerActions = actions.filter((a) => a.destructive);

  return (
    <>
      <div className="flex items-center gap-1">
        <Link
          to={`/admin/shops/${shop.id}`}
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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(shop.id)}
            >
              Copy Shop ID
            </DropdownMenuItem>

            {safeActions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {safeActions.map((a) => (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => handleActionClick(a.id)}
                    className="cursor-pointer"
                  >
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

      <AlertDialog
        open={showDialog}
        onOpenChange={!processing ? setShowDialog : undefined}
      >
        <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
          {currentConfig && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{currentConfig.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentConfig.description}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">Shop: {shop.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {shop.status === "Pending" && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-yellow-100 text-yellow-800"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Pending Approval
                    </Badge>
                  )}
                  <Badge
                    variant={shop.verified ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {shop.verified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge
                    variant={shop.is_removed ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {normalizeShopStatus(shop.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatNumberFull(shop.followers || 0)} followers
                  </span>
                </div>
              </div>

              {currentConfig.needsReason && (
                <div className="space-y-2">
                  <Label
                    htmlFor={`reason-${shop.id}`}
                    className="text-sm font-medium"
                  >
                    Reason for{" "}
                    {activeAction === "suspend"
                      ? "Suspension"
                      : activeAction === "reject"
                        ? "Rejection"
                        : activeAction === "ban"
                          ? "Ban"
                          : "Deletion"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`reason-${shop.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={`Enter reason for ${activeAction}ing this shop...`}
                    className="h-10"
                    disabled={processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason will be recorded and may be shared with the shop owner.
                  </p>
                </div>
              )}

              {activeAction === "suspend" && (
                <div className="space-y-2">
                  <Label
                    htmlFor={`days-${shop.id}`}
                    className="text-sm font-medium"
                  >
                    Suspension Duration
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id={`days-${shop.id}`}
                      type="number"
                      min="1"
                      max="365"
                      value={suspensionDays}
                      onChange={(e) =>
                        setSuspensionDays(Math.max(1, parseInt(e.target.value) || 7))
                      }
                      className="h-10 w-24"
                      disabled={processing}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The shop will be automatically unsuspended after this period.
                  </p>
                </div>
              )}

              {currentConfig.variant === "destructive" && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Warning: This action cannot be undone
                  </p>
                  {activeAction === "delete" && (
                    <p className="text-xs text-destructive mt-1">
                      All products, orders, and shop data will be permanently deleted.
                    </p>
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
              disabled={
                processing || (currentConfig?.needsReason === true && !reason.trim())
              }
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

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({
  request,
  context,
}: Route.LoaderArgs): Promise<LoaderData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  let user = (context as any).user;
  if (!user) user = await fetchUserRole({ request, context });
  await requireRole(request, context, ["isAdmin"]);
  return { user };
}

// ── Columns factory ───────────────────────────────────────────────────────────

function buildColumns(
  user: any,
  onRefresh: () => void,
): ColumnDef<Shop>[] {
  return [
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
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          {row.getValue("location") as string}
        </div>
      ),
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          {formatNumberFull((row.getValue("followers") as number) || 0)}
        </div>
      ),
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
          <Package className="w-3.5 h-3.5 text-muted-foreground" />
          {formatNumberFull((row.getValue("products") as number) || 0)}
        </div>
      ),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const shop = row.original;
        const rating = shop.rating || 0;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <Star
                className={`w-4 h-4 ${rating > 0 ? "text-yellow-500 fill-current" : "text-gray-300"}`}
              />
              <span className="text-sm">
                {rating > 0 ? rating.toFixed(1) : "—"}
              </span>
            </div>
            {(shop.totalRatings || 0) > 0 && (
              <div className="text-xs text-muted-foreground">
                {formatNumberFull(shop.totalRatings || 0)} review{(shop.totalRatings || 0) !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "totalRevenue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Revenue
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const shop = row.original;
        const totalRevenue = shop.total_revenue || shop.totalSales || 0;
        const completedRevenue = shop.completed_revenue || 0;
        const pendingRevenue = shop.pending_revenue || 0;
        return (
          <div className="space-y-0.5 min-w-[140px]">
            <div className="font-semibold text-sm">{formatCurrencyFull(totalRevenue)}</div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                {formatCurrencyFull(completedRevenue)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-yellow-500" />
                {formatCurrencyFull(pendingRevenue)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const shop = row.original;
        return (
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <ShopStatusBadge status={shop.status} />
            {shop.status === "Suspended" && shop.suspension_reason && (
              <span
                className="text-xs text-muted-foreground truncate max-w-[120px] cursor-help"
                title={`Reason: ${shop.suspension_reason}${shop.suspension_end_date ? ` | Until: ${new Date(shop.suspension_end_date).toLocaleDateString()}` : ""}`}
              >
                {shop.suspension_reason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <ActionsCell
          shop={row.original}
          user={user}
          onRefresh={onRefresh}
        />
      ),
    },
  ];
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function Shops({ loaderData }: { loaderData: LoaderData }) {
  const { user } = loaderData;

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
    sales_summary: {
      completed_revenue: 0,
      pending_revenue: 0,
      total_revenue: 0,
      platform_fees: 0,
      shipping_fees: 0,
      incoming_balance: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    rangeType: "weekly" as "daily" | "weekly" | "monthly" | "yearly" | "custom",
  });

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

      const [metricsResponse, shopsResponse] = await Promise.all([
        AxiosInstance.get(`/admin-shops/get_metrics/?${params.toString()}`),
        AxiosInstance.get(`/admin-shops/get_shops_list/?${params.toString()}`),
      ]);

      if (metricsResponse.data.success) {
        setShopMetrics({
          ...metricsResponse.data.metrics,
          sales_summary: metricsResponse.data.metrics.sales_summary || {
            completed_revenue: 0,
            pending_revenue: 0,
            total_revenue: 0,
            platform_fees: 0,
            shipping_fees: 0,
            incoming_balance: 0,
          },
        });
      }
      if (shopsResponse.data.success) {
        setShops(
          shopsResponse.data.shops.map((s: Shop) => ({
            ...s,
            status: normalizeShopStatus(s.status),
            followers: s.followers || 0,
            products: s.products || 0,
            rating: s.rating || 0,
            totalRatings: s.totalRatings || 0,
            totalSales: s.totalSales || 0,
            completed_revenue: s.completed_revenue || 0,
            pending_revenue: s.pending_revenue || 0,
            total_revenue: s.total_revenue || 0,
            incoming_balance: s.incoming_balance || 0,
            platform_fees: s.platform_fees || 0,
            shipping_fees: s.shipping_fees || 0,
            completed_orders: s.completed_orders || 0,
            pending_orders: s.pending_orders || 0,
            total_orders: s.total_orders || 0,
          })),
        );
      }
    } catch (error) {
      console.error("Error fetching shop data:", error);
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData(dateRange.start, dateRange.end, dateRange.rangeType);
  }, []);

  const handleDateRangeChange = (range: {
    start: Date;
    end: Date;
    rangeType: string;
  }) => {
    setDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as any,
    });
    fetchShopData(range.start, range.end, range.rangeType);
  };

  const calculateTotalShopsBreakdown = () => {
    const statusBreakdown: Record<string, number> = {};
    const verificationBreakdown = {
      "Verified": 0,
      "Unverified": 0,
    };

    (shops || []).forEach((shop) => {
      const status = normalizeShopStatus(shop.status);
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

      if (shop.verified) {
        verificationBreakdown["Verified"]++;
      } else {
        verificationBreakdown["Unverified"]++;
      }
    });

    const totalShops = shopMetrics.total_shops || 0;
    
    return {
      byStatus: Object.entries(statusBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: totalShops > 0 ? (value / totalShops) * 100 : 0,
        color: 
          label === "Active" ? "bg-green-500" :
          label === "Pending" ? "bg-yellow-500" :
          label === "Suspended" ? "bg-amber-500" :
          label === "Banned" ? "bg-red-500" :
          label === "Deleted" ? "bg-rose-500" : "bg-gray-500",
      })),
      byVerification: Object.entries(verificationBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: totalShops > 0 ? (value / totalShops) * 100 : 0,
        color: label === "Verified" ? "bg-blue-500" : "bg-gray-500",
      })),
    };
  };

  const calculateActiveShopsBreakdown = () => {
    const activeShopsList = (shops || []).filter(s => normalizeShopStatus(s.status) === "Active");
    const byVerification = {
      "Verified": activeShopsList.filter(s => s.verified).length,
      "Unverified": activeShopsList.filter(s => !s.verified).length,
    };
    const activeShops = shopMetrics.active_shops || 0;

    return {
      byVerification: Object.entries(byVerification).map(([label, value]) => ({
        label,
        value,
        percentage: activeShops > 0 ? (value / activeShops) * 100 : 0,
        color: label === "Verified" ? "bg-blue-500" : "bg-gray-500",
      })),
    };
  };

  const calculateFollowersBreakdown = () => {
    const byRange = {
      "0-100": 0,
      "101-500": 0,
      "501-1000": 0,
      "1001-5000": 0,
      "5000+": 0,
    };

    (shops || []).forEach((shop) => {
      const followers = shop.followers || 0;
      if (followers <= 100) byRange["0-100"]++;
      else if (followers <= 500) byRange["101-500"]++;
      else if (followers <= 1000) byRange["501-1000"]++;
      else if (followers <= 5000) byRange["1001-5000"]++;
      else byRange["5000+"]++;
    });

    const totalShops = shops.length || 1;
    
    return {
      byRange: Object.entries(byRange).map(([label, value]) => ({
        label,
        value,
        percentage: (value / totalShops) * 100,
        color:
          label === "5000+" ? "bg-purple-500" :
          label === "1001-5000" ? "bg-blue-500" :
          label === "501-1000" ? "bg-green-500" :
          label === "101-500" ? "bg-yellow-500" : "bg-gray-500",
      })),
    };
  };

  const calculateRatingBreakdown = () => {
    const ratingRanges = {
      "4.5-5★": 0,
      "4-4.4★": 0,
      "3-3.9★": 0,
      "2-2.9★": 0,
      "1-1.9★": 0,
      "No Rating": 0,
    };

    (shops || []).forEach((shop) => {
      const rating = shop.rating || 0;
      if (rating >= 4.5) ratingRanges["4.5-5★"]++;
      else if (rating >= 4) ratingRanges["4-4.4★"]++;
      else if (rating >= 3) ratingRanges["3-3.9★"]++;
      else if (rating >= 2) ratingRanges["2-2.9★"]++;
      else if (rating >= 1) ratingRanges["1-1.9★"]++;
      else ratingRanges["No Rating"]++;
    });

    const totalShops = shops.length || 1;
    
    return {
      byRating: Object.entries(ratingRanges).map(([label, value]) => ({
        label,
        value,
        percentage: (value / totalShops) * 100,
        color:
          label === "4.5-5★" ? "bg-yellow-500" :
          label === "4-4.4★" ? "bg-lime-500" :
          label === "3-3.9★" ? "bg-blue-500" :
          label === "2-2.9★" ? "bg-orange-500" :
          label === "1-1.9★" ? "bg-red-500" : "bg-gray-500",
      })),
    };
  };

  const totalShopsBreakdown = calculateTotalShopsBreakdown();
  const activeShopsBreakdown = calculateActiveShopsBreakdown();
  const followersBreakdown = calculateFollowersBreakdown();
  const ratingBreakdown = calculateRatingBreakdown();

  const shopFilterConfig = {
    status: {
      options: [...new Set((shops || []).map((s) => s.status))],
      placeholder: "Status",
    },
    owner: {
      options: [...new Set((shops || []).map((s) => s.owner))],
      placeholder: "Owner",
    },
    location: {
      options: [...new Set((shops || []).map((s) => s.location))],
      placeholder: "Location",
    },
    verification: {
      options: ["Verified", "Unverified"],
      placeholder: "Verification Status",
    },
  };

  const columns = buildColumns(
    user,
    () => fetchShopData(dateRange.start, dateRange.end, dateRange.rangeType),
  );

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

  const salesSummary = shopMetrics.sales_summary || {
    completed_revenue: 0,
    pending_revenue: 0,
    total_revenue: 0,
    platform_fees: 0,
    shipping_fees: 0,
    incoming_balance: 0,
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Shops</h1>
          </div>

          <DateRangeFilter
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />

          {/* Sales Revenue Card */}
          <SalesCard
            title="Platform Sales Revenue"
            completedRevenue={salesSummary.completed_revenue}
            pendingRevenue={salesSummary.pending_revenue}
            totalRevenue={salesSummary.total_revenue}
            platformFees={salesSummary.platform_fees}
            shippingFees={salesSummary.shipping_fees}
            isLoading={isLoading}
          />

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
                  title="Total Shops"
                  value={shopMetrics.total_shops || 0}
                  icon={<Store className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-blue-600"
                  breakdown={[
                    { label: "By Status", value: shopMetrics.total_shops || 0, color: "bg-blue-500" },
                    ...totalShopsBreakdown.byStatus,
                    { label: "──────────", value: 0, color: "bg-transparent" },
                    { label: "By Verification", value: shopMetrics.total_shops || 0, color: "bg-blue-500" },
                    ...totalShopsBreakdown.byVerification,
                  ]}
                  totalLabel="Total Shops"
                />

                <InteractiveNumberCard
                  title="Active Shops"
                  value={shopMetrics.active_shops || 0}
                  icon={<Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-green-600"
                  breakdown={[
                    { label: "By Verification", value: shopMetrics.active_shops || 0, color: "bg-green-500" },
                    ...activeShopsBreakdown.byVerification,
                  ]}
                  totalLabel="Active Shops"
                />

                <InteractiveNumberCard
                  title="Total Followers"
                  value={shopMetrics.total_followers || 0}
                  icon={<Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-purple-600"
                  breakdown={[
                    { label: "By Follower Range", value: shops.length || 0, color: "bg-purple-500" },
                    ...followersBreakdown.byRange,
                  ]}
                  totalLabel="Shops"
                />

                <InteractiveNumberCard
                  title="Avg Rating"
                  value={shopMetrics.avg_rating > 0 ? parseFloat(shopMetrics.avg_rating.toFixed(1)) : 0}
                  icon={<Star className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-yellow-500"
                  suffix="★"
                  breakdown={[
                    { label: "Rating Distribution", value: shops.length || 0, color: "bg-yellow-500" },
                    ...ratingBreakdown.byRating,
                  ]}
                  totalLabel="Total Shops"
                />
              </>
            )}
          </div>

          {/* Shops Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">All Shops</CardTitle>
              <CardDescription>
                {isLoading ? "Loading shops..." : `Showing ${shops.length} shops`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={shops}
                filterConfig={shopFilterConfig}
                searchConfig={{ column: "name", placeholder: "Search shop..." }}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}