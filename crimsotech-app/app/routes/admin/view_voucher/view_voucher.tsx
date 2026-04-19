// app/routes/admin/view_voucher/view_voucher.tsx
import type { Route } from "./+types/view_voucher";
import { UserProvider } from "~/components/providers/user-role-provider";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import AxiosInstance from "~/components/axios/Axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Tag,
  Store,
  Percent,
  PhilippinePeso,
  Calendar,
  User,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ShoppingBag,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Ticket,
} from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "View Voucher | Admin",
    },
  ];
}

interface VoucherUsage {
  id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  discount_amount: number;
  used_at: string;
  order_total: number;
  final_total: number;
}

interface Voucher {
  id: string;
  name: string;
  code: string;
  description: string | null;
  shop: {
    id: string;
    name: string;
  } | null;
  discount_type: "percentage" | "fixed";
  value: number;
  minimum_spend: number;
  maximum_usage: number;
  usage_count: number;
  start_date: string;
  end_date: string | null;
  added_at: string;
  created_by: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  is_active: boolean;
  status: string;
}

interface LoaderData {
  user: any;
  userId: string | null;
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

  // Get session for authentication
  const { getSession } = await import("~/sessions.server");
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId") || null;

  return { user, userId };
}

export default function ViewVoucher({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  const { user: authUser, userId } = loaderData;
  const { voucher_id } = useParams();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [usages, setUsages] = useState<VoucherUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVoucher = async () => {
      if (!voucher_id) {
        setError("Voucher ID is required");
        setLoading(false);
        return;
      }

      try {
        const headers: Record<string, string> = {};
        if (userId) {
          headers["X-User-Id"] = userId;
        }

        const response = await AxiosInstance.get(
          `/admin-vouchers/${voucher_id}/voucher/`,
          { headers },
        );
        setVoucher(response.data.voucher);
        setUsages(response.data.usages || []);
      } catch (err: any) {
        console.error("Error fetching voucher:", err);
        setError(err.response?.data?.error || "Failed to load voucher data");
      } finally {
        setLoading(false);
      }
    };

    fetchVoucher();
  }, [voucher_id, userId]);

  const handleCopyCode = async () => {
    if (voucher) {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Voucher code copied to clipboard",
      });
    }
  };

  const handleDelete = async () => {
    if (!voucher) return;

    setIsDeleting(true);
    try {
      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      const response = await AxiosInstance.delete(
        `/admin-vouchers/delete_voucher/${voucher.id}/`,
        { headers },
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Voucher deleted successfully",
        });
        navigate("/admin/vouchers");
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to delete voucher",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to delete voucher",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return {
          label: "Active",
          icon: CheckCircle,
          className: "bg-green-100 text-green-700 border-green-200",
          iconClassName: "text-green-600",
        };
      case "scheduled":
        return {
          label: "Scheduled",
          icon: Clock,
          className: "bg-orange-100 text-orange-700 border-orange-200",
          iconClassName: "text-orange-600",
        };
      case "expired":
        return {
          label: "Expired",
          icon: XCircle,
          className: "bg-red-100 text-red-700 border-red-200",
          iconClassName: "text-red-600",
        };
      default:
        return {
          label: "Inactive",
          icon: AlertCircle,
          className: "bg-gray-100 text-gray-700 border-gray-200",
          iconClassName: "text-gray-600",
        };
    }
  };

  const getDiscountDisplay = () => {
    if (!voucher) return "";
    if (voucher.discount_type === "percentage") {
      return `${voucher.value}% OFF`;
    }
    return `₱${voucher.value.toLocaleString()} OFF`;
  };

  if (loading) {
    return (
      <UserProvider user={authUser}>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Loading voucher details...
              </p>
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (error || !voucher) {
    return (
      <UserProvider user={authUser}>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <Tag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Voucher Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || "Unable to load voucher data"}
            </p>
            <Button asChild>
              <a href="/admin/vouchers">Back to Vouchers</a>
            </Button>
          </div>
        </div>
      </UserProvider>
    );
  }

  const statusConfig = getStatusConfig(voucher.status);
  const StatusIcon = statusConfig.icon;
  const usagePercentage =
    voucher.maximum_usage > 0
      ? (voucher.usage_count / voucher.maximum_usage) * 100
      : 0;

  return (
    <UserProvider user={authUser}>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <a href="/admin" className="hover:text-primary">
                Admin
              </a>
              <span>&gt;</span>
              <a href="/admin/vouchers" className="hover:text-primary">
                Vouchers
              </a>
              <span>&gt;</span>
              <span className="text-foreground">{voucher.name}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">{voucher.name}</h1>
              <Badge
                className={`flex items-center gap-1.5 ${statusConfig.className}`}
              >
                <StatusIcon
                  className={`w-3 h-3 ${statusConfig.iconClassName}`}
                />
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                {voucher.code}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
              {copied && (
                <span className="text-xs text-green-600">Copied!</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/vouchers")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usage Count</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">
                    {voucher.usage_count}
                  </p>
                  {voucher.maximum_usage > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Limit: {voucher.maximum_usage}
                    </p>
                  )}
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                  <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Discount Value
                  </p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">
                    {getDiscountDisplay()}
                  </p>
                  {voucher.minimum_spend > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Min spend: ₱{voucher.minimum_spend.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                  {voucher.discount_type === "percentage" ? (
                    <Percent className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  ) : (
                    <PhilippinePeso className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valid Until</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">
                    {voucher.end_date
                      ? new Date(voucher.end_date).toLocaleDateString()
                      : "No expiry"}
                  </p>
                  {voucher.start_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      From: {new Date(voucher.start_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                  <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shop</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1 truncate">
                    {voucher.shop?.name || "Global"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {voucher.shop ? "Shop-specific" : "Applies to all shops"}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                  <Store className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Progress */}
        {voucher.maximum_usage > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Usage Progress</CardTitle>
              <CardDescription>
                {voucher.usage_count} out of {voucher.maximum_usage} uses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ticket className="w-5 h-5" />
                  Voucher Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <p className="font-medium">{voucher.name}</p>
                </div>
                {voucher.description && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Description
                    </label>
                    <p className="text-sm">{voucher.description}</p>
                  </div>
                )}
                <Separator />
                <div>
                  <label className="text-sm text-muted-foreground">
                    Discount Type
                  </label>
                  <p className="font-medium capitalize">
                    {voucher.discount_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Discount Value
                  </label>
                  <p className="font-medium text-lg text-green-600">
                    {getDiscountDisplay()}
                  </p>
                </div>
                <Separator />
                <div>
                  <label className="text-sm text-muted-foreground">
                    Minimum Spend
                  </label>
                  <p className="font-medium">
                    {voucher.minimum_spend > 0
                      ? `₱${voucher.minimum_spend.toLocaleString()}`
                      : "No minimum"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Maximum Usage
                  </label>
                  <p className="font-medium">
                    {voucher.maximum_usage > 0
                      ? voucher.maximum_usage
                      : "Unlimited"}
                  </p>
                </div>
                <Separator />
                <div>
                  <label className="text-sm text-muted-foreground">
                    Start Date
                  </label>
                  <p className="font-medium">
                    {voucher.start_date
                      ? new Date(voucher.start_date).toLocaleString()
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    End Date
                  </label>
                  <p className="font-medium">
                    {voucher.end_date
                      ? new Date(voucher.end_date).toLocaleString()
                      : "No expiry"}
                  </p>
                </div>
                <Separator />
                <div>
                  <label className="text-sm text-muted-foreground">
                    Created By
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {voucher.created_by
                        ? `${voucher.created_by.first_name} ${voucher.created_by.last_name}`
                        : "System"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Added At
                  </label>
                  <p className="font-medium">
                    {new Date(voucher.added_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Status
                  </label>
                  <Badge className={`mt-1 ${statusConfig.className}`}>
                    <StatusIcon
                      className={`w-3 h-3 mr-1 ${statusConfig.iconClassName}`}
                    />
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Usage History */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="w-5 h-5" />
                  Usage History
                </CardTitle>
                <CardDescription>
                  {usages.length} orders have used this voucher
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usages.length > 0 ? (
                  <div className="space-y-4">
                    {usages.map((usage) => (
                      <div
                        key={usage.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {usage.user_name}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Order ID: #{usage.order_id}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Used on:{" "}
                              {new Date(usage.used_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                Original:{" "}
                              </span>
                              <span className="line-through">
                                ₱{usage.order_total.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                Discount:{" "}
                              </span>
                              <span className="text-green-600">
                                -₱{usage.discount_amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="font-semibold mt-1">
                              Final: ₱{usage.final_total.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No usage history for this voucher</p>
                    <p className="text-sm mt-1">
                      This voucher hasn't been used yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Card */}
            {usages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PhilippinePeso className="w-5 h-5" />
                    Usage Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Total Uses
                      </p>
                      <p className="text-2xl font-bold">{usages.length}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Total Discount Given
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        ₱
                        {usages
                          .reduce((sum, u) => sum + u.discount_amount, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              voucher "{voucher.name}" (Code: {voucher.code}).
              {voucher.usage_count > 0 && (
                <span className="block mt-2 text-orange-600">
                  Note: This voucher has been used {voucher.usage_count} times.
                  Deleting it will remove it from the system.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UserProvider>
  );
}
