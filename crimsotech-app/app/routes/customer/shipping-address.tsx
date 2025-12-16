// app/routes/shipping-address.tsx
import { useState, useEffect } from "react";
import type { Route } from "./+types/shipping-address";
import SidebarLayout from '~/components/layouts/sidebar';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Plus, MapPin, Home, Briefcase, Globe } from "lucide-react";
import ShippingAddressCard from "~/components/customer/shipping-address-card";
import ShippingAddressForm from "~/components/customer/shipping-address-form";
import DeleteAddressDialog from "~/components/customer/delete-confirmation";
import AxiosInstance from '~/components/axios/Axios';
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { Toaster } from "~/components/ui/sonner";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";


export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Shipping Addresses",
    }
  ]
}

interface ShippingAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  full_address: string;
  is_default: boolean;
  address_type: 'home' | 'work' | 'other';
  street: string;
  barangay: string;
  city: string;
  province: string;
  state: string;
  zip_code: string;
  country: string;
  building_name: string;
  floor_number: string;
  unit_number: string;
  landmark: string;
  instructions: string;
  created_at: string;
}

interface LoaderData {
  user: any;
  shippingAddresses: ShippingAddress[];
  defaultAddress: ShippingAddress | null;
  count: number;
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  await requireRole(request, context, ["isCustomer"]);

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  let shippingAddresses: ShippingAddress[] = [];
  let defaultAddress: ShippingAddress | null = null;
  let count = 0;

  try {
    const response = await AxiosInstance.get('/shipping-address/get_shipping_addresses/', {
      params: {
        user_id: user.user_id
      }
    });

    if (response.data.success) {
      shippingAddresses = response.data.shipping_addresses || [];
      defaultAddress = response.data.default_shipping_address;
      count = response.data.count || 0;
    }
  } catch (error: any) {
    console.error("Error fetching shipping addresses:", error);
  }

  return { 
    user, 
    shippingAddresses,
    defaultAddress,
    count
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  await requireRole(request, context, ["isCustomer"]);

  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "add") {
      const response = await AxiosInstance.post('/shipping-address/add_shipping_address/', {
        user_id: user.user_id,
        recipient_name: formData.get("recipient_name"),
        recipient_phone: formData.get("recipient_phone"),
        street: formData.get("street"),
        barangay: formData.get("barangay"),
        city: formData.get("city"),
        province: formData.get("province"),
        state: formData.get("state") || '',
        zip_code: formData.get("zip_code"),
        country: formData.get("country"),
        building_name: formData.get("building_name") || '',
        floor_number: formData.get("floor_number") || '',
        unit_number: formData.get("unit_number") || '',
        landmark: formData.get("landmark") || '',
        instructions: formData.get("instructions") || '',
        address_type: formData.get("address_type"),
        is_default: formData.get("is_default") === "true",
      });

      if (response.data.success) {
        return { success: true, message: 'Address added successfully!', action: 'add' };
      } else {
        return { success: false, error: response.data.error || 'Failed to add address' };
      }
    } 
    
    else if (intent === "edit") {
      const response = await AxiosInstance.put('/shipping-address/update_shipping_address/', {
        address_id: formData.get("address_id"),
        user_id: user.user_id,
        recipient_name: formData.get("recipient_name"),
        recipient_phone: formData.get("recipient_phone"),
        street: formData.get("street"),
        barangay: formData.get("barangay"),
        city: formData.get("city"),
        province: formData.get("province"),
        state: formData.get("state") || '',
        zip_code: formData.get("zip_code"),
        country: formData.get("country"),
        building_name: formData.get("building_name") || '',
        floor_number: formData.get("floor_number") || '',
        unit_number: formData.get("unit_number") || '',
        landmark: formData.get("landmark") || '',
        instructions: formData.get("instructions") || '',
        address_type: formData.get("address_type"),
        is_default: formData.get("is_default") === "true",
      });

      if (response.data.success) {
        return { success: true, message: 'Address updated successfully!', action: 'edit' };
      } else {
        return { success: false, error: response.data.error || 'Failed to update address' };
      }
    }
    
    else if (intent === "delete") {
      const response = await AxiosInstance.delete('/shipping-address/delete_shipping_address/', {
        data: {
          address_id: formData.get("address_id"),
          user_id: user.user_id
        }
      });

      if (response.data.success) {
        return { success: true, message: 'Address deleted successfully!', action: 'delete' };
      } else {
        return { success: false, error: response.data.error || 'Failed to delete address' };
      }
    }
    
    else if (intent === "set_default") {
      const response = await AxiosInstance.post('/shipping-address/set_default_address/', {
        address_id: formData.get("address_id"),
        user_id: user.user_id
      });

      if (response.data.success) {
        return { success: true, message: 'Default address updated!', action: 'set_default' };
      } else {
        return { success: false, error: response.data.error || 'Failed to set default address' };
      }
    }

    return { success: false, error: 'Invalid action intent' };
  } catch (error: any) {
    console.error("Error in shipping address action:", error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message || 'An unexpected error occurred' 
    };
  }
}

