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
import { AlertCircle, Store, ArrowLeft, Plus, X, Image as ImageIcon, Video, Upload, Package, Truck, Check } from "lucide-react";
import { useState } from 'react';
import Breadcrumbs from "~/components/ui/breadcrumbs";

// --- INTERFACE DEFINITIONS ---

interface User {
  id: string;
  username: string;
}

interface Category {
  id: string;
  name: string;
  shop: string | null;
  user: User;
}

interface Shop {
  id: string;
  name: string;
  description: string;
}

interface FormErrors {
  message?: string;
  name?: string;
  description?: string;
  quantity?: string;
  price?: string;
  compare_price?: string;
  condition?: string;
  shop?: string;
  category_admin_id?: string;
  [key: string]: string | undefined;
}

interface MediaPreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface ShippingZone {
  id: string;
  name: 'Local' | 'Nearby City' | 'Far Province';
  fee: number | '';
  freeShipping: boolean;
}

interface VariantOption {
  id: string;
  title: string;
  quantity: number | '';
  price: number | '';
  compare_price?: number | '';
  critical_trigger?: number | '';
  enable_critical_trigger?: boolean;
  image?: File | null;
  imagePreview?: string;
  length?: number | '';
  width?: number | '';
  height?: number | '';
  weight?: number | '';
  weight_unit?: 'g' | 'kg' | 'lb' | 'oz';
}

interface VariantGroup {
  id: string;
  title: string;
  options: VariantOption[];
}

interface CreateProductFormProps {
  selectedShop: Shop | null;
  globalCategories: Category[];
  errors?: FormErrors;
  userShops?: Shop[];
  isPersonalListing?: boolean;
}

// --- REACT COMPONENT ---

