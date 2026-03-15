import type { Route } from './+types/profile';
import { useFetcher, useNavigate } from "react-router";
// Remove SidebarLayout import
// import SidebarLayout from '~/components/layouts/sidebar';
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
import { data } from "react-router";
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
  MapPinned,
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Receipt,
  Download,
  EyeOff,
  Eye,
  Store,
  ShoppingBag
} from "lucide-react";

// ================================
// Debug logger
// ================================
const DEBUG = true;
const log = {
  info: (...args: any[]) => DEBUG && console.log('[Wallet Debug]', ...args),
  error: (...args: any[]) => DEBUG && console.error('[Wallet Error]', ...args),
  data: (label: string, data: any) => DEBUG && console.log(`[Wallet Data] ${label}:`, data),
  api: (method: string, url: string, data?: any) => DEBUG && console.log(`[API] ${method} ${url}`, data || '')
};

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

interface WalletData {
  wallet_id: string;
  available_balance: number;
  pending_balance: number;
  total_balance: number;
  lifetime_earnings: number;
  lifetime_withdrawals: number;
  pending_withdrawals: number;
  deductions: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'completed' | 'pending' | 'failed';
  source: string;
  source_type: 'personal' | 'shop';
  shop_id?: string;
  shop_name?: string;
  order_id?: string;
}

interface Shop {
  id: string;
  name: string;
  logo?: string;
  shop_picture?: string;
}

interface MonthlyData {
  month: string;
  amount: number;
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
  
  // Wallet state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  
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
  // Fetch Shops Function
  // ================================
  const fetchShops = async () => {
    try {
      setLoadingShops(true);
      log.api('GET', '/customer-shops/', { customer_id: user.user_id });
      const response = await AxiosInstance.get('/customer-shops/', {
        params: { customer_id: user.user_id }
      });
      
      log.data('Shops response', response.data);
      
      if (response.data.success && response.data.shops) {
        const fetchedShops = response.data.shops.map((shop: any) => ({
          id: shop.id,
          name: shop.name,
          logo: shop.shop_picture || null,
          shop_picture: shop.shop_picture
        }));
        setShops(fetchedShops);
        log.info(`Loaded ${fetchedShops.length} shops`);
      } else {
        setShops([]);
        log.info('No shops found');
      }
    } catch (error) {
      log.error('Error fetching shops:', error);
      setShops([]);
    } finally {
      setLoadingShops(false);
    }
  };

