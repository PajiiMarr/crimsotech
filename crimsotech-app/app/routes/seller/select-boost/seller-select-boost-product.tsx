// app/routes/seller/select-boost/seller-select-boost-product.tsx
import type { Route } from "./+types/seller-select-boost-product";
import { UserProvider } from '~/components/providers/user-role-provider';
import { Link, useLoaderData, useNavigate } from "react-router";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
import { 
  Search, 
  ArrowLeft, 
  Zap, 
  Package, 
  Clock, 
  Check, 
  AlertCircle,
  Loader2,
  Grid,
  List,
  TrendingUp,
  Plus,
  Sparkles,
  X,
  CheckCircle,
  AlertTriangle,
  Crown,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { DataTable } from "~/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import AxiosInstance from '~/components/axios/Axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Select Products to Boost | Seller",
    },
  ];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  status: string;
  condition: string;
  upload_status: string;
  shop?: {
    id: string;
    name: string;
  } | null;
  category_admin?: {
    id: string;
    name: string;
  } | null;
  category?: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
  is_refundable?: boolean;
  is_removed?: boolean;
  removal_reason?: string | null;
  variants?: any[];
  is_boosted?: boolean;
  boost_info?: {
    boost_id: string;
    plan_name: string;
    plan_id: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
    status: string;
  } | null;
  can_be_boosted?: boolean;
  eligibility?: {
    is_eligible: boolean;
    issues: string[];
  };
}

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  time_unit: 'hours' | 'days' | 'weeks' | 'months';
  status: 'active' | 'inactive' | 'archived';
  features: any[];
  created_at: string;
  description: string;
  product_limit?: number;
  popular?: boolean;
}

interface LoaderData {
  user: any;
  userId: string | undefined;
  shopId: string | undefined;
  planId: string | undefined;
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {

  
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  
  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  
  await requireRole(request, context, ["isCustomer"]);
  
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  
  const userId = session.get("userId");
  const shopId = session.get("shopId");
  
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  let planId: string | undefined;
  const pathSegments = pathname.split('/').filter(Boolean);
  const planIndex = pathSegments.indexOf('seller-boosts');
  
  if (planIndex !== -1 && planIndex + 1 < pathSegments.length) {
    planId = pathSegments[planIndex + 1];
  }
  
  return { user, userId, shopId, planId };
}

export default function SelectBoostProduct({ loaderData }: { loaderData: LoaderData }) {
  const { user, userId, shopId, planId } = loaderData;
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [boostPlan, setBoostPlan] = useState<BoostPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [applyBoostDialogOpen, setApplyBoostDialogOpen] = useState(false);
  const [applyingBoost, setApplyingBoost] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [planProductLimit, setPlanProductLimit] = useState<number>(1);
  const [activeBoostCount, setActiveBoostCount] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [boostedProducts, setBoostedProducts] = useState<Set<string>>(new Set());
  const [productStats, setProductStats] = useState({
    total_products: 0,
    eligible_for_boost: 0,
    already_boosted: 0,
    not_eligible: 0
  });
  const [loadingBoostStatus, setLoadingBoostStatus] = useState(false);
  const [boostStatusChecked, setBoostStatusChecked] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  useEffect(() => {
    const fetchBoostPlan = async () => {
      if (!planId) {
        setError('No boost plan specified');
        setIsLoadingPlan(false);
        return;
      }

      try {
        setIsLoadingPlan(true);
        setError(null);
        
        const response = await AxiosInstance.get(`/seller-boosts/${planId}/plan_detail/`);
        
        if (response.data.success) {
          const plan = response.data.plan;
          setBoostPlan(plan);
          setPlanProductLimit(plan.product_limit || 1);
        } else {
          setError(`Failed to load boost plan: ${response.data.message}`);
          toast.error("Failed to load boost plan", {
            description: response.data.message
          });
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || `Error loading boost plan: ${error.message}`;
        setError(errorMessage);
        toast.error("Error loading boost plan", {
          description: errorMessage
        });
      } finally {
        setIsLoadingPlan(false);
      }
    };

    fetchBoostPlan();
  }, [planId]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!userId) {
        setIsLoadingProducts(false);
        toast.error("User ID not found");
        return;
      }

      try {
        setIsLoadingProducts(true);
        
        // Fetch products from the seller-products endpoint
        const response = await AxiosInstance.get('/seller-products/', {
          params: { customer_id: userId, shop_id: shopId }
        });
        
        if (response.data.success) {
          const productsData = response.data.products || [];
          
          // Process products data
          const processedProducts = productsData.map((product: any) => {
            // Determine the category name to display
            let categoryName = 'No Category';
            if (product.category?.name) {
              categoryName = product.category.name;
            } else if (product.category_admin?.name) {
              categoryName = product.category_admin.name;
            }
            
            return {
              ...product,
              // Set a default category property for filtering
              category: product.category || product.category_admin || null,
              // Default values for boost properties
              is_boosted: false,
              boost_info: null,
              can_be_boosted: true
            };
          });
          
          setProducts(processedProducts);
          setFilteredProducts(processedProducts);
          
          // Extract categories for filtering
          const categoryNames: string[] = [];
          processedProducts.forEach((product: Product) => {
            if (product.category?.name) {
              categoryNames.push(product.category.name);
            } else if (product.category_admin?.name) {
              categoryNames.push(product.category_admin.name);
            }
          });
          
          const uniqueCategories = Array.from(new Set(categoryNames));
          setCategories(uniqueCategories);
          
          // Update stats
          const stats = {
            total_products: processedProducts.length,
            eligible_for_boost: 0, // Will be updated after checking boost status
            already_boosted: 0, // Will be updated after checking boost status
            not_eligible: 0 // Will be updated after checking boost status
          };
          setProductStats(stats);
          
        } else {
          setProducts([]);
          setFilteredProducts([]);
          toast.warning("No products found", {
            description: "You don't have any products available for boosting"
          });
        }
      } catch (error: any) {
        console.error('Error fetching products:', error);
        setProducts([]);
        setFilteredProducts([]);
        toast.error("Failed to load products", {
          description: error.response?.data?.message || "Network error occurred"
        });
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [userId, shopId]);

  useEffect(() => {
    const checkBoostStatusForProducts = async () => {
      if (!userId || !products.length || boostStatusChecked) return;
      
      try {
        setLoadingBoostStatus(true);
        
        // Batch product IDs in groups of 10 to avoid URL length issues
        const productIds = products.map(p => p.id);
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < productIds.length; i += batchSize) {
          batches.push(productIds.slice(i, i + batchSize));
        }
        
        const allResults: any[] = [];
        
        for (const batch of batches) {
          try {
            const response = await AxiosInstance.get('/seller-boosts/check_products/', {
              params: { 
                customer_id: userId,
                product_ids: batch // batch is already an array
              },
              paramsSerializer: {
                indexes: null // This will serialize array as product_ids=id1&product_ids=id2
              }
            });
            
            if (response.data.success && response.data.results) {
              allResults.push(...response.data.results);
            }
          } catch (batchError) {
            console.error('Error checking boost status for batch:', batchError);
          }
        }
        
        if (allResults.length > 0) {
          const boostedIds = new Set<string>();
          let eligibleCount = 0;
          let alreadyBoostedCount = 0;
          let notEligibleCount = 0;
          
          // Update products with boost status
          setProducts(prevProducts => 
            prevProducts.map(product => {
              const boostResult = allResults.find((r: any) => r.product_id === product.id);
              if (boostResult) {
                if (boostResult.is_boosted) {
                  boostedIds.add(product.id);
                  alreadyBoostedCount++;
                }
                
                if (boostResult.can_be_boosted) {
                  eligibleCount++;
                } else {
                  notEligibleCount++;
                }
                
                return {
                  ...product,
                  is_boosted: boostResult.is_boosted || false,
                  boost_info: boostResult.boost_info || null,
                  can_be_boosted: boostResult.can_be_boosted || false,
                  eligibility: boostResult.eligibility || { is_eligible: true, issues: [] }
                };
              }
              return product;
            })
          );
          
          setBoostedProducts(boostedIds);
          
          // Update stats
          setProductStats(prev => ({
            ...prev,
            eligible_for_boost: eligibleCount,
            already_boosted: alreadyBoostedCount,
            not_eligible: notEligibleCount
          }));
        }
        
        setBoostStatusChecked(true);
      } catch (error) {
        console.error('Error checking boost status:', error);
      } finally {
        setLoadingBoostStatus(false);
      }
    };

    if (products.length > 0 && !boostStatusChecked) {
      checkBoostStatusForProducts();
    }
  }, [products, userId, boostStatusChecked]);

  useEffect(() => {
    const fetchActiveBoosts = async () => {
      if (!userId || !planId) return;
      
      try {
        const response = await AxiosInstance.get('/seller-boosts/active/', {
          params: { customer_id: userId, shop_id: shopId }
        });
        
        if (response.data.success) {
          const planActiveBoosts = response.data.boosts?.filter(
            (boost: any) => boost.boost_plan_id === planId
          ) || [];
          setActiveBoostCount(planActiveBoosts.length);
        }
      } catch (error) {
        console.error('Error fetching active boosts:', error);
      }
    };

    if (boostPlan) {
      fetchActiveBoosts();
    }
  }, [boostPlan, userId, shopId, planId]);

  useEffect(() => {
    let result = products;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((product: Product) =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        (product.category?.name && product.category.name.toLowerCase().includes(query)) ||
        (product.category_admin?.name && product.category_admin.name.toLowerCase().includes(query))
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter((product: Product) => {
        if (statusFilter === 'active') {
          return product.status.toLowerCase() === 'active';
        } else if (statusFilter === 'delivered') {
          return product.status.toLowerCase() === 'delivered';
        } else if (statusFilter === 'draft') {
          return product.upload_status.toLowerCase() === 'draft';
        } else if (statusFilter === 'inactive') {
          return product.status.toLowerCase() === 'inactive';
        }
        return true;
      });
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter((product: Product) => 
        (product.category?.name === categoryFilter) || 
        (product.category_admin?.name === categoryFilter)
      );
    }
    
    setFilteredProducts(result);
  }, [searchQuery, statusFilter, categoryFilter, products]);

  useEffect(() => {
    setIsLoading(isLoadingPlan || isLoadingProducts || loadingBoostStatus);
  }, [isLoadingPlan, isLoadingProducts, loadingBoostStatus]);

  const validateProductForBoost = (product: Product): string[] => {
    const errors: string[] = [];
    
    // Check product boost status
    if (product.is_boosted) {
      errors.push("Product already has an active boost");
    }
    
    // Additional validation
    if (product.quantity <= 0) {
      errors.push("Product is out of stock");
    }
    
    if (product.upload_status !== 'published') {
      errors.push(`Product must be published (current: ${product.upload_status})`);
    }
    
    if (product.status.toLowerCase() !== 'active') {
      errors.push(`Product must be active (current: ${product.status})`);
    }
    
    if (product.is_removed) {
      errors.push("Product has been removed");
    }
    
    // Use backend validation if available
    if (product.can_be_boosted === false) {
      if (product.eligibility?.issues) {
        product.eligibility.issues.forEach(issue => {
          if (!errors.includes(issue)) {
            errors.push(issue);
          }
        });
      } else if (!errors.length) {
        errors.push("Product cannot be boosted");
      }
    }
    
    return errors;
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Use backend validation first
    const errors = validateProductForBoost(product);
    
    if (errors.length > 0) {
      setValidationErrors(prev => ({ ...prev, [productId]: errors }));
      toast.warning("Cannot select product", {
        description: errors[0]
      });
      return;
    }
    
    const newSelected = new Set(selectedProducts);
    
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[productId];
        return newErrors;
      });
    } else {
      // Check if adding would exceed plan limit
      if (newSelected.size + 1 > planProductLimit) {
        toast.warning("Selection limit reached", {
          description: `You can only select up to ${planProductLimit} product${planProductLimit !== 1 ? 's' : ''} for this boost plan.`
        });
        return;
      }
      
      // Check if adding would exceed total limit with existing boosts
      if (newSelected.size + 1 + activeBoostCount > planProductLimit) {
        toast.warning("Plan limit exceeded", {
          description: `You already have ${activeBoostCount} active boost${activeBoostCount !== 1 ? 's' : ''} with this plan. You can only select ${planProductLimit - activeBoostCount} more product${planProductLimit - activeBoostCount !== 1 ? 's' : ''}.`
        });
        return;
      }
      
      newSelected.add(productId);
    }
    
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    // Filter out already boosted products
    const selectableProducts = filteredProducts.filter(product => {
      const errors = validateProductForBoost(product);
      return errors.length === 0 && !product.is_boosted;
    });
    
    // Check if we can select all within limits
    const maxSelectable = Math.min(
      planProductLimit - activeBoostCount,
      planProductLimit,
      selectableProducts.length
    );
    
    if (selectableProducts.length > maxSelectable) {
      toast.warning("Cannot select all", {
        description: `You can only select up to ${maxSelectable} product${maxSelectable !== 1 ? 's' : ''} (plan limit: ${planProductLimit}, active boosts: ${activeBoostCount}).`
      });
      return;
    }
    
    const newSelected = new Set(selectedProducts);
    let addedCount = 0;
    selectableProducts.forEach(product => {
      if (!newSelected.has(product.id) && !product.is_boosted) {
        newSelected.add(product.id);
        addedCount++;
      }
    });
    setSelectedProducts(newSelected);
    
    if (addedCount > 0) {
      toast.success("Products selected", {
        description: `Added ${addedCount} product${addedCount !== 1 ? 's' : ''} to your selection`
      });
    } else {
      toast.info("No new products selected", {
        description: "All valid products are already selected"
      });
    }
  };

  const handleDeselectAll = () => {
    if (selectedProducts.size === 0) return;
    
    setSelectedProducts(new Set());
    setValidationErrors({});
    toast.info("Selection cleared", {
      description: `Cleared ${selectedProducts.size} product${selectedProducts.size !== 1 ? 's' : ''} from selection`
    });
  };

  const formatDatabaseError = (errorData: any): string => {
    if (!errorData) return "Unknown database error occurred";
    
    // Handle validation errors array from backend
    if (Array.isArray(errorData.errors)) {
      return errorData.errors.map((err: any) => {
        if (typeof err === 'string') return `• ${err}`;
        if (err.product_name && err.errors) {
          return `• ${err.product_name}: ${Array.isArray(err.errors) ? err.errors.join(', ') : err.errors}`;
        }
        return `• ${JSON.stringify(err)}`;
      }).join('\n');
    }
    
    // Handle simple error message
    if (typeof errorData === 'string') {
      return errorData;
    }
    
    // Handle error object with message
    if (errorData.message) {
      return errorData.message;
    }
    
    // Handle Django validation error format
    if (errorData.non_field_errors) {
      return Array.isArray(errorData.non_field_errors) 
        ? errorData.non_field_errors.join(', ')
        : errorData.non_field_errors;
    }
    
    // Handle field-specific errors
    const fieldErrors = [];
    for (const [field, errors] of Object.entries(errorData)) {
      if (Array.isArray(errors)) {
        fieldErrors.push(`${field}: ${errors.join(', ')}`);
      } else if (typeof errors === 'string') {
        fieldErrors.push(`${field}: ${errors}`);
      }
    }
    
    if (fieldErrors.length > 0) {
      return fieldErrors.join('\n');
    }
    
    return JSON.stringify(errorData);
  };

  const handleApplyBoost = async () => {
    if (selectedProducts.size === 0 || !planId || !userId) return;
    
    try {
      setApplyingBoost(true);
      setApplyBoostDialogOpen(false);
      
      // Validate all selected products one more time
      const finalValidationErrors: Record<string, string[]> = {};
      const validProductIds: string[] = [];
      
      Array.from(selectedProducts).forEach(productId => {
        const product = products.find(p => p.id === productId);
        if (product) {
          const errors = validateProductForBoost(product);
          if (errors.length > 0) {
            finalValidationErrors[productId] = errors;
          } else {
            validProductIds.push(productId);
          }
        }
      });
      
      if (Object.keys(finalValidationErrors).length > 0) {
        setValidationErrors(finalValidationErrors);
        const errorCount = Object.keys(finalValidationErrors).length;
        toast.error("Validation failed", {
          description: `${errorCount} product${errorCount !== 1 ? 's' : ''} cannot be boosted. Please check the errors.`,
          duration: 5000
        });
        setApplyingBoost(false);
        return;
      }
      
      // Check if adding would exceed plan limit with existing boosts
      if (validProductIds.length + activeBoostCount > planProductLimit) {
        toast.error("Plan limit exceeded", {
          description: `Cannot apply boost: You would exceed the plan limit of ${planProductLimit} product${planProductLimit !== 1 ? 's' : ''} (${activeBoostCount} already active + ${validProductIds.length} new).`
        });
        setApplyingBoost(false);
        return;
      }
      
      // Show loading toast
      const loadingToastId = toast.loading(`Applying boost to ${validProductIds.length} product${validProductIds.length !== 1 ? 's' : ''}...`, {
        duration: Infinity
      });
      
      try {
        const response = await AxiosInstance.post('/seller-boosts/create_bulk/', {
          product_ids: validProductIds,
          boost_plan_id: planId,
          customer_id: userId,
          shop_id: shopId
        });
        
        toast.dismiss(loadingToastId);
        
        if (response.data.success) {
          toast.success("Boost applied successfully!", {
            description: `Successfully boosted ${validProductIds.length} product${validProductIds.length !== 1 ? 's' : ''}!`,
            duration: 3000
          });
          
          // Reset boost status to force re-check
          setBoostStatusChecked(false);
          
          // Clear selection and wait before navigating back
          setSelectedProducts(new Set());
          setTimeout(() => {
            navigate(-1);
          }, 1500);
        } else {
          // Handle backend validation errors
          if (response.data.errors) {
            const errorDetails = formatDatabaseError(response.data);
            toast.error("Boost application failed", {
              description: `${response.data.message}\n\n${errorDetails}`,
              duration: 8000
            });
          } else {
            toast.error("Boost application failed", {
              description: response.data.message || "Unknown error occurred",
              duration: 5000
            });
          }
        }
      } catch (error: any) {
        toast.dismiss(loadingToastId);
        
        // Handle network errors
        if (error.code === 'ERR_NETWORK') {
          toast.error("Network error", {
            description: "Unable to connect to the server. Please check your internet connection.",
            duration: 5000
          });
          return;
        }
        
        // Handle HTTP errors (400, 500, etc.)
        if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;
          
          switch (status) {
            case 400:
              // Bad request - validation errors
              const errorDetails = formatDatabaseError(errorData);
              toast.error("Validation failed", {
                description: errorData.message ? `${errorData.message}\n\n${errorDetails}` : errorDetails,
                duration: 8000
              });
              break;
              
            case 401:
              toast.error("Authentication required", {
                description: "Please log in again to continue.",
                duration: 5000
              });
              break;
              
            case 403:
              toast.error("Permission denied", {
                description: "You don't have permission to perform this action.",
                duration: 5000
              });
              break;
              
            case 404:
              toast.error("Resource not found", {
                description: "The boost plan or products could not be found.",
                duration: 5000
              });
              break;
              
            case 422:
              // Unprocessable entity - validation errors
              const validationError = formatDatabaseError(errorData);
              toast.error("Validation error", {
                description: validationError,
                duration: 8000
              });
              break;
              
            case 500:
              toast.error("Server error", {
                description: "An internal server error occurred. Please try again later.",
                duration: 5000
              });
              break;
              
            default:
              toast.error(`Error ${status}`, {
                description: errorData.message || "An unexpected error occurred",
                duration: 5000
              });
          }
        } else {
          // Handle other errors
          toast.error("Boost application failed", {
            description: error.message || "An unexpected error occurred",
            duration: 5000
          });
        }
      } finally {
        setApplyingBoost(false);
      }
      
    } catch (error: any) {
      setApplyingBoost(false);
      toast.error("Boost application failed", {
        description: error.message || "An unexpected error occurred",
        duration: 5000
      });
    }
  };

  const formatPrice = (price: string | number) => {
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(priceNum)) return '₱0.00';
    return `₱${priceNum.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const statusConfig = {
      active: { variant: "default" as const, label: "Active", color: '#059669' },
      inactive: { variant: "secondary" as const, label: "Inactive", color: '#6b7280' },
      draft: { variant: "outline" as const, label: "Draft", color: '#d97706' },
      sold: { variant: "secondary" as const, label: "Sold", color: '#7c3aed' },
      delivered: { variant: "secondary" as const, label: "Delivered", color: '#7c3aed' },
    };
    
    const config = statusConfig[statusLower as keyof typeof statusConfig] || 
                  { variant: "outline" as const, label: status, color: '#6b7280' };
    
    return (
      <Badge 
        variant={config.variant}
        className="text-xs px-2 capitalize"
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        {config.label}
      </Badge>
    );
  };

  const getTimeUnitDisplay = (unit: string, duration: number) => {
    const plural = duration > 1 ? 's' : '';
    switch(unit) {
      case 'hours': return `Hour${plural}`;
      case 'days': return `Day${plural}`;
      case 'weeks': return `Week${plural}`;
      case 'months': return `Month${plural}`;
      default: return unit;
    }
  };

  const getCategoryName = (product: Product) => {
    if (product.category?.name) return product.category.name;
    if (product.category_admin?.name) return product.category_admin.name;
    return 'No Category';
  };

  const columns: ColumnDef<Product>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => {
            if (value) {
              handleSelectAll();
            } else {
              handleDeselectAll();
            }
          }}
          aria-label="Select all"
          className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
        />
      ),
      cell: ({ row }) => {
        const product = row.original;
        const canBoost = validateProductForBoost(product).length === 0;
        const isSelected = selectedProducts.has(product.id);
        
        return (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => handleProductSelect(product.id)}
            disabled={!canBoost || product.is_boosted}
            aria-label="Select row"
            className={`${product.is_boosted ? "opacity-50" : ""} border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500`}
          />
        );
      },
    },
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original;
        const hasErrors = validationErrors[product.id]?.length > 0;
        const isBoosted = product.is_boosted || false;
        
        return (
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-md flex items-center justify-center ${
              hasErrors ? 'bg-red-100' : isBoosted ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              {isBoosted ? (
                <Crown className="h-5 w-5 text-orange-600" />
              ) : (
                <Package className={`h-5 w-5 ${hasErrors ? 'text-red-600' : 'text-gray-600'}`} />
              )}
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {product.name}
                {isBoosted && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                    <Zap className="h-3 w-3 mr-1" />
                    Already Boosted
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{getCategoryName(product)}</div>
              {hasErrors && (
                <div className="text-xs text-red-600 mt-1">
                  {validationErrors[product.id]?.[0] || ''}
                  {validationErrors[product.id]?.length > 1 && ` +${validationErrors[product.id].length - 1} more`}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const product = row.original;
        const isBoosted = product.is_boosted || false;
        const price = row.getValue("price") as string | number;
        return (
          <div className={`font-medium ${isBoosted ? 'text-orange-600' : ''}`}>
            {formatPrice(price)}
          </div>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: "Stock",
      cell: ({ row }) => {
        const quantity = row.getValue("quantity") as number;
        const product = row.original;
        const isBoosted = product.is_boosted || false;
        const color = quantity === 0 ? 'text-red-600' : 
                     quantity < 10 ? 'text-amber-600' : 
                     isBoosted ? 'text-orange-600' : 'text-emerald-600';
        return <div className={`font-medium ${color}`}>{quantity}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const product = row.original;
        const status = row.getValue("status") as string;
        const isBoosted = product.is_boosted || false;
        
        if (isBoosted) {
          return (
            <Badge 
              variant="outline"
              className="text-xs bg-orange-50 text-orange-700 border-orange-200"
            >
              <Zap className="h-3 w-3 mr-1" />
              Boosted + {status}
            </Badge>
          );
        }
        
        return getStatusBadge(status);
      },
    },
    {
      accessorKey: "upload_status",
      header: "Upload Status",
      cell: ({ row }) => {
        const product = row.original;
        const isBoosted = product.is_boosted || false;
        return (
          <div className={`text-sm capitalize ${isBoosted ? 'text-orange-600' : ''}`}>
            {row.getValue("upload_status") as string}
          </div>
        );
      },
    },
  ];

  if (error) {
    return (
      <UserProvider user={user}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Select Products to Boost</h1>
          </div>
          
          <Card>
            <CardContent className="p-6 md:p-12 text-center">
              <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg md:text-xl font-semibold mb-2">Error Loading Boost Plan</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <Loader2 className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </UserProvider>
    );
  }

  if (isLoading) {
    return (
      <UserProvider user={user}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Skeleton className="h-6 md:h-8 w-32 md:w-48" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            <Skeleton className="h-[300px] md:h-[400px] rounded-lg" />
            <div className="lg:col-span-3 space-y-4 md:space-y-6">
              <Skeleton className="h-10 md:h-12 rounded-lg" />
              <Skeleton className="h-[200px] md:h-64 rounded-lg" />
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (!planId || !boostPlan) {
    return (
      <UserProvider user={user}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Select Products to Boost</h1>
          </div>
          
          <Card>
            <CardContent className="p-6 md:p-12 text-center">
              <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-lg md:text-xl font-semibold mb-2">Boost Plan Not Found</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6">
                The boost plan you're trying to select doesn't exist or is no longer available.
              </p>
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </UserProvider>
    );
  }

  const remainingSelectionLimit = Math.max(0, planProductLimit - activeBoostCount);
  const canSelectMore = selectedProducts.size < remainingSelectionLimit;
  const alreadyBoostedCount = productStats.already_boosted || boostedProducts.size;

  return (
    <UserProvider user={user}>
      <div className="p-3 sm:p-4 md:p-6 flex flex-col min-h-screen">
        {/* Header - Simplified and responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Back</span>
            </Button>
            <div className="min-w-0 flex-1 sm:flex-initial">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Select Products</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {boostPlan.name} • {planProductLimit} limit
              </p>
            </div>
          </div>
          
          {selectedProducts.size > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 sm:gap-2 bg-orange-50 text-orange-700 px-2 sm:px-3 py-1.5 rounded-lg border border-orange-200 text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="font-medium">{selectedProducts.size} selected</span>
                <span className="hidden xs:inline text-orange-600">
                  ({remainingSelectionLimit - selectedProducts.size} left)
                </span>
              </div>
              
              <Button 
                size="sm"
                onClick={() => setApplyBoostDialogOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-sm text-xs sm:text-sm px-2 sm:px-3"
                disabled={applyingBoost}
              >
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden xs:inline">Boost</span>
              </Button>
            </div>
          )}
        </div>

        {/* Main Content - Responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 flex-1">
          {/* Left: Enhanced Plan Summary Card with all features */}
          <div className="lg:col-span-1">
            <Card className="border-orange-200">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <Sparkles className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm sm:text-base font-semibold truncate">{boostPlan.name}</CardTitle>
                    <CardDescription className="text-xs">Boost Plan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
                {/* Price - Prominent */}
                <div className="text-center py-2">
                  <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                    ₱{boostPlan.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    for {boostPlan.duration} {getTimeUnitDisplay(boostPlan.time_unit, boostPlan.duration)}
                  </div>
                </div>

                {/* Key metrics in a clean grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-orange-50/50 p-2 rounded-lg">
                    <div className="text-xs text-muted-foreground">Product Limit</div>
                    <div className="text-sm font-semibold text-orange-700">{planProductLimit}</div>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded-lg">
                    <div className="text-xs text-muted-foreground">Available</div>
                    <div className="text-sm font-semibold text-emerald-700">{remainingSelectionLimit}</div>
                  </div>
                </div>

                {/* Status indicators - compact */}
                {(activeBoostCount > 0 || alreadyBoostedCount > 0) && (
                  <div className="space-y-1.5">
                    {activeBoostCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs bg-amber-50 p-2 rounded-lg">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="text-amber-700">{activeBoostCount} active with this plan</span>
                      </div>
                    )}
                    {alreadyBoostedCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs bg-orange-50 p-2 rounded-lg">
                        <Crown className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                        <span className="text-orange-700">{alreadyBoostedCount} already boosted</span>
                      </div>
                    )}
                  </div>
                )}

                {/* All Features - Clean collapsible section */}
                {boostPlan.features && boostPlan.features.length > 0 && (
                  <Collapsible open={featuresOpen} onOpenChange={setFeaturesOpen} className="border-t border-orange-100 pt-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent">
                        <span className="text-xs font-medium flex items-center gap-1">
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          Features ({boostPlan.features.length})
                        </span>
                        {featuresOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {boostPlan.features.map((feature: any, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-xs bg-gray-50 p-2 rounded">
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">
                              {feature.value || feature.feature_name || feature.name || 'Feature'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}


                {/* Visual indicator for boosted products */}
                <div className="border-t border-orange-100 pt-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-muted-foreground">Orange border = Already boosted</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Product Selection Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filters - Responsive */}
            <Card className="border-orange-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 sm:h-10 text-sm focus-visible:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[110px] sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[110px] sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category} className="truncate">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex border rounded-lg">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={`h-9 px-2 sm:px-3 ${viewMode === 'grid' ? 'bg-orange-500 text-white hover:bg-orange-600' : ''}`}
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={`h-9 px-2 sm:px-3 ${viewMode === 'list' ? 'bg-orange-500 text-white hover:bg-orange-600' : ''}`}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    <span className="font-medium">{filteredProducts.length}</span> products
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={remainingSelectionLimit <= 0 || !canSelectMore}
                      className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      Select All
                    </Button>
                    {selectedProducts.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="h-8 text-xs text-orange-700 hover:bg-orange-50"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid/List */}
            <Card className="border-orange-200">
              <CardContent className="p-3 sm:p-4">
                {isLoadingProducts || loadingBoostStatus ? (
                  <div className="text-center py-8 sm:py-12">
                    <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-orange-500 mx-auto mb-3" />
                    <p className="text-sm">Loading products...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 text-orange-300 mx-auto mb-3" />
                    <h3 className="text-sm sm:text-base font-semibold mb-1">No Products Found</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'No products available'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
                      <Button size="sm" asChild className="bg-orange-500 hover:bg-orange-600">
                        <Link to="/seller/seller-create-product">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Product
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  // Responsive Grid
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedProducts.has(product.id);
                      const canBoost = validateProductForBoost(product).length === 0;
                      const isBoosted = product.is_boosted || false;
                      const errors = validationErrors[product.id] || [];
                      
                      return (
                        <Card 
                          key={product.id} 
                          className={`overflow-hidden ${
                            isSelected ? 'ring-2 ring-orange-500' : 
                            isBoosted ? 'ring-2 ring-orange-500' : 'border-orange-200'
                          } ${!canBoost || isBoosted ? 'opacity-75' : ''}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleProductSelect(product.id)}
                                disabled={!canBoost || isBoosted}
                                className="mt-1 border-orange-300 data-[state=checked]:bg-orange-500"
                              />
                              <div className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${
                                isBoosted ? 'bg-orange-100' : 'bg-orange-50'
                              }`}>
                                {isBoosted ? (
                                  <Crown className="h-5 w-5 text-orange-600" />
                                ) : (
                                  <Package className="h-5 w-5 text-orange-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{product.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {getCategoryName(product)}
                                </div>
                              </div>
                            </div>

                            {errors.length > 0 && (
                              <div className="mb-2 p-1.5 bg-red-50 rounded text-xs text-red-600">
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                {errors[0]}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                              <div>
                                <span className="text-muted-foreground">Price:</span>
                                <span className="ml-1 font-medium">{formatPrice(product.price)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Stock:</span>
                                <span className={`ml-1 font-medium ${
                                  product.quantity === 0 ? 'text-red-600' : 
                                  product.quantity < 10 ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                  {product.quantity}
                                </span>
                              </div>
                            </div>

                            <Button
                              className={`w-full h-8 text-xs ${
                                isSelected ? 'bg-orange-500 text-white hover:bg-orange-600' : 
                                isBoosted ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 
                                'border-orange-300 text-orange-700 hover:bg-orange-50'
                              }`}
                              variant={isSelected ? "default" : isBoosted ? "outline" : "outline"}
                              onClick={() => handleProductSelect(product.id)}
                              disabled={!canBoost || isBoosted}
                            >
                              {isSelected ? 'Selected' : isBoosted ? 'Boosted' : 'Select'}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    data={filteredProducts}
                    searchConfig={{
                      column: "name",
                      placeholder: "Search..."
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Simplified Confirmation Dialog */}
        <Dialog open={applyBoostDialogOpen} onOpenChange={setApplyBoostDialogOpen}>
          <DialogContent className="sm:max-w-md border-orange-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-700 text-base">
                <Zap className="h-4 w-4 text-orange-500" />
                Confirm Boost
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3 py-2">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-sm">
                <p className="font-medium mb-2">Selected Products ({selectedProducts.size})</p>
                <div className="max-h-32 overflow-y-auto space-y-1.5">
                  {Array.from(selectedProducts).slice(0, 3).map((productId) => {
                    const product = products.find(p => p.id === productId);
                    return product ? (
                      <div key={productId} className="flex justify-between text-xs bg-white p-2 rounded border border-orange-100">
                        <span className="truncate flex-1">{product.name}</span>
                        <span className="font-medium text-orange-600 ml-2">{formatPrice(product.price)}</span>
                      </div>
                    ) : null;
                  })}
                  {selectedProducts.size > 3 && (
                    <div className="text-xs text-center text-muted-foreground">
                      +{selectedProducts.size - 3} more
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 rounded-lg border border-orange-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">{boostPlan.name}</span>
                  <span className="font-bold text-orange-600">₱{boostPlan.price.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {boostPlan.duration} {boostPlan.time_unit} • {planProductLimit} product limit
                </p>
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApplyBoostDialogOpen(false)}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Cancel
              </Button>
              <Link
                to={`/seller/seller-boosts/pay-boost/${planId}?product_ids=${Array.from(selectedProducts).join(',')}`}
                state={{ selectedProducts: Array.from(selectedProducts), boostPlan }}
              >
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Pay ₱{(boostPlan.price * selectedProducts.size).toFixed(2)}
                </Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </UserProvider>
  );
}