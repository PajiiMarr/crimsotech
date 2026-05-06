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
  Eye,
  ArrowUpDown,
  Upload,
  X,
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
import { DataTable } from "~/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useIsMobile } from "~/hooks/use-mobile";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "View Voucher | Admin",
    },
  ];
}

interface ShopInfo {
  id: string;
  name: string;
  status?: string;
  refund_status?: string;
  refund_expire_date?: string | null;
}

interface VoucherUsage {
  id: string;
  order_id: string;
  order_status?: string;
  shop_statuses?: Record<string, string>;
  shop_refund_statuses?: Record<string, string>;
  shop_refund_expire_dates?: Record<string, string | null>;
  user_id: string;
  user_name: string;
  discount_amount: number;
  used_at: string;
  order_total: number;
  final_total: number;
  shops?: ShopInfo[];
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
  capped_at?: number | null;
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

interface PaymentMethod {
  payment_id: string;
  payment_method: string;
  account_name: string;
  account_number: string;
  bank_name?: string;
  is_default: boolean;
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
  const isMobile = useIsMobile();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [usages, setUsages] = useState<VoucherUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState<VoucherUsage | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCompensationModalOpen, setIsCompensationModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<{
    id: string;
    name: string;
    discount_amount: number;
    refund_status: string;
    refund_expire_date: string | null;
  } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [compensationNote, setCompensationNote] = useState("");
  const [submittingCompensation, setSubmittingCompensation] = useState(false);
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
        
        // Ensure shops have refund_status and refund_expire_date
        const usagesData = (response.data.usages || []).map((usage: any) => ({
          ...usage,
          shops: (usage.shops || []).map((shop: any) => ({
            ...shop,
            refund_status: shop.refund_status || "active",
            refund_expire_date: shop.refund_expire_date || null,
          })),
        }));
        setUsages(usagesData);
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