  // ================================
  // Wallet Functions
  // ================================
  const fetchWalletData = async () => {
    try {
      setLoadingWallet(true);
      log.info('=== Starting wallet data fetch ===');
      
      // Get wallet balance
      log.api('GET', '/wallet/balance/');
      const balanceRes = await AxiosInstance.get('/wallet/balance/', {
        headers: { 'X-User-Id': user.user_id }
      });
      
      log.data('Balance response', balanceRes.data);
      
      if (balanceRes.data.success) {
        setWallet({
          wallet_id: balanceRes.data.wallet_id || '',
          available_balance: balanceRes.data.available_balance || 0,
          pending_balance: balanceRes.data.pending_balance || 0,
          total_balance: balanceRes.data.total_balance || 0,
          lifetime_earnings: balanceRes.data.lifetime_earnings || 0,
          lifetime_withdrawals: balanceRes.data.lifetime_withdrawals || 0,
          pending_withdrawals: balanceRes.data.pending_withdrawals || 0,
          deductions: 0
        });
        log.info('✅ Wallet balance loaded');
      }
      
      // Get ALL wallet transactions with shop info
      log.api('GET', '/wallet/transactions/?limit=100');
      const txRes = await AxiosInstance.get('/wallet/transactions/?limit=100', {
        headers: { 'X-User-Id': user.user_id }
      });
      
      log.data('All wallet transactions', txRes.data);
      
      if (txRes.data.success) {
        const apiTransactions = txRes.data.transactions || [];
        log.info(`✅ Loaded ${apiTransactions.length} wallet transactions`);
        
        // Format transactions for display
        const formattedTransactions: Transaction[] = apiTransactions.map((tx: any) => {
          // Determine source type
          let source_type: 'personal' | 'shop' = 'personal';
          if (tx.source_type === 'shop_sale') {
            source_type = 'shop';
          }
          
          // Create description
          let description = '';
          if (tx.source_type === 'personal_sale') description = 'Personal Listing Sale';
          else if (tx.source_type === 'shop_sale') description = tx.shop_name ? `Sale from ${tx.shop_name}` : 'Shop Sale';
          else if (tx.source_type === 'withdrawal') description = 'Withdrawal';
          else if (tx.source_type === 'refund') description = 'Refund';
          else if (tx.source_type === 'release') description = 'Release from Pending';
          else description = tx.source_type || 'Transaction';
          
          return {
            id: tx.transaction_id,
            date: tx.created_at,
            description: description,
            amount: parseFloat(tx.amount),
            type: tx.transaction_type,
            status: tx.status || 'completed',
            source: tx.source_type,
            source_type: source_type,
            shop_id: tx.shop_id,
            shop_name: tx.shop_name,
            order_id: tx.order_id
          };
        });
        
        setTransactions(formattedTransactions);
        setFilteredTransactions(formattedTransactions);
        log.info(`✅ Formatted ${formattedTransactions.length} transactions`);
      }
      
      // Get transaction summary for monthly data
      log.api('GET', '/wallet/transaction_summary/');
      const summaryRes = await AxiosInstance.get('/wallet/transaction_summary/', {
        headers: { 'X-User-Id': user.user_id }
      });
      
      log.data('Summary response', summaryRes.data);
      
      if (summaryRes.data.success) {
        const monthly = summaryRes.data.summary?.monthly_data || [];
        setMonthlyData(monthly.map((m: any) => ({
          month: m.month,
          amount: m.credits || 0
        })));
        log.info(`✅ Loaded ${monthly.length} months of data`);
      }
      
      log.info('=== Wallet data fetch complete ===');
      
    } catch (error) {
      log.error('Error fetching wallet data:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Filter transactions based on selected filter
  useEffect(() => {
    if (!transactions.length) return;
    
    log.info(`Filtering transactions: ${selectedFilter}`);
    let filtered = transactions;
    
    if (selectedFilter === 'personal') {
      filtered = transactions.filter(t => t.source_type === 'personal');
      log.info(`Filtered to personal: ${filtered.length} transactions`);
    } else if (selectedFilter.startsWith('shop_')) {
      const shopId = selectedFilter.replace('shop_', '');
      filtered = transactions.filter(t => t.shop_id === shopId);
      log.info(`Filtered to shop ${shopId}: ${filtered.length} transactions`);
    } else {
      log.info(`Showing all: ${filtered.length} transactions`);
    }
    
    setFilteredTransactions(filtered);
  }, [selectedFilter, transactions]);

  // Test function to create a test transaction
  const createTestTransaction = async () => {
    try {
      log.info('Creating test transaction...');
      const response = await AxiosInstance.post('/wallet/credit/', {
        amount: 1000.00,
        source_type: 'personal_sale',
        description: 'Test transaction'
      }, {
        headers: { 'X-User-Id': user.user_id }
      });
      
      log.data('Test transaction response', response.data);
      
      if (response.data.success) {
        setSuccess('Test transaction created successfully!');
        fetchWalletData();
      }
    } catch (error: any) {
      log.error('Error creating test transaction:', error);
      setError(error.response?.data?.error || 'Failed to create test transaction');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Simple bar graph component
  const SimpleBarGraph = ({ data }: { data: MonthlyData[] }) => {
    const maxAmount = Math.max(...data.map(d => d.amount), 0.01);
    
    return (
      <div className="h-32 flex items-end justify-between gap-1 mt-2">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div 
              className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors"
              style={{ height: `${(item.amount / maxAmount) * 80}px` }}
            />
            <span className="text-[10px] text-gray-500 mt-1">{item.month}</span>
          </div>
        ))}
      </div>
    );
  };

  // ================================
  // Profile Functions
  // ================================
  const fetchProfile = async () => {
    try {
      setError(null);
      setLoading(true);
      log.api('GET', '/profile/');
      const response = await AxiosInstance.get('/profile/', {
        headers: {
          'X-User-Id': user.user_id
        }
      });
      log.data('Profile response', response.data);
      
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
      log.error("Error fetching profile:", error);
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
      log.error("Error saving profile:", error);
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
      log.error("Error fetching addresses:", error);
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
      log.error("Error adding address:", error);
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
      log.error("Error updating address:", error);
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
      log.error("Error deleting address:", error);
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
      log.error("Error setting default address:", error);
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
  // Payment Functions
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
        if (response.data.success === true) {
          if (response.data.payment_method) {
            setPaymentMethods(prev => {
              const newMethod = response.data.payment_method;
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
      log.error("Error adding payment method:", error);
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
        setPaymentMethods(prev => prev.filter(p => p.payment_id !== paymentId));
        setSuccess("Payment method deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      log.error("Error deleting payment method:", error);
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
        setPaymentMethods(prev => prev.map(p => ({
          ...p,
          is_default: p.payment_id === paymentId
        })));
        
        setSuccess("Default payment method updated!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      log.error("Error setting default payment:", error);
      setError(error.response?.data?.error || "Failed to set default payment method");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    log.info('Component mounted, user:', user.user_id);
    if (!initialProfile) {
      fetchProfile();
    } else {
      setPaymentMethods(initialProfile.profile?.payment_methods || []);
    }
    fetchAddresses();
    fetchShops();
  }, []);

  // Fetch wallet data after shops are loaded
  useEffect(() => {
    if (shops.length >= 0) {
      log.info('Shops loaded, fetching wallet data...');
      fetchWalletData();
    }
  }, [shops]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex justify-center items-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs">Loading profile...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
            <p className="text-xs text-gray-500">Manage your account and finances</p>
          </div>
        </div>
      </div>

      {/* Content with horizontal padding */}
      <div className="px-4 py-4 md:px-6 lg:px-8">
        {/* Debug Buttons */}
        {DEBUG && (
          <div className="mb-4 flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={createTestTransaction}
              className="text-xs border-yellow-300 bg-yellow-50"
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Create Test Transaction
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const res = await AxiosInstance.get('/wallet/transactions/?limit=100', {
                  headers: { 'X-User-Id': user.user_id }
                });
                console.log('📊 All wallet transactions:', res.data);
              }}
              className="text-xs border-gray-300 bg-gray-50"
            >
              Log All Transactions
            </Button>
          </div>
        )}

        {/* Edit Button Row */}
        <div className="flex justify-end mb-4">
          {!editMode ? (
            <Button 
              onClick={() => setEditMode(true)}
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
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
            <p className="text-green-600 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
            <p className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        {/* Profile Tabs */}
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6 bg-gray-100 p-0.5 h-10">
            <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-white h-8">
              <User className="w-3.5 h-3.5 mr-1" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="addresses" className="text-xs data-[state=active]:bg-white h-8">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs data-[state=active]:bg-white h-8">
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="finance" className="text-xs data-[state=active]:bg-white h-8">
              <Wallet className="w-3.5 h-3.5 mr-1" />
              Finance
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
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

          {/* Addresses Tab */}
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
                {/* Address Form */}
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
                
                {/* Addresses List */}
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

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
                  <CardDescription className="text-xs">Manage your payout options</CardDescription>
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
                {/* Payment Form */}
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
                
                {/* Payment Methods List */}
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

          {/* Finance Tab */}
          <TabsContent value="finance">
            <div className="space-y-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('all')}
                  className="h-8 text-xs"
                >
                  <Wallet className="w-3.5 h-3.5 mr-1" />
                  All
                </Button>
                <Button
                  variant={selectedFilter === 'personal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('personal')}
                  className="h-8 text-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                  Personal Listings
                </Button>
                {loadingShops ? (
                  <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
                    <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Loading shops...
                  </Button>
                ) : (
                  shops.map(shop => (
                    <Button
                      key={shop.id}
                      variant={selectedFilter === `shop_${shop.id}` ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFilter(`shop_${shop.id}`)}
                      className="h-8 text-xs"
                    >
                      {shop.shop_picture ? (
                        <img 
                          src={shop.shop_picture} 
                          alt={shop.name}
                          className="w-3.5 h-3.5 rounded-full mr-1 object-cover"
                        />
                      ) : (
                        <Store className="w-3.5 h-3.5 mr-1" />
                      )}
                      <span className="truncate max-w-[100px]">{shop.name}</span>
                    </Button>
                  ))
                )}
              </div>

              {/* Wallet Balance Cards - 4 cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-gray-500">Available</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => setShowBalance(!showBalance)}
                      >
                        {showBalance ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                    </div>
                    <p className="text-xl font-semibold">
                      {showBalance ? formatCurrency(wallet?.available_balance || 0) : '••••••'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Ready to withdraw</p>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs font-medium text-gray-500">Pending</span>
                    </div>
                    <p className="text-xl font-semibold">
                      {showBalance ? formatCurrency(wallet?.pending_balance || 0) : '••••••'}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">Awaiting release</p>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-500">Total Balance</span>
                    </div>
                    <p className="text-xl font-semibold">
                      {showBalance ? formatCurrency(wallet?.total_balance || 0) : '••••••'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Lifetime: {showBalance ? formatCurrency(wallet?.lifetime_earnings || 0) : '••••••'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-medium text-gray-500">Deductions</span>
                    </div>
                    <p className="text-xl font-semibold text-red-600">
                      {showBalance ? formatCurrency(wallet?.deductions || 0) : '••••••'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Fees & adjustments</p>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction History and Graph - 70/30 split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Transaction History - 70% */}
                <div className="lg:col-span-8">
                  <Card className="border shadow-sm h-full">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium">Transaction History</CardTitle>
                        <CardDescription className="text-xs">
                          {selectedFilter === 'all' ? 'All transactions' : 
                           selectedFilter === 'personal' ? 'Personal listings only' :
                           `Shop: ${shops.find(s => `shop_${s.id}` === selectedFilter)?.name}`}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {loadingWallet ? (
                          <div className="flex justify-center py-8">
                            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          filteredTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${
                                  tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  {tx.type === 'credit' ? (
                                    <ArrowDownRight className="w-3.5 h-3.5 text-green-600" />
                                  ) : (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{tx.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">{formatDate(tx.date)}</span>
                                    {tx.source_type === 'shop' && tx.shop_name && (
                                      <Badge className="bg-blue-100 text-blue-700 text-[8px] h-4 px-1">
                                        {tx.shop_name}
                                      </Badge>
                                    )}
                                    <Badge className={`text-[8px] h-4 px-1 ${
                                      tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {tx.status}
                                    </Badge>
                                  </div>
                                  {tx.order_id && (
                                    <p className="text-[8px] text-gray-400 mt-0.5">
                                      Order: {tx.order_id.slice(0, 8)}...
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${
                                  tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        
                        {filteredTransactions.length === 0 && !loadingWallet && (
                          <div className="text-center py-8 text-gray-400">
                            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">No transactions found</p>
                          </div>
                        )}
                      </div>

                      {/* View All Link */}
                      {filteredTransactions.length > 0 && (
                        <div className="mt-4 text-center">
                          <Button variant="link" size="sm" className="text-xs">
                            View All Transactions
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Graph - 30% */}
                <div className="lg:col-span-4">
                  <Card className="border shadow-sm h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Money Flow</CardTitle>
                      <CardDescription className="text-xs">Last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SimpleBarGraph data={monthlyData} />
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Average</span>
                          <span className="font-medium">
                            {formatCurrency(monthlyData.reduce((sum, m) => sum + m.amount, 0) / Math.max(monthlyData.length, 1))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Highest</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(Math.max(...monthlyData.map(m => m.amount), 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Lowest</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(Math.min(...monthlyData.map(m => m.amount), 0))}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ================================
// Default component - WITHOUT SIDEBAR
// ================================
export default function Profile({ loaderData }: Route.ComponentProps) {
  const user = loaderData.user;
  const profile = loaderData.profile || null;
  
  return (
    <UserProvider user={user}>
      <ProfileContent user={user} profile={profile} />
    </UserProvider>
  );
}