// app/routes/admin/vouchers.tsx
import type { Route } from "./+types/vouchers";
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
import { Progress } from "~/components/ui/progress";
import {
  Plus,
  Download,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Tag,
  User,
  Percent,
  Copy,
  Store,
  PhilippinePeso,
  CalendarIcon,
  AlertCircle,
  Ticket,
  TrendingUp,
  TrendingDown,
  Zap,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import AxiosInstance from "~/components/axios/Axios";
import DateRangeFilter from "~/components/ui/date-range-filter";
import { useState, useEffect } from "react";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { useIsMobile } from "~/hooks/use-mobile";
import { Calendar as CalendarComponent } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import { Switch } from "~/components/ui/switch";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { ScrollArea } from "~/components/ui/scroll-area";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Vouchers | Admin",
    },
  ];
}

// Interface to match Django Voucher model
interface Voucher {
  id: string;
  name: string;
  code: string;
  shop: {
    id: string;
    name: string;
  } | null;
  discount_type: string;
  value: number;
  capped_at?: number | null;
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
  status?: string;
  shopName?: string;
  minimum_spend: number;
  maximum_usage: number;
  usage_count?: number;
}

interface LoaderData {
  user: any;
  voucherMetrics: {
    total_vouchers: number;
    active_vouchers: number;
    expired_vouchers: number;
    scheduled_vouchers: number;
    total_usage: number;
    total_discount: number;
  };
  vouchers: Voucher[];
  dateRange: {
    start: string;
    end: string;
    rangeType: string;
  };
  shops: { id: string; name: string }[];
  userId: string | null;
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
  filterOptions: {
    discount_types: string[];
    shops: string[];
    statuses: string[];
  };
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

  // Parse URL search params for date range and filters
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  const rangeTypeParam = url.searchParams.get("rangeType");
  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("page_size");
  const searchParam = url.searchParams.get("search");
  const statusParam = url.searchParams.get("status");
  const discountTypeParam = url.searchParams.get("discount_type");
  const shopParam = url.searchParams.get("shop");

  // Set default date range (last 30 days)
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const defaultEnd = new Date();

  const startDate = startParam ? new Date(startParam) : defaultStart;
  const endDate = endParam ? new Date(endParam) : defaultEnd;
  const rangeType = rangeTypeParam || "monthly";

  // Validate dates
  const validStart = !isNaN(startDate.getTime()) ? startDate : defaultStart;
  const validEnd = !isNaN(endDate.getTime()) ? endDate : defaultEnd;

  // Pagination params
  const page = pageParam ? parseInt(pageParam) : 1;
  const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 10;

  // Initialize empty data structures
  let voucherMetrics = {
    total_vouchers: 0,
    active_vouchers: 0,
    expired_vouchers: 0,
    scheduled_vouchers: 0,
    total_usage: 0,
    total_discount: 0,
  };

  let vouchersList: Voucher[] = [];
  let shopsList: { id: string; name: string }[] = [];
  let pagination = {
    page: 1,
    page_size: 10,
    total_count: 0,
    total_pages: 0,
  };
  let filterOptions = {
    discount_types: [] as string[],
    shops: [] as string[],
    statuses: ["active", "expired", "scheduled", "inactive"],
  };

  // Create headers conditionally
  const headers = userId ? { "X-User-Id": userId } : {};

  try {
    // Fetch real data from API with date range parameters
    const metricsResponse = await AxiosInstance.get(
      "/admin-vouchers/get_metrics/",
      {
        params: {
          start_date: validStart.toISOString().split("T")[0],
          end_date: validEnd.toISOString().split("T")[0],
        },
        headers,
      },
    );

    if (metricsResponse.data.success) {
      voucherMetrics = metricsResponse.data.metrics || voucherMetrics;
    }

    // Fetch vouchers list from API with all filters
    const vouchersResponse = await AxiosInstance.get(
      "/admin-vouchers/vouchers_list/",
      {
        headers,
        params: {
          start_date: validStart.toISOString().split("T")[0],
          end_date: validEnd.toISOString().split("T")[0],
          page: page,
          page_size: pageSize,
          search: searchParam || "",
          status: statusParam || "",
          discount_type: discountTypeParam || "",
          shop: shopParam || "",
        },
      },
    );

    if (vouchersResponse.data.success) {
      vouchersList = vouchersResponse.data.vouchers || [];
      pagination = vouchersResponse.data.pagination || pagination;
      filterOptions = {
        ...filterOptions,
        discount_types:
          vouchersResponse.data.filter_options?.discount_types || [],
        shops: vouchersResponse.data.filter_options?.shops || [],
      };
    }

    // Fetch shops for dropdown
    const shopsResponse = await AxiosInstance.get("/shops/", {
      headers,
      params: {
        page_size: 100,
      },
    });

    if (shopsResponse.data && shopsResponse.data.results) {
      shopsList = shopsResponse.data.results.map((shop: any) => ({
        id: shop.id,
        name: shop.name,
      }));
    }
  } catch (error) {
    console.log("API fetch failed - no data available");
  }