export default function ShippingAddressPage({ loaderData }: { loaderData: LoaderData }) {
  const navigate = useNavigate()
  const { user, shippingAddresses: initialAddresses, defaultAddress, count } = loaderData;
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const revalidator = useRevalidator();
  
  const homeAddresses = loaderData.shippingAddresses.filter(addr => addr.address_type === 'home');
  const workAddresses = loaderData.shippingAddresses.filter(addr => addr.address_type === 'work');
  const otherAddresses = loaderData.shippingAddresses.filter(addr => addr.address_type === 'other');

  const refreshAddresses = () => {
    revalidator.revalidate();
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete) return;
    
    setIsLoading(true);
    try {
      const response = await AxiosInstance.delete('/shipping-address/delete_shipping_address/', {
        data: {
          address_id: addressToDelete,
          user_id: user.user_id
        }
      });

      if (response.data.success) {
        revalidator.revalidate();
        toast.success('Address deleted successfully!');
        setDeleteDialogOpen(false);
        setAddressToDelete(null);
      } else {
        toast.error(response.data.error || 'Failed to delete address');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    setIsLoading(true);
    try {
      const response = await AxiosInstance.post('/shipping-address/set_default_address/', {
        address_id: addressId,
        user_id: user.user_id
      });

      if (response.data.success) {
        revalidator.revalidate();
        toast.success('Default address updated!');
      } else {
        toast.error(response.data.error || 'Failed to set default address');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to set default address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (address: ShippingAddress) => {
    setEditingAddress(address);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (addressId: string) => {
    setAddressToDelete(addressId);
    setDeleteDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingAddress(null);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const EmptyState = ({ type }: { type: string }) => (
    <Card className="border-dashed">
      <CardContent className="pt-6 text-center">
        <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No {type} addresses</h3>
        <p className="text-gray-500 text-sm mb-4">
          You haven't added any {type.toLowerCase()} addresses yet
        </p>
        <Button 
          variant="outline" 
          onClick={handleAddNewClick}
          className="border-orange-200 text-orange-600 hover:bg-orange-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add {type} Address
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <UserProvider user={user}>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Button
                onClick={() => navigate(-1)}
                >
                 <ArrowLeft />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Shipping Addresses</h1>
            
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                  {count} Address{count !== 1 ? 'es' : ''}
                </Badge>
                <Button 
                  onClick={handleAddNewClick}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Address
                </Button>
              </div>
            </div>
          </div>
        </div>

        {defaultAddress && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <svg className="h-5 w-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-orange-800">Default Shipping Address</CardTitle>
                      <CardDescription className="text-orange-600">
                        This address will be used for all orders by default
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-orange-500 text-white">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">{defaultAddress.recipient_name}</p>
                    <p className="text-gray-600 text-sm">{defaultAddress.recipient_phone}</p>
                    <p className="text-gray-700 mt-1">{defaultAddress.full_address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="all" className="px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                All ({count})
              </TabsTrigger>
              <TabsTrigger value="home" className="px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Home className="h-4 w-4 mr-2" />
                Home ({homeAddresses.length})
              </TabsTrigger>
              <TabsTrigger value="work" className="px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Briefcase className="h-4 w-4 mr-2" />
                Work ({workAddresses.length})
              </TabsTrigger>
              <TabsTrigger value="other" className="px-3 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Globe className="h-4 w-4 mr-2" />
                Other ({otherAddresses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {loaderData.shippingAddresses.length === 0 ? (
                <EmptyState type="Shipping" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loaderData.shippingAddresses.map((address) => (
                    <ShippingAddressCard
                      key={address.id}
                      address={address}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onSetDefault={handleSetDefaultAddress}
                      isDeleting={isLoading && addressToDelete === address.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="home" className="space-y-4">
              {homeAddresses.length === 0 ? (
                <EmptyState type="Home" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {homeAddresses.map((address) => (
                    <ShippingAddressCard
                      key={address.id}
                      address={address}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onSetDefault={handleSetDefaultAddress}
                      isDeleting={isLoading && addressToDelete === address.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="work" className="space-y-4">
              {workAddresses.length === 0 ? (
                <EmptyState type="Work" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workAddresses.map((address) => (
                    <ShippingAddressCard
                      key={address.id}
                      address={address}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onSetDefault={handleSetDefaultAddress}
                      isDeleting={isLoading && addressToDelete === address.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="other" className="space-y-4">
              {otherAddresses.length === 0 ? (
                <EmptyState type="Other" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherAddresses.map((address) => (
                    <ShippingAddressCard
                      key={address.id}
                      address={address}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onSetDefault={handleSetDefaultAddress}
                      isDeleting={isLoading && addressToDelete === address.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="fixed bottom-6 right-6 z-50 md:hidden">
            <Button
              size="lg"
              onClick={handleAddNewClick}
              className="h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <ShippingAddressForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingAddress}
        mode={isEditing ? 'edit' : 'create'}
        addressId={editingAddress?.id}
        onSuccess={refreshAddresses}
      />

      <DeleteAddressDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteAddress}
        isLoading={isLoading}
      />
    </UserProvider>
  );
}