  const fetchShopPaymentMethods = async (shopId: string) => {
    try {
      const response = await AxiosInstance.get(`/user-payment-details/`, {
        headers: { "X-User-Id": userId || "" }
      });
      if (response.data.results) {
        setPaymentMethods(response.data.results);
      } else {
        setPaymentMethods([]);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      setPaymentMethods([]);
    }
  };

  const handleCompensation = async (shop: ShopInfo, discountAmount: number) => {
    setSelectedShop({
      id: shop.id,
      name: shop.name,
      discount_amount: discountAmount,
      refund_status: shop.refund_status || "active",
      refund_expire_date: shop.refund_expire_date || null,
    });
    await fetchShopPaymentMethods(shop.id);
    setIsCompensationModalOpen(true);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const previewUrl = URL.createObjectURL(file);
      setReceiptPreview(previewUrl);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleSubmitCompensation = async () => {
    if (!selectedShop || !receiptFile) {
      toast({
        title: "Error",
        description: "Please upload a receipt image",
        variant: "destructive",
      });
      return;
    }

    setSubmittingCompensation(true);
    try {
      const formData = new FormData();
      formData.append("shop_id", selectedShop.id);
      formData.append("order_id", selectedUsage?.order_id || "");
      formData.append("voucher_id", voucher?.id || "");
      formData.append("amount", selectedShop.discount_amount.toString());
      formData.append("note", compensationNote);
      formData.append("receipt", receiptFile);

      const response = await AxiosInstance.post("/shop-compensation/create-compensation/", formData, {
        headers: {
          "X-User-Id": userId || "",
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Compensation processed successfully",
        });
        setIsCompensationModalOpen(false);
        setReceiptFile(null);
        setReceiptPreview(null);
        setCompensationNote("");
        setSelectedShop(null);
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to process compensation",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to process compensation",
        variant: "destructive",
      });
    } finally {
      setSubmittingCompensation(false);
    }
  };

  // Check if refund is expired
  const isRefundExpired = (refundExpireDate: string | null, refundStatus: string) => {
    if (refundStatus === "expired") return true;
    if (refundExpireDate) {
      const expireDate = new Date(refundExpireDate);
      const today = new Date();
      return expireDate < today;
    }
    return false;
  };

  // Usage History Columns with Compensation Action
  const usageColumns: ColumnDef<VoucherUsage>[] = [
    {
      accessorKey: "user_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-8"
        >
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("user_name") || "Unknown"}
        </div>
      ),
    },
    {
      accessorKey: "order_id",
      header: "Order ID",
      cell: ({ row }) => {
        const orderId = row.getValue("order_id");
        const orderIdStr = orderId ? String(orderId) : "";
        return (
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            #{orderIdStr.slice(0, 8)}...
          </code>
        );
      },
    },
    {
      accessorKey: "discount_amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-8"
        >
          Discount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("discount_amount") as number;
        return (
          <span className="text-green-600">
            -₱{(amount || 0).toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: "order_total",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-8"
        >
          Final Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const finalTotal = row.getValue("order_total") as number;
        return <span>₱{(finalTotal || 0).toLocaleString()}</span>;
      },
    },
    {
      accessorKey: "used_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-8"
        >
          Used Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("used_at") as string;
        return (
          <span>{date ? new Date(date).toLocaleDateString() : "N/A"}</span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const usage = row.original;
        const hasExpiredShop = usage.shops?.some(
          (shop) => isRefundExpired(shop.refund_expire_date || null, shop.refund_status || "active")
        );
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setSelectedUsage(usage);
                setIsDetailModalOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {hasExpiredShop && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
                onClick={() => {
                  const expiredShop = usage.shops?.find(
                    (shop) => isRefundExpired(shop.refund_expire_date || null, shop.refund_status || "active")
                  );
                  if (expiredShop) {
                    handleCompensation(expiredShop, usage.discount_amount);
                  }
                }}
              >
                <Clock className="h-3 w-3 mr-1" />
                Compensate
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Render Detail Modal/Drawer
  const renderDetailModal = () => {
    if (!selectedUsage) return null;

    const orderIdStr = selectedUsage.order_id
      ? String(selectedUsage.order_id)
      : "";
    const orderIdDisplay = orderIdStr ? `#${orderIdStr.slice(0, 8)}...` : "N/A";

    const hasExpiredShop = selectedUsage.shops?.some(
      (shop) => isRefundExpired(shop.refund_expire_date || null, shop.refund_status || "active")
    );

    const content = (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Order ID</label>
            <p className="font-mono text-sm font-medium">
              {orderIdStr || "N/A"}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Customer</label>
            <p className="font-medium">
              {selectedUsage.user_name || "Unknown"}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Order Total</label>
            <p className="text-lg font-semibold">
              ₱{(selectedUsage.final_total || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              Discount Applied
            </label>
            <p className="text-lg font-semibold text-green-600">
              -₱{(selectedUsage.discount_amount || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">Final Total</label>
          <p className="text-xl font-bold">
            ₱{(selectedUsage.order_total || 0).toLocaleString()}
          </p>
        </div>

        <Separator />

        <div>
          <label className="text-sm text-muted-foreground">Used At</label>
          <p>
            {selectedUsage.used_at
              ? new Date(selectedUsage.used_at).toLocaleString()
              : "N/A"}
          </p>
        </div>

        {selectedUsage.shops && selectedUsage.shops.length > 0 && (
          <>
            <Separator />
            <div>
              <label className="text-sm text-muted-foreground">Shops</label>
              <div className="space-y-2 mt-1">
                {selectedUsage.shops.map((shop) => {
                  const expired = isRefundExpired(shop.refund_expire_date || null, shop.refund_status || "active");
                  return (
                    <div key={shop.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{shop.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {expired ? (
                          <>
                            <Badge variant="destructive" className="text-xs">
                              Refund Expired
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-orange-500 text-orange-600"
                              onClick={() => handleCompensation(shop, selectedUsage.discount_amount)}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Compensate
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Refund Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );

    if (isMobile) {
      return (
        <Drawer open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Usage Details</DrawerTitle>
              <DrawerDescription>Order ID: {orderIdDisplay}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">{content}</div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Usage Details</DialogTitle>
            <DialogDescription>Order ID: {orderIdDisplay}</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  };

  // Render Compensation Modal
  const renderCompensationModal = () => {
    if (!selectedShop) return null;

    const content = (
      <div className="space-y-4">
        {/* Shop Info */}
        <div className="p-3 bg-orange-50 rounded-lg flex items-center gap-3">
          <Store className="w-5 h-5 text-orange-600" />
          <div>
            <p className="font-semibold text-gray-900">{selectedShop.name}</p>
            <p className="text-sm text-gray-500">Shop ID: {selectedShop.id}</p>
          </div>
        </div>

        {/* Discount Amount */}
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Compensation Amount</p>
          <p className="text-2xl font-bold text-green-600">
            ₱{selectedShop.discount_amount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Voucher discount applied to this order</p>
        </div>

        {/* Refund Status Warning */}
        <div className="p-3 bg-red-50 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Refund Period Expired</p>
            <p className="text-xs text-red-600">
              The refund period for this shop has ended. You can still process compensation.
            </p>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Shop Payment Details</Label>
          {paymentMethods.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {paymentMethods.map((method) => (
                <div key={method.payment_id} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    {method.payment_method === "bank" ? (
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs text-blue-600">B</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-xs text-purple-600">E</span>
                      </div>
                    )}
                    <span className="font-medium text-sm capitalize">{method.payment_method}</span>
                    {method.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{method.account_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{method.account_number}</p>
                  {method.bank_name && (
                    <p className="text-xs text-gray-500">{method.bank_name}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <p className="text-sm text-yellow-700">No payment method configured</p>
              <p className="text-xs text-yellow-600 mt-1">The shop owner needs to add a payment method first</p>
            </div>
          )}
        </div>

        {/* Receipt Upload */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Upload Receipt *</Label>
          {!receiptPreview ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="mb-2 text-sm text-gray-500">Click to upload receipt</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleReceiptUpload}
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <button
                onClick={handleRemoveReceipt}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Notes (Optional)</Label>
          <Textarea
            placeholder="Add any additional information about this compensation..."
            value={compensationNote}
            onChange={(e) => setCompensationNote(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <Drawer open={isCompensationModalOpen} onOpenChange={setIsCompensationModalOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Process Compensation</DrawerTitle>
              <DrawerDescription>
                Process compensation for expired refund
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">{content}</div>
            <DrawerFooter>
              <div className="flex gap-2">
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1">Cancel</Button>
                </DrawerClose>
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  onClick={handleSubmitCompensation}
                  disabled={submittingCompensation || !receiptFile}
                >
                  {submittingCompensation ? "Processing..." : "Process Compensation"}
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={isCompensationModalOpen} onOpenChange={setIsCompensationModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Compensation</DialogTitle>
            <DialogDescription>
              Process compensation for expired refund
            </DialogDescription>
          </DialogHeader>
          {content}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsCompensationModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={handleSubmitCompensation}
              disabled={submittingCompensation || !receiptFile}
            >
              {submittingCompensation ? "Processing..." : "Process Compensation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
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
                  {voucher.capped_at && voucher.capped_at > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Capped at: ₱{voucher.capped_at.toLocaleString()}
                    </p>
                  )}
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
                {voucher.capped_at && voucher.capped_at > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Maximum Discount Cap
                    </label>
                    <p className="font-medium">
                      ₱{voucher.capped_at.toLocaleString()}
                    </p>
                  </div>
                )}
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
                <DataTable
                  columns={usageColumns}
                  data={usages}
                  searchConfig={{
                    column: "user_name",
                    placeholder: "Search by user...",
                  }}
                />
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
                          .reduce((sum, u) => sum + (u.discount_amount || 0), 0)
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

      {/* Detail Modal/Drawer */}
      {renderDetailModal()}

      {/* Compensation Modal/Drawer */}
      {renderCompensationModal()}

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