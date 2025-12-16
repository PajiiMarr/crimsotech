// app/components/customer/shipping-address-form.tsx
import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Plus, Home, Briefcase, MapPin, Save, AlertCircle } from "lucide-react";
import { useIsMobile } from "~/hooks/use-mobile";
import { Alert, AlertDescription } from "~/components/ui/alert";

interface ShippingAddressFormData {
  recipient_name: string;
  recipient_phone: string;
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
  address_type: 'home' | 'work' | 'other';
  is_default: boolean;
}

const initialFormData: ShippingAddressFormData = {
  recipient_name: '',
  recipient_phone: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  state: '',
  zip_code: '',
  country: 'Philippines',
  building_name: '',
  floor_number: '',
  unit_number: '',
  landmark: '',
  instructions: '',
  address_type: 'home',
  is_default: false,
};

interface ShippingAddressFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ShippingAddressFormData | null;
  mode: 'create' | 'edit';
  addressId?: string;
  onSuccess?: () => void;
}

// FormContent moved outside the component - FIXED VERSION
const FormContent = ({ 
  fetcher, 
  formData, 
  errors, 
  handleChange, 
  isLoading, 
  onOpenChange, 
  mode,
  addressId
}: {
  fetcher: any,
  formData: ShippingAddressFormData,
  errors: any,
  handleChange: (field: keyof ShippingAddressFormData, value: any) => void,
  isLoading: boolean,
  onOpenChange: (open: boolean) => void,
  mode: 'create' | 'edit',
  addressId?: string
}) => (
  <fetcher.Form 
    method="post" 
    action="/shipping-address" 
    className="space-y-6"
  >
    {/* Add hidden fields for intent and addressId */}
    <input type="hidden" name="intent" value={mode === 'create' ? 'add' : 'edit'} />
    {addressId && <input type="hidden" name="address_id" value={addressId} />}
    
    {fetcher.data?.error && (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{fetcher.data.error}</AlertDescription>
      </Alert>
    )}

    <ScrollArea className="h-[calc(100vh-180px)] md:h-[550px] pr-4">
      <div className="space-y-6 p-3">
        {/* Recipient Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Recipient Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-3">
              <Label htmlFor="recipient_name" className="text-sm">Full Name *</Label>
              <Input
                id="recipient_name"
                name="recipient_name"
                value={formData.recipient_name}
                onChange={(e) => handleChange('recipient_name', e.target.value)}
                placeholder="John Doe"
                required
                maxLength={200}
                className="bg-white"
              />
              {errors?.recipient_name && (
                <p className="px-1 text-xs text-red-600">{errors.recipient_name}</p>
              )}
            </div>
            <div className="grid gap-3">
              <Label htmlFor="recipient_phone" className="text-sm">Phone Number *</Label>
              <Input
                id="recipient_phone"
                name="recipient_phone"
                value={formData.recipient_phone}
                onChange={(e) => handleChange('recipient_phone', e.target.value)}
                placeholder="09123456789 or +639123456789"
                required
                maxLength={20}
                className="bg-white"
              />
              {errors?.recipient_phone && (
                <p className="px-1 text-xs text-red-600">{errors.recipient_phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Type */}
        <div className="grid gap-3">
          <Label className="text-sm">Address Type *</Label>
          <input type="hidden" name="address_type" value={formData.address_type} />
          <Select
            value={formData.address_type}
            onValueChange={(value: 'home' | 'work' | 'other') => handleChange('address_type', value)}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select address type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </div>
              </SelectItem>
              <SelectItem value="work">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span>Work</span>
                </div>
              </SelectItem>
              <SelectItem value="other">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Other</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Address Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Address Details</h3>
          
          <div className="space-y-3">
            <div className="grid gap-3">
              <Label htmlFor="street" className="text-sm">Street Address *</Label>
              <Input
                id="street"
                name="street"
                value={formData.street}
                onChange={(e) => handleChange('street', e.target.value)}
                placeholder="123 Main Street"
                required
                maxLength={200}
                className="bg-white"
              />
              {errors?.street && (
                <p className="px-1 text-xs text-red-600">{errors.street}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="barangay" className="text-sm">Barangay *</Label>
                <Input
                  id="barangay"
                  name="barangay"
                  value={formData.barangay}
                  onChange={(e) => handleChange('barangay', e.target.value)}
                  placeholder="Barangay Name"
                  required
                  maxLength={100}
                  className="bg-white"
                />
                {errors?.barangay && (
                  <p className="px-1 text-xs text-red-600">{errors.barangay}</p>
                )}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="city" className="text-sm">City/Municipality *</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="City Name"
                  required
                  maxLength={100}
                  className="bg-white"
                />
                {errors?.city && (
                  <p className="px-1 text-xs text-red-600">{errors.city}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="province" className="text-sm">Province *</Label>
                <Input
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={(e) => handleChange('province', e.target.value)}
                  placeholder="Province"
                  required
                  maxLength={100}
                  className="bg-white"
                />
                {errors?.province && (
                  <p className="px-1 text-xs text-red-600">{errors.province}</p>
                )}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="zip_code" className="text-sm">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => handleChange('zip_code', e.target.value)}
                  placeholder="1000"
                  required
                  maxLength={4}
                  className="bg-white"
                />
                {errors?.zip_code && (
                  <p className="px-1 text-xs text-red-600">{errors.zip_code}</p>
                )}
                <p className="text-xs text-gray-500">Must be 4 digits</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="state" className="text-sm">State (Optional)</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="State"
                  maxLength={100}
                  className="bg-white"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="country" className="text-sm">Country</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="Philippines"
                  maxLength={100}
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Additional Details (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-3">
              <Label htmlFor="building_name" className="text-sm">Building Name</Label>
              <Input
                id="building_name"
                name="building_name"
                value={formData.building_name}
                onChange={(e) => handleChange('building_name', e.target.value)}
                placeholder="Building"
                maxLength={200}
                className="bg-white"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="floor_number" className="text-sm">Floor</Label>
              <Input
                id="floor_number"
                name="floor_number"
                value={formData.floor_number}
                onChange={(e) => handleChange('floor_number', e.target.value)}
                placeholder="Floor"
                maxLength={50}
                className="bg-white"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="unit_number" className="text-sm">Unit</Label>
              <Input
                id="unit_number"
                name="unit_number"
                value={formData.unit_number}
                onChange={(e) => handleChange('unit_number', e.target.value)}
                placeholder="Unit"
                maxLength={50}
                className="bg-white"
              />
            </div>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="landmark" className="text-sm">Landmark</Label>
            <Input
              id="landmark"
              name="landmark"
              value={formData.landmark}
              onChange={(e) => handleChange('landmark', e.target.value)}
              placeholder="Nearby landmark"
              maxLength={300}
              className="bg-white"
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="instructions" className="text-sm">Delivery Instructions</Label>
            <Textarea
              id="instructions"
              name="instructions"
              value={formData.instructions}
              onChange={(e) => handleChange('instructions', e.target.value)}
              placeholder="Special instructions for delivery"
              rows={3}
              className="bg-white"
            />
          </div>
        </div>

        {/* Default Address Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4 bg-gray-50">
          <div className="space-y-0.5">
            <Label htmlFor="is_default" className="text-sm font-medium">Set as default address</Label>
            <p className="text-xs text-gray-500">
              This address will be selected by default for all orders
            </p>
          </div>
          <input type="hidden" name="is_default" value={formData.is_default ? "true" : "false"} />
          <Switch
            id="is_default"
            checked={formData.is_default}
            onCheckedChange={(checked) => handleChange('is_default', checked)}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
      </div>
    </ScrollArea>

    <div className="flex gap-3 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isLoading}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isLoading}
        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
      >
        {isLoading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
            {mode === 'create' ? 'Adding...' : 'Saving...'}
          </>
        ) : (
          <>
            {mode === 'create' ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </>
        )}
      </Button>
    </div>
  </fetcher.Form>
);

export default function ShippingAddressForm({
  open,
  onOpenChange,
  initialData,
  mode,
  addressId,
}: ShippingAddressFormProps) {
  const fetcher = useFetcher();
  const [formData, setFormData] = useState<ShippingAddressFormData>(initialFormData);
  const isMobile = useIsMobile();

  const isLoading = fetcher.state !== "idle";
  const errors = fetcher.data?.errors;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (!open) {
      setTimeout(() => {
        setFormData(initialFormData);
      }, 300);
    }
  }, [initialData, open]);

  // Close form on successful submission
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === "idle") {
      onOpenChange(false);
      setTimeout(() => {
        setFormData(initialFormData);
      }, 300);
    }
  }, [fetcher.data, fetcher.state, onOpenChange]);

  const handleChange = (field: keyof ShippingAddressFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home className="h-4 w-4" />;
      case 'work':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  // Use the same pattern from shadcn for responsive dialog/drawer
  if (!isMobile) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              {getAddressTypeIcon(formData.address_type)}
              <AlertDialogTitle className="text-orange-600">
                {mode === 'create' ? 'Add New Address' : 'Edit Address'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {mode === 'create' 
                ? 'Add a new shipping address for your orders'
                : 'Update your shipping address details'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormContent 
            fetcher={fetcher}
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            isLoading={isLoading}
            onOpenChange={onOpenChange}
            mode={mode}
            addressId={addressId}
          />
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center gap-2">
            {getAddressTypeIcon(formData.address_type)}
            <DrawerTitle className="text-orange-600">
              {mode === 'create' ? 'Add New Address' : 'Edit Address'}
            </DrawerTitle>
          </div>
          <DrawerDescription>
            {mode === 'create' 
              ? 'Add a new shipping address for your orders'
              : 'Update your shipping address details'}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          <FormContent 
            fetcher={fetcher}
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            isLoading={isLoading}
            onOpenChange={onOpenChange}
            mode={mode}
            addressId={addressId}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}