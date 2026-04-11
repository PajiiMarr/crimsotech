import type { Route } from "./+types/view_user"
import { UserProvider } from '~/components/providers/user-role-provider';
import { useState, useEffect } from "react";
import { useParams } from "react-router";
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
  ShoppingBag,
  Truck,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Package,
  Heart,
  Star,
  DollarSign,
  Eye,
  Ban,
  Trash2,
  MoreVertical,
  Edit,
  FileText,
  CreditCard,
  LogOut,
  Store,
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

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "View User | Admin",
    },
  ];
}

interface CustomerData {
  product_limit: number;
  current_product_count: number;
}

interface RiderData {
  vehicle_type: string;
  plate_number: string;
  vehicle_brand: string;
  vehicle_model: string;
  license_number: string;
  verified: boolean;
}

interface ShopData {
  id: string;
  name: string;
  description: string | null;
  shop_picture_url: string | null;
  verified: boolean;
  status: string;
  total_sales: number;
  is_suspended: boolean;
  created_at: string;
  city: string;
  province: string;
  contact_number: string;
}

interface PersonalListing {
  id: string;
  name: string;
  description: string;
  condition: number;
  upload_status: string;
  status: string;
  is_refundable: boolean | null;
  refund_days: number;
  created_at: string;
  updated_at: string;
  is_removed: boolean;
  primary_image: string | null;
  min_price: number | null;
  max_price: number | null;
  variants_count: number;
  total_stock: number;
  favorites_count: number;
}

interface UserData {
  id: string;
  username: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  middle_name: string;
  contact_number: string;
  date_of_birth: string | null;
  age: number | null;
  sex: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  state: string;
  zip_code: string;
  country: string;
  is_admin: boolean;
  is_customer: boolean;
  is_moderator: boolean;
  is_rider: boolean;
  registration_stage: number | null;
  created_at: string;
  updated_at: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  suspended_until: string | null;
  profile_picture_url: string | null;
  customer_data: CustomerData | null;
  rider_data: RiderData | null;
  moderator_data: any | null;
  admin_data: any | null;
  shops: ShopData[];
  personal_listings: PersonalListing[];
}

interface LoaderData {
  user: any;
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

  return { user };
}

const getUserPrimaryType = (user: UserData): string => {
  if (user.is_admin) return "Admin";
  if (user.is_moderator) return "Moderator";
  if (user.is_rider) return "Rider";
  if (user.is_customer) return "Customer";
  return "Incomplete";
};

const getRegistrationStageLabel = (stage: number | null, isRider: boolean, isCustomer: boolean): string => {
  if (isRider) {
    switch (stage) {
      case null:
        return "Vehicle Applying";
      case 1:
        return "Signing Up";
      case 2:
        return "Profiling";
      case 3:
        return "OTP";
      case 4:
        return "Completed";
      default:
        return "Unknown Stage";
    }
  } else if (isCustomer) {
    switch (stage) {
      case null:
        return "Signing Up";
      case 1:
        return "Profiling";
      case 2:
        return "OTP";
      case 4:
        return "Completed";
      default:
        return "Unknown Stage";
    }
  } else {
    switch (stage) {
      case null:
        return "Not Started";
      case 1:
        return "Started";
      case 2:
        return "Basic Info";
      case 3:
        return "Address";
      case 4:
        return "Verification";
      case 5:
        return "Completed";
      default:
        return stage ? `Stage ${stage}` : "Not Started";
    }
  }
};

const getFullName = (user: UserData): string => {
  return `${user.first_name} ${user.middle_name ? user.middle_name + " " : ""}${user.last_name}`.trim();
};

export default function ViewUser({ loaderData }: { loaderData: LoaderData }) {
  const { user: authUser } = loaderData;
  const { user_id } = useParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      if (!user_id) {
        setError("User ID is required");
        setLoading(false);
        return;
      }

      try {
        const response = await AxiosInstance.get(`/admin-users/user/${user_id}/`);
        setUser(response.data);
      } catch (err: any) {
        console.error("Error fetching user:", err);
        setError(err.response?.data?.error || "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [user_id]);

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
    setReason("");
    setSuspensionDays(7);
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    if (!activeAction || !user) return;

    const needsReason = ["suspend", "delete"].includes(activeAction);
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
      const response = await AxiosInstance.post(`/admin-users/user/${user.id}/execute_action/`, {
        action: activeAction,
        reason: reason,
        suspension_days: suspensionDays,
        user_id: authUser?.user_id || authUser?.id,
      });

      toast({
        title: "Success",
        description: `${activeAction} action completed successfully`,
        variant: "success",
      });

      if (response.data.user) {
        setUser(response.data.user);
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
    if (!user) return [];
    const actions = [];

    if (user.is_suspended) {
      actions.push({
        id: "unsuspend",
        label: "Unsuspend User",
        icon: CheckCircle,
        variant: "default" as const,
      });
    } else {
      actions.push({
        id: "suspend",
        label: "Suspend User",
        icon: Ban,
        variant: "outline" as const,
      });
    }

    actions.push({
      id: "delete",
      label: "Delete User",
      icon: Trash2,
      variant: "destructive" as const,
    });

    return actions;
  };

  const actionConfigs: Record<string, any> = {
    suspend: {
      title: "Suspend User",
      description: "This will temporarily suspend the user account.",
      confirmText: "Suspend",
      variant: "outline",
    },
    unsuspend: {
      title: "Unsuspend User",
      description: "This will restore the user account access.",
      confirmText: "Unsuspend",
      variant: "default",
    },
    delete: {
      title: "Delete User",
      description: "This action cannot be undone. This will permanently delete the user account.",
      confirmText: "Delete User",
      variant: "destructive",
    },
  };

  const currentAction = activeAction ? actionConfigs[activeAction] : null;

  if (loading) {
    return (
      <UserProvider user={authUser}>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading user details...</p>
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (error || !user) {
    return (
      <UserProvider user={authUser}>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || "Unable to load user data"}</p>
            <Button asChild>
              <a href="/admin/users">Back to Users</a>
            </Button>
          </div>
        </div>
      </UserProvider>
    );
  }

  const userType = getUserPrimaryType(user);
  const registrationStageLabel = getRegistrationStageLabel(
    user.registration_stage,
    user.is_rider,
    user.is_customer
  );
  const fullName = getFullName(user);
  const isActive = registrationStageLabel === "Completed";
  const availableActions = getAvailableActions();

  const getInitials = () => {
    const first = user.first_name?.[0] || "";
    const last = user.last_name?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

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
              <a href="/admin/users" className="hover:text-primary">Users</a>
              <span>&gt;</span>
              <span className="text-foreground">{user.username || user.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{fullName}</h1>
            <p className="text-muted-foreground mt-1">@{user.username || "No username"}</p>
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
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                    <AvatarImage 
                      src={user.profile_picture_url || undefined} 
                      alt={fullName}
                    />
                    <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold mt-4">{fullName}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                    <Badge className="text-xs">{userType}</Badge>
                    <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                      {isActive ? "Active" : registrationStageLabel}
                    </Badge>
                    {user.is_suspended && (
                      <Badge variant="destructive" className="text-xs">Suspended</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">@{user.username || "No username"}</p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{user.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{user.contact_number || "No contact number"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {user.is_customer && user.customer_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingBag className="w-5 h-5" />
                    Customer Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product Limit</span>
                    <span className="font-medium">{user.customer_data.product_limit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Products</span>
                    <span className="font-medium">{user.customer_data.current_product_count}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {user.is_rider && user.rider_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="w-5 h-5" />
                    Rider Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-medium">
                      {user.rider_data.vehicle_brand} {user.rider_data.vehicle_model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plate Number</span>
                    <span className="font-medium">{user.rider_data.plate_number || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verified</span>
                    <Badge variant={user.rider_data.verified ? "default" : "secondary"} className="text-xs">
                      {user.rider_data.verified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="shops">Shops</TabsTrigger>
                <TabsTrigger value="listings">Listings</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">First Name</label>
                        <p className="font-medium">{user.first_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Middle Name</label>
                        <p className="font-medium">{user.middle_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Last Name</label>
                        <p className="font-medium">{user.last_name || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Sex</label>
                        <p className="font-medium">{user.sex || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Date of Birth</label>
                        <p className="font-medium">
                          {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Age</label>
                        <p className="font-medium">{user.age || "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="address" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Address Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Street</label>
                        <p className="font-medium">{user.street || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Barangay</label>
                        <p className="font-medium">{user.barangay || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">City</label>
                        <p className="font-medium">{user.city || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Province</label>
                        <p className="font-medium">{user.province || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Zip Code</label>
                        <p className="font-medium">{user.zip_code || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Country</label>
                        <p className="font-medium">{user.country || "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Created</span>
                      <span className="font-medium">{new Date(user.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span className="font-medium">{new Date(user.updated_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registration Stage</span>
                      <Badge variant="outline">{registrationStageLabel}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shops" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Shops Owned
                    </CardTitle>
                    <CardDescription>{user.shops?.length || 0} shops owned by this user</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.shops && user.shops.length > 0 ? (
                      <div className="space-y-4">
                        {user.shops.map((shop) => (
                          <div key={shop.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={shop.shop_picture_url || undefined} />
                                  <AvatarFallback>
                                    <Store className="h-6 w-6" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold">{shop.name}</div>
                                  <div className="text-sm text-muted-foreground">{shop.city}, {shop.province}</div>
                                  <div className="text-xs text-muted-foreground mt-1">Total Sales: ₱{shop.total_sales.toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant={shop.verified ? "default" : "secondary"} className="text-xs">
                                  {shop.verified ? "Verified" : "Unverified"}
                                </Badge>
                                <Badge variant={shop.status === "Active" ? "default" : "secondary"} className="text-xs">
                                  {shop.status}
                                </Badge>
                                {shop.is_suspended && (
                                  <Badge variant="destructive" className="text-xs">Suspended</Badge>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/admin/shops/${shop.id}`}>
                                  <Eye className="w-3 h-3 mr-1" />
                                  View Shop
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Store className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No shops owned by this user</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="listings" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Personal Listings
                    </CardTitle>
                    <CardDescription>{user.personal_listings?.length || 0} personal products listed by this user</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.personal_listings && user.personal_listings.length > 0 ? (
                      <div className="space-y-4">
                        {user.personal_listings.map((listing) => (
                          <div key={listing.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className="h-16 w-16 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                {listing.primary_image ? (
                                  <img src={listing.primary_image} alt={listing.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Package className="h-8 w-8 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold">{listing.name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-1">{listing.description}</div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {listing.min_price && listing.max_price ? (
                                      listing.min_price === listing.max_price ? 
                                        `₱${listing.min_price.toLocaleString()}` : 
                                        `₱${listing.min_price.toLocaleString()} - ₱${listing.max_price.toLocaleString()}`
                                    ) : "Price unavailable"}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    Stock: {listing.total_stock}
                                  </Badge>
                                  <Badge variant={listing.upload_status === "published" ? "default" : "secondary"} className="text-xs">
                                    {listing.upload_status}
                                  </Badge>
                                  {listing.is_removed && (
                                    <Badge variant="destructive" className="text-xs">Removed</Badge>
                                  )}
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/admin/products/${listing.id}`}>
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No personal listings from this user</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {user.is_suspended && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    Suspension Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-red-700">{user.suspension_reason || "No reason provided"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

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
                    <p className="text-sm font-medium">User: {fullName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">{userType}</Badge>
                      <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                        {isActive ? "Active" : registrationStageLabel}
                      </Badge>
                    </div>
                  </div>

                  {(activeAction === "suspend" || activeAction === "delete") && (
                    <div className="space-y-2">
                      <Label htmlFor="reason" className="text-sm font-medium">
                        Reason for {activeAction === "suspend" ? "Suspension" : "Deletion"} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={`Please provide a reason for ${activeAction === "suspend" ? "suspending" : "deleting"} this user...`}
                        className="h-10"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        This reason will be recorded and may be shared with the user.
                      </p>
                    </div>
                  )}

                  {activeAction === "suspend" && (
                    <div className="space-y-2">
                      <Label htmlFor="suspension-days" className="text-sm font-medium">
                        Suspension Duration
                      </Label>
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
                      <p className="text-xs text-muted-foreground">
                        The user will be automatically unsuspended after this period.
                      </p>
                    </div>
                  )}

                  {currentAction.variant === "destructive" && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                      <p className="text-sm font-medium text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Warning: This action cannot be undone
                      </p>
                      {activeAction === "delete" && (
                        <p className="text-xs text-destructive mt-1">
                          All user data, orders, and associated information will be permanently deleted.
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
                    disabled={
                      processing ||
                      ((activeAction === "suspend" || activeAction === "delete") && !reason.trim())
                    }
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