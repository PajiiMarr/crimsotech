import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { AlertCircle, Store, ArrowLeft, Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import { useState } from 'react';
import Breadcrumbs from "~/components/ui/breadcrumbs";

interface Category {
  id: string;
  name: string;
  shop: null;
  user: {
    id: string;
    username: string;
  };
}

interface FormErrors {
  message?: string;
  name?: string;
  description?: string;
  quantity?: string;
  price?: string;
  condition?: string;
  shop?: string;
  category_admin_id?: string;
  variant_title?: string;
  variant_option_title?: string;
  variant_option_quantity?: string;
  variant_option_price?: string;
  [key: string]: string | undefined;
}

interface CreateProductFormProps {
  selectedShop: any;
  globalCategories: Category[];
  errors: FormErrors;
}

interface ImagePreview {
  file: File;
  preview: string;
}

export default function CreateProductForm({ selectedShop, globalCategories, errors }: CreateProductFormProps) {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [showVariants, setShowVariants] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + images.length > 9) {
      alert('Maximum 9 images allowed');
      return;
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
    
          {/* Breadcrumbs */}
          <Breadcrumbs />
          <Separator />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Product</h1>
          <p className="text-muted-foreground">
            Add a new product to your inventory
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/seller/product-list" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>

      {/* Error Alert */}
      {errors.message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.message}</AlertDescription>
        </Alert>
      )}

      {/* Shop Information */}
      {selectedShop && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-800">Creating Product For</h3>
                <p className="text-blue-700">{selectedShop.name}</p>
                {selectedShop.description && (
                  <p className="text-blue-600 text-sm mt-1">{selectedShop.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {!selectedShop && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No shops found. Please create a shop first.
          </AlertDescription>
          <Button asChild className="mt-2">
            <Link to="/seller/create-shop">
              Create Shop
            </Link>
          </Button>
        </Alert>
      )}

      {/* Product Form */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            Fill in the details for your new product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" encType="multipart/form-data" className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Product Name *
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="Enter product name"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price">
                  Price *
                </Label>
                <Input
                  type="number"
                  id="price"
                  name="price"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity *
                </Label>
                <Input
                  type="number"
                  id="quantity"
                  name="quantity"
                  required
                  min="0"
                  placeholder="0"
                />
                {errors.quantity && <p className="text-sm text-red-600">{errors.quantity}</p>}
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label htmlFor="condition">
                  Condition *
                </Label>
                <Select name="condition" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="Refurbished">Refurbished</SelectItem>
                  </SelectContent>
                </Select>
                {errors.condition && <p className="text-sm text-red-600">{errors.condition}</p>}
              </div>

              {/* Global Category */}
              <div className="space-y-2">
                <Label htmlFor="category_admin_id">
                  Global Category
                </Label>
                <Select name="category_admin_id">
                  <SelectTrigger>
                    <SelectValue placeholder="No Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {globalCategories && globalCategories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {globalCategories && globalCategories.length > 0 
                    ? `Select from ${globalCategories.length} available global categories` 
                    : 'No global categories available'}
                </p>
                {errors.category_admin_id && <p className="text-sm text-red-600">{errors.category_admin_id}</p>}
              </div>
            </div>

            {/* Used For */}
            <div className="space-y-2">
              <Label htmlFor="used_for">
                Used For
              </Label>
              <Input
                type="text"
                id="used_for"
                name="used_for"
                placeholder="What is this product used for?"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description *
              </Label>
              <Textarea
                id="description"
                name="description"
                required
                rows={4}
                placeholder="Enter product description"
              />
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Media Upload */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="media_files">
                  Product Images (Max 9)
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    id="media_files"
                    name="media_files"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Label 
                    htmlFor="media_files" 
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div>
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        Click to upload
                      </span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, GIF, WebP, MP4 up to 50MB each
                    </p>
                  </Label>
                </div>
              </div>

              {/* Image Previews */}
              {images.length > 0 && (
                <div>
                  <Label>Uploaded Media ({images.length}/9)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Variants Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Product Variants</h3>
                  <p className="text-sm text-muted-foreground">
                    Add variants like size, color, etc. (Optional)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="variant-toggle">Enable Variants</Label>
                  <Switch
                    id="variant-toggle"
                    checked={showVariants}
                    onCheckedChange={setShowVariants}
                  />
                </div>
              </div>

              {showVariants && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variant_title">
                        Variant Title
                      </Label>
                      <Input
                        type="text"
                        id="variant_title"
                        name="variant_title"
                        placeholder="e.g., Size, Color"
                      />
                      {errors.variant_title && <p className="text-sm text-red-600">{errors.variant_title}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variant_option_title">
                        Option Name
                      </Label>
                      <Input
                        type="text"
                        id="variant_option_title"
                        name="variant_option_title"
                        placeholder="e.g., Small, Red"
                      />
                      {errors.variant_option_title && <p className="text-sm text-red-600">{errors.variant_option_title}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variant_option_quantity">
                        Option Quantity
                      </Label>
                      <Input
                        type="number"
                        id="variant_option_quantity"
                        name="variant_option_quantity"
                        min="0"
                        placeholder="0"
                      />
                      {errors.variant_option_quantity && <p className="text-sm text-red-600">{errors.variant_option_quantity}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variant_option_price">
                        Option Price
                      </Label>
                      <Input
                        type="number"
                        id="variant_option_price"
                        name="variant_option_price"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      {errors.variant_option_price && <p className="text-sm text-red-600">{errors.variant_option_price}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button asChild variant="outline" type="button">
                <Link to="/seller/product-list">
                  Cancel
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={!selectedShop}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {selectedShop ? "Create Product" : "Create Shop First"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}