// app/routes/seller.select-boost-product.tsx
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
  Crown
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
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
  
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
      active: { variant: "default" as const, label: "Active", color: '#10b981' },
      inactive: { variant: "secondary" as const, label: "Inactive", color: '#6b7280' },
      draft: { variant: "outline" as const, label: "Draft", color: '#f59e0b' },
      sold: { variant: "secondary" as const, label: "Sold", color: '#8b5cf6' },
      delivered: { variant: "secondary" as const, label: "Delivered", color: '#8b5cf6' },
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
            className={product.is_boosted ? "opacity-50" : ""}
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
                     quantity < 10 ? 'text-yellow-600' : 
                     isBoosted ? 'text-orange-600' : 'text-green-600';
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
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Select Products to Boost</h1>
          </div>
          
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Boost Plan</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
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
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[400px] rounded-lg" />
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (!planId || !boostPlan) {
    return (
      <UserProvider user={user}>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Select Products to Boost</h1>
          </div>
          
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Boost Plan Not Found</h2>
              <p className="text-muted-foreground mb-6">
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
      <div className="p-6 flex flex-col h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Select Products to Boost</h1>
              <p className="text-sm text-muted-foreground">
                Choose products to apply the "{boostPlan.name}" boost
                {planProductLimit > 1 && ` • Limit: ${planProductLimit} products`}
                {activeBoostCount > 0 && ` • ${activeBoostCount} already active`}
                {alreadyBoostedCount > 0 && ` • ${alreadyBoostedCount} already boosted`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{selectedProducts.size} selected</span>
                {remainingSelectionLimit >= 0 && (
                  <span className="text-sm">
                    ({remainingSelectionLimit - selectedProducts.size} more available)
                  </span>
                )}
              </div>
            )}
            
            {selectedProducts.size > 0 && (
              <Button 
                size="lg"
                onClick={() => setApplyBoostDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={applyingBoost}
              >
                <Zap className="h-5 w-5 mr-2" />
                {applyingBoost ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `Boost ${selectedProducts.size} Product${selectedProducts.size !== 1 ? 's' : ''}`
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left: Boost Plan Summary Card */}
          <div className="lg:col-span-1 flex flex-col">
            <Card className="h-full flex flex-col">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {boostPlan.name}
                </CardTitle>
                <CardDescription className="text-white/80">
                  Boost Plan Summary
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold text-center mb-2">
                      ₱{boostPlan.price.toFixed(2)}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      for {boostPlan.duration} {getTimeUnitDisplay(boostPlan.time_unit, boostPlan.duration)}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Product Limit</div>
                        <div className="text-sm text-muted-foreground">
                          {planProductLimit} product{planProductLimit !== 1 ? 's' : ''} at a time
                        </div>
                        {activeBoostCount > 0 && (
                          <div className="text-xs text-yellow-600">
                            ({activeBoostCount} already active with this plan)
                          </div>
                        )}
                        {alreadyBoostedCount > 0 && (
                          <div className="text-xs text-orange-600">
                            ({alreadyBoostedCount} already boosted)
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">Remaining Slots</div>
                        <div className="text-sm text-muted-foreground">
                          {remainingSelectionLimit > 0 ? (
                            <span className="text-green-600 font-medium">
                              {remainingSelectionLimit} available
                            </span>
                          ) : (
                            <span className="text-red-600 font-medium">
                              No slots available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">Duration</div>
                        <div className="text-sm text-muted-foreground">
                          {boostPlan.duration} {boostPlan.time_unit}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">What you get:</h4>
                    <ul className="space-y-2 text-sm">
                      {boostPlan.features?.slice(0, 5).map((feature: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {feature.value || feature.feature_name || feature.name || 'Feature'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Selection Rules:</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Product must be published and active</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Product must have stock available</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-orange-600">Product must not already be boosted</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Total selection cannot exceed plan limit</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                      <h4 className="font-medium">Orange Border = Already Boosted</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Products with orange borders already have active boosts and cannot be selected again.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Product Selection Area - Scrollable */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
              {/* Filters and Search */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products by name, description, or category..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex border rounded-lg">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="h-9 px-3"
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="h-9 px-3"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Selection Stats */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{selectedProducts.size}</span> of{" "}
                      <span className="font-medium">{remainingSelectionLimit}</span> product{remainingSelectionLimit !== 1 ? 's' : ''} selected
                      {alreadyBoostedCount > 0 && (
                        <span className="ml-2 text-orange-600">
                          • {alreadyBoostedCount} already boosted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        disabled={remainingSelectionLimit <= 0 || !canSelectMore || applyingBoost}
                      >
                        Select All Valid
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeselectAll}
                        disabled={selectedProducts.size === 0 || applyingBoost}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Display */}
              <Card className="flex-1 min-h-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Select Products</CardTitle>
                      <CardDescription>
                        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                        {selectedProducts.size > 0 && (
                          <> • {selectedProducts.size} selected (Limit: {planProductLimit} product{planProductLimit !== 1 ? 's' : ''})</>
                        )}
                        {alreadyBoostedCount > 0 && (
                          <span className="ml-2 text-orange-600">
                            • {alreadyBoostedCount} already boosted
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {selectedProducts.size > 0 && (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleDeselectAll}
                          disabled={applyingBoost}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear Selection
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[calc(100vh-450px)]">
                  {isLoadingProducts || loadingBoostStatus ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p>Loading products and boost status...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                          ? 'Try adjusting your search or filters'
                          : 'You have no products available for boosting'}
                      </p>
                      {(!searchQuery && statusFilter === 'all' && categoryFilter === 'all') && (
                        <Button asChild>
                          <Link to="/seller/seller-create-product">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Product
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : viewMode === 'grid' ? (
                    // Grid View with Multi-Select and Orange Borders for Boosted Products
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProducts.map((product) => {
                        const isSelected = selectedProducts.has(product.id);
                        const canBoost = validateProductForBoost(product).length === 0;
                        const isBoosted = product.is_boosted || false;
                        const errors = validationErrors[product.id] || [];
                        
                        return (
                          <Card 
                            key={product.id} 
                            className={`overflow-hidden transition-all hover:shadow-md ${
                              isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 
                              isBoosted ? 'ring-2 ring-orange-500 border-orange-500' : 'border-gray-200'
                            } ${!canBoost || isBoosted ? 'opacity-75' : ''}`}
                            style={{
                              borderColor: isBoosted ? '#f97316' : isSelected ? '#3b82f6' : '#e5e7eb',
                              borderWidth: (isBoosted || isSelected) ? '2px' : '1px'
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleProductSelect(product.id)}
                                    disabled={!canBoost || isBoosted || applyingBoost}
                                    className={`${errors.length > 0 ? 'border-red-500' : 
                                              isBoosted ? 'border-orange-500 opacity-50' : ''}`}
                                  />
                                  <div className={`h-12 w-12 rounded-md flex items-center justify-center ${
                                    isBoosted ? 'bg-orange-100' : 'bg-gray-100'
                                  }`}>
                                    {isBoosted ? (
                                      <Crown className="h-6 w-6 text-orange-600" />
                                    ) : (
                                      <Package className="h-6 w-6 text-gray-600" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium truncate max-w-[180px]">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">{getCategoryName(product)}</div>
                                  </div>
                                </div>
                                {isBoosted && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Already Boosted
                                  </Badge>
                                )}
                              </div>
                              
                              {errors.length > 0 && (
                                <div className="mb-3 p-2 bg-red-50 rounded-md">
                                  {errors.map((error, index) => (
                                    <div key={index} className="text-xs text-red-600 flex items-start gap-1">
                                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      {error}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Price:</span>
                                  <span className={`font-medium ${isBoosted ? 'text-orange-600' : ''}`}>
                                    {formatPrice(product.price)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Stock:</span>
                                  <span className={`font-medium ${
                                    product.quantity === 0 ? 'text-red-600' : 
                                    product.quantity < 10 ? 'text-yellow-600' : 
                                    isBoosted ? 'text-orange-600' : 'text-green-600'
                                  }`}>
                                    {product.quantity} units
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Status:</span>
                                  {isBoosted ? (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Boosted
                                    </Badge>
                                  ) : (
                                    getStatusBadge(product.status)
                                  )}
                                </div>
                                {isBoosted && product.boost_info && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Boost ends in:</span>
                                    <span className="text-orange-600 font-medium">
                                      {product.boost_info.days_remaining} days
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      className={`w-full ${isBoosted ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300' : ''}`}
                                      variant={isSelected ? "default" : isBoosted ? "outline" : "outline"}
                                      onClick={() => handleProductSelect(product.id)}
                                      disabled={!canBoost || isBoosted || applyingBoost}
                                    >
                                      {isSelected ? (
                                        <>
                                          <Check className="h-4 w-4 mr-2" />
                                          Selected
                                        </>
                                      ) : isBoosted ? (
                                        <>
                                          <Zap className="h-4 w-4 mr-2" />
                                          Already Boosted
                                        </>
                                      ) : !canBoost ? (
                                        'Cannot Boost'
                                      ) : (
                                        'Select Product'
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  {(!canBoost || isBoosted) && errors.length > 0 && (
                                    <TooltipContent>
                                      <div className="max-w-xs">
                                        {errors.map((error, index) => (
                                          <div key={index}>• {error}</div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  )}
                                  {isBoosted && (
                                    <TooltipContent>
                                      <div className="max-w-xs">
                                        This product already has an active boost and cannot be boosted again.
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    // List View (DataTable)
                    <DataTable
                      columns={columns}
                      data={filteredProducts}
                      searchConfig={{
                        column: "name",
                        placeholder: "Search products..."
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Boost Confirmation Dialog */}
      <Dialog open={applyBoostDialogOpen} onOpenChange={setApplyBoostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Confirm Boost Application
            </DialogTitle>
            <DialogDescription>
              You are about to apply the "{boostPlan.name}" boost to {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          
          {selectedProducts.size > 0 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="mb-3">
                  <div className="font-medium mb-2">Selected Products:</div>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {Array.from(selectedProducts).slice(0, 5).map((productId) => {
                      const product = products.find(p => p.id === productId);
                      return product ? (
                        <div key={productId} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                          <div className="truncate flex-1">{product.name}</div>
                          <div className="font-medium">{formatPrice(product.price)}</div>
                        </div>
                      ) : null;
                    })}
                    {selectedProducts.size > 5 && (
                      <div className="text-sm text-muted-foreground text-center">
                        +{selectedProducts.size - 5} more product{selectedProducts.size - 5 !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Products</div>
                    <div className="font-medium">{selectedProducts.size} item{selectedProducts.size !== 1 ? 's' : ''}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Plan Limit</div>
                    <div className="font-medium">
                      {planProductLimit} product{planProductLimit !== 1 ? 's' : ''}
                      {activeBoostCount > 0 && ` (${activeBoostCount} active)`}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{boostPlan.name} Boost</div>
                  <div className="text-lg font-bold text-blue-600">
                    ₱{boostPlan.price.toFixed(2)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {boostPlan.duration} {getTimeUnitDisplay(boostPlan.time_unit, boostPlan.duration)} • 
                  Plan Limit: {planProductLimit} product{planProductLimit !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                By confirming, you agree to the boost terms and authorize payment for boosting {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''}.
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setApplyBoostDialogOpen(false)}
              disabled={applyingBoost}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyBoost}
              disabled={applyingBoost}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {applyingBoost ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying Boost...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Boost {selectedProducts.size} Product{selectedProducts.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserProvider>
  );
}