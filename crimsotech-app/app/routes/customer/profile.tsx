// app/routes/customer/profile.tsx
import type { Route } from './+types/profile';
import { UserProvider } from '~/components/providers/user-role-provider';
import SidebarLayout from '~/components/layouts/sidebar';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Store,
  Edit,
  Home,
  Building,
  Globe,
  Map,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Wallet,
  Landmark,
  Send,
  CreditCard,
  Star,
  Pencil,
  Package,
  ShoppingBag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import AxiosInstance from '~/components/axios/Axios';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Checkbox } from '~/components/ui/checkbox';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  full_name: string;
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
  is_customer: boolean;
  created_at: string;
  profile_picture_url?: string | null;
}

interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  label?: string;
  is_default: boolean;
  contact_number?: string;
  recipient_name?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentMethod {
  id: string;
  type: 'wallet' | 'bank' | 'remittance';
  provider?: string;
  bank_name?: string;
  account_name: string;
  account_number: string;
  account_type?: string;
  branch?: string;
  contact_number?: string;
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  country?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  barangay?: string;
  street?: string;
  valid_id_type?: string;
  valid_id_number?: string;
  refund_id: string;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerData {
  is_customer: boolean;
  product_limit: number;
  current_product_count: number;
  products_remaining: number;
  customer_since?: string;
}

interface ShopData {
  id: string;
  name: string;
  description: string;
  verified: boolean;
  is_active: boolean;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { getSession } = await import('~/sessions.server');
  
  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get('userId');
  
  let profile = null;
  let error = null;

  if (userId) {
    try {
      const response = await AxiosInstance.get("/profile/", {
        headers: { "X-User-Id": userId },
      });

      if (response.data.success) {
        profile = response.data.profile;
        
        try {
          const addressesResponse = await AxiosInstance.get("/profile/addresses/", {
            headers: { "X-User-Id": userId },
          });
          if (addressesResponse.data.success) {
            profile.addresses = addressesResponse.data.addresses;
          }
        } catch (addrErr) {
          console.error("Error fetching addresses:", addrErr);
        }

        try {
          const paymentResponse = await AxiosInstance.get("/profile/payment-methods/", {
            headers: { "X-User-Id": userId },
          });
          if (paymentResponse.data.success) {
            profile.payment_methods = paymentResponse.data.payment_methods;
          }
        } catch (payErr) {
          console.error("Error fetching payment methods:", payErr);
        }
      } else {
        error = response.data.error || "Failed to load profile";
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      error = err.response?.data?.error || err.message || "Failed to load profile";
    }
  }

  return { user, userId, profile, error };
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "My Profile | TradEase" }];
}

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const { user, userId, profile, error } = loaderData;
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'profile' | 'addresses' | 'payments' | 'shop'>('profile');
  const [loading, setLoading] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [paymentMethodType, setPaymentMethodType] = useState<'wallet' | 'bank' | 'remittance'>('wallet');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['profile']));
  
  const [addresses, setAddresses] = useState<Address[]>(profile?.addresses || []);
  const [paymentMethods, setPaymentMethods] = useState(profile?.payment_methods || {
    wallets: [],
    banks: [],
    remittances: [],
    all_methods: [],
    total_count: 0
  });

  const [addressForm, setAddressForm] = useState({
    type: 'home' as 'home' | 'work' | 'other',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zip_code: '',
    country: 'Philippines',
    label: '',
    contact_number: '',
    recipient_name: '',
    is_default: false
  });

  const [paymentForm, setPaymentForm] = useState({
    type: 'wallet' as 'wallet' | 'bank' | 'remittance',
    refund_id: '',
    provider: '',
    account_name: '',
    account_number: '',
    contact_number: '',
    bank_name: '',
    account_type: 'savings',
    branch: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    country: 'Philippines',
    city: '',
    province: '',
    zip_code: '',
    barangay: '',
    street: '',
    valid_id_type: '',
    valid_id_number: ''
  });

  if (!userId) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="space-y-3 p-3">
            <Card className="border">
              <CardContent className="p-6 text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <h2 className="text-sm font-medium mb-1">Not Logged In</h2>
                <p className="text-xs text-gray-500 mb-3">Please login to view your profile</p>
                <Button onClick={() => navigate("/login")} size="sm" className="h-7 text-xs">
                  Go to Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  if (error && !profile) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="space-y-3 p-3">
            <Card className="border">
              <CardContent className="p-6 text-center">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p className="text-xs text-red-600 mb-3">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="h-7 text-xs">
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  if (!profile) {
    return (
      <UserProvider user={user}>
        <SidebarLayout>
          <div className="space-y-3 p-3">
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading profile...</p>
            </div>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  const userData = profile?.user;
  const customerData = profile?.customer;
  const shopData = profile?.shop;

  const getInitials = () => {
    if (userData?.full_name) {
      const names = userData.full_name.split(' ');
      if (names.length > 1) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (userData?.full_name) return userData.full_name;
    if (userData?.username) return userData.username;
    return 'User';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
    setActiveSection(section as any);
  };

  const handleAddAddress = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.post('/profile/addresses/', addressForm, {
        headers: { 'X-User-Id': userId }
      });
      if (response.data.success) {
        setAddresses([...addresses, response.data.address]);
        resetAddressForm();
        setShowAddressDialog(false);
      }
    } catch (error) {
      console.error('Error adding address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!editingAddress) return;
    setLoading(true);
    try {
      const response = await AxiosInstance.put(`/profile/addresses/${editingAddress.id}/`, addressForm, {
        headers: { 'X-User-Id': userId }
      });
      if (response.data.success) {
        setAddresses(addresses.map(addr => 
          addr.id === editingAddress.id ? response.data.address : addr
        ));
        resetAddressForm();
        setShowAddressDialog(false);
        setEditingAddress(null);
      }
    } catch (error) {
      console.error('Error updating address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Delete this address?')) return;
    try {
      const response = await AxiosInstance.delete(`/profile/addresses/${addressId}/`, {
        headers: { 'X-User-Id': userId },
        data: { type: 'address' }
      });
      if (response.data.success) {
        setAddresses(addresses.filter(addr => addr.id !== addressId));
      }
    } catch (error) {
      console.error('Error deleting address:', error);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const response = await AxiosInstance.put(`/profile/addresses/${addressId}/`, 
        { is_default: true },
        { headers: { 'X-User-Id': userId } }
      );
      if (response.data.success) {
        setAddresses(addresses.map(addr => ({
          ...addr,
          is_default: addr.id === addressId
        })));
      }
    } catch (error) {
      console.error('Error setting default address:', error);
    }
  };

  const handleAddPaymentMethod = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.post('/profile/payment-methods/', 
        { ...paymentForm, type: paymentMethodType },
        { headers: { 'X-User-Id': userId } }
      );
      if (response.data.success) {
        const newMethod = response.data.payment_method;
        setPaymentMethods((prev: typeof paymentMethods) => {
          const updated: typeof paymentMethods = { ...prev };
          if (newMethod.type === 'wallet') {
            updated.wallets = [...prev.wallets, newMethod];
          } else if (newMethod.type === 'bank') {
            updated.banks = [...prev.banks, newMethod];
          } else if (newMethod.type === 'remittance') {
            updated.remittances = [...prev.remittances, newMethod];
          }
          updated.all_methods = [...updated.wallets, ...updated.banks, ...updated.remittances];
          updated.total_count = updated.all_methods.length;
          return updated;
        });
        resetPaymentForm();
        setShowPaymentDialog(false);
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!editingPayment) return;
    setLoading(true);
    try {
      const response = await AxiosInstance.put(`/profile/payment-methods/${editingPayment.id}/`, 
        { ...paymentForm, type: editingPayment.type },
        { headers: { 'X-User-Id': userId } }
      );
      if (response.data.success) {
        const updatedMethod = response.data.payment_method;
        setPaymentMethods((prev: typeof paymentMethods) => {
            const updated = { ...prev };
            updated.wallets = prev.wallets.filter((p: PaymentMethod) => p.id !== editingPayment.id);
            updated.banks = prev.banks.filter((p: PaymentMethod) => p.id !== editingPayment.id);
            updated.remittances = prev.remittances.filter((p: PaymentMethod) => p.id !== editingPayment.id);
          
          if (updatedMethod.type === 'wallet') {
            updated.wallets = [...updated.wallets, updatedMethod];
          } else if (updatedMethod.type === 'bank') {
            updated.banks = [...updated.banks, updatedMethod];
          } else if (updatedMethod.type === 'remittance') {
            updated.remittances = [...updated.remittances, updatedMethod];
          }
          
          updated.all_methods = [...updated.wallets, ...updated.banks, ...updated.remittances];
          updated.total_count = updated.all_methods.length;
          return updated;
        });
        resetPaymentForm();
        setShowPaymentDialog(false);
        setEditingPayment(null);
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (method: PaymentMethod) => {
    if (!confirm(`Delete this ${method.type}?`)) return;
    try {
      const response = await AxiosInstance.delete(`/profile/payment-methods/${method.id}/`, {
        headers: { 'X-User-Id': userId },
        data: { type: method.type }
      });
      if (response.data.success) {
        setPaymentMethods((prev: typeof paymentMethods) => {
          const updated = { ...prev };
          if (method.type === 'wallet') {
            updated.wallets = prev.wallets.filter((m: PaymentMethod) => m.id !== method.id);
          } else if (method.type === 'bank') {
            updated.banks = prev.banks.filter((m: PaymentMethod) => m.id !== method.id);
          } else if (method.type === 'remittance') {
            updated.remittances = prev.remittances.filter((m: PaymentMethod) => m.id !== method.id);
          }
          updated.all_methods = [...updated.wallets, ...updated.banks, ...updated.remittances];
          updated.total_count = updated.all_methods.length;
          return updated;
        });
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      type: 'home',
      street: '',
      barangay: '',
      city: '',
      province: '',
      zip_code: '',
      country: 'Philippines',
      label: '',
      contact_number: '',
      recipient_name: '',
      is_default: false
    });
    setEditingAddress(null);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      type: 'wallet',
      refund_id: '',
      provider: '',
      account_name: '',
      account_number: '',
      contact_number: '',
      bank_name: '',
      account_type: 'savings',
      branch: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      country: 'Philippines',
      city: '',
      province: '',
      zip_code: '',
      barangay: '',
      street: '',
      valid_id_type: '',
      valid_id_number: ''
    });
    setEditingPayment(null);
  };

  const editAddress = (address: Address) => {
    setAddressForm({
      type: address.type,
      street: address.street,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      zip_code: address.zip_code,
      country: address.country,
      label: address.label || '',
      contact_number: address.contact_number || '',
      recipient_name: address.recipient_name || '',
      is_default: address.is_default
    });
    setEditingAddress(address);
    setShowAddressDialog(true);
  };

  const editPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethodType(method.type);
    setPaymentForm({
      type: method.type,
      refund_id: method.refund_id,
      provider: method.provider || '',
      account_name: method.account_name || '',
      account_number: method.account_number || '',
      contact_number: method.contact_number || '',
      bank_name: method.bank_name || '',
      account_type: method.account_type || 'savings',
      branch: method.branch || '',
      first_name: method.first_name || '',
      middle_name: method.middle_name || '',
      last_name: method.last_name || '',
      country: method.country || 'Philippines',
      city: method.city || '',
      province: method.province || '',
      zip_code: method.zip_code || '',
      barangay: method.barangay || '',
      street: method.street || '',
      valid_id_type: method.valid_id_type || '',
      valid_id_number: method.valid_id_number || ''
    });
    setEditingPayment(method);
    setShowPaymentDialog(true);
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-3 p-3 max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-base font-medium">Profile</h1>
              <p className="text-xs text-gray-500">Manage your account</p>
            </div>
            <Button
              onClick={() => navigate('/customer/account-profile')}
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
            >
              <Edit className="w-3 h-3" />
              Edit
            </Button>
          </div>

          {/* Profile Card */}
          <Card className="border">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border">
                  {userData?.profile_picture_url ? (
                    <AvatarImage src={userData.profile_picture_url} alt={getDisplayName()} />
                  ) : null}
                  <AvatarFallback className="bg-orange-50 text-orange-700 text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-medium truncate">{getDisplayName()}</h2>
                    {shopData && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        <Store className="w-2.5 h-2.5 mr-0.5" />
                        Shop
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-0.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{userData?.email}</span>
                    </div>
                    {userData?.contact_number && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{userData.contact_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Joined {formatDate(userData?.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {customerData?.is_customer && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Listed</div>
                    <div className="text-sm font-medium">{customerData.current_product_count}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Limit</div>
                    <div className="text-sm font-medium">{customerData.product_limit}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Remaining</div>
                    <div className="text-sm font-medium">{customerData.products_remaining}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Information Section */}
          <Card className="border">
            <button
              onClick={() => toggleSection('profile')}
              className="w-full px-3 py-2 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Personal Information</span>
              </div>
              {expandedSections.has('profile') ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            {expandedSections.has('profile') && (
              <CardContent className="pt-0 px-3 pb-3">
                <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
                  <InfoItem label="Full Name" value={userData?.full_name} />
                  <InfoItem label="Username" value={userData?.username} />
                  <InfoItem label="Gender" value={userData?.sex || 'Not specified'} />
                  <InfoItem label="Age" value={userData?.age?.toString()} />
                  <InfoItem label="Birth Date" value={userData?.date_of_birth ? formatDate(userData.date_of_birth) : null} />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Addresses Section */}
          <Card className="border">
            <button
              onClick={() => toggleSection('addresses')}
              className="w-full px-3 py-2 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Addresses ({addresses.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetAddressForm();
                    setShowAddressDialog(true);
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                {expandedSections.has('addresses') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedSections.has('addresses') && (
              <CardContent className="pt-0 px-3 pb-3">
                <div className="border-t pt-3 space-y-2">
                  {addresses.length === 0 ? (
                    <div className="text-center py-4">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs text-gray-500 mb-2">No addresses yet</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setShowAddressDialog(true)}
                        className="h-7 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Address
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {addresses.map((address) => (
                        <AddressCard
                          key={address.id}
                          address={address}
                          onEdit={() => editAddress(address)}
                          onDelete={() => handleDeleteAddress(address.id)}
                          onSetDefault={() => handleSetDefaultAddress(address.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Payment Methods Section */}
          <Card className="border">
            <button
              onClick={() => toggleSection('payments')}
              className="w-full px-3 py-2 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Payment Methods ({paymentMethods.total_count})</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetPaymentForm();
                    setShowPaymentDialog(true);
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                {expandedSections.has('payments') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedSections.has('payments') && (
              <CardContent className="pt-0 px-3 pb-3">
                <div className="border-t pt-3">
                  {paymentMethods.total_count === 0 ? (
                    <div className="text-center py-4">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs text-gray-500 mb-2">No payment methods</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setShowPaymentDialog(true)}
                        className="h-7 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Method
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods.wallets.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <Wallet className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-medium">E-Wallets</span>
                          </div>
                          <div className="space-y-2">
                            {paymentMethods.wallets.map((method: PaymentMethod) => (
                              <PaymentMethodCard
                                key={method.id}
                                method={method}
                                onEdit={() => editPaymentMethod(method)}
                                onDelete={() => handleDeletePaymentMethod(method)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {paymentMethods.banks.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <Landmark className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-medium">Bank Accounts</span>
                          </div>
                          <div className="space-y-2">
                            {paymentMethods.banks.map((method: PaymentMethod) => (
                              <PaymentMethodCard
                                key={method.id}
                                method={method}
                                onEdit={() => editPaymentMethod(method)}
                                onDelete={() => handleDeletePaymentMethod(method)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {paymentMethods.remittances.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <Send className="w-3 h-3 text-purple-500" />
                            <span className="text-xs font-medium">Remittance</span>
                          </div>
                          <div className="space-y-2">
                            {paymentMethods.remittances.map((method: PaymentMethod) => (
                              <PaymentMethodCard
                                key={method.id}
                                method={method}
                                onEdit={() => editPaymentMethod(method)}
                                onDelete={() => handleDeletePaymentMethod(method)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Shop Section */}
          {shopData && (
            <Card className="border">
              <button
                onClick={() => toggleSection('shop')}
                className="w-full px-3 py-2 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Shop</span>
                </div>
                {expandedSections.has('shop') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {expandedSections.has('shop') && (
                <CardContent className="pt-0 px-3 pb-3">
                  <div className="border-t pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <InfoItem label="Shop Name" value={shopData.name} />
                      <InfoItem label="Description" value={shopData.description} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] h-5 px-1.5 ${shopData.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                        {shopData.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {shopData.verified && (
                        <Badge className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-700">
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate(`/shop/${shopData.id}`)}
                      className="h-auto p-0 text-xs text-orange-600"
                    >
                      View Shop
                      <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </SidebarLayout>

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base">{editingAddress ? 'Edit Address' : 'Add Address'}</DialogTitle>
            <DialogDescription className="text-xs">
              Fill in the address details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select 
                  value={addressForm.type} 
                  onValueChange={(value: any) => setAddressForm({...addressForm, type: value})}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home" className="text-xs">Home</SelectItem>
                    <SelectItem value="work" className="text-xs">Work</SelectItem>
                    <SelectItem value="other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  className="h-8 text-xs"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({...addressForm, label: e.target.value})}
                  placeholder="e.g., Apartment"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Recipient Name</Label>
              <Input
                className="h-8 text-xs"
                value={addressForm.recipient_name}
                onChange={(e) => setAddressForm({...addressForm, recipient_name: e.target.value})}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Contact Number</Label>
              <Input
                className="h-8 text-xs"
                value={addressForm.contact_number}
                onChange={(e) => setAddressForm({...addressForm, contact_number: e.target.value})}
                placeholder="09123456789"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Street</Label>
              <Input
                className="h-8 text-xs"
                value={addressForm.street}
                onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                placeholder="House/Unit No., Street"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Barangay</Label>
              <Input
                className="h-8 text-xs"
                value={addressForm.barangay}
                onChange={(e) => setAddressForm({...addressForm, barangay: e.target.value})}
                placeholder="Barangay"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input
                  className="h-8 text-xs"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                  placeholder="City"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Province</Label>
                <Input
                  className="h-8 text-xs"
                  value={addressForm.province}
                  onChange={(e) => setAddressForm({...addressForm, province: e.target.value})}
                  placeholder="Province"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Zip Code</Label>
                <Input
                  className="h-8 text-xs"
                  value={addressForm.zip_code}
                  onChange={(e) => setAddressForm({...addressForm, zip_code: e.target.value})}
                  placeholder="Zip code"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Country</Label>
                <Input
                  className="h-8 text-xs"
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({...addressForm, country: e.target.value})}
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={addressForm.is_default}
                onCheckedChange={(checked) => 
                  setAddressForm({...addressForm, is_default: checked as boolean})
                }
              />
              <Label htmlFor="is_default" className="text-xs">Set as default</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddressDialog(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
              disabled={loading}
              className="h-8 text-xs bg-orange-600 hover:bg-orange-700"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (editingAddress ? 'Update' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editingPayment ? 'Edit' : 'Add'} Payment Method</DialogTitle>
            <DialogDescription className="text-xs">
              Select type and fill in the details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <RadioGroup 
                value={paymentMethodType} 
                onValueChange={(value: any) => {
                  setPaymentMethodType(value);
                  setPaymentForm({...paymentForm, type: value});
                }}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="wallet" id="wallet" className="h-3 w-3" />
                  <Label htmlFor="wallet" className="text-xs">Wallet</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="bank" id="bank" className="h-3 w-3" />
                  <Label htmlFor="bank" className="text-xs">Bank</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="remittance" id="remittance" className="h-3 w-3" />
                  <Label htmlFor="remittance" className="text-xs">Remittance</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Refund ID</Label>
              <Input
                className="h-8 text-xs"
                value={paymentForm.refund_id}
                onChange={(e) => setPaymentForm({...paymentForm, refund_id: e.target.value})}
                placeholder="Enter refund ID"
              />
            </div>

            {paymentMethodType === 'wallet' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Provider</Label>
                  <Select 
                    value={paymentForm.provider} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, provider: value})}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GCash" className="text-xs">GCash</SelectItem>
                      <SelectItem value="PayMaya" className="text-xs">PayMaya</SelectItem>
                      <SelectItem value="GrabPay" className="text-xs">GrabPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Account Name</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.account_name}
                    onChange={(e) => setPaymentForm({...paymentForm, account_name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Account Number</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.account_number}
                    onChange={(e) => setPaymentForm({...paymentForm, account_number: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Contact Number</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.contact_number}
                    onChange={(e) => setPaymentForm({...paymentForm, contact_number: e.target.value})}
                  />
                </div>
              </>
            )}

            {paymentMethodType === 'bank' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Bank Name</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.bank_name}
                    onChange={(e) => setPaymentForm({...paymentForm, bank_name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Account Name</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.account_name}
                    onChange={(e) => setPaymentForm({...paymentForm, account_name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Account Number</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.account_number}
                    onChange={(e) => setPaymentForm({...paymentForm, account_number: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Account Type</Label>
                  <Select 
                    value={paymentForm.account_type} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, account_type: value})}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings" className="text-xs">Savings</SelectItem>
                      <SelectItem value="checking" className="text-xs">Checking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Branch</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.branch}
                    onChange={(e) => setPaymentForm({...paymentForm, branch: e.target.value})}
                  />
                </div>
              </>
            )}

            {paymentMethodType === 'remittance' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Provider</Label>
                  <Select 
                    value={paymentForm.provider} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, provider: value})}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Palawan" className="text-xs">Palawan</SelectItem>
                      <SelectItem value="Cebuana" className="text-xs">Cebuana</SelectItem>
                      <SelectItem value="MLhuillier" className="text-xs">MLhuillier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">First Name</Label>
                    <Input
                      className="h-8 text-xs"
                      value={paymentForm.first_name}
                      onChange={(e) => setPaymentForm({...paymentForm, first_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Middle</Label>
                    <Input
                      className="h-8 text-xs"
                      value={paymentForm.middle_name}
                      onChange={(e) => setPaymentForm({...paymentForm, middle_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last Name</Label>
                    <Input
                      className="h-8 text-xs"
                      value={paymentForm.last_name}
                      onChange={(e) => setPaymentForm({...paymentForm, last_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Contact Number</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.contact_number}
                    onChange={(e) => setPaymentForm({...paymentForm, contact_number: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Street</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.street}
                    onChange={(e) => setPaymentForm({...paymentForm, street: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Barangay</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.barangay}
                    onChange={(e) => setPaymentForm({...paymentForm, barangay: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input
                      className="h-8 text-xs"
                      value={paymentForm.city}
                      onChange={(e) => setPaymentForm({...paymentForm, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Province</Label>
                    <Input
                      className="h-8 text-xs"
                      value={paymentForm.province}
                      onChange={(e) => setPaymentForm({...paymentForm, province: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Zip Code</Label>
                    <Input
                      className="h-8 text-xs"
                      value={paymentForm.zip_code}
                      onChange={(e) => setPaymentForm({...paymentForm, zip_code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Country</Label>
                    <Input
                      className="h-8 text-xs"
                      value={paymentForm.country}
                      onChange={(e) => setPaymentForm({...paymentForm, country: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">ID Type</Label>
                  <Select 
                    value={paymentForm.valid_id_type} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, valid_id_type: value})}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Driver's License" className="text-xs">Driver's License</SelectItem>
                      <SelectItem value="Passport" className="text-xs">Passport</SelectItem>
                      <SelectItem value="UMID" className="text-xs">UMID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">ID Number</Label>
                  <Input
                    className="h-8 text-xs"
                    value={paymentForm.valid_id_number}
                    onChange={(e) => setPaymentForm({...paymentForm, valid_id_number: e.target.value})}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPaymentDialog(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={editingPayment ? handleUpdatePaymentMethod : handleAddPaymentMethod}
              disabled={loading}
              className="h-8 text-xs bg-orange-600 hover:bg-orange-700"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (editingPayment ? 'Update' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserProvider>
  );
}

// Address Card Component
function AddressCard({ address, onEdit, onDelete, onSetDefault }: { 
  address: Address; 
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div className="border rounded p-2 relative bg-white">
      {address.is_default && (
        <Badge className="absolute top-1 right-1 text-[8px] h-3 px-1 bg-orange-50 text-orange-700 border-0">
          <Star className="w-2 h-2 mr-0.5 fill-orange-500" />
          Default
        </Badge>
      )}
      
      <div className="flex items-start gap-2 mb-1">
        <div className="p-1 bg-gray-50 rounded">
          {address.type === 'home' && <Home className="w-3 h-3" />}
          {address.type === 'work' && <Building className="w-3 h-3" />}
          {address.type === 'other' && <MapPin className="w-3 h-3" />}
        </div>
        <div>
          <h4 className="text-xs font-medium capitalize">{address.type}</h4>
          {address.label && <p className="text-[10px] text-gray-500">{address.label}</p>}
        </div>
      </div>
      
      <div className="text-[10px] text-gray-600 space-y-0.5 mb-2">
        {address.recipient_name && <p className="font-medium">{address.recipient_name}</p>}
        <p>{address.street}</p>
        <p>{address.barangay}, {address.city}</p>
        <p>{address.province}, {address.zip_code}</p>
        {address.contact_number && <p>{address.contact_number}</p>}
      </div>
      
      <div className="flex items-center gap-1 pt-1 border-t">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-5 px-1.5 text-[10px]">
          <Pencil className="w-2.5 h-2.5 mr-0.5" />
          Edit
        </Button>
        {!address.is_default && (
          <Button variant="ghost" size="sm" onClick={onSetDefault} className="h-5 px-1.5 text-[10px]">
            <Star className="w-2.5 h-2.5 mr-0.5" />
            Default
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-5 px-1.5 text-[10px] text-red-600 hover:text-red-700">
          <Trash2 className="w-2.5 h-2.5 mr-0.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

// Payment Method Card Component
function PaymentMethodCard({ method, onEdit, onDelete }: { 
  method: PaymentMethod; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getIcon = () => {
    switch (method.type) {
      case 'wallet': return <Wallet className="w-3 h-3 text-blue-500" />;
      case 'bank': return <Landmark className="w-3 h-3 text-green-500" />;
      case 'remittance': return <Send className="w-3 h-3 text-purple-500" />;
    }
  };

  return (
    <div className="border rounded p-2">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-gray-50 rounded">
            {getIcon()}
          </div>
          <div>
            <h4 className="text-xs font-medium">
              {method.type === 'wallet' && method.provider}
              {method.type === 'bank' && method.bank_name}
              {method.type === 'remittance' && method.provider}
            </h4>
            <p className="text-[10px] text-gray-500 capitalize">{method.type}</p>
          </div>
        </div>
        {method.is_default && (
          <Badge variant="outline" className="text-[8px] h-3 px-1 bg-orange-50 text-orange-700">
            Default
          </Badge>
        )}
      </div>
      
      <div className="text-[10px] text-gray-600 mb-2">
        <p className="font-medium">{method.account_name}</p>
        <p>{method.account_number}</p>
        {method.type === 'bank' && <p>{method.account_type}</p>}
        {method.type === 'remittance' && method.contact_number && <p>{method.contact_number}</p>}
      </div>
      
      <div className="flex items-center gap-1 pt-1 border-t">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-5 px-1.5 text-[10px]">
          <Pencil className="w-2.5 h-2.5 mr-0.5" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-5 px-1.5 text-[10px] text-red-600 hover:text-red-700">
          <Trash2 className="w-2.5 h-2.5 mr-0.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

// Helper component
function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-xs font-medium">{value}</p>
    </div>
  );
}