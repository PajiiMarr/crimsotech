// app/components/shipping/ShippingAddressCard.tsx
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { MapPin, Edit2, Trash2, Star, Home, Briefcase, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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

interface ShippingAddressCardProps {
  address: ShippingAddress;
  onEdit: (address: ShippingAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isDeleting?: boolean;
}

export default function ShippingAddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting = false
}: ShippingAddressCardProps) {
  
  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home className="h-4 w-4 text-orange-500" />;
      case 'work':
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAddressTypeLabel = (type: string) => {
    switch (type) {
      case 'home':
        return 'Home';
      case 'work':
        return 'Work';
      default:
        return 'Other';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md
      ${address.is_default ? 'border-orange-300 border-2' : 'border-gray-200'}`}>
      
      {address.is_default && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-xs py-1 px-3 rounded-bl-lg">
          <Star className="h-3 w-3 inline mr-1" fill="currentColor" />
          Default
        </div>
      )}
      
      <CardHeader className={`pb-3 ${address.is_default ? 'pt-8' : 'pt-6'}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${address.is_default ? 'bg-orange-100' : 'bg-gray-100'}`}>
              {getAddressTypeIcon(address.address_type)}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {address.recipient_name}
              </CardTitle>
              <p className="text-gray-600 text-sm">{address.recipient_phone}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(address)} className="cursor-pointer">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(address.id)}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Badge 
          variant="secondary" 
          className={`mt-2 w-fit ${
            address.address_type === 'home' ? 'bg-orange-50 text-orange-700' :
            address.address_type === 'work' ? 'bg-blue-50 text-blue-700' :
            'bg-gray-50 text-gray-700'
          }`}
        >
          {getAddressTypeLabel(address.address_type)}
        </Badge>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-3">
          <div className="flex gap-2">
            <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-700 leading-relaxed font-medium">{address.full_address}</p>
              <div className="mt-2 space-y-1">
                {address.landmark && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="font-medium min-w-20">Landmark:</span>
                    <span>{address.landmark}</span>
                  </div>
                )}
                
                {address.instructions && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="font-medium min-w-20">Instructions:</span>
                    <span>{address.instructions}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {(address.building_name || address.floor_number || address.unit_number) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {address.building_name && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Building: {address.building_name}
                </span>
              )}
              {address.floor_number && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Floor {address.floor_number}
                </span>
              )}
              {address.unit_number && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Unit {address.unit_number}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Added on {formatDate(address.created_at)}
        </div>
        
        <div className="space-x-2">
          {!address.is_default && (
            <Button
              size="sm"
              onClick={() => onSetDefault(address.id)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Star className="h-4 w-4 mr-2" />
              Set as Default
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}