export default function CreateProductForm({ 
  selectedShop, 
  globalCategories, 
  errors = {},
  userShops = [],
  isPersonalListing = true
}: CreateProductFormProps) {
  const [mainMedia, setMainMedia] = useState<MediaPreview[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [enableCriticalTrigger, setEnableCriticalTrigger] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState<number | ''>('');
  const [productWeight, setProductWeight] = useState<number | ''>('');
  const [productWeightUnit, setProductWeightUnit] = useState<'g' | 'kg' | 'lb' | 'oz'>('g');
  const [productLength, setProductLength] = useState<number | ''>('');
  const [productWidth, setProductWidth] = useState<number | ''>('');
  const [productHeight, setProductHeight] = useState<number | ''>('');
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([
    { id: crypto.randomUUID(), name: 'Local', fee: '', freeShipping: false },
    { id: crypto.randomUUID(), name: 'Nearby City', fee: '', freeShipping: false },
    { id: crypto.randomUUID(), name: 'Far Province', fee: '', freeShipping: false },
  ]);
  
  // Shop selection state
  const [addToShop, setAddToShop] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string>('');

  // Use example shops if userShops is empty
  const shopsToDisplay = userShops.length > 0 ? userShops : [
    { id: 'shop-1', name: 'My Fashion Store', description: 'Clothing and accessories' },
    { id: 'shop-2', name: 'Tech Gadgets Hub', description: 'Electronics and gadgets' }
  ];

  // --- MAIN MEDIA HANDLERS ---
  const handleMainMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxMedia = 9;
    
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    const availableSlots = maxMedia - mainMedia.length;
    const filesToAdd = validFiles.slice(0, availableSlots);
    
    if (filesToAdd.length === 0 && files.length > 0) {
      alert(`Only image or video files are supported and the maximum limit is ${maxMedia} total media files.`);
      return;
    }

    const newMedia = filesToAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video' as 'image' | 'video'
    }));

    setMainMedia(prev => [...prev, ...newMedia]);
    e.target.value = '';
  };

  const removeMainMedia = (index: number) => {
    setMainMedia(prev => prev.filter((_, i) => i !== index));
  };

  const updateShippingZoneFee = (zoneId: string, fee: number | '') => {
    setShippingZones(prev => prev.map(zone => 
      zone.id === zoneId ? { ...zone, fee } : zone
    ));
  };

  const toggleZoneFreeShipping = (zoneId: string) => {
    setShippingZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        const newFreeShipping = !zone.freeShipping;
        return {
          ...zone,
          freeShipping: newFreeShipping,
          fee: newFreeShipping ? 0 : ''
        };
      }
      return zone;
    }));
  };

  // --- VARIANT HANDLERS ---
  const addVariantGroup = () => {
    setVariantGroups(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: "Color",
        options: [
          {
            id: crypto.randomUUID(),
            title: "Red",
            quantity: 0,
            price: 0,
            weight_unit: 'g' as const,
          },
        ],
      },
    ]);
  };

  const removeVariantGroup = (groupId: string) => {
    setVariantGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const updateVariantGroupTitle = (groupId: string, newTitle: string) => {
    setVariantGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, title: newTitle } : group
    ));
  };

  const addOption = (groupId: string, title: string) => {
    const newOption: VariantOption = {
      id: crypto.randomUUID(),
      title: title.trim(),
      quantity: 0,
      price: 0,
      weight_unit: 'g' as const,
    };
    
    setVariantGroups(prev => prev.map(group => 
      group.id === groupId
        ? { ...group, options: [...group.options, newOption] }
        : group
    ));
  };

  const removeOption = (groupId: string, optionId: string) => {
    setVariantGroups(prev => prev.map(group => 
      group.id === groupId
        ? { ...group, options: group.options.filter(option => option.id !== optionId) }
        : group
    ));
  };

  const updateOption = (groupId: string, optionId: string, field: keyof VariantOption, value: string | number | boolean | File | null) => {
    setVariantGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      
      return {
        ...group,
        options: group.options.map(option => {
          if (option.id !== optionId) return option;
          
          let updatedOption = { ...option };
          
          if (field === 'title') {
            updatedOption.title = value as string;
          } else if (field === 'weight_unit') {
            updatedOption.weight_unit = value as 'g' | 'kg' | 'lb' | 'oz';
          } else if (field === 'quantity' || field === 'length' || field === 'width' || field === 'height' || field === 'weight') {
            const numValue = parseInt(value as string);
            updatedOption[field] = numValue >= 0 ? numValue : '';
          } else if (field === 'price' || field === 'compare_price' || field === 'critical_trigger') {
            const numValue = parseFloat(value as string);
            updatedOption[field] = numValue >= 0 ? numValue : '';
          } else if (field === 'enable_critical_trigger') {
            updatedOption.enable_critical_trigger = value as boolean;
          } else if (field === 'image') {
            updatedOption.image = value as File | null;
            if (value instanceof File) {
              updatedOption.imagePreview = URL.createObjectURL(value);
            } else if (value === null) {
              updatedOption.imagePreview = undefined;
            }
          }
          
          return updatedOption;
        }),
      };
    }));
  };

  // Handle variant image upload
  const handleVariantImageChange = (groupId: string, optionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      updateOption(groupId, optionId, 'image', file);
    }
    e.target.value = '';
  };

  // Get selected shop name
  const getSelectedShopName = () => {
    if (selectedShopId && shopsToDisplay.length > 0) {
      const shop = shopsToDisplay.find(s => s.id === selectedShopId);
      return shop?.name || '';
    }
    return '';
  };

  // --- RENDER ---
  return (
    <div className="space-y-8">
      {/* Simple Shop Selection Card with Checkbox */}
      {isPersonalListing && (
        <Card id="shop-selection">
          <CardHeader>
            <CardTitle>Shop Assignment</CardTitle>
            <CardDescription>
              Do you want to add this product to your shop?
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Simple Checkbox for Add to Shop */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="add-to-shop"
                  checked={addToShop}
                  onChange={(e) => {
                    setAddToShop(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedShopId('');
                    }
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-1">
                  <Label htmlFor="add-to-shop" className="font-medium">
                    Add this product to my shop
                  </Label>
                  <p className="text-sm text-gray-500">
                    Products listed in shops get better visibility and sales
                  </p>
                </div>
              </div>

              {/* Shop selection when checkbox is checked */}
              {addToShop && (
                <div className="mt-4 space-y-3">
                  <Label className="text-sm font-medium">Select your shop:</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Choose which shop to add this product to
                  </p>
                  
                  <div className="space-y-2">
                    {shopsToDisplay.map((shop) => (
                      <div
                        key={shop.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          selectedShopId === shop.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedShopId(shop.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedShopId === shop.id 
                              ? 'border-blue-500 bg-blue-500' 
                              : 'border-gray-300'
                          }`}>
                            {selectedShopId === shop.id && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{shop.name}</div>
                            <div className="text-sm text-gray-500">{shop.description}</div>
                          </div>
                          {selectedShopId === shop.id && (
                            <Check className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedShopId && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2 text-green-700">
                        <Store className="h-4 w-4" />
                        <span className="text-sm">
                          This product will be listed under: <strong>{getSelectedShopName()}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {!selectedShopId && (
                    <p className="text-sm text-gray-500 mt-2">
                      Please select a shop to list this product under.
                    </p>
                  )}
                </div>
              )}

              {!addToShop && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-700">Personal Listing</h4>
                      <p className="text-sm text-yellow-600 mt-1">
                        This product will be listed as a personal item. It won't appear under any shop and will be shown as an individual seller's item.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. Media Card */}
      <Card id="media">
        <CardHeader>
          <CardTitle>Product Media</CardTitle>
          <CardDescription>
            Upload main product images and videos (max 9 files, 50MB each)
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  * First image/video will be used as the cover image
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {mainMedia.length}/9
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {mainMedia.map((item, index) => (
                <div key={index} className="relative group aspect-square border rounded-md overflow-hidden">
                  {item.type === 'image' ? (
                    <img
                      src={item.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Video className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  {index === 0 && (
                    <Badge className="absolute bottom-0 left-0 rounded-none bg-black/80 text-white px-1.5 py-0.5 text-[10px]">
                      Cover
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => removeMainMedia(index)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
              
              {mainMedia.length < 9 && (
                <div className="aspect-square">
                  <Input 
                    type="file" 
                    id="main-media-upload" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={handleMainMediaChange}
                    className="hidden" 
                  />
                  <Label htmlFor="main-media-upload" className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors h-full w-full p-2">
                    <Upload className="h-5 w-5 mb-1" />
                    <span className="text-xs text-center">Add Picture/Video</span>
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Basic Information Card */}
      <Card id="basic-information">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Enter essential product details, name, and description.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Error Alert */}
          {errors.message && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.message}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input type="text" id="name" name="name" required placeholder="Enter product name" />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition *</Label>
                <Select name="condition" required>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="Refurbished">Refurbished</SelectItem>
                  </SelectContent>
                </Select>
                {errors.condition && <p className="text-sm text-red-600">{errors.condition}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_admin_id">Global Category</Label>
                <Select name="category_admin_id">
                  <SelectTrigger><SelectValue placeholder="No Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {globalCategories && globalCategories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_admin_id && <p className="text-sm text-red-600">{errors.category_admin_id}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" name="description" required rows={4} placeholder="Enter product description" />
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Variations Card */}
      <Card id="variations">
        <CardHeader>
          <CardTitle>Variations (Optional)</CardTitle>
          <CardDescription>
            Define product variants like size or color with individual images and dimensions.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Enable Product Variations</h3>
                <p className="text-sm text-muted-foreground">
                  Enable this to add variant groups (e.g., Size, Color) with individual images and dimensions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="variant-toggle">Enable Variations</Label>
                <Switch
                  id="variant-toggle"
                  checked={showVariants}
                  onCheckedChange={(checked) => {
                    setShowVariants(checked);
                    if (checked && variantGroups.length === 0) {
                      setVariantGroups([
                        {
                          id: crypto.randomUUID(),
                          title: "Size",
                          options: [
                            {
                              id: crypto.randomUUID(),
                              title: "Small",
                              quantity: 0,
                              price: 0,
                              weight_unit: 'g' as const,
                            },
                          ],
                        },
                      ]);
                    }
                  }}
                />
              </div>
            </div>

            {showVariants ? (
              <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-red-500 italic">
                  **Important**: Since the backend expects a single variant title and option, 
                  only the **first variant option's data** will be submitted.
                </p>
                
                {/* Variant Options Definition */}
                <div className="space-y-4">
                  {variantGroups.map((group) => (
                    <div key={group.id} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-700">
                        <div>Option type</div>
                        <div>Option value</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 items-start">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={group.title}
                            onChange={(e) => updateVariantGroupTitle(group.id, e.target.value)}
                            placeholder="e.g., Size, Color"
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeVariantGroup(group.id)}
                            disabled={variantGroups.length === 1}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="min-h-[2.5rem] px-3 py-2 border rounded-md bg-white flex flex-wrap items-center gap-1">
                          {group.options.map((option, index) => (
                            <div key={option.id} className="flex items-center">
                              <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                                {option.title}
                              </span>
                              {index < group.options.length - 1 && (
                                <span className="mx-1 text-gray-400">×</span>
                              )}
                            </div>
                          ))}
                          
                          <input
                            type="text"
                            className="flex-1 min-w-[100px] text-sm border-0 focus:outline-none focus:ring-0 px-2 py-1"
                            placeholder="Type and press Enter..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                addOption(group.id, e.currentTarget.value.trim());
                                e.currentTarget.value = '';
                              } else if (e.key === 'Backspace' && e.currentTarget.value === '' && group.options.length > 0) {
                                const lastOption = group.options[group.options.length - 1];
                                removeOption(group.id, lastOption.id);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                addOption(group.id, e.target.value.trim());
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Variant Dimensions Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Variant Dimensions</h4>
                  <p className="text-sm text-muted-foreground">
                    Set dimensions and weight for each variant option.
                  </p>
                  
                  <div className="overflow-x-auto">
                    {variantGroups.map((group) => (
                      <div key={group.id} className="space-y-3 mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">{group.title} Options:</div>
                        
                        <div className="min-w-[800px]">
                          {group.options.map((option) => (
                            <div key={option.id} className="grid grid-cols-7 gap-3 items-center mb-3 p-3 border rounded-lg bg-white">
                              {/* Option Label */}
                              <div className="col-span-1">
                                <span className="text-sm font-medium">{group.title}: {option.title}</span>
                              </div>
                              
                              {/* Length */}
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="L (cm)"
                                  value={option.length || ''}
                                  onChange={(e) => updateOption(group.id, option.id, 'length', e.target.value)}
                                  className="w-full text-sm"
                                />
                              </div>
                              
                              {/* Width */}
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="W (cm)"
                                  value={option.width || ''}
                                  onChange={(e) => updateOption(group.id, option.id, 'width', e.target.value)}
                                  className="w-full text-sm"
                                />
                              </div>
                              
                              {/* Height */}
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="H (cm)"
                                  value={option.height || ''}
                                  onChange={(e) => updateOption(group.id, option.id, 'height', e.target.value)}
                                  className="w-full text-sm"
                                />
                              </div>
                              
                              {/* Weight */}
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Weight"
                                  value={option.weight || ''}
                                  onChange={(e) => updateOption(group.id, option.id, 'weight', e.target.value)}
                                  className="w-full text-sm"
                                />
                              </div>
                              
                              {/* Weight Unit */}
                              <div>
                                <Select 
                                  value={option.weight_unit || 'g'} 
                                  onValueChange={(value: 'g' | 'kg' | 'lb' | 'oz') => updateOption(group.id, option.id, 'weight_unit', value)}
                                >
                                  <SelectTrigger className="w-full h-9 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="g">g</SelectItem>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="lb">lb</SelectItem>
                                    <SelectItem value="oz">oz</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={addVariantGroup}
                  variant="outline"
                  className="w-full border-dashed mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add more option type
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <Alert className='text-sm text-muted-foreground'>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Variants are currently **disabled**. When enabled, you can add individual images and pricing for each variant.
                  </AlertDescription>
                </Alert>
                
                {/* Single Product Dimensions (when variants disabled) */}
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-medium">Product Dimensions & Weight</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">Length (cm)</Label>
                      <Input
                        type="number"
                        id="length"
                        name="length"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        value={productLength}
                        onChange={(e) => setProductLength(parseFloat(e.target.value) || '')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="width">Width (cm)</Label>
                      <Input
                        type="number"
                        id="width"
                        name="width"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        value={productWidth}
                        onChange={(e) => setProductWidth(parseFloat(e.target.value) || '')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        type="number"
                        id="height"
                        name="height"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        value={productHeight}
                        onChange={(e) => setProductHeight(parseFloat(e.target.value) || '')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          id="weight"
                          name="weight"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={productWeight}
                          onChange={(e) => setProductWeight(parseFloat(e.target.value) || '')}
                          className="flex-1"
                        />
                        <Select value={productWeightUnit} onValueChange={(value: 'g' | 'kg' | 'lb' | 'oz') => setProductWeightUnit(value)}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Pricing Card */}
      <Card id="pricing">
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            {showVariants 
              ? "Set price and compare price for each variant option" 
              : "Set the base price and compare price for the product"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {showVariants && variantGroups.length > 0 ? (
              <div className="space-y-4">
                <Label className="text-lg font-medium">Variant Pricing</Label>
                
                {variantGroups.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">{group.title} Options:</div>
                    
                    {group.options.map((option, optionIndex) => (
                      <div key={option.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                        {/* Option Label */}
                        <div className="md:col-span-1">
                          <span className="text-sm font-medium">{group.title}: {option.title}</span>
                        </div>
                        
                        {/* Small Image Box */}
                        <div className="md:col-span-1">
                          {option.imagePreview ? (
                            <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                              <img 
                                src={option.imagePreview} 
                                alt={`${option.title} variant`}
                                className="h-full w-full object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-0 right-0 h-4 w-4 rounded-full p-0"
                                onClick={() => updateOption(group.id, option.id, 'image', null)}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <Input 
                                type="file" 
                                id={`variant-image-${group.id}-${option.id}`}
                                accept="image/*"
                                onChange={(e) => handleVariantImageChange(group.id, option.id, e)}
                                className="hidden"
                              />
                              <Label 
                                htmlFor={`variant-image-${group.id}-${option.id}`}
                                className="cursor-pointer flex items-center justify-center h-12 w-12 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50"
                                title="Upload variant image"
                              >
                                <ImageIcon className="h-5 w-5" />
                              </Label>
                            </div>
                          )}
                        </div>
                        
                        {/* Price */}
                        <div className="md:col-span-1">
                          <Input
                            type="number"
                            name={optionIndex === 0 ? `variant_option_price` : `option_price_${group.id}_${option.id}`}
                            min="0"
                            step="0.01"
                            placeholder="Price"
                            value={option.price === 0 ? '' : option.price}
                            onChange={(e) => updateOption(group.id, option.id, 'price', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Compare Price */}
                        <div className="md:col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Compare Price (Optional)"
                            value={option.compare_price || ''}
                            onChange={(e) => updateOption(group.id, option.id, 'compare_price', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
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
                
                <div className="space-y-2">
                  <Label htmlFor="compare_price">Compare Price (Optional)</Label>
                  <Input
                    type="number"
                    id="compare_price"
                    name="compare_price"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    Original price to show as crossed out
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Stock Card */}
      <Card id="stock">
        <CardHeader>
          <CardTitle>Stock & Critical Trigger</CardTitle>
          <CardDescription>
            Set initial stock quantity and configure low stock alerts.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Main Product Stock (when variants disabled) */}
            {!showVariants && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
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
                  
                  <div className="space-y-4 border p-4 rounded-lg bg-red-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Critical Stock Trigger ⚠️</h4>
                        <p className="text-sm text-muted-foreground">
                          Receive notification when stock is low
                        </p>
                      </div>
                      <Switch
                        checked={enableCriticalTrigger}
                        onCheckedChange={setEnableCriticalTrigger}
                      />
                    </div>

                    {enableCriticalTrigger && (
                      <div className="space-y-2">
                        <Label htmlFor="critical_threshold">Critical Threshold</Label>
                        <Input
                          type="number"
                          id="critical_threshold"
                          name="critical_threshold"
                          min="1"
                          placeholder="e.g., 5"
                          value={criticalThreshold}
                          onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || '')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Variant Stock (when variants enabled) */}
            {showVariants && variantGroups.length > 0 && (
              <div className="space-y-4">
                <Label className="text-lg font-medium">Variant Stock</Label>
                
                {variantGroups.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">{group.title} Options:</div>
                    
                    {group.options.map((option, optionIndex) => (
                      <div key={option.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        {/* Option Label */}
                        <div>
                          <span className="text-sm font-medium">{group.title}: {option.title}</span>
                        </div>
                        
                        {/* Quantity */}
                        <div>
                          <Input
                            type="number"
                            name={optionIndex === 0 ? `variant_option_quantity` : `option_quantity_${group.id}_${option.id}`}
                            min="0"
                            placeholder="Quantity"
                            value={option.quantity}
                            onChange={(e) => updateOption(group.id, option.id, 'quantity', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Critical Trigger */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={option.enable_critical_trigger || false}
                              onCheckedChange={(checked) => updateOption(group.id, option.id, 'enable_critical_trigger', checked)}
                              className="h-4 w-8"
                            />
                            <span className="text-sm">Critical</span>
                          </div>
                          
                          {option.enable_critical_trigger && (
                            <Input
                              type="number"
                              min="1"
                              placeholder="Threshold"
                              value={option.critical_trigger || ''}
                              onChange={(e) => updateOption(group.id, option.id, 'critical_trigger', e.target.value)}
                              className="w-24"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="pt-6">
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full"
        >
          {isPersonalListing ? "Create Personal Listing" : "Create Product"}
        </Button>
        
        {isPersonalListing && !addToShop && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            This will be listed as a personal item. You can manage it from your profile.
          </p>
        )}
        
        {isPersonalListing && addToShop && selectedShopId && (
          <p className="text-sm text-green-600 mt-2 text-center">
            ✓ This product will be added to your shop: <strong>{getSelectedShopName()}</strong>
          </p>
        )}
      </div>
    </div>
  );
}