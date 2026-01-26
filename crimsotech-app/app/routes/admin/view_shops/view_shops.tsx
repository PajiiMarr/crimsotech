import type { Route } from "./+types/view_shops"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { useState, useEffect } from 'react'

// shadcn imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { 
  Building2, 
  Package, 
  Tag, 
  Users, 
  Star, 
  AlertCircle,
  CheckCircle,
  MapPin,
  Phone,
  Calendar,
  DollarSign,
  BarChart3,
  Shield,
  Gift,
  ExternalLink,
  MoreVertical,
  ChevronLeft,
  Store,
  Eye,
  Ban,
  Trash2,
  Archive,
  Send,
  Undo,
  XCircle,
  ShieldAlert,
  Menu,
  TrendingUp,
  Heart
} from 'lucide-react'
import { DataTable } from '~/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Progress } from '~/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { useToast } from "~/hooks/use-toast"

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Shop Details",
        }
    ]
}

interface LoaderData {
    user: any;
    shopId: string;
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server")
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any)
    const { requireRole } = await import("~/middleware/role-require.server")
    const { fetchUserRole } = await import("~/middleware/role.server")

    let user = (context as any).user
    if (!user) {
        user = await fetchUserRole({ request, context })
    }

    await requireRole(request, context, ["isAdmin"])

    // Extract shop ID from URL params
    const url = new URL(request.url)
    const shopId = url.pathname.split('/').pop() || ''

    return { user, shopId }
}

// Interface definitions matching Django models
interface Shop {
    id: string;
    shop_picture: string | null;
    customer: Customer | null;
    description: string | null;
    name: string;
    province: string;
    city: string;
    barangay: string;
    street: string;
    contact_number: string;
    verified: boolean;
    status: string;
    total_sales: number;
    created_at: string;
    updated_at: string;
    is_suspended: boolean;
    suspension_reason: string | null;
    suspended_until: string | null;
    active_report_count: number;
    favorites_count: number;
    followers_count: number;
}

interface Customer {
    customer: User;
    product_limit: number;
    current_product_count: number;
}

interface User {
    id: string;
    username: string | null;
    email: string | null;
    first_name: string;
    last_name: string;
    contact_number: string;
}

interface Product {
    id: string;
    name: string;
    description: string;
    quantity: number;
    price: number;
    status: string;
    condition: string;
    upload_status: string;
    created_at: string;
    category: Category | null;
    active_report_count: number;
    favorites_count: number;
}

interface Category {
    id: string;
    name: string;
}

interface Review {
    id: string;
    customer: Customer;
    rating: number;
    comment: string | null;
    created_at: string;
}

interface Voucher {
    id: string;
    name: string;
    code: string;
    discount_type: string;
    value: number;
    valid_until: string;
    is_active: boolean;
}

interface Boost {
    id: string;
    product: Product;
    boost_plan: BoostPlan;
    status: string;
    start_date: string;
    end_date: string;
}

interface BoostPlan {
    id: string;
    name: string;
    price: number;
}

interface Report {
    id: string;
    reason: string;
    description: string | null;
    status: string;
    created_at: string;
}

// Action configurations
const actionConfigs = {
  suspend: {
    title: "Suspend Shop",
    description: "This will suspend the shop temporarily. Customers won't be able to view or purchase from it.",
    confirmText: "Suspend",
    variant: "outline" as const,
    icon: Ban,
    needsReason: true,
    needsSuspensionDays: true,
  },
  unsuspend: {
    title: "Unsuspend Shop",
    description: "This will unsuspend the shop and make it available to customers again.",
    confirmText: "Unsuspend",
    variant: "outline" as const,
    icon: CheckCircle,
    needsReason: false,
    needsSuspensionDays: false,
  },
  verify: {
    title: "Verify Shop",
    description: "This will verify the shop and add a verification badge.",
    confirmText: "Verify",
    variant: "default" as const,
    icon: Shield,
    needsReason: false,
    needsSuspensionDays: false,
  },
  unverify: {
    title: "Remove Verification",
    description: "This will remove the verification badge from the shop.",
    confirmText: "Remove Verification",
    variant: "outline" as const,
    icon: ShieldAlert,
    needsReason: false,
    needsSuspensionDays: false,
  },
  delete: {
    title: "Delete Shop",
    description: "This action cannot be undone. This will permanently delete the shop and all its products.",
    confirmText: "Delete Shop",
    variant: "destructive" as const,
    icon: Trash2,
    needsReason: true,
    needsSuspensionDays: false,
  },
};

