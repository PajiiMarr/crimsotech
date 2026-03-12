import type { Route } from './+types/profile';
import { useFetcher } from "react-router";
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useNavigate, data } from "react-router";
import AxiosInstance from '~/components/axios/Axios';
import { 
  AlertCircle, 
  Plus, 
  RefreshCw,
  User,
  Phone,
  MapPin,
  Camera,
  CreditCard,
  Edit2,
  Check,
  X,
  Trash2,
  Star,
  Calendar,
  Home,
  Briefcase,
  MapPinned
} from "lucide-react";

// ================================
// Meta function - page title
// ================================
export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "My Profile",
    },
  ];
}

// ================================
// Loader function
// ================================
export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));



  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  // Fetch user profile data
  let profileData = null;
  try {
    const response = await AxiosInstance.get('/profile/', {
      headers: {
        'X-User-Id': user.user_id
      }
    });
    if (response.data) {
      profileData = response.data;
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
  }

  return data({ user, profile: profileData }, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

// ================================
// Interfaces
// ================================
interface PaymentMethod {
  payment_id: string;
  payment_method: string;
  bank_name?: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
  created_at?: string;
}

interface Address {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  building_name?: string;
  floor_number?: string;
  unit_number?: string;
  landmark?: string;
  instructions?: string;
  address_type: string;
  is_default: boolean;
  full_address?: string;
}

// ================================
// ProfileContent Component
// ================================
function ProfileContent({ user, profile: initialProfile }: { user: any, profile?: any | null }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(initialProfile || null);
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    recipient_name: '',
    recipient_phone: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zip_code: '',
    country: 'Philippines',
    building_name: '',
    floor_number: '',
    unit_number: '',
    landmark: '',
    instructions: '',
    address_type: 'home',
    is_default: false
  });

  // Payment state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    profile?.profile?.payment_methods || []
  );
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    payment_method: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    is_default: false
  });

  // Form state - Only essential fields
  const [formData, setFormData] = useState({
    firstName: profile?.profile?.user?.first_name || '',
    middleName: profile?.profile?.user?.middle_name || '',
    lastName: profile?.profile?.user?.last_name || '',
    fullName: profile?.profile?.user?.full_name || '',
    email: profile?.profile?.user?.email || user?.email || '',
    phone: profile?.profile?.user?.contact_number || '',
    birthdate: profile?.profile?.user?.birthdate || '',
    profile_picture_url: profile?.profile?.user?.profile_picture_url || null,
  });

  // ================================
  // Profile Functions
  // ================================
  const fetchProfile = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await AxiosInstance.get('/profile/', {
        headers: {
          'X-User-Id': user.user_id
        }
      });
      if (response.data) {
        setProfile(response.data);
        setPaymentMethods(response.data.profile?.payment_methods || []);
        setFormData({
          firstName: response.data.profile?.user?.first_name || '',
          middleName: response.data.profile?.user?.middle_name || '',
          lastName: response.data.profile?.user?.last_name || '',
          fullName: response.data.profile?.user?.full_name || '',
          email: response.data.profile?.user?.email || user?.email || '',
          phone: response.data.profile?.user?.contact_number || '',
          birthdate: response.data.profile?.user?.birthdate || '',
          profile_picture_url: response.data.profile?.user?.profile_picture_url || null,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await AxiosInstance.put('/profile/', {
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        email: formData.email,
        contact_number: formData.phone,
        birthdate: formData.birthdate,
      }, {
        headers: {
          'X-User-Id': user.user_id
        }
      });
      
      if (response.data) {
        await fetchProfile();
        setSuccess("Profile updated successfully!");
        setEditMode(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      firstName: profile?.profile?.user?.first_name || '',
      middleName: profile?.profile?.user?.middle_name || '',
      lastName: profile?.profile?.user?.last_name || '',
      fullName: profile?.profile?.user?.full_name || '',
      email: profile?.profile?.user?.email || user?.email || '',
      phone: profile?.profile?.user?.contact_number || '',
      birthdate: profile?.profile?.user?.birthdate || '',
      profile_picture_url: profile?.profile?.user?.profile_picture_url || null,
    });
    setEditMode(false);
    setError(null);
  };

  // ================================
  // Address Functions
  // ================================
  const fetchAddresses = async () => {
    try {
      const response = await AxiosInstance.get('/shipping-address/get_shipping_addresses/', {
        params: { user_id: user.user_id }
      });
      if (response.data.success) {
        setAddresses(response.data.shipping_addresses || []);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setAddressFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAddAddress = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await AxiosInstance.post('/shipping-address/add_shipping_address/', {
        user_id: user.user_id,
        ...addressFormData
      });
      
      if (response.data.success) {
        await fetchAddresses();
        setSuccess("Address added successfully!");
        setShowAddressForm(false);
        resetAddressForm();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Error adding address:", error);
      setError("Failed to add address");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!editingAddress) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await AxiosInstance.put('/shipping-address/update_shipping_address/', {
        address_id: editingAddress.id,
        user_id: user.user_id,
        ...addressFormData
      });
      
      if (response.data.success) {
        await fetchAddresses();
        setSuccess("Address updated successfully!");
        setShowAddressForm(false);
        setEditingAddress(null);
        resetAddressForm();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Error updating address:", error);
      setError("Failed to update address");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await AxiosInstance.delete('/shipping-address/delete_shipping_address/', {
        data: {
          address_id: addressId,
          user_id: user.user_id
        }
      });
      
      if (response.data.success) {
        await fetchAddresses();
        setSuccess("Address deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      setError("Failed to delete address");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await AxiosInstance.post('/shipping-address/set_default_address/', {
        address_id: addressId,
        user_id: user.user_id
      });
      
      if (response.data.success) {
        await fetchAddresses();
        setSuccess("Default address updated!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Error setting default address:", error);
      setError("Failed to set default address");
    } finally {
      setSaving(false);
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressFormData({
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      street: address.street,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      zip_code: address.zip_code,
      country: address.country,
      building_name: address.building_name || '',
      floor_number: address.floor_number || '',
      unit_number: address.unit_number || '',
      landmark: address.landmark || '',
      instructions: address.instructions || '',
      address_type: address.address_type,
      is_default: address.is_default
    });
    setShowAddressForm(true);
  };

  const resetAddressForm = () => {
    setAddressFormData({
      recipient_name: '',
      recipient_phone: '',
      street: '',
      barangay: '',
      city: '',
      province: '',
      zip_code: '',
      country: 'Philippines',
      building_name: '',
      floor_number: '',
      unit_number: '',
      landmark: '',
      instructions: '',
      address_type: 'home',
      is_default: false
    });
  };

  // ================================
  // Payment Functions - FIXED
  // ================================
  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setPaymentFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAddPaymentMethod = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await AxiosInstance.post('/profile/', {
        action: 'add_payment_method',
        ...paymentFormData
      }, {
        headers: {
          'X-User-Id': user.user_id
        }
      });
      
      if (response.data) {
        // Check if success is in the response (your backend returns success: true)
        if (response.data.success === true) {
          // Add the new payment method to the list
          if (response.data.payment_method) {
            setPaymentMethods(prev => {
              const newMethod = response.data.payment_method;
              // If the new method is default, remove default from others
              if (newMethod.is_default) {
                return [...prev.map(p => ({ ...p, is_default: false })), newMethod];
              }
              return [...prev, newMethod];
            });
          }
          
          setSuccess("Payment method added successfully!");
          setShowPaymentForm(false);
          setPaymentFormData({
            payment_method: '',
            bank_name: '',
            account_name: '',
            account_number: '',
            is_default: false
          });
          
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(response.data?.error || "Failed to add payment method");
        }
      }
    } catch (error: any) {
      console.error("Error adding payment method:", error);
      setError(error.response?.data?.error || "Failed to add payment method");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      setSaving(true);
      setError(null);
      
      const response = await AxiosInstance.post('/profile/', {
        action: 'delete_payment_method',
        payment_id: paymentId
      }, {
        headers: {
          'X-User-Id': user.user_id
        }
      });
      
      if (response.data && response.data.success === true) {
        // Remove the deleted payment method from the list
        setPaymentMethods(prev => prev.filter(p => p.payment_id !== paymentId));
        
        setSuccess("Payment method deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      setError(error.response?.data?.error || "Failed to delete payment method");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultPayment = async (paymentId: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await AxiosInstance.post('/profile/', {
        action: 'set_default_payment',
        payment_id: paymentId
      }, {
        headers: {
          'X-User-Id': user.user_id
        }
      });
      
      if (response.data && response.data.success === true) {
        // Update default status in the list
        setPaymentMethods(prev => prev.map(p => ({
          ...p,
          is_default: p.payment_id === paymentId
        })));
        
        setSuccess("Default payment method updated!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error("Error setting default payment:", error);
      setError(error.response?.data?.error || "Failed to set default payment method");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!initialProfile) {
      fetchProfile();
    } else {
      // Initialize paymentMethods from initialProfile
      setPaymentMethods(initialProfile.profile?.payment_methods || []);
    }
    fetchAddresses();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center min-h-[300px]">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header - Minimal */}
      <div className="flex items-center justify-between mb-6 px-6 pt-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500">Manage your account settings</p>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <Button 
              onClick={() => setEditMode(true)}
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleSaveProfile}
                disabled={saving}
                size="sm"
                className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Save
              </Button>
              <Button 
                onClick={handleCancelEdit}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 mx-6 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
          <p className="text-green-600 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {success}
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 mx-6 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Profile Tabs - Minimal */}
      <div className="px-6">
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-sm mb-6 bg-gray-100 p-0.5 h-9">
            <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-white h-7">
              <User className="w-3.5 h-3.5 mr-1" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="addresses" className="text-xs data-[state=active]:bg-white h-7">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs data-[state=active]:bg-white h-7">
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab - Essential fields only */}
          <TabsContent value="profile">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Personal Information</CardTitle>
                <CardDescription className="text-xs">Update your personal details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="w-16 h-16 border-2 border-gray-200">
                    <AvatarImage src={formData.profile_picture_url || "/default-avatar.png"} />
                    <AvatarFallback className="bg-gray-100 text-base">
                      {formData.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {editMode && (
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
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Middle Name</Label>
                    <Input
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Last Name</Label>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Birthdate</Label>
                    <Input
                      name="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Email</Label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Phone Number</Label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab - Minimal */}
          <TabsContent value="addresses">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Shipping Addresses</CardTitle>
                  <CardDescription className="text-xs">Manage your shipping addresses</CardDescription>
                </div>
                {!showAddressForm && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setEditingAddress(null);
                      resetAddressForm();
                      setShowAddressForm(true);
                    }}
                    className="h-7 text-xs px-2"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {/* Address Form - Compact */}
                {showAddressForm && (
                  <div className="mb-4 p-3 border rounded-md bg-gray-50">
                    <h3 className="text-xs font-medium mb-3">{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Recipient Name</Label>
                        <Input
                          name="recipient_name"
                          value={addressFormData.recipient_name}
                          onChange={handleAddressInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Phone Number</Label>
                        <Input
                          name="recipient_phone"
                          value={addressFormData.recipient_phone}
                          onChange={handleAddressInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Street Address</Label>
                        <Input
                          name="street"
                          value={addressFormData.street}
                          onChange={handleAddressInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Barangay</Label>
                        <Input
                          name="barangay"
                          value={addressFormData.barangay}
                          onChange={handleAddressInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">City</Label>
                        <Input
                          name="city"
                          value={addressFormData.city}
                          onChange={handleAddressInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Province</Label>
                        <Input
                          name="province"
                          value={addressFormData.province}
                          onChange={handleAddressInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Zip Code</Label>
                        <Input
                          name="zip_code"
                          value={addressFormData.zip_code}
                          onChange={handleAddressInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Building/Unit</Label>
                        <Input
                          name="building_name"
                          value={addressFormData.building_name}
                          onChange={handleAddressInputChange}
                          className="h-7 text-xs"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Address Type</Label>
                        <select
                          name="address_type"
                          value={addressFormData.address_type}
                          onChange={handleAddressInputChange}
                          className="w-full h-7 text-xs border rounded-md px-2"
                        >
                          <option value="home">Home</option>
                          <option value="work">Work</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="is_default"
                          checked={addressFormData.is_default}
                          onChange={handleAddressInputChange}
                          className="w-3 h-3"
                        />
                        <Label className="text-[10px]">Set as default address</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
                        disabled={saving}
                        size="sm"
                        className="h-7 text-xs px-3"
                      >
                        {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                        {editingAddress ? 'Update' : 'Save'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddress(null);
                          resetAddressForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Addresses List - Compact */}
                <div className="space-y-2">
                  {addresses.length > 0 ? (
                    addresses.map((address) => (
                      <div key={address.id} className="p-3 border rounded-md">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {address.address_type === 'home' ? (
                                <Home className="w-3 h-3 text-gray-400" />
                              ) : address.address_type === 'work' ? (
                                <Briefcase className="w-3 h-3 text-gray-400" />
                              ) : (
                                <MapPinned className="w-3 h-3 text-gray-400" />
                              )}
                              <span className="text-xs font-medium">{address.recipient_name}</span>
                              {address.is_default && (
                                <Badge className="bg-green-100 text-green-700 text-[8px] h-4 px-1">Default</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500">{address.recipient_phone}</p>
                            <p className="text-[10px] text-gray-600">
                              {address.full_address || 
                                `${address.street}, ${address.barangay}, ${address.city}, ${address.province}`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!address.is_default && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => handleSetDefaultAddress(address.id)}
                                disabled={saving}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => handleEditAddress(address)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 text-[10px] px-2 text-red-600"
                              onClick={() => handleDeleteAddress(address.id)}
                              disabled={saving}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs">No addresses saved</p>
                      <Button 
                        variant="link" 
                        size="sm"
                        className="text-xs mt-1 h-6"
                        onClick={() => setShowAddressForm(true)}
                      >
                        Add your first address
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab - Minimal */}
          <TabsContent value="payments">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
                  <CardDescription className="text-xs">Manage your payment options</CardDescription>
                </div>
                {!showPaymentForm && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowPaymentForm(true)}
                    className="h-7 text-xs px-2"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {/* Payment Form - Compact */}
                {showPaymentForm && (
                  <div className="mb-4 p-3 border rounded-md bg-gray-50">
                    <h3 className="text-xs font-medium mb-3">Add Payment Method</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Payment Method</Label>
                        <select
                          name="payment_method"
                          value={paymentFormData.payment_method}
                          onChange={handlePaymentInputChange}
                          className="w-full h-7 text-xs border rounded-md px-2"
                        >
                          <option value="">Select method</option>
                          <option value="bank">Bank Account</option>
                          <option value="gcash">GCash</option>
                          <option value="paypal">PayPal</option>
                          <option value="card">Credit/Debit Card</option>
                        </select>
                      </div>
                      
                      {paymentFormData.payment_method === 'bank' && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-500">Bank Name</Label>
                          <Input
                            name="bank_name"
                            value={paymentFormData.bank_name}
                            onChange={handlePaymentInputChange}
                            className="h-7 text-xs"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Account Name</Label>
                        <Input
                          name="account_name"
                          value={paymentFormData.account_name}
                          onChange={handlePaymentInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">Account Number</Label>
                        <Input
                          name="account_number"
                          value={paymentFormData.account_number}
                          onChange={handlePaymentInputChange}
                          className="h-7 text-xs"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="is_default"
                          checked={paymentFormData.is_default}
                          onChange={handlePaymentInputChange}
                          className="w-3 h-3"
                        />
                        <Label className="text-[10px]">Set as default payment method</Label>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button 
                        onClick={handleAddPaymentMethod}
                        disabled={saving}
                        size="sm"
                        className="h-7 text-xs px-3"
                      >
                        {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                        Save
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => {
                          setShowPaymentForm(false);
                          setPaymentFormData({
                            payment_method: '',
                            bank_name: '',
                            account_name: '',
                            account_number: '',
                            is_default: false
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Payment Methods List - Compact */}
                <div className="space-y-2">
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => (
                      <div key={method.payment_id} className="p-3 border rounded-md">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium capitalize">{method.payment_method}</span>
                                {method.is_default && (
                                  <Badge className="bg-green-100 text-green-700 text-[8px] h-4 px-1 flex items-center gap-0.5">
                                    <Star className="w-2 h-2" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              {method.bank_name && (
                                <p className="text-[10px] text-gray-500">{method.bank_name}</p>
                              )}
                              <p className="text-[10px] text-gray-600">
                                {method.account_name} • {method.account_number}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {!method.is_default && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => handleSetDefaultPayment(method.payment_id)}
                                disabled={saving}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 text-[10px] px-2 text-red-600"
                              onClick={() => handleDeletePaymentMethod(method.payment_id)}
                              disabled={saving}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs">No payment methods</p>
                      <Button 
                        variant="link" 
                        size="sm"
                        className="text-xs mt-1 h-6"
                        onClick={() => setShowPaymentForm(true)}
                      >
                        Add your first payment method
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ================================
// Default component
// ================================
export default function Profile({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user;
  const profile = loaderData.profile || null;
  
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <ProfileContent user={user} profile={profile} />
      </SidebarLayout>
    </UserProvider>
  );
}