  return {
    user,
    voucherMetrics,
    vouchers: vouchersList,
    shops: shopsList,
    dateRange: {
      start: validStart.toISOString(),
      end: validEnd.toISOString(),
      rangeType,
    },
    userId,
    pagination,
    filterOptions,
  };
}

// Interactive Number Card Component
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

  const totalBreakdownValue = breakdown.reduce(
    (sum, item) => sum + (item.value || 0),
    0,
  );

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
                {formatValue(value)}
                {suffix}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Click for breakdown
              </p>
            </div>
            <div className={`p-2 sm:p-3 ${color} rounded-full`}>{icon}</div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`p-2 ${color} rounded-full`}>{icon}</div>
              {title} Breakdown
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of {title.toLowerCase()} - Total:{" "}
              {formatValue(value)}
              {suffix}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Overall {title}
                  </p>
                  <p className="text-3xl font-bold">
                    {formatValue(value)}
                    {suffix}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{totalLabel}</p>
                  <p className="text-sm font-medium">
                    {formatValue(totalBreakdownValue)} accounted
                  </p>
                </div>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Breakdown</h4>
              {breakdown
                .filter((item) => item.value > 0 || item.label.includes("──"))
                .map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {item.color && item.color !== "bg-transparent" && (
                          <div
                            className={`w-3 h-3 rounded-full ${item.color}`}
                          />
                        )}
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold">
                          {formatValue(item.value)}
                        </span>
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

            {/* Chart Visualization */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-lg mb-3">Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {breakdown
                  .filter(
                    (item) => item.value > 0 && !item.label.includes("──"),
                  )
                  .map((item, index) => {
                    const percentage =
                      item.percentage ||
                      (totalBreakdownValue > 0
                        ? (item.value / totalBreakdownValue) * 100
                        : 0);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50"
                      >
                        {item.color && item.color !== "bg-transparent" && (
                          <div
                            className={`w-2 h-2 rounded-full ${item.color}`}
                          />
                        )}
                        <span className="text-xs">{item.label}</span>
                        <span className="text-xs font-medium">
                          {percentage.toFixed(1)}%
                        </span>
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
                <Button
                  onClick={() => {
                    setIsDialogOpen(false);
                    onViewDetails();
                  }}
                >
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

// MetricCardSkeleton for loading state
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

// Empty state components
const EmptyTable = ({ onAddClick }: { onAddClick: () => void }) => (
  <div className="flex flex-col items-center justify-center h-64 py-8">
    <div className="text-center text-muted-foreground">
      <Tag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold mb-2">No vouchers found</h3>
      <p className="text-sm mb-4">
        Get started by creating your first voucher code.
      </p>
      <Button
        onClick={onAddClick}
        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
      >
        <Plus className="w-4 h-4" />
        Create Voucher
      </Button>
    </div>
  </div>
);

// Generate random voucher code
const generateVoucherCode = () => {
  const prefix = "VOUCH";
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
};

// Action Dialog Component
function ActionDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  actionType,
  voucherName,
  voucherCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => Promise<void>;
  title: string;
  description: string;
  actionType: string;
  voucherName: string;
  voucherCode: string;
}) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (actionType === "delete") {
        await onConfirm(reason);
      } else {
        await onConfirm();
      }
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Voucher: {voucherName}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs font-mono">
                {voucherCode}
              </Badge>
            </div>
          </div>

          {actionType === "delete" && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason for Deletion <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for deleting this voucher..."
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be recorded for audit purposes.
              </p>
            </div>
          )}

          {actionType === "delete" && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Warning: This action cannot be undone
              </p>
              <p className="text-xs text-destructive mt-1">
                All voucher data and usage history will be permanently deleted.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter className="mt-6 sm:flex-row flex-col gap-2">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="mt-0 sm:w-auto w-full order-2 sm:order-1"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || (actionType === "delete" && !reason.trim())}
            className={`sm:w-auto w-full order-1 sm:order-2 ${actionType === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              "Confirm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Add Voucher Modal/Drawer Component
interface AddVoucherFormData {
  name: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  value: number | "";
  capped_at: number | "";
  minimum_spend: number | "";
  maximum_usage: number | "";
  start_date: Date | undefined;
  end_date: Date | undefined;
  shop: string | null;
  is_active: boolean;
}

interface AddVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  shops: { id: string; name: string }[];
  userId: string | null;
}

const AddVoucherModal = ({
  open,
  onOpenChange,
  onSuccess,
  shops,
  userId,
}: AddVoucherModalProps) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<AddVoucherFormData>({
    name: "",
    code: generateVoucherCode(),
    description: "",
    discount_type: "percentage",
    value: "",
    capped_at: "",
    minimum_spend: "",
    maximum_usage: "",
    start_date: new Date(),
    end_date: undefined,
    shop: null,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: "",
      code: generateVoucherCode(),
      description: "",
      discount_type: "percentage",
      value: "",
      capped_at: "",
      minimum_spend: "",
      maximum_usage: "",
      start_date: new Date(),
      end_date: undefined,
      shop: null,
      is_active: true,
    });
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      if (value === "") {
        setFormData((prev) => ({
          ...prev,
          [name]: "",
        }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setFormData((prev) => ({
            ...prev,
            [name]: numValue,
          }));
        }
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "shop") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "global" ? null : value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_active: checked,
    }));
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      start_date: date,
    }));
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      end_date: date,
    }));
  };

  const generateNewCode = () => {
    setFormData((prev) => ({
      ...prev,
      code: generateVoucherCode(),
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Voucher name is required");
      return false;
    }
    if (!formData.code.trim()) {
      setError("Voucher code is required");
      return false;
    }
    if (formData.value === "" || formData.value <= 0) {
      setError("Discount value must be greater than 0");
      return false;
    }
    if (formData.capped_at !== "" && formData.capped_at <= 0) {
      setError("Maximum discount cap must be greater than 0");
      return false;
    }
    if (!formData.end_date) {
      setError("End date is required");
      return false;
    }
    if (
      formData.start_date &&
      formData.end_date &&
      formData.start_date > formData.end_date
    ) {
      setError("End date must be after start date");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        value: Number(formData.value),
        capped_at: formData.capped_at === "" ? null : Number(formData.capped_at),
        minimum_spend:
          formData.minimum_spend === "" ? 0 : Number(formData.minimum_spend),
        maximum_usage:
          formData.maximum_usage === "" ? 0 : Number(formData.maximum_usage),
        start_date: formData.start_date
          ? format(formData.start_date, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        end_date: formData.end_date
          ? format(formData.end_date, "yyyy-MM-dd")
          : null,
        is_active: formData.is_active,
      };

      payload.shop = formData.shop;

      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      const response = await AxiosInstance.post(
        "/admin-vouchers/add_voucher/",
        payload,
        { headers },
      );

      if (response.data.success) {
        handleOpenChange(false);
        onSuccess();
      } else {
        setError(
          response.data.error ||
            response.data.message ||
            "Failed to create voucher.",
        );
      }
    } catch (err: any) {
      console.error("Error creating voucher:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to create voucher.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className="grid gap-4 py-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Label htmlFor="name">Voucher Name *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g., Summer Sale 2024"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="code">Voucher Code *</Label>
        <div className="flex gap-2">
          <Input
            id="code"
            name="code"
            value={formData.code}
            onChange={handleInputChange}
            placeholder="VOUCHER123"
            disabled={isSubmitting}
            className="uppercase"
          />
          <Button
            type="button"
            variant="outline"
            onClick={generateNewCode}
            disabled={isSubmitting}
          >
            Generate
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Discount Type *</Label>
        <RadioGroup
          value={formData.discount_type}
          onValueChange={(value) =>
            handleSelectChange("discount_type", value as "percentage" | "fixed")
          }
          className="flex gap-4"
          disabled={isSubmitting}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percentage" id="percentage" />
            <Label htmlFor="percentage" className="cursor-pointer">
              Percentage (%)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id="fixed" />
            <Label htmlFor="fixed" className="cursor-pointer">
              Fixed Amount (₱)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="value">
          {formData.discount_type === "percentage"
            ? "Discount Percentage *"
            : "Discount Amount *"}
        </Label>
        <div className="relative">
          {formData.discount_type === "fixed" && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₱
            </span>
          )}
          <Input
            id="value"
            name="value"
            type="number"
            min="0"
            step={formData.discount_type === "percentage" ? "1" : "0.01"}
            value={formData.value}
            onChange={handleInputChange}
            placeholder={formData.discount_type === "percentage" ? "20" : "100"}
            disabled={isSubmitting}
            className={formData.discount_type === "fixed" ? "pl-8" : ""}
          />
          {formData.discount_type === "percentage" && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="capped_at">Maximum Discount Cap</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ₱
          </span>
          <Input
            id="capped_at"
            name="capped_at"
            type="number"
            min="0"
            step="0.01"
            value={formData.capped_at}
            onChange={handleInputChange}
            placeholder="e.g., 500 (no limit if empty)"
            disabled={isSubmitting}
            className="pl-8"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Maximum discount amount that can be applied per order. Leave empty for no cap.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="minimum_spend">Minimum Spend</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₱
            </span>
            <Input
              id="minimum_spend"
              name="minimum_spend"
              type="number"
              min="0"
              step="0.01"
              value={formData.minimum_spend}
              onChange={handleInputChange}
              placeholder="0"
              disabled={isSubmitting}
              className="pl-8"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maximum_usage">Max Usage</Label>
          <Input
            id="maximum_usage"
            name="maximum_usage"
            type="number"
            min="0"
            step="1"
            value={formData.maximum_usage}
            onChange={handleInputChange}
            placeholder="0"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.start_date && "text-muted-foreground",
                )}
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.start_date ? (
                  format(formData.start_date, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={formData.start_date}
                onSelect={handleStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-2">
          <Label>End Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.end_date && "text-muted-foreground",
                )}
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.end_date ? (
                  format(formData.end_date, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={formData.end_date}
                onSelect={handleEndDateChange}
                initialFocus
                disabled={(date) =>
                  formData.start_date
                    ? date < formData.start_date
                    : date < new Date()
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="shop">Shop (Optional)</Label>
        <Select
          value={formData.shop === null ? "global" : formData.shop || ""}
          onValueChange={(value) => handleSelectChange("shop", value)}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a shop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global Voucher (All Shops)</SelectItem>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>
                {shop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={handleSwitchChange}
          disabled={isSubmitting}
        />
        <Label htmlFor="is_active">Active immediately</Label>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl">Create New Voucher</DialogTitle>
            <DialogDescription>
              Create a new voucher code for your customers. Fill in the details
              below.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-6">{formContent}</ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? "Creating..." : "Create Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="flex flex-col max-h-[95vh]">
        <DrawerHeader className="text-left border-b px-4 py-3 flex-shrink-0">
          <DrawerTitle className="text-xl">Create New Voucher</DrawerTitle>
          <DrawerDescription>
            Create a new voucher code for your customers. Fill in the details
            below.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto flex-1 px-4 p-2">{formContent}</div>
        <DrawerFooter className="border-t pt-3 pb-4 px-4 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 w-full"
            >
              {isSubmitting ? "Creating..." : "Create Voucher"}
            </Button>
            <DrawerClose asChild>
              <Button
                variant="outline"
                disabled={isSubmitting}
                className="w-full"
              >
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

// Edit Voucher Modal Component
interface EditVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  voucher: Voucher | null;
  shops: { id: string; name: string }[];
  userId: string | null;
}

const EditVoucherModal = ({
  open,
  onOpenChange,
  onSuccess,
  voucher,
  shops,
  userId,
}: EditVoucherModalProps) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<AddVoucherFormData>({
    name: "",
    code: "",
    description: "",
    discount_type: "percentage",
    value: "",
    capped_at: "",
    minimum_spend: "",
    maximum_usage: "",
    start_date: undefined,
    end_date: undefined,
    shop: null,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (voucher) {
      setFormData({
        name: voucher.name || "",
        code: voucher.code || "",
        description: "",
        discount_type:
          (voucher.discount_type as "percentage" | "fixed") || "percentage",
        value: voucher.value || "",
        capped_at: (voucher as any).capped_at !== undefined && (voucher as any).capped_at !== null ? (voucher as any).capped_at : "",
        minimum_spend: voucher.minimum_spend || "",
        maximum_usage: voucher.maximum_usage || "",
        start_date: voucher.start_date ? new Date(voucher.start_date) : undefined,
        end_date: voucher.end_date ? new Date(voucher.end_date) : undefined,
        shop: voucher.shop?.id || null,
        is_active: voucher.is_active,
      });
    }
  }, [voucher]);

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      discount_type: "percentage",
      value: "",
      capped_at: "",
      minimum_spend: "",
      maximum_usage: "",
      start_date: undefined,
      end_date: undefined,
      shop: null,
      is_active: true,
    });
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      if (value === "") {
        setFormData((prev) => ({
          ...prev,
          [name]: "",
        }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setFormData((prev) => ({
            ...prev,
            [name]: numValue,
          }));
        }
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "shop") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "global" ? null : value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_active: checked,
    }));
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      start_date: date,
    }));
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      end_date: date,
    }));
  };

  const generateNewCode = () => {
    setFormData((prev) => ({
      ...prev,
      code: generateVoucherCode(),
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Voucher name is required");
      return false;
    }
    if (!formData.code.trim()) {
      setError("Voucher code is required");
      return false;
    }
    if (formData.value === "" || formData.value <= 0) {
      setError("Discount value must be greater than 0");
      return false;
    }
    if (formData.capped_at !== "" && formData.capped_at <= 0) {
      setError("Maximum discount cap must be greater than 0");
      return false;
    }
    if (!formData.end_date) {
      setError("End date is required");
      return false;
    }
    if (
      formData.start_date &&
      formData.end_date &&
      formData.start_date > formData.end_date
    ) {
      setError("End date must be after start date");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !voucher) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        value: Number(formData.value),
        capped_at: formData.capped_at === "" ? null : Number(formData.capped_at),
        minimum_spend:
          formData.minimum_spend === "" ? 0 : Number(formData.minimum_spend),
        maximum_usage:
          formData.maximum_usage === "" ? 0 : Number(formData.maximum_usage),
        start_date: formData.start_date
          ? format(formData.start_date, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        end_date: formData.end_date
          ? format(formData.end_date, "yyyy-MM-dd")
          : null,
        is_active: formData.is_active,
      };

      payload.shop = formData.shop;

      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      const response = await AxiosInstance.put(
        `/admin-vouchers/update_voucher/${voucher.id}/`,
        payload,
        { headers },
      );

      if (response.data.success) {
        handleOpenChange(false);
        onSuccess();
      } else {
        setError(
          response.data.error ||
            response.data.message ||
            "Failed to update voucher.",
        );
      }
    } catch (err: any) {
      console.error("Error updating voucher:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to update voucher.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className="grid gap-4 py-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Label htmlFor="name">Voucher Name *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g., Summer Sale 2024"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="code">Voucher Code *</Label>
        <div className="flex gap-2">
          <Input
            id="code"
            name="code"
            value={formData.code}
            onChange={handleInputChange}
            placeholder="VOUCHER123"
            disabled={isSubmitting}
            className="uppercase"
          />
          <Button
            type="button"
            variant="outline"
            onClick={generateNewCode}
            disabled={isSubmitting}
          >
            Generate
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Discount Type *</Label>
        <RadioGroup
          value={formData.discount_type}
          onValueChange={(value) =>
            handleSelectChange("discount_type", value as "percentage" | "fixed")
          }
          className="flex gap-4"
          disabled={isSubmitting}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percentage" id="edit-percentage" />
            <Label htmlFor="edit-percentage" className="cursor-pointer">
              Percentage (%)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id="edit-fixed" />
            <Label htmlFor="edit-fixed" className="cursor-pointer">
              Fixed Amount (₱)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="value">
          {formData.discount_type === "percentage"
            ? "Discount Percentage *"
            : "Discount Amount *"}
        </Label>
        <div className="relative">
          {formData.discount_type === "fixed" && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₱
            </span>
          )}
          <Input
            id="value"
            name="value"
            type="number"
            min="0"
            step={formData.discount_type === "percentage" ? "1" : "0.01"}
            value={formData.value}
            onChange={handleInputChange}
            placeholder={formData.discount_type === "percentage" ? "20" : "100"}
            disabled={isSubmitting}
            className={formData.discount_type === "fixed" ? "pl-8" : ""}
          />
          {formData.discount_type === "percentage" && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="capped_at">Maximum Discount Cap</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ₱
          </span>
          <Input
            id="capped_at"
            name="capped_at"
            type="number"
            min="0"
            step="0.01"
            value={formData.capped_at}
            onChange={handleInputChange}
            placeholder="e.g., 500 (no limit if empty)"
            disabled={isSubmitting}
            className="pl-8"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Maximum discount amount that can be applied per order. Leave empty for no cap.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="minimum_spend">Minimum Spend</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₱
            </span>
            <Input
              id="minimum_spend"
              name="minimum_spend"
              type="number"
              min="0"
              step="0.01"
              value={formData.minimum_spend}
              onChange={handleInputChange}
              placeholder="0"
              disabled={isSubmitting}
              className="pl-8"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maximum_usage">Max Usage</Label>
          <Input
            id="maximum_usage"
            name="maximum_usage"
            type="number"
            min="0"
            step="1"
            value={formData.maximum_usage}
            onChange={handleInputChange}
            placeholder="0"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.start_date && "text-muted-foreground",
                )}
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.start_date ? (
                  format(formData.start_date, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={formData.start_date}
                onSelect={handleStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-2">
          <Label>End Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.end_date && "text-muted-foreground",
                )}
                disabled={isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.end_date ? (
                  format(formData.end_date, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={formData.end_date}
                onSelect={handleEndDateChange}
                initialFocus
                disabled={(date) =>
                  formData.start_date
                    ? date < formData.start_date
                    : date < new Date()
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="shop">Shop</Label>
        <Select
          value={formData.shop === null ? "global" : formData.shop || ""}
          onValueChange={(value) => handleSelectChange("shop", value)}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a shop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global Voucher (All Shops)</SelectItem>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>
                {shop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id="edit-is_active"
          checked={formData.is_active}
          onCheckedChange={handleSwitchChange}
          disabled={isSubmitting}
        />
        <Label htmlFor="edit-is_active">Active</Label>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl">Edit Voucher</DialogTitle>
            <DialogDescription>
              Update the voucher details below.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-6">{formContent}</ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? "Updating..." : "Update Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="flex flex-col max-h-[95vh]">
        <DrawerHeader className="text-left border-b px-4 py-3 flex-shrink-0">
          <DrawerTitle className="text-xl">Edit Voucher</DrawerTitle>
          <DrawerDescription>
            Update the voucher details below.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto flex-1 px-4 p-2">{formContent}</div>
        <DrawerFooter className="border-t pt-3 pb-4 px-4 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 w-full"
            >
              {isSubmitting ? "Updating..." : "Update Voucher"}
            </Button>
            <DrawerClose asChild>
              <Button
                variant="outline"
                disabled={isSubmitting}
                className="w-full"
              >
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default function Vouchers() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    voucherMetrics,
    vouchers,
    dateRange,
    shops,
    userId,
    pagination,
    filterOptions,
  } = loaderData;

  // State management
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
    rangeType: dateRange.rangeType as
      | "daily"
      | "weekly"
      | "monthly"
      | "yearly"
      | "custom",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAddVoucherOpen, setIsAddVoucherOpen] = useState(false);
  const [isEditVoucherOpen, setIsEditVoucherOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    voucherId: string;
    voucherName: string;
    voucherCode: string;
    actionType: string;
  }>({
    open: false,
    voucherId: "",
    voucherName: "",
    voucherCode: "",
    actionType: "",
  });

  // Handle date range change
  const handleDateRangeChange = (range: {
    start: Date;
    end: Date;
    rangeType: string;
  }) => {
    setIsLoading(true);

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("start", range.start.toISOString());
    newSearchParams.set("end", range.end.toISOString());
    newSearchParams.set("rangeType", range.rangeType);
    newSearchParams.set("page", "1");

    navigate(`?${newSearchParams.toString()}`, { replace: true });

    setCurrentDateRange({
      start: range.start,
      end: range.end,
      rangeType: range.rangeType as
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly"
        | "custom",
    });
  };

  // Reset loading state
  useEffect(() => {
    setIsLoading(false);
  }, [loaderData]);

  // Handle successful voucher creation/update/deletion
  const handleVoucherChanged = () => {
    navigate(".", { replace: true });
  };

  // Handle voucher actions
  const handleVoucherAction = async (
    voucherId: string,
    actionType: string,
    reason?: string,
  ) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      if (actionType === "delete") {
        const response = await AxiosInstance.delete(
          `/admin-vouchers/delete_voucher/${voucherId}/`,
          { headers },
        );
        if (response.data.success) {
          handleVoucherChanged();
        } else {
          console.error("Failed to delete voucher:", response.data.error);
        }
      } else if (actionType === "duplicate") {
        // Get voucher details first
        const voucherResponse = await AxiosInstance.get(
          `/admin-vouchers/voucher/${voucherId}/`,
          { headers },
        );
        if (voucherResponse.data.success) {
          const original = voucherResponse.data.voucher;
          const duplicatePayload = {
            name: `${original.name} (Copy)`,
            code: `${original.code}_COPY_${Date.now()}`,
            discount_type: original.discount_type,
            value: original.value,
            capped_at: original.capped_at || null,
            minimum_spend: original.minimum_spend,
            maximum_usage: original.maximum_usage,
            start_date: original.start_date,
            end_date: original.end_date,
            shop: original.shop?.id || null,
            is_active: false,
          };
          const createResponse = await AxiosInstance.post(
            "/admin-vouchers/add_voucher/",
            duplicatePayload,
            { headers },
          );
          if (createResponse.data.success) {
            handleVoucherChanged();
          }
        }
      }
    } catch (error: any) {
      console.error(`Error ${actionType}ing voucher:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!loaderData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading vouchers...</div>
      </div>
    );
  }

  const safeVouchers = vouchers || [];
  const safeMetrics = voucherMetrics || {
    total_vouchers: 0,
    active_vouchers: 0,
    expired_vouchers: 0,
    scheduled_vouchers: 0,
    total_usage: 0,
    total_discount: 0,
  };

  const hasVouchers = safeVouchers.length > 0;

  // Get status based on voucher data
  const getVoucherStatus = (voucher: Voucher) => {
    const now = new Date();
    const startDate = voucher.start_date ? new Date(voucher.start_date) : null;
    const endDate = voucher.end_date ? new Date(voucher.end_date) : null;

    if (!voucher.is_active) {
      if (endDate && endDate < now) return "expired";
      if (startDate && startDate > now) return "scheduled";
      return "inactive";
    }

    if (endDate && endDate < now) return "expired";
    if (startDate && startDate > now) return "scheduled";
    return "active";
  };

  // Add status field to vouchers
  const vouchersWithStatus = safeVouchers.map((voucher) => ({
    ...voucher,
    status: voucher.status || getVoucherStatus(voucher),
    shopName: voucher.shopName || voucher.shop?.name || "Global",
  }));

  // Calculate breakdowns for metrics
  const calculateTotalVouchersBreakdown = () => {
    const statusBreakdown: Record<string, number> = {
      Active: 0,
      Expired: 0,
      Scheduled: 0,
      Inactive: 0,
    };

    vouchersWithStatus.forEach((voucher) => {
      const status = voucher.status;
      if (status === "active") statusBreakdown["Active"]++;
      else if (status === "expired") statusBreakdown["Expired"]++;
      else if (status === "scheduled") statusBreakdown["Scheduled"]++;
      else statusBreakdown["Inactive"]++;
    });

    const totalVouchers = safeMetrics.total_vouchers || 0;

    return {
      byStatus: Object.entries(statusBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: totalVouchers > 0 ? (value / totalVouchers) * 100 : 0,
        color:
          label === "Active"
            ? "bg-green-500"
            : label === "Scheduled"
              ? "bg-orange-500"
              : label === "Expired"
                ? "bg-red-500"
                : "bg-gray-500",
      })),
    };
  };

  const calculateDiscountTypeBreakdown = () => {
    const typeBreakdown: Record<string, number> = {
      Percentage: 0,
      Fixed: 0,
    };

    vouchersWithStatus.forEach((voucher) => {
      if (voucher.discount_type === "percentage") typeBreakdown["Percentage"]++;
      else typeBreakdown["Fixed"]++;
    });

    const totalVouchers = vouchersWithStatus.length || 1;

    return {
      byType: Object.entries(typeBreakdown).map(([label, value]) => ({
        label,
        value,
        percentage: (value / totalVouchers) * 100,
        color: label === "Percentage" ? "bg-blue-500" : "bg-purple-500",
      })),
    };
  };

  const calculateShopBreakdown = () => {
    const shopBreakdown: Record<string, number> = {
      Global: 0,
    };

    vouchersWithStatus.forEach((voucher) => {
      if (voucher.shop) {
        const shopName = voucher.shop.name;
        shopBreakdown[shopName] = (shopBreakdown[shopName] || 0) + 1;
      } else {
        shopBreakdown["Global"]++;
      }
    });

    const totalVouchers = vouchersWithStatus.length || 1;

    const sortedShops = Object.entries(shopBreakdown).sort(
      (a, b) => b[1] - a[1],
    );
    const topShops = sortedShops.slice(0, 5);
    const otherShops = sortedShops.slice(5);
    const otherCount = otherShops.reduce((sum, [, count]) => sum + count, 0);

    const breakdown = topShops.map(([label, value]) => ({
      label,
      value,
      percentage: (value / totalVouchers) * 100,
      color: "bg-cyan-500",
    }));

    if (otherCount > 0) {
      breakdown.push({
        label: "Others",
        value: otherCount,
        percentage: (otherCount / totalVouchers) * 100,
        color: "bg-gray-500",
      });
    }

    return { byShop: breakdown };
  };

  const totalVouchersBreakdown = calculateTotalVouchersBreakdown();
  const discountTypeBreakdown = calculateDiscountTypeBreakdown();
  const shopBreakdown = calculateShopBreakdown();

  const voucherFilterConfig = {
    status: {
      accessorKey: "status",
      options: filterOptions.statuses,
      placeholder: "Status",
    },
    discount_type: {
      accessorKey: "discount_type",
      options:
        filterOptions.discount_types.length > 0
          ? filterOptions.discount_types
          : ["percentage", "fixed"],
      placeholder: "Discount Type",
    },
    shop: {
      accessorKey: "shopName",
      options:
        filterOptions.shops.length > 0 ? filterOptions.shops : ["Global"],
      placeholder: "Shop",
    },
  };

  // Build columns with actions
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium text-xs sm:text-sm">
          <div>{row.getValue("name")}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {row.original.shop
              ? `Shop: ${row.original.shop.name}`
              : "Global Voucher"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => {
        const code = row.getValue("code") as string;
        return (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {code}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100"
              onClick={() => navigator.clipboard.writeText(code)}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "usage_count",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Usage
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const usage = row.original.usage_count || 0;
        const maxUsage = row.original.maximum_usage;

        return (
          <div className="text-xs sm:text-sm">
            {usage}
            {maxUsage > 0 && (
              <span className="text-muted-foreground">/{maxUsage}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "value",
      header: "Amount",
      cell: ({ row }) => {
        const type = row.original.discount_type;
        const value = row.getValue("value") as number;

        if (type === "percentage") {
          return (
            <span className="text-xs sm:text-sm font-medium">{value}%</span>
          );
        }
        return <span className="text-xs sm:text-sm font-medium">₱{value}</span>;
      },
    },
    {
      accessorKey: "end_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Valid Until
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateStr = row.original.end_date;
        if (!dateStr)
          return <div className="text-muted-foreground">No end date</div>;

        const date = new Date(dateStr);
        if (isNaN(date.getTime()))
          return <div className="text-muted-foreground">Invalid date</div>;

        const formattedDate = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const isExpired = new Date() > date;

        return (
          <div
            className={`flex items-center gap-1 text-xs sm:text-sm ${isExpired ? "text-red-600" : ""}`}
          >
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const getColor = (status: string) => {
          switch (status?.toLowerCase()) {
            case "active":
              return "#f97316";
            case "scheduled":
              return "#f97316";
            case "expired":
              return "#ef4444";
            default:
              return "#6b7280";
          }
        };
        const color = getColor(status);

        return (
          <Badge
            variant="secondary"
            className="text-xs capitalize"
            style={{ backgroundColor: `${color}20`, color: color }}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const voucher = row.original;

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
              onClick={() => navigate(`/admin/voucher/${voucher.id}`)}
            >
              <Eye className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedVoucher(voucher);
                    setIsEditVoucherOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(voucher.code)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setActionDialog({
                      open: true,
                      voucherId: voucher.id,
                      voucherName: voucher.name,
                      voucherCode: voucher.code,
                      actionType: "duplicate",
                    });
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setActionDialog({
                      open: true,
                      voucherId: voucher.id,
                      voucherName: voucher.name,
                      voucherCode: voucher.code,
                      actionType: "delete",
                    });
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Vouchers</h1>
            </div>
            <Button
              onClick={() => setIsAddVoucherOpen(true)}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" />
              Add Voucher
            </Button>
          </div>

          {/* Modals/Drawers */}
          <AddVoucherModal
            open={isAddVoucherOpen}
            onOpenChange={setIsAddVoucherOpen}
            onSuccess={handleVoucherChanged}
            shops={shops}
            userId={userId}
          />

          <EditVoucherModal
            open={isEditVoucherOpen}
            onOpenChange={setIsEditVoucherOpen}
            onSuccess={handleVoucherChanged}
            voucher={selectedVoucher}
            shops={shops}
            userId={userId}
          />

          {/* Action Dialog */}
          <ActionDialog
            open={actionDialog.open}
            onOpenChange={(open) =>
              setActionDialog((prev) => ({ ...prev, open }))
            }
            onConfirm={(reason) =>
              handleVoucherAction(
                actionDialog.voucherId,
                actionDialog.actionType,
                reason,
              )
            }
            title={`${actionDialog.actionType?.charAt(0).toUpperCase() + actionDialog.actionType?.slice(1)} Voucher`}
            description={`Are you sure you want to ${actionDialog.actionType} this voucher?`}
            actionType={actionDialog.actionType}
            voucherName={actionDialog.voucherName}
            voucherCode={actionDialog.voucherCode}
          />

          {/* Date Range Filter */}
          <DateRangeFilter
            onDateRangeChange={handleDateRangeChange}
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
                  title="Total Vouchers"
                  value={safeMetrics.total_vouchers || 0}
                  icon={<Tag className="w-4 h-4 sm:w-6 sm:h-6 text-white" />}
                  color="bg-orange-600"
                  breakdown={[
                    {
                      label: "By Status",
                      value: safeMetrics.total_vouchers || 0,
                      color: "bg-orange-500",
                    },
                    ...totalVouchersBreakdown.byStatus,
                    { label: "──────────", value: 0, color: "bg-transparent" },
                    {
                      label: "By Discount Type",
                      value: vouchersWithStatus.length || 0,
                      color: "bg-orange-500",
                    },
                    ...discountTypeBreakdown.byType,
                  ]}
                  totalLabel="Total Vouchers"
                />

                <InteractiveNumberCard
                  title="Total Usage"
                  value={safeMetrics.total_usage || 0}
                  icon={
                    <PhilippinePeso className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  }
                  color="bg-green-600"
                  breakdown={[
                    {
                      label: "Usage Statistics",
                      value: safeMetrics.total_usage || 0,
                      color: "bg-green-500",
                    },
                    {
                      label: "Total Discount Given",
                      value: safeMetrics.total_discount || 0,
                      percentage:
                        safeMetrics.total_usage > 0
                          ? safeMetrics.total_discount / safeMetrics.total_usage
                          : 0,
                      color: "bg-green-600",
                    },
                  ]}
                  totalLabel="Total Usage"
                />

                <InteractiveNumberCard
                  title="Total Discount"
                  value={safeMetrics.total_discount || 0}
                  icon={
                    <Percent className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  }
                  color="bg-purple-600"
                  suffix="₱"
                  breakdown={[
                    {
                      label: "Discount Distribution",
                      value: safeMetrics.total_discount || 0,
                      color: "bg-purple-500",
                    },
                    {
                      label: "By Voucher Type",
                      value: vouchersWithStatus.length || 0,
                      color: "bg-purple-500",
                    },
                    ...discountTypeBreakdown.byType,
                  ]}
                  totalLabel="Total Discount"
                />

                <InteractiveNumberCard
                  title="Expired Vouchers"
                  value={safeMetrics.expired_vouchers || 0}
                  icon={
                    <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  }
                  color="bg-red-500"
                  breakdown={[
                    {
                      label: "Expired Breakdown",
                      value: safeMetrics.expired_vouchers || 0,
                      color: "bg-red-500",
                    },
                    {
                      label: "By Shop",
                      value:
                        vouchersWithStatus.filter((v) => v.status === "expired")
                          .length || 0,
                      color: "bg-red-500",
                    },
                    ...shopBreakdown.byShop
                      .filter((s) => s.label !== "Global")
                      .map((s) => ({ ...s, color: "bg-red-400" })),
                  ]}
                  totalLabel="Expired Vouchers"
                />
              </>
            )}
          </div>

          {/* Vouchers Table */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">
                  All Vouchers
                </CardTitle>
                <CardDescription>
                  {isLoading
                    ? "Loading vouchers..."
                    : `Showing ${vouchersWithStatus.length} of ${pagination.total_count} vouchers`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  window.open(
                    `/api/admin-vouchers/export/?${params.toString()}`,
                    "_blank",
                  );
                }}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : hasVouchers ? (
                <div className="rounded-md">
                  <DataTable
                    columns={columns}
                    data={vouchersWithStatus}
                    filterConfig={voucherFilterConfig}
                    searchConfig={{
                      column: "name",
                      placeholder: "Search by voucher name...",
                    }}
                    isLoading={isLoading}
                  />
                </div>
              ) : (
                <EmptyTable onAddClick={() => setIsAddVoucherOpen(true)} />
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}