// Placeholder data
const placeholderShop: Shop = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    shop_picture: "https://via.placeholder.com/150",
    customer: {
        customer: {
            id: "550e8400-e29b-41d4-a716-446655440001",
            username: "john_shopowner",
            email: "john@example.com",
            first_name: "John",
            last_name: "Doe",
            contact_number: "+639123456789"
        },
        product_limit: 50,
        current_product_count: 28
    },
    description: "Premium electronics and gadgets shop with best prices in the city.",
    name: "Tech Haven",
    province: "Metro Manila",
    city: "Quezon City",
    barangay: "Cubao",
    street: "Aurora Boulevard",
    contact_number: "+639123456789",
    verified: true,
    status: "Active",
    total_sales: 125450.75,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-03-20T14:45:00Z",
    is_suspended: false,
    suspension_reason: null,
    suspended_until: null,
    active_report_count: 2,
    favorites_count: 345,
    followers_count: 1289
}

const placeholderProducts: Product[] = [
    {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: "Wireless Bluetooth Headphones",
        description: "Noise cancelling wireless headphones with 30-hour battery",
        quantity: 45,
        price: 2999.99,
        status: "Available",
        condition: "New",
        upload_status: "published",
        created_at: "2024-02-10T09:15:00Z",
        category: { id: "1", name: "Electronics" },
        active_report_count: 0,
        favorites_count: 23
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440011",
        name: "Smart Watch Series 5",
        description: "Latest smart watch with health monitoring features",
        quantity: 25,
        price: 5999.99,
        status: "Available",
        condition: "New",
        upload_status: "published",
        created_at: "2024-02-15T14:20:00Z",
        category: { id: "1", name: "Electronics" },
        active_report_count: 1,
        favorites_count: 45
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440012",
        name: "Laptop Backpack",
        description: "Waterproof laptop backpack with USB charging port",
        quantity: 60,
        price: 1499.99,
        status: "Available",
        condition: "New",
        upload_status: "published",
        created_at: "2024-01-25T11:30:00Z",
        category: { id: "2", name: "Accessories" },
        active_report_count: 0,
        favorites_count: 12
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440013",
        name: "iPhone 15 Pro Max",
        description: "Latest Apple smartphone with dynamic island",
        quantity: 15,
        price: 75999.99,
        status: "Available",
        condition: "New",
        upload_status: "published",
        created_at: "2024-03-01T10:00:00Z",
        category: { id: "3", name: "Mobile Phones" },
        active_report_count: 0,
        favorites_count: 89
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440014",
        name: "Gaming Laptop RTX 4070",
        description: "High performance gaming laptop with latest GPU",
        quantity: 8,
        price: 89999.99,
        status: "Low Stock",
        condition: "New",
        upload_status: "published",
        created_at: "2024-02-28T16:45:00Z",
        category: { id: "4", name: "Computers" },
        active_report_count: 0,
        favorites_count: 34
    }
]

const placeholderCategories: Category[] = [
    { id: "all", name: "All Products" },
    { id: "1", name: "Electronics" },
    { id: "2", name: "Accessories" },
    { id: "3", name: "Mobile Phones" },
    { id: "4", name: "Computers" }
]

const placeholderReviews: Review[] = [
    {
        id: "1",
        customer: {
            customer: {
                id: "1",
                username: "customer1",
                email: "cust1@example.com",
                first_name: "Alice",
                last_name: "Smith",
                contact_number: "+639987654321"
            },
            product_limit: 10,
            current_product_count: 3
        },
        rating: 5,
        comment: "Great products and fast shipping!",
        created_at: "2024-03-15T10:30:00Z"
    },
    {
        id: "2",
        customer: {
            customer: {
                id: "2",
                username: "customer2",
                email: "cust2@example.com",
                first_name: "Bob",
                last_name: "Johnson",
                contact_number: "+639876543210"
            },
            product_limit: 10,
            current_product_count: 1
        },
        rating: 4,
        comment: "Good quality but shipping was delayed",
        created_at: "2024-03-10T14:20:00Z"
    }
]

const placeholderVouchers: Voucher[] = [
    {
        id: "1",
        name: "Summer Sale",
        code: "SUMMER20",
        discount_type: "percentage",
        value: 20,
        valid_until: "2024-08-31",
        is_active: true
    },
    {
        id: "2",
        name: "First Purchase",
        code: "WELCOME10",
        discount_type: "fixed",
        value: 100,
        valid_until: "2024-12-31",
        is_active: true
    }
]

const placeholderBoosts: Boost[] = [
    {
        id: "1",
        product: placeholderProducts[0],
        boost_plan: { id: "1", name: "Premium Boost", price: 299 },
        status: "active",
        start_date: "2024-03-01T00:00:00Z",
        end_date: "2024-03-31T23:59:59Z"
    }
]

const placeholderReports: Report[] = [
    {
        id: "1",
        reason: "inappropriate_content",
        description: "Product image contains inappropriate content",
        status: "pending",
        created_at: "2024-03-18T09:15:00Z"
    },
    {
        id: "2",
        reason: "misleading",
        description: "Product description is misleading",
        status: "resolved",
        created_at: "2024-02-28T14:30:00Z"
    }
]

// Product table columns - Responsive version
const productColumns: ColumnDef<Product>[] = [
    {
        accessorKey: "name",
        header: "Product Name",
        cell: ({ row }) => {
            const product = row.original
            return (
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">{product.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500 truncate">
                            {product.description}
                        </div>
                    </div>
                </div>
            )
        }
    },
    {
        accessorKey: "category.name",
        header: "Category",
        cell: ({ row }) => {
            const category = row.getValue("category.name") as string
            return (
                <div className="hidden sm:block">
                    <Badge variant="outline" className="text-xs">
                        {category}
                    </Badge>
                </div>
            )
        }
    },
    {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => {
            const price = parseFloat(row.getValue("price"))
            return (
                <div className="font-medium text-sm sm:text-base">
                    ₱{price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
            )
        }
    },
    {
        accessorKey: "quantity",
        header: "Stock",
        cell: ({ row }) => {
            const quantity = row.getValue("quantity") as number
            return (
                <div className="hidden md:block">
                    {quantity}
                    {quantity <= 10 && (
                        <span className="ml-1 text-xs text-red-500">Low</span>
                    )}
                </div>
            )
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            return (
                <div className="hidden lg:block">
                    <Badge variant={
                        status === "Available" ? "default" :
                        status === "Low Stock" ? "secondary" :
                        "destructive"
                    } className="text-xs">
                        {status}
                    </Badge>
                </div>
            )
        }
    },
    {
        accessorKey: "favorites_count",
        header: "Favorites",
        cell: ({ row }) => {
            const count = row.getValue("favorites_count") as number
            return (
                <div className="hidden xl:block">
                    <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span className="font-medium">{count}</span>
                    </div>
                </div>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const product = row.original
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>
                            Copy Product ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Product</DropdownMenuItem>
                        <DropdownMenuItem>View Reports</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    }
]

// Mobile product columns (simplified)
const mobileProductColumns: ColumnDef<Product>[] = [
    {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => {
            const product = row.original
            return (
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center">
                        <Package className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                                {product.category?.name}
                            </Badge>
                            <span className="text-xs font-medium">
                                ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            )
        }
    }
]

export default function ShopDetails({ loaderData }: { loaderData: LoaderData }) {
    const { user } = loaderData
    const [shop, setShop] = useState<Shop>(placeholderShop)
    const [allProducts, setAllProducts] = useState<Product[]>(placeholderProducts)
    const [categories, setCategories] = useState<Category[]>(placeholderCategories)
    const [reviews, setReviews] = useState<Review[]>(placeholderReviews)
    const [vouchers, setVouchers] = useState<Voucher[]>(placeholderVouchers)
    const [boosts, setBoosts] = useState<Boost[]>(placeholderBoosts)
    const [reports, setReports] = useState<Report[]>(placeholderReports)
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [activeAction, setActiveAction] = useState<string | null>(null)
    const [showDialog, setShowDialog] = useState(false)
    const [reason, setReason] = useState("")
    const [suspensionDays, setSuspensionDays] = useState(7)
    const [processing, setProcessing] = useState(false)
    const { toast } = useToast()

    // Filter products based on selected category
    const filteredProducts = selectedCategory === "all" 
        ? allProducts 
        : allProducts.filter(product => product.category?.id === selectedCategory)

    // Calculate statistics
    const avgRating = reviews.length > 0 
        ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
        : 0
    
    const totalProducts = allProducts.length
    const totalCategories = categories.length - 1 // exclude "all" category
    const activeReports = reports.filter(r => r.status === 'pending').length
    const totalFavorites = allProducts.reduce((sum, product) => sum + product.favorites_count, 0)

    // Calculate category distribution
    const categoryDistribution = categories
        .filter(cat => cat.id !== "all")
        .map(category => ({
            ...category,
            count: allProducts.filter(p => p.category?.id === category.id).length
        }))

    // Get current columns based on screen size
    const getColumns = () => {
        if (typeof window === 'undefined') return productColumns
        if (window.innerWidth < 768) return mobileProductColumns
        if (window.innerWidth < 1024) return productColumns.slice(0, 4) // Show fewer columns on tablet
        return productColumns
    }

    const [columns, setColumns] = useState(getColumns())

    // Determine available actions
    const getAvailableActions = () => {
        const actions = []
        
        if (shop.is_suspended) {
            actions.push({
                id: "unsuspend",
                label: "Unsuspend Shop",
                icon: CheckCircle,
                variant: "outline" as const,
            })
        } else {
            actions.push({
                id: "suspend",
                label: "Suspend Shop",
                icon: Ban,
                variant: "outline" as const,
            })
        }
        
        if (shop.verified) {
            actions.push({
                id: "unverify",
                label: "Remove Verification",
                icon: ShieldAlert,
                variant: "outline" as const,
            })
        } else {
            actions.push({
                id: "verify",
                label: "Verify Shop",
                icon: Shield,
                variant: "default" as const,
            })
        }
        
        actions.push({
            id: "delete",
            label: "Delete Shop",
            icon: Trash2,
            variant: "destructive" as const,
        })
        
        return actions
    }

    const availableActions = getAvailableActions()
    const currentAction = activeAction ? actionConfigs[activeAction as keyof typeof actionConfigs] : null

    const handleActionClick = (actionId: string) => {
        setActiveAction(actionId)
        setReason("")
        setSuspensionDays(7)
        setShowDialog(true)
    }

    const handleConfirm = async () => {
        if (!activeAction || !shop) return
        
        // Validate required reason
        if ((activeAction === 'suspend' || activeAction === 'delete') && !reason.trim()) {
            toast({
                title: "Validation Error",
                description: "Please provide a reason for this action",
                variant: "destructive",
            })
            return
        }
        
        setProcessing(true)
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            toast({
                title: "Success",
                description: `${currentAction?.confirmText} action completed successfully`,
                variant: "success",
            })
            
            // Update shop state based on action
            if (activeAction === 'suspend') {
                setShop(prev => ({ ...prev, is_suspended: true, status: 'Suspended' }))
            } else if (activeAction === 'unsuspend') {
                setShop(prev => ({ ...prev, is_suspended: false, status: 'Active' }))
            } else if (activeAction === 'verify') {
                setShop(prev => ({ ...prev, verified: true }))
            } else if (activeAction === 'unverify') {
                setShop(prev => ({ ...prev, verified: false }))
            }
            
        } catch (error: any) {
            console.error('Error executing action:', error)
            
            toast({
                title: "Error",
                description: "Failed to complete action. Please try again.",
                variant: "destructive",
            })
        } finally {
            setProcessing(false)
            setShowDialog(false)
            setActiveAction(null)
            setReason("")
            setSuspensionDays(7)
        }
    }

    const handleCancel = () => {
        if (processing) return
        setShowDialog(false)
        setActiveAction(null)
        setReason("")
        setSuspensionDays(7)
    }

    const renderDialogContent = () => {
        if (!currentAction || !shop) return null

        return (
            <>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">{currentAction.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {currentAction.description}
                        </p>
                    </div>
                    
                    {/* Shop info */}
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium">Shop: {shop.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={shop.verified ? "default" : "secondary"} className="text-xs">
                                {shop.verified ? "Verified" : "Unverified"}
                            </Badge>
                            <Badge variant={shop.is_suspended ? "destructive" : "default"} className="text-xs">
                                {shop.is_suspended ? "Suspended" : "Active"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {shop.followers_count.toLocaleString()} followers
                            </span>
                        </div>
                    </div>
                    
                    {/* Reason input for suspend and delete actions */}
                    {(activeAction === 'suspend' || activeAction === 'delete') && (
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="text-sm font-medium">
                                Reason for {activeAction === 'suspend' ? 'Suspension' : 'Deletion'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={`Please provide a reason for ${activeAction === 'suspend' ? 'suspending' : 'deleting'} this shop...`}
                                className="h-10"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                This reason will be recorded and may be shared with the shop owner.
                            </p>
                        </div>
                    )}
                    
                    {/* Suspension days for suspend action */}
                    {activeAction === 'suspend' && (
                        <div className="space-y-2">
                            <Label htmlFor="suspension-days" className="text-sm font-medium">
                                Suspension Duration
                            </Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="suspension-days"
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={suspensionDays}
                                    onChange={(e) => setSuspensionDays(Math.max(1, parseInt(e.target.value) || 7))}
                                    className="h-10 w-24"
                                />
                                <span className="text-sm text-muted-foreground">days</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                The shop will be automatically unsuspended after this period.
                            </p>
                        </div>
                    )}
                    
                    {/* Warning message for destructive actions */}
                    {currentAction.variant === "destructive" && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                            <p className="text-sm font-medium text-destructive flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                Warning: This action cannot be undone
                            </p>
                            {activeAction === 'delete' && (
                                <p className="text-xs text-destructive mt-1">
                                    All products, orders, and shop data will be permanently deleted.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </>
        )
    }

    useEffect(() => {
        const handleResize = () => {
            setColumns(getColumns())
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <UserProvider user={user}>
            <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                {/* Loading indicator */}
                {processing && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-xs sm:text-sm text-muted-foreground">Processing action...</p>
                        </div>
                    </div>
                )}

                {/* Responsive Header with Mobile Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Breadcrumb */}
                    <nav className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                        <a href="/admin" className="hover:text-primary hover:underline flex items-center gap-1">
                            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Admin</span>
                        </a>
                        <span>&gt;</span>
                        <a href="/admin/shops" className="hover:text-primary hover:underline">
                            Shops
                        </a>
                        <span>&gt;</span>
                        <span className="text-foreground font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[250px]">
                            {shop.name}
                        </span>
                    </nav>

                    {/* Mobile Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="ml-auto">
                                <Menu className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {availableActions.map((action, index) => (
                                <DropdownMenuItem
                                    key={index}
                                    onClick={() => handleActionClick(action.id)}
                                    className={`flex items-center gap-2 ${
                                        action.variant === "destructive" 
                                            ? "text-destructive focus:text-destructive" 
                                            : ""
                                    }`}
                                >
                                    <action.icon className="w-4 h-4" />
                                    {action.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    {/* Left Column - Shop Overview */}
                    <div className="space-y-3 sm:space-y-4">
                        <Card>
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 mx-auto sm:mx-0">
                                        <AvatarImage src={shop.shop_picture || undefined} />
                                        <AvatarFallback className="text-xl sm:text-2xl">
                                            <Store className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" />
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="flex-1 space-y-3 sm:space-y-4 text-center sm:text-left">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-2">
                                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">
                                                    {shop.name}
                                                </h1>
                                                <div className="flex flex-wrap justify-center sm:justify-start gap-1">
                                                    {shop.verified && (
                                                        <Badge className="gap-1 text-xs">
                                                            <Shield className="h-3 w-3" />
                                                            Verified
                                                        </Badge>
                                                    )}
                                                    <Badge variant={
                                                        shop.status === "Active" ? "default" : 
                                                        shop.status === "Suspended" ? "destructive" : 
                                                        "secondary"
                                                    } className="text-xs">
                                                        {shop.status}
                                                    </Badge>
                                                    {shop.is_suspended && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Suspended
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-sm sm:text-base">{shop.description}</p>
                                        </div>
                                        
                                        <Separator className="my-2 sm:my-4" />

                                        {/* Engagement Stats */}
                                        <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center sm:justify-start">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                                                star <= Math.round(avgRating)
                                                                    ? "fill-yellow-400 text-yellow-400"
                                                                    : "text-gray-300"
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs sm:text-sm text-muted-foreground">
                                                    {avgRating.toFixed(1)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                                                <span className="text-xs sm:text-sm text-muted-foreground">
                                                    {shop.favorites_count.toLocaleString()} favorites
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                                                <span className="text-xs sm:text-sm text-muted-foreground">
                                                    {shop.followers_count.toLocaleString()} followers
                                                </span>
                                            </div>
                                        </div>

                                        {/* Key Details */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    Location
                                                </div>
                                                <p className="font-medium text-sm sm:text-base truncate">
                                                    {shop.street}, {shop.barangay}, {shop.city}, {shop.province}
                                                </p>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                                                    <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    Contact
                                                </div>
                                                <p className="font-medium text-sm sm:text-base">{shop.contact_number}</p>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                                                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    Created
                                                </div>
                                                <p className="font-medium text-sm sm:text-base">
                                                    {new Date(shop.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                                                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    Total Sales
                                                </div>
                                                <p className="font-medium text-sm sm:text-base">
                                                    ₱{shop.total_sales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats - Responsive Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="overflow-hidden">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium text-gray-500">Products</p>
                                            <p className="text-xl sm:text-2xl font-bold">{totalProducts}</p>
                                        </div>
                                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                        </div>
                                    </div>
                                    {shop.customer && (
                                        <div className="mt-2 sm:mt-3">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Product Limit</span>
                                                <span>
                                                    {shop.customer.current_product_count}/{shop.customer.product_limit}
                                                </span>
                                            </div>
                                            <Progress 
                                                value={(shop.customer.current_product_count / shop.customer.product_limit) * 100}
                                                className="h-1 sm:h-2"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium text-gray-500">Categories</p>
                                            <p className="text-xl sm:text-2xl font-bold">{totalCategories}</p>
                                        </div>
                                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                            <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:mt-3">
                                        <p className="text-xs text-gray-500 mb-1">Most Popular</p>
                                        <p className="text-sm font-medium truncate">
                                            {categoryDistribution.sort((a, b) => b.count - a.count)[0]?.name}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium text-gray-500">Total Favorites</p>
                                            <p className="text-xl sm:text-2xl font-bold">{totalFavorites}</p>
                                        </div>
                                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                                            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:mt-3">
                                        <p className="text-xs text-gray-500 mb-1">Avg per Product</p>
                                        <p className="text-sm font-medium">
                                            {Math.round(totalFavorites / totalProducts)} favs
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium text-gray-500">Active Reports</p>
                                            <p className="text-xl sm:text-2xl font-bold">{activeReports}</p>
                                        </div>
                                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-red-100 flex items-center justify-center">
                                            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 sm:mt-2">{shop.active_report_count} shop reports</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column - Owner Info & Actions */}
                    <div className="space-y-4 sm:space-y-6">
                        {/* Owner Information */}
                        {shop.customer && (
                            <Card>
                                <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Shop Owner
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                                            <AvatarFallback>
                                                {shop.customer.customer.first_name?.[0]}
                                                {shop.customer.customer.last_name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm sm:text-base">
                                                {shop.customer.customer.first_name} {shop.customer.customer.last_name}
                                            </div>
                                            <div className="text-xs sm:text-sm text-gray-500">
                                                @{shop.customer.customer.username}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                                            <span className="text-gray-500">Email:</span>
                                            <span className="font-medium truncate">{shop.customer.customer.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                                            <span className="text-gray-500">Contact:</span>
                                            <span className="font-medium">{shop.customer.customer.contact_number}</span>
                                        </div>
                                    </div>

                                    <Separator />

                                    <Button variant="outline" size="sm" className="w-full">
                                        View Full Profile
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Shop Status Overview */}
                        <Card>
                            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                                    Shop Status Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/50">
                                        <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Verification</span>
                                        <Badge variant={shop.verified ? "default" : "secondary"}>
                                            {shop.verified ? "Verified" : "Unverified"}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/50">
                                        <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Status</span>
                                        <Badge variant={shop.status === "Active" ? "default" : "destructive"}>
                                            {shop.status}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/50">
                                        <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Followers</span>
                                        <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                                            <span className="font-medium text-base sm:text-lg">{shop.followers_count.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/50">
                                        <span className="text-xs sm:text-sm text-muted-foreground mb-2 text-center">Total Sales</span>
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                                            <span className="font-medium text-sm">₱{Math.round(shop.total_sales / 1000)}k</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Admin Actions - Desktop only */}
                        {/* {typeof window !== 'undefined' && window.innerWidth >= 1024 && availableActions.length > 0 && (
                            <Card>
                                <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                        <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Admin Actions
                                    </CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">
                                        Available actions based on shop status
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
                                    <div className="flex flex-col gap-2">
                                        {availableActions.map((action, index) => (
                                            <Button
                                                key={index}
                                                variant={action.variant}
                                                className="flex items-center justify-start gap-2 text-xs sm:text-sm w-full"
                                                onClick={() => handleActionClick(action.id)}
                                                disabled={processing}
                                                size="sm"
                                            >
                                                <action.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                {action.label}
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )} */}
                    </div>
                </div>

                {/* Products Section - Full Width */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
                        <div>
                            <CardTitle className="text-lg sm:text-xl">Products</CardTitle>
                            <CardDescription className="text-sm">
                                {filteredProducts.length} products in this shop
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            <span className="text-xs sm:text-sm">Add Product</span>
                        </Button>
                    </CardHeader>
                    <CardContent className="px-4 py-3 sm:px-6 sm:py-4 pt-0">
                        {/* Category Tabs - Responsive */}
                        <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
                            <ScrollArea className="w-full pb-2">
                                <TabsList className="inline-flex h-9 w-auto items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
                                    {categories.map((category) => (
                                        <TabsTrigger 
                                            key={category.id} 
                                            value={category.id}
                                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 sm:px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
                                        >
                                            <Tag className="h-2 w-2 sm:h-3 sm:w-3 mr-1 sm:mr-2" />
                                            <span className="truncate max-w-[60px] sm:max-w-none">{category.name}</span>
                                            {category.id !== "all" && (
                                                <Badge variant="secondary" className="ml-1 text-xs">
                                                    {allProducts.filter(p => p.category?.id === category.id).length}
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </ScrollArea>
                            
                            {categories.map((category) => (
                                <TabsContent key={category.id} value={category.id} className="mt-3 sm:mt-4">
                                    {filteredProducts.length > 0 ? (
                                        <div className="overflow-hidden">
                                            <DataTable columns={columns} data={filteredProducts} />
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 sm:py-8">
                                            <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
                                            <p className="text-gray-500 text-sm sm:text-base">No products in this category</p>
                                        </div>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Bottom Section - Tabs */}
                <Tabs defaultValue="reviews" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto min-h-[2.5rem]">
                        <TabsTrigger value="reviews" className="text-xs sm:text-sm py-2 px-2">
                            Reviews & Ratings
                        </TabsTrigger>
                        <TabsTrigger value="vouchers" className="text-xs sm:text-sm py-2 px-2">
                            Vouchers & Promotions
                        </TabsTrigger>
                        <TabsTrigger value="boosts" className="text-xs sm:text-sm py-2 px-2">
                            Active Boosts
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="text-xs sm:text-sm py-2 px-2">
                            Reports & Moderation
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="reviews" className="space-y-3 sm:space-y-4">
                        <Card>
                            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                <CardTitle className="text-base sm:text-lg">Customer Reviews</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    {reviews.length} total reviews • {avgRating.toFixed(1)} average rating
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                                {reviews.map((review) => (
                                    <div key={review.id} className="border-b pb-3 sm:pb-4 last:border-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-3 h-3 ${
                                                            star <= review.rating
                                                                ? "fill-yellow-400 text-yellow-400"
                                                                : "text-gray-300"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs sm:text-sm font-medium">
                                                {review.customer.customer.first_name} {review.customer.customer.last_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm">{review.comment || "No comment provided"}</p>
                                    </div>
                                ))}
                                {reviews.length === 0 && (
                                    <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                                        No reviews yet for this shop.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="vouchers" className="space-y-3 sm:space-y-4">
                        <Card>
                            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                                    Active Vouchers
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
                                <div className="space-y-3">
                                    {vouchers.filter(v => v.is_active).map((voucher) => (
                                        <div key={voucher.id} className="border rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-medium text-sm">{voucher.name}</div>
                                                <Badge variant="outline" className="text-xs">
                                                    {voucher.discount_type === 'percentage' ? `${voucher.value}%` : `₱${voucher.value}`}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Code: <code className="bg-gray-100 px-1 py-0.5 rounded">{voucher.code}</code>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Valid until: {new Date(voucher.valid_until).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                    {vouchers.filter(v => v.is_active).length === 0 && (
                                        <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                                            No active vouchers for this shop.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="boosts" className="space-y-3 sm:space-y-4">
                        <Card>
                            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                    Active Boosts
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
                                <div className="space-y-3">
                                    {boosts.length > 0 ? (
                                        boosts.map((boost) => (
                                            <div key={boost.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded bg-purple-100 flex items-center justify-center">
                                                        <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm sm:text-base">{boost.product.name}</div>
                                                        <div className="text-xs sm:text-sm text-gray-500">
                                                            Plan: {boost.boost_plan.name} • ₱{boost.boost_plan.price}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-4 ml-11 sm:ml-0">
                                                    <Badge variant={
                                                        boost.status === "active" ? "default" : 
                                                        boost.status === "expired" ? "secondary" : 
                                                        "outline"
                                                    } className="text-xs">
                                                        {boost.status}
                                                    </Badge>
                                                    <div className="text-xs sm:text-sm text-gray-500">
                                                        Ends: {new Date(boost.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                                            No active boosts for this shop.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-3 sm:space-y-4">
                        <Card>
                            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                    Reports & Moderation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">Active Reports</p>
                                        <p className={`font-medium text-sm sm:text-base ${activeReports > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {activeReports} active
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">Total Reports</p>
                                        <p className="font-medium text-sm sm:text-base">{reports.length} total</p>
                                    </div>
                                    <div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">Shop Reports</p>
                                        <p className="font-medium text-sm sm:text-base">{shop.active_report_count} active</p>
                                    </div>
                                </div>
                                
                                {reports.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs sm:text-sm font-medium">Recent Reports:</p>
                                        <div className="space-y-2">
                                            {reports.slice(0, 2).map((report) => (
                                                <div key={report.id} className="border rounded p-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="font-medium capitalize text-xs sm:text-sm">
                                                            {report.reason.replace('_', ' ')}
                                                        </div>
                                                        <Badge variant={
                                                            report.status === 'pending' ? 'secondary' :
                                                            report.status === 'resolved' ? 'default' :
                                                            'outline'
                                                        } className="text-xs">
                                                            {report.status}
                                                        </Badge>
                                                    </div>
                                                    {report.description && (
                                                        <p className="text-xs text-gray-600 line-clamp-2">{report.description}</p>
                                                    )}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {new Date(report.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                                        View All Reports
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                                        Moderate Shop
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Suspension History - Conditional */}
                {(shop.is_suspended || shop.suspension_reason) && (
                    <Card>
                        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                            <CardTitle className="flex items-center gap-2 text-red-600 text-sm sm:text-base">
                                <AlertCircle className="w-4 h-4 sm:w-5 sm:w-5" />
                                Suspension History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="space-y-3">
                                {shop.is_suspended && (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border border-red-200 rounded-lg bg-red-50 gap-3 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                                            <div>
                                                <div className="font-medium text-sm sm:text-base">Currently Suspended</div>
                                                {shop.suspension_reason && (
                                                    <div className="text-xs sm:text-sm text-gray-600">
                                                        Reason: {shop.suspension_reason}
                                                    </div>
                                                )}
                                                {shop.suspended_until && (
                                                    <div className="text-xs sm:text-sm text-gray-600">
                                                        Until: {new Date(shop.suspended_until).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="mt-2 sm:mt-0" onClick={() => handleActionClick('unsuspend')}>
                                            Lift Suspension
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Alert Dialog for Actions */}
                <AlertDialog open={showDialog} onOpenChange={!processing ? setShowDialog : undefined}>
                    <AlertDialogContent className="sm:max-w-[500px] max-w-[95vw]">
                        {renderDialogContent()}
                        <AlertDialogFooter className="mt-6 sm:flex-row flex-col gap-2">
                            <AlertDialogCancel 
                                onClick={handleCancel}
                                disabled={processing}
                                className="mt-0 sm:w-auto w-full order-2 sm:order-1"
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleConfirm}
                                className={
                                    `sm:w-auto w-full order-1 sm:order-2 ${
                                        currentAction?.variant === "destructive" 
                                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                                            : ""
                                    }`
                                }
                                disabled={processing || ((activeAction === 'suspend' || activeAction === 'delete') && !reason.trim())}
                            >
                                {processing ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    currentAction?.confirmText
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </UserProvider>
    )
}