import type { Route } from "./+types/view_rider"
import { UserProvider } from '~/components/providers/user-role-provider';
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Truck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Star,
  Eye,
  Ban,
  Trash2,
  MoreVertical,
  FileText,
  CreditCard,
  Store,
  Wallet,
  TrendingUp,
  TrendingDown,
  Car,
  Navigation,
  Award,
  BarChart3,
  PhilippinePeso,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/hooks/use-toast";
import { Progress } from "~/components/ui/progress";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "View Rider | Admin",
    },
  ];
}

interface RiderUser {
  id: string;
  username: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  contact_number: string;
  created_at: string;
  is_rider: boolean;
}

interface VehicleInfo {
  type: string;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_image: string | null;
}

interface LicenseInfo {
  number: string;
  image: string | null;
}

interface VerificationInfo {
  verified: boolean;
  approved_by: string | null;
  approval_date: string | null;
}

interface PerformanceData {
  total_deliveries: number;
  completed_deliveries: number;
  success_rate: number;
  average_rating: number;
  total_earnings: number;
  date_range_applied?: boolean;
}

interface DeliveryHistory {
  id: string;
  order_id: string;
  status: string;
  picked_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface RiderDetails {
  rider: RiderUser;
  vehicle_info: VehicleInfo;
  license_info: LicenseInfo;
  verification_info: VerificationInfo;
  performance: PerformanceData;
  delivery_history: DeliveryHistory[];
  date_range?: {
    start_date: string;
    end_date: string;
    actual_start: string;
    actual_end: string;
  };
}

interface LoaderData {
  user: any;
  userId: string | null;
  riderId: string;
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isAdmin"]);

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId") || null;
  const { rider_id } = params;

  return { user, userId, riderId: rider_id };
}

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
};

const getInitials = (firstName: string, lastName: string, username?: string | null) => {
  if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (username) return username[0].toUpperCase();
  return "R";
};

export default function ViewRider({ loaderData }: { loaderData: LoaderData }) {
  const { user: authUser, userId, riderId } = loaderData;
  const navigate = useNavigate();
  const [rider, setRider] = useState<RiderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRider = async () => {
      if (!riderId) {
        setError("Rider ID is required");
        setLoading(false);
        return;
      }

      try {
        const headers: Record<string, string> = {};
        if (userId) {
          headers["X-User-Id"] = userId;
        }

        const response = await AxiosInstance.get(
          `/admin-riders/get_rider_details/?rider_id=${riderId}`,
          { headers }
        );

        if (response.data.success) {
          setRider(response.data.rider);
        } else {
          setError(response.data.error || "Failed to load rider data");
        }
      } catch (err: any) {
        console.error("Error fetching rider:", err);
        setError(err.response?.data?.error || "Failed to load rider data");
      } finally {
        setLoading(false);
      }
    };

    fetchRider();
  }, [riderId, userId]);

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
    setReason("");
    setSuspensionDays(7);
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    if (!activeAction || !rider) return;

    const needsReason = ["reject"].includes(activeAction);
    if (needsReason && !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for this action",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const headers: Record<string, string> = {};
      if (userId) {
        headers["X-User-Id"] = userId;
      }

      const response = await AxiosInstance.post(
        "/admin-riders/update_rider_status/",
        {
          rider_id: riderId,
          action: activeAction,
          reason: reason,
        },
        { headers }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `${activeAction === "approve" ? "Approved" : activeAction === "reject" ? "Rejected" : activeAction} rider successfully`,
          variant: "success",
        });
        navigate(".", { replace: true });
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to complete action",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to complete action",
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

  const getAvailableActions = () => {
    if (!rider) return [];
    const actions: { id: string; label: string; icon: any; variant: "default" | "destructive" }[] = [];

    if (rider.verification_info.verified) {
      return actions;
    }

    actions.push({
      id: "approve",
      label: "Approve Rider",
      icon: CheckCircle,
      variant: "default" as const,
    });

    actions.push({
      id: "reject",
      label: "Reject Rider",
      icon: XCircle,
      variant: "destructive" as const,
    });

    return actions;
  };

  const actionConfigs: Record<string, any> = {
    approve: {
      title: "Approve Rider",
      description: "This will approve the rider's application and allow them to start delivering.",
      confirmText: "Approve",
      variant: "default",
    },
    reject: {
      title: "Reject Rider",
      description: "This will reject the rider's application. The rider will not be able to deliver.",
      confirmText: "Reject",
      variant: "destructive",
    },
  };

  const currentAction = activeAction ? actionConfigs[activeAction] : null;
  const availableActions = getAvailableActions();
  const isVerified = rider?.verification_info.verified;

  const fullName = rider
    ? `${rider.rider.first_name} ${rider.rider.last_name}`.trim() || rider.rider.username || "Unknown"
    : "Unknown";
  const userInitials = rider
    ? getInitials(rider.rider.first_name, rider.rider.last_name, rider.rider.username)
    : "R";
  const successRate = rider?.performance.success_rate || 0;

  if (loading) {
    return (
      <UserProvider user={authUser}>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading rider details...</p>
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (error || !rider) {
    return (
      <UserProvider user={authUser}>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Rider Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || "Unable to load rider data"}</p>
            <Button asChild>
              <a href="/admin/riders">Back to Riders</a>
            </Button>
          </div>
        </div>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={authUser}>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {processing && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-xs sm:text-sm text-muted-foreground">Processing action...</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <a href="/admin" className="hover:text-primary">Admin</a>
              <span>&gt;</span>
              <a href="/admin/riders" className="hover:text-primary">Riders</a>
              <span>&gt;</span>
              <span className="text-foreground">{fullName}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">{fullName}</h1>
              {isVerified ? (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending Verification
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">@{rider.rider.username || "No username"}</p>
          </div>

          {availableActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {availableActions.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => handleActionClick(action.id)}
                    className={`flex items-center gap-2 cursor-pointer ${
                      action.variant === "destructive" ? "text-destructive focus:text-destructive" : ""
                    }`}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Rider Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                    <AvatarImage src={undefined} alt={fullName} />
                    <AvatarFallback className="text-2xl sm:text-3xl bg-orange-100 text-orange-600">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold mt-4">{fullName}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                    <Badge className="text-xs bg-blue-100 text-blue-700">Rider</Badge>
                    {isVerified ? (
                      <Badge className="text-xs bg-green-100 text-green-700">Verified</Badge>
                    ) : (
                      <Badge className="text-xs bg-yellow-100 text-yellow-700">Pending</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">@{rider.rider.username || "No username"}</p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{rider.rider.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{rider.rider.contact_number || "No contact number"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Joined {formatDate(rider.rider.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Car className="w-5 h-5" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle Type</span>
                  <span className="font-medium capitalize">{rider.vehicle_info.type || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand</span>
                  <span className="font-medium">{rider.vehicle_info.brand || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">{rider.vehicle_info.model || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plate Number</span>
                  <span className="font-medium font-mono">{rider.vehicle_info.plate_number || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">License Number</span>
                  <span className="font-medium font-mono">{rider.license_info.number || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Verification Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5" />
                  Verification Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {isVerified ? (
                    <Badge className="bg-green-100 text-green-700">Verified</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                  )}
                </div>
                {rider.verification_info.approved_by && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved By</span>
                    <span className="font-medium">{rider.verification_info.approved_by}</span>
                  </div>
                )}
                {rider.verification_info.approval_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approval Date</span>
                    <span className="font-medium">{formatDate(rider.verification_info.approval_date)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Performance & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Deliveries</p>
                      <p className="text-2xl font-bold mt-1">{rider.performance.total_deliveries}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold mt-1">{rider.performance.completed_deliveries}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold mt-1">{successRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-full">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <Progress value={successRate} className="mt-2 h-1" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Rating</p>
                      <p className="text-2xl font-bold mt-1">{rider.performance.average_rating.toFixed(1)}</p>
                    </div>
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <Star className="w-5 h-5 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PhilippinePeso className="w-5 h-5" />
                  Earnings Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-3xl font-bold text-orange-600">{formatCurrency(rider.performance.total_earnings)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Delivery History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Navigation className="w-5 h-5" />
                  Delivery History
                </CardTitle>
                <CardDescription>
                  {rider.delivery_history.length} delivery{rider.delivery_history.length !== 1 ? "s" : ""} completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rider.delivery_history.length > 0 ? (
                  <div className="space-y-4">
                    {rider.delivery_history.map((delivery) => (
                      <div key={delivery.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">Order #{delivery.order_id.slice(0, 8)}...</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Requested: {formatDateTime(delivery.created_at)}
                            </div>
                            {delivery.picked_at && (
                              <div className="text-sm text-muted-foreground">
                                Picked up: {formatDateTime(delivery.picked_at)}
                              </div>
                            )}
                            {delivery.delivered_at && (
                              <div className="text-sm text-muted-foreground">
                                Delivered: {formatDateTime(delivery.delivered_at)}
                              </div>
                            )}
                          </div>
                          <div>
                            <Badge
                              variant="secondary"
                              className={`text-xs capitalize ${
                                delivery.status === "delivered"
                                  ? "bg-green-100 text-green-700"
                                  : delivery.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {delivery.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No delivery history for this rider</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Dialog */}
        <AlertDialog open={showDialog} onOpenChange={!processing ? setShowDialog : undefined}>
          <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
            {currentAction && (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{currentAction.title}</AlertDialogTitle>
                  <AlertDialogDescription>{currentAction.description}</AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">Rider: {fullName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">Rider</Badge>
                      <Badge variant={isVerified ? "default" : "secondary"} className="text-xs">
                        {isVerified ? "Verified" : "Pending Verification"}
                      </Badge>
                    </div>
                  </div>

                  {activeAction === "reject" && (
                    <div className="space-y-2">
                      <Label htmlFor="reason" className="text-sm font-medium">
                        Reason for Rejection <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please provide a reason for rejecting this rider..."
                        className="h-10"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        This reason will be recorded and may be shared with the rider.
                      </p>
                    </div>
                  )}

                  {currentAction.variant === "destructive" && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                      <p className="text-sm font-medium text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Warning: This action cannot be undone
                      </p>
                      {activeAction === "reject" && (
                        <p className="text-xs text-destructive mt-1">
                          The rider will be notified of the rejection.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <AlertDialogFooter className="mt-6 sm:flex-row flex-col gap-2">
                  <AlertDialogCancel onClick={handleCancel} disabled={processing} className="mt-0 sm:w-auto w-full order-2 sm:order-1">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirm}
                    className={`sm:w-auto w-full order-1 sm:order-2 ${
                      currentAction.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
                    }`}
                    disabled={processing || (activeAction === "reject" && !reason.trim())}
                  >
                    {processing ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Processing...
                      </>
                    ) : (
                      currentAction.confirmText
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </UserProvider>
  );
}