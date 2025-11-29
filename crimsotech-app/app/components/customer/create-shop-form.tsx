import { useFetcher } from "react-router";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Link } from "react-router";
import { useState, useRef } from "react";
import { Card } from "../ui/card";
import AddressDropdowns from '~/components/address/address_dropdowns';

interface CreateShopFormProps extends React.ComponentProps<"div"> {
  className?: string;
}

export function CreateShopForm({ className, ...props }: CreateShopFormProps) {
  const fetcher = useFetcher();
  const errors = fetcher.data?.errors;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    shop_picture: null as File | null,
    description: "",
    province: "",
    city: "",
    barangay: "",
    street: "",
    contact_number: "",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormData({ ...formData, shop_picture: file });
      
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setFormData({ ...formData, shop_picture: file });
      
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setFormData({ ...formData, shop_picture: null });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle address changes from the dropdowns
  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === "none" ? "" : value // Handle the "none" placeholder
    }));
  };

  // Handle form submission
  // Handle form submission
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // Use the form's FormData directly to capture all fields including address dropdowns
  const form = e.currentTarget as HTMLFormElement;
  const submitFormData = new FormData(form);
  
  fetcher.submit(submitFormData, {
    method: "post",
    encType: "multipart/form-data",
  });
};

  // Handle successful shop creation
  if (fetcher.data && fetcher.state === "idle" && !fetcher.data.errors) {
    return (
      <div className={cn("w-full max-w-2xl mx-auto", className)} {...props}>
        <Card className="p-8 text-center">
          <div className="text-green-600 text-lg font-semibold mb-4">
            Shop created successfully! Redirecting...
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)} {...props}>
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Create Your Shop</h1>
        <p className="text-gray-600 mt-2">
          Fill in the details below to set up your new shop and start selling.
        </p>
      </div>

      {/* Create Shop Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shop Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Shop Name *
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your shop name"
              className={cn(errors?.name && "border-red-500")}
            />
            {errors?.name && (
              <p className="text-red-500 text-sm">{errors.name}</p>
            )}
          </div>

          {/* Shop Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description *
            </Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className={cn(
                "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                errors?.description && "border-red-500"
              )}
              placeholder="Describe what your shop offers..."
            />
            {errors?.description && (
              <p className="text-red-500 text-sm">{errors.description}</p>
            )}
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Shop Address *</Label>
            
            {/* Address Dropdowns */}
            <AddressDropdowns errors={errors} />
            
            {/* Street Address */}
            <div className="space-y-2">
              <Label htmlFor="street" className="text-sm font-medium">
                Street Address *
              </Label>
              <Input
                type="text"
                id="street"
                name="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Enter complete street address, building, house number, etc."
                className={cn(errors?.street && "border-red-500")}
              />
              {errors?.street && (
                <p className="text-red-500 text-sm">{errors.street}</p>
              )}
            </div>
          </div>

          {/* Contact Number */}
          <div className="space-y-2">
            <Label htmlFor="contact_number" className="text-sm font-medium">
              Contact Number *
            </Label>
            <Input
              type="text"
              id="contact_number"
              name="contact_number"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              placeholder="Enter contact number"
              className={cn(errors?.contact_number && "border-red-500")}
            />
            {errors?.contact_number && (
              <p className="text-red-500 text-sm">{errors.contact_number}</p>
            )}
          </div>

          {/* Shop Picture */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop_picture" className="text-sm font-medium">
                Shop Picture
              </Label>
              
              {/* Custom file input styling */}
              <div className={cn(
                "flex items-center justify-center w-full",
                "border-2 border-dashed border-gray-300 rounded-lg",
                "transition-colors duration-200 ease-in-out",
                "hover:border-blue-400 hover:bg-blue-50/50",
                "focus-within:border-blue-500 focus-within:bg-blue-50/30",
                errors?.shop_picture && "border-red-300 hover:border-red-400 focus-within:border-red-500"
              )}>
                <label 
                  htmlFor="shop_picture" 
                  className="flex flex-col items-center justify-center w-full h-32 cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {imagePreview ? (
                    // Show image preview when image is selected
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Shop preview" 
                        className="w-20 h-20 object-cover  border-2 border-gray-200"
                      />
                      
                    </div>
                  ) : (
                    // Show upload instructions when no image is selected
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg 
                        className="w-8 h-8 mb-3 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        ></path>
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">
                        PNG, JPG, GIF, WEBP (MAX. 5MB)
                      </p>
                    </div>
                  )}
                  <Input
                    ref={fileInputRef}
                    type="file"
                    id="shop_picture"
                    name="shop_picture"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Selected file info */}
              {formData.shop_picture && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-md flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 truncate">
                        {formData.shop_picture.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {(formData.shop_picture.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                   
                  </div>
                </div>
              )}

              {errors?.shop_picture && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-sm text-red-700">{errors.shop_picture}</p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errors?.message && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{errors.message}</p>
              {errors.details && (
                <p className="text-red-600 text-xs mt-1">{errors.details}</p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              asChild
              disabled={fetcher.state === "submitting"}
              className="flex-1"
            >
              <Link to="/shop-list">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={fetcher.state === "submitting"}
              className="flex-1"
            >
              {fetcher.state === "submitting" ? "Creating Shop..." : "Create Shop"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}