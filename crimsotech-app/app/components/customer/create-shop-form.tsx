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
    // Business Info
    tax_id: "",
    business_reg_no: "",
    business_email: "",
    business_type: "",
    vatr_status: "",
    // Owner / Verification
    owner_name: "",
    owner_id_number: "",
    owner_id_file: null as File | null
   
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ownerIdPreview, setOwnerIdPreview] = useState<string | null>(null);

  // Handle file input change for shop picture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormData({ ...formData, shop_picture: file });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle owner ID file input change
  const handleOwnerIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormData({ ...formData, owner_id_file: file });
      const reader = new FileReader();
      reader.onloadend = () => setOwnerIdPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>, field: "shop_picture" | "owner_id_file") => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (field === "shop_picture") {
        setFormData({ ...formData, shop_picture: file });
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFormData({ ...formData, owner_id_file: file });
        const reader = new FileReader();
        reader.onloadend = () => setOwnerIdPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleRemoveFile = (field: "shop_picture" | "owner_id_file") => {
    if (field === "shop_picture") {
      setFormData({ ...formData, shop_picture: null });
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setFormData({ ...formData, owner_id_file: null });
      setOwnerIdPreview(null);
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value === "none" ? "" : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const submitFormData = new FormData(form);
    fetcher.submit(submitFormData, { method: "post", encType: "multipart/form-data" });
  };

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
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ================== Shop Information ================== */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Shop Information</h3>

            {/* Shop Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Shop Name *</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your shop name"
                className={cn(errors?.name && "border-red-500")}
              />
              {errors?.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={cn("w-full rounded-md border px-3 py-2 text-sm", errors?.description && "border-red-500")}
                placeholder="Describe what your shop offers..."
              />
              {errors?.description && <p className="text-red-500 text-sm">{errors.description}</p>}
            </div>

            {/* Address */}
            <div className="space-y-4">
              <Label>Shop Address *</Label>
              <AddressDropdowns errors={errors} />
              <div className="space-y-2">
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={e => setFormData({ ...formData, street: e.target.value })}
                  placeholder="Enter complete street address"
                  className={cn(errors?.street && "border-red-500")}
                />
                {errors?.street && <p className="text-red-500 text-sm">{errors.street}</p>}
              </div>
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number *</Label>
              <Input
                type="text"
                id="contact_number"
                name="contact_number"
                value={formData.contact_number}
                onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="Enter contact number"
                className={cn(errors?.contact_number && "border-red-500")}
              />
              {errors?.contact_number && <p className="text-red-500 text-sm">{errors.contact_number}</p>}
            </div>

            {/* Shop Picture */}
            <div className="space-y-2">
              <Label>Shop Picture</Label>
              <div className={cn(
                "flex items-center justify-center w-full border-2 border-dashed rounded-lg h-32",
                errors?.shop_picture && "border-red-500"
              )}>
                <label 
                  htmlFor="shop_picture"
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                  onDrop={e => handleDrop(e, "shop_picture")}
                  onDragOver={handleDragOver}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Shop" className="w-20 h-20 object-cover"/>
                  ) : (
                    <p className="text-gray-500">Click or drag to upload</p>
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
            </div>
          </div>

          {/* ================== Business Information ================== */}
          <hr className="my-6 border-t border-gray-300" />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Business Information</h3>

            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax Identification Number *</Label>
              <Input
                type="text"
                id="tax_id"
                name="tax_id"
                value={formData.tax_id}
                onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="Enter your TIN"
                className={cn(errors?.tax_id && "border-red-500")}
              />
              {errors?.tax_id && <p className="text-red-500 text-sm">{errors.tax_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_reg_no">Business Registration Number</Label>
              <Input
                type="text"
                id="business_reg_no"
                name="business_reg_no"
                value={formData.business_reg_no}
                onChange={e => setFormData({ ...formData, business_reg_no: e.target.value })}
                placeholder="Enter business registration number"
                className={cn(errors?.business_reg_no && "border-red-500")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_email">Business Email</Label>
              <Input
                type="email"
                id="business_email"
                name="business_email"
                value={formData.business_email}
                onChange={e => setFormData({ ...formData, business_email: e.target.value })}
                placeholder="Enter business email"
                className={cn(errors?.business_email && "border-red-500")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type</Label>
              <select
                id="business_type"
                name="business_type"
                value={formData.business_type}
                onChange={e => setFormData({ ...formData, business_type: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select business type</option>
                <option value="Individual">Individual</option>
                <option value="Corporation">Corporation</option>
                <option value="Sole Proprietor">Sole Proprietor</option>
                <option value="Partnership">Partnership</option>
                <option value="LLC">LLC</option>
              </select>
            </div>


            <div className="space-y-2">
              <Label htmlFor="vatr_status">VAT Registration Status</Label>
              <select
                id="vatr_status"
                name="vatr_status"
                value={formData.vatr_status}
                onChange={e => setFormData({ ...formData, vatr_status: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select VAT status</option>
                <option value="Registered">Registered</option>
                <option value="Not Registered">Not Registered</option>
              </select>
            </div>

          </div>

          {/* ================== Owner / Verification ================== */}
          <hr className="my-6 border-t border-gray-300" />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Owner / Verification</h3>

            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner / Authorized Person Name *</Label>
              <Input
                type="text"
                id="owner_name"
                name="owner_name"
                value={formData.owner_name}
                onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="Full name of shop owner"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_id_number">Government ID Number *</Label>
              <Input
                type="text"
                id="owner_id_number"
                name="owner_id_number"
                value={formData.owner_id_number}
                onChange={e => setFormData({ ...formData, owner_id_number: e.target.value })}
                placeholder="e.g., Passport, Driver's License number"
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Government ID</Label>
              <div className="flex items-center border-2 border-dashed rounded-lg h-32 justify-center">
                <label
                  htmlFor="owner_id_file"
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                  onDrop={e => handleDrop(e, "owner_id_file")}
                  onDragOver={handleDragOver}
                >
                  {ownerIdPreview ? (
                    <img src={ownerIdPreview} alt="Owner ID" className="w-20 h-20 object-cover"/>
                  ) : (
                    <p className="text-gray-500">Click or drag to upload ID</p>
                  )}
                  <Input
                    type="file"
                    id="owner_id_file"
                    name="owner_id_file"
                    accept="image/*,application/pdf"
                    onChange={handleOwnerIdChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          

          {/* ================== Buttons ================== */}
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
