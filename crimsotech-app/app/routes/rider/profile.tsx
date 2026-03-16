// app/routes/rider/profile.tsx
import type { Route } from "./+types/profile"
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useToast } from '~/hooks/use-toast';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Camera,
  Landmark,
  Smartphone,
  CreditCard as CreditCardIcon,
  ArrowLeft,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import AxiosInstance from '~/components/axios/Axios';
import { Form, useNavigate, useLoaderData, useActionData, useNavigation } from 'react-router';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Profile | Rider",
        }
    ]
}

// Interface for user profile data
interface UserProfile {
  user_id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  contact_number?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  country?: string;
  profile_image?: string;
  date_joined?: string;
}

// Interface for payment methods - matching your UserPaymentDetail model
interface PaymentMethod {
  payment_id: string;
  payment_method: 'bank' | 'gcash' | 'paypal' | 'card';
  bank_name?: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
  created_at: string;
}

interface LoaderData {
    user: any;
    profile: UserProfile | null;
    paymentMethods: PaymentMethod[];
}

// Action data interface
interface ActionData {
  success?: boolean;
  error?: string;
  message?: string;
  payment_method?: PaymentMethod;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isRider"]);

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");

    let profile: UserProfile | null = null;
    let paymentMethods: PaymentMethod[] = [];

    try {
        // Fetch user profile from Profiling API
        const profileResponse = await AxiosInstance.get(`/profiling/`, {
            headers: { "X-User-Id": userId }
        });

        if (profileResponse.data) {
            profile = {
                user_id: profileResponse.data.user_id || userId,
                username: profileResponse.data.username || 'rider',
                first_name: profileResponse.data.first_name || '',
                last_name: profileResponse.data.last_name || '',
                email: profileResponse.data.email || '',
                contact_number: profileResponse.data.contact_number || '',
                street: profileResponse.data.street || '',
                barangay: profileResponse.data.barangay || '',
                city: profileResponse.data.city || '',
                province: profileResponse.data.province || '',
                zip_code: profileResponse.data.zip_code || '',
                country: profileResponse.data.country || 'Philippines',
                date_joined: profileResponse.data.date_joined || new Date().toISOString(),
            };
        }

        // Fetch payment methods from ProfileView
        const profileViewResponse = await AxiosInstance.get(`/profile/`, {
            headers: { "X-User-Id": userId }
        });

        if (profileViewResponse.data?.success && profileViewResponse.data.profile?.payment_methods) {
            paymentMethods = profileViewResponse.data.profile.payment_methods;
        }

    } catch (error) {
        console.error('Error fetching rider profile:', error);
    }

    return { user, profile, paymentMethods };
}

export async function action({ request, context }: Route.ActionArgs): Promise<ActionData> {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isRider"]);

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    // Update profile using Profiling API
    if (intent === "update_profile") {
      const profileData = {
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        contact_number: formData.get("contact_number"),
        street: formData.get("street"),
        barangay: formData.get("barangay"),
        city: formData.get("city"),
        province: formData.get("province"),
        zip_code: formData.get("zip_code"),
        country: formData.get("country") || "Philippines",
      };

      const response = await AxiosInstance.put('/profiling/', profileData, {
        headers: { "X-User-Id": userId }
      });

      if (response.data) {
        return { success: true, message: "Profile updated successfully" };
      } else {
        return { error: "Failed to update profile" };
      }
    }

    // Add payment method using ProfileView
    if (intent === "add_payment") {
      const paymentData = {
        action: 'add_payment_method',
        payment_method: formData.get("payment_method"),
        bank_name: formData.get("bank_name") || '',
        account_name: formData.get("account_name"),
        account_number: formData.get("account_number"),
        is_default: formData.get("is_default") === "true",
      };

      const response = await AxiosInstance.post('/profile/', paymentData, {
        headers: { "X-User-Id": userId }
      });

      if (response.data?.success) {
        return { 
          success: true, 
          message: "Payment method added successfully",
          payment_method: response.data.payment_method 
        };
      } else {
        return { error: response.data?.error || "Failed to add payment method" };
      }
    }

    // Set default payment method using ProfileView
    if (intent === "set_default_payment") {
      const paymentId = formData.get("payment_id");
      
      const response = await AxiosInstance.post('/profile/', {
        action: 'set_default_payment',
        payment_id: paymentId
      }, {
        headers: { "X-User-Id": userId }
      });

      if (response.data?.success) {
        return { success: true, message: "Default payment method updated" };
      } else {
        return { error: response.data?.error || "Failed to update default payment" };
      }
    }

    // Delete payment method using ProfileView
    if (intent === "delete_payment") {
      const paymentId = formData.get("payment_id");
      
      const response = await AxiosInstance.post('/profile/', {
        action: 'delete_payment_method',
        payment_id: paymentId
      }, {
        headers: { "X-User-Id": userId }
      });

      if (response.data?.success) {
        return { success: true, message: "Payment method deleted" };
      } else {
        return { error: response.data?.error || "Failed to delete payment method" };
      }
    }

    return { error: "Invalid action" };
  } catch (error: any) {
    console.error('Error in action:', error);
    return { error: error.response?.data?.error || "An unexpected error occurred" };
  }
}

// Helper function to get initials
const getInitials = (firstName?: string, lastName?: string, username?: string) => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (username) {
    return username.substring(0, 2).toUpperCase();
  }
  return 'RD';
};

// Payment method icon
const getPaymentIcon = (method: string) => {
  switch (method?.toLowerCase()) {
    case 'bank':
      return <Landmark className="w-4 h-4" />;
    case 'gcash':
      return <Smartphone className="w-4 h-4" />;
    case 'paypal':
      return <CreditCardIcon className="w-4 h-4" />;
    default:
      return <CreditCard className="w-4 h-4" />;
  }
};

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

// Mask account number for security
const maskAccountNumber = (accountNumber: string) => {
  if (!accountNumber) return '';
  if (accountNumber.length <= 4) return '*'.repeat(accountNumber.length);
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
};

// Add Payment Method Dialog
const AddPaymentDialog = ({ 
  open, 
  onOpenChange
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [method, setMethod] = useState<'bank' | 'gcash' | 'paypal'>('bank');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new payment method for your withdrawals
          </DialogDescription>
        </DialogHeader>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="add_payment" />
          
          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select 
              name="payment_method" 
              value={method} 
              onValueChange={(v: any) => setMethod(v)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Account</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === 'bank' && (
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                name="bank_name"
                placeholder="e.g., BDO, BPI, Metrobank"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name</Label>
            <Input
              id="account_name"
              name="account_name"
              placeholder="Full name on account"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">Account Number</Label>
            <Input
              id="account_number"
              name="account_number"
              placeholder="Account number / GCash number / PayPal email"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              name="is_default"
              value="true"
              className="rounded border-gray-300"
            />
            <Label htmlFor="is_default">Set as default payment method</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Payment Method"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Confirmation Dialog for setting default payment
const SetDefaultConfirmDialog = ({ 
  open, 
  onOpenChange,
  onConfirm,
  paymentMethod
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  paymentMethod: PaymentMethod | null;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Set as Default
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to set this as your default payment method?
          </DialogDescription>
        </DialogHeader>
        
        {paymentMethod && (
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-lg">
                  {getPaymentIcon(paymentMethod.payment_method)}
                </div>
                <div>
                  <p className="font-medium capitalize">{paymentMethod.payment_method}</p>
                  {paymentMethod.bank_name && (
                    <p className="text-sm text-gray-600">{paymentMethod.bank_name}</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">{paymentMethod.account_name}</p>
              <p className="text-sm font-mono text-gray-500">{paymentMethod.account_number}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-yellow-600 hover:bg-yellow-700">
            <Star className="w-4 h-4 mr-2" />
            Set as Default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Confirmation Dialog for deleting payment method
const DeleteConfirmDialog = ({ 
  open, 
  onOpenChange,
  onConfirm,
  paymentMethod
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  paymentMethod: PaymentMethod | null;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Delete Payment Method
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this payment method? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {paymentMethod && (
          <div className="py-4">
            <div className="bg-red-50 rounded-lg p-4 space-y-2 border border-red-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-lg">
                  {getPaymentIcon(paymentMethod.payment_method)}
                </div>
                <div>
                  <p className="font-medium capitalize">{paymentMethod.payment_method}</p>
                  {paymentMethod.bank_name && (
                    <p className="text-sm text-gray-600">{paymentMethod.bank_name}</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">{paymentMethod.account_name}</p>
              <p className="text-sm font-mono text-gray-500">{paymentMethod.account_number}</p>
              {paymentMethod.is_default && (
                <Badge className="bg-yellow-100 text-yellow-700 mt-2">Default Payment Method</Badge>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Profile Component
function ProfileContent({ user, profile: initialProfile, paymentMethods: initialPayments }: { 
  user: any; 
  profile: UserProfile | null;
  paymentMethods: PaymentMethod[];
}) {
  const navigate = useNavigate();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPayments);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [showSetDefaultConfirm, setShowSetDefaultConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [visibleAccountNumbers, setVisibleAccountNumbers] = useState<Record<string, boolean>>({});
  
  // Form state for editing
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    contact_number: profile?.contact_number || '',
    street: profile?.street || '',
    barangay: profile?.barangay || '',
    city: profile?.city || '',
    province: profile?.province || '',
    zip_code: profile?.zip_code || '',
    country: profile?.country || 'Philippines',
  });

  // Show toast notifications based on action data and close dialog
  useEffect(() => {
    if (actionData?.success) {
      toast({
        title: "Success",
        description: actionData.message || "Operation completed successfully",
      });
      
      // Close payment dialog if it was a payment action
      if (actionData.message?.includes('payment')) {
        setShowAddPayment(false);
      }
      
      // Refresh the page to show updated data
      navigate('.', { replace: true });
    } else if (actionData?.error) {
      toast({
        title: "Error",
        description: actionData.error,
        variant: "destructive",
      });
      setProcessingPaymentId(null);
    }
  }, [actionData, toast, navigate]);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        contact_number: profile.contact_number || '',
        street: profile.street || '',
        barangay: profile.barangay || '',
        city: profile.city || '',
        province: profile.province || '',
        zip_code: profile.zip_code || '',
        country: profile.country || 'Philippines',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSetDefaultClick = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod);
    setShowSetDefaultConfirm(true);
  };

  const handleConfirmSetDefault = () => {
    if (selectedPaymentMethod) {
      setProcessingPaymentId(selectedPaymentMethod.payment_id);
      setShowSetDefaultConfirm(false);
      
      const form = document.createElement('form');
      form.method = 'post';
      
      const intentInput = document.createElement('input');
      intentInput.name = 'intent';
      intentInput.value = 'set_default_payment';
      form.appendChild(intentInput);
      
      const paymentIdInput = document.createElement('input');
      paymentIdInput.name = 'payment_id';
      paymentIdInput.value = selectedPaymentMethod.payment_id;
      form.appendChild(paymentIdInput);
      
      document.body.appendChild(form);
      form.submit();
    }
  };

  const handleDeleteClick = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (selectedPaymentMethod) {
      setProcessingPaymentId(selectedPaymentMethod.payment_id);
      setShowDeleteConfirm(false);
      
      const form = document.createElement('form');
      form.method = 'post';
      
      const intentInput = document.createElement('input');
      intentInput.name = 'intent';
      intentInput.value = 'delete_payment';
      form.appendChild(intentInput);
      
      const paymentIdInput = document.createElement('input');
      paymentIdInput.name = 'payment_id';
      paymentIdInput.value = selectedPaymentMethod.payment_id;
      form.appendChild(paymentIdInput);
      
      document.body.appendChild(form);
      form.submit();
    }
  };

  const toggleAccountVisibility = (paymentId: string) => {
    setVisibleAccountNumbers(prev => ({
      ...prev,
      [paymentId]: !prev[paymentId]
    }));
  };

  const handleBack = () => {
    navigate(-1);
  };

  const isSubmitting = navigation.state === "submitting";

  if (!profile) {
    return (
      <div className="w-full min-h-screen flex justify-center items-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs">Loading profile...</p>
        </div>
      </div>
    );
  }

  const initials = getInitials(profile.first_name, profile.last_name, profile.username);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Full Width Header with Back Button */}
      <div className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="flex items-center px-4 py-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleBack}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">My Profile</h1>
            <p className="text-xs text-gray-500">Manage your account and payment methods</p>
          </div>
        </div>
      </div>

      {/* Content with horizontal padding */}
      <div className="px-4 py-4 md:px-6 lg:px-8">
        {/* Edit Button Row */}
        <div className="flex justify-end mb-4">
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  const form = document.getElementById('profile-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                disabled={isSubmitting}
                size="sm"
                className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                Save
              </Button>
              <Button 
                onClick={() => setIsEditing(false)}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Hidden Profile Form */}
        <Form method="post" id="profile-form" className="hidden">
          <input type="hidden" name="intent" value="update_profile" />
          <input type="hidden" name="first_name" value={formData.first_name} />
          <input type="hidden" name="last_name" value={formData.last_name} />
          <input type="hidden" name="contact_number" value={formData.contact_number} />
          <input type="hidden" name="street" value={formData.street} />
          <input type="hidden" name="barangay" value={formData.barangay} />
          <input type="hidden" name="city" value={formData.city} />
          <input type="hidden" name="province" value={formData.province} />
          <input type="hidden" name="zip_code" value={formData.zip_code} />
          <input type="hidden" name="country" value={formData.country} />
        </Form>

        {/* Two Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-6 bg-gray-100 p-0.5 h-10">
            <TabsTrigger value="personal" className="text-xs data-[state=active]:bg-white h-8">
              <User className="w-3.5 h-3.5 mr-1" />
              Personal Information
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-xs data-[state=active]:bg-white h-8">
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              Payment Details
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Personal Information</CardTitle>
                <CardDescription className="text-xs">Update your personal details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="w-16 h-16 border-2 border-gray-200">
                    <AvatarImage src={profile.profile_image} />
                    <AvatarFallback className="bg-gray-100 text-base">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Camera className="w-3.5 h-3.5 mr-1" />
                      Change Photo
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">First Name</Label>
                    <Input
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Last Name</Label>
                    <Input
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Username</Label>
                    <Input
                      value={profile.username}
                      disabled={true}
                      className="h-8 text-sm bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Email</Label>
                    <Input
                      value={profile.email}
                      disabled={true}
                      className="h-8 text-sm bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Phone Number</Label>
                    <Input
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Member Since</Label>
                    <Input
                      value={formatDate(profile.date_joined)}
                      disabled={true}
                      className="h-8 text-sm bg-gray-50"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Street</Label>
                      <Input
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Barangay</Label>
                      <Input
                        name="barangay"
                        value={formData.barangay}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">City</Label>
                      <Input
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Province</Label>
                      <Input
                        name="province"
                        value={formData.province}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Zip Code</Label>
                      <Input
                        name="zip_code"
                        value={formData.zip_code}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Country</Label>
                      <Input
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Details Tab */}
          <TabsContent value="payment">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription className="text-xs">Manage your withdrawal payment methods</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAddPayment(true)} disabled={isSubmitting} className="h-7 text-xs px-2">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-6">
                    <CreditCard className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-gray-500 text-xs">No payment methods added yet</p>
                    <Button 
                      variant="link" 
                      size="sm"
                      className="text-xs mt-1 h-6"
                      onClick={() => setShowAddPayment(true)}
                    >
                      Add your first payment method
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentMethods.map((method) => {
                      const isProcessing = processingPaymentId === method.payment_id && isSubmitting;
                      const isVisible = visibleAccountNumbers[method.payment_id];
                      
                      return (
                        <Card key={method.payment_id} className={`border ${method.is_default ? 'border-green-500 bg-green-50/30' : ''}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2 flex-1">
                                <div className="p-1.5 bg-gray-100 rounded-lg">
                                  {getPaymentIcon(method.payment_method)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs font-medium capitalize">{method.payment_method}</p>
                                    {method.is_default && (
                                      <Badge className="bg-green-100 text-green-700 text-[8px] h-4 px-1 flex items-center gap-0.5">
                                        <Star className="w-2 h-2 fill-current" />
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                  {method.bank_name && (
                                    <p className="text-[10px] text-gray-500">{method.bank_name}</p>
                                  )}
                                  <p className="text-[10px] text-gray-600">{method.account_name}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <p className="text-[10px] font-mono text-gray-500">
                                      {isVisible ? method.account_number : maskAccountNumber(method.account_number)}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0"
                                      onClick={() => toggleAccountVisibility(method.payment_id)}
                                    >
                                      {isVisible ? (
                                        <EyeOff className="w-3 h-3 text-gray-400" />
                                      ) : (
                                        <Eye className="w-3 h-3 text-gray-400" />
                                      )}
                                    </Button>
                                  </div>
                                  <p className="text-[8px] text-gray-400 mt-0.5">
                                    Added {formatDate(method.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 ml-2">
                                {!method.is_default && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                    onClick={() => handleSetDefaultClick(method)}
                                    title="Set as default"
                                    disabled={isSubmitting}
                                  >
                                    {isProcessing ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600" />
                                    ) : (
                                      <Star className="w-3 h-3" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteClick(method)}
                                  title="Delete"
                                  disabled={isSubmitting}
                                >
                                  {isProcessing ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
      />

      {/* Set Default Confirmation Dialog */}
      <SetDefaultConfirmDialog
        open={showSetDefaultConfirm}
        onOpenChange={setShowSetDefaultConfirm}
        onConfirm={handleConfirmSetDefault}
        paymentMethod={selectedPaymentMethod}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        paymentMethod={selectedPaymentMethod}
      />
    </div>
  );
}

// ================================
// Default component - WITHOUT SIDEBAR
// ================================
export default function Profile({ loaderData }: Route.ComponentProps) {
  const { user, profile, paymentMethods } = loaderData;
  
  return (
    <UserProvider user={user}>
      <ProfileContent 
        user={user} 
        profile={profile} 
        paymentMethods={paymentMethods} 
      />
    </UserProvider>
  );
}