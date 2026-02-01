import type { Route } from './+types/dashboard'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider'
import { data } from 'react-router'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import DateRangeFilter from '~/components/ui/date-range-filter'
import { useState, useRef } from 'react'
import { 
  ShoppingCart, 
  Package, 
  RefreshCw, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Star,
  FileText,
  AlertTriangle,
  Bell,
  Eye,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import AxiosInstance from '~/components/axios/Axios'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: 'Seller | Dashboard',
    },
  ]
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import('~/middleware/registration.server')
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any)

  const { requireRole } = await import('~/middleware/role-require.server')
  const { fetchUserRole } = await import('~/middleware/role.server')

  let user = (context as any).user
  if (!user) {
    user = await fetchUserRole({ request, context })
  }

  await requireRole(request, context, ['isCustomer'])

  const { getSession } = await import('~/sessions.server')
  const session = await getSession(request.headers.get('Cookie'))
  const shopId = session.get('shopId')
  const userId = session.get('userId')
  
  // Default date range (last month)
  const defaultStartDate = new Date()
  defaultStartDate.setDate(defaultStartDate.getDate() - 30)
  const defaultEndDate = new Date()
  
  let dashboardData = null
  
  if (shopId) {
    try {
      const params = new URLSearchParams()
      params.append('shop_id', shopId)
      params.append('start_date', defaultStartDate.toISOString().split('T')[0])
      params.append('end_date', defaultEndDate.toISOString().split('T')[0])
      params.append('range_type', 'monthly')

      const response = await AxiosInstance.get(`/seller-dashboard/get_dashboard/?${params.toString()}`, {
        headers: {
          'X-User-Id': userId || '',
        }
      })

      if (response.data.success) {
        dashboardData = response.data
      } else {
        console.error('API returned success:false', response.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data in loader:', error)
    }
  }

  return data({
    user,
    shopId,
    dashboardData: dashboardData && dashboardData.success ? dashboardData : null,
  })
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
      </div>
    </div>
  )
}

function DashboardContent({ user, shopId, dashboardData: initialDashboardData }: { 
  user: any; 
  shopId: string | undefined; 
  dashboardData: any;
}) {
  const [dashboardData, setDashboardData] = useState(initialDashboardData)
  const [isLoading, setIsLoading] = useState(false)
  
  // Track if this is the first call from DateRangeFilter's useEffect
  const isFirstCall = useRef(true)

  const ORDER_STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Clock },
    shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
    refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
  }

  const REFUND_STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    negotiation: { label: 'Negotiation', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
    dispute: { label: 'Dispute', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle },
  }

  const fetchDashboardData = async (start: Date, end: Date, rangeType: string) => {
    if (!shopId) return
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('shop_id', shopId)
      params.append('start_date', start.toISOString().split('T')[0])
      params.append('end_date', end.toISOString().split('T')[0])
      params.append('range_type', rangeType)

      const response = await AxiosInstance.get(`/seller-dashboard/get_dashboard/?${params.toString()}`)

      if (response.data.success) {
        setDashboardData(response.data)
      } else {
        console.error('Failed to fetch dashboard data')
        setDashboardData(null)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setDashboardData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateRangeChange = (range: { start: Date; end: Date; rangeType: string }) => {
    // Skip the first call from DateRangeFilter's useEffect on mount
    if (isFirstCall.current) {
      console.log('⏭️ Skipping first DateRangeFilter call - using loader data')
      isFirstCall.current = false
      return
    }
    
    console.log('📅 Date range changed, fetching new data:', range)
    fetchDashboardData(range.start, range.end, range.rangeType)
  }

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A'
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    if (isNaN(date.getTime())) return 'Invalid date'
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | Date) => {
    if (!dateString) return 'N/A'
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    if (isNaN(date.getTime())) return 'Invalid date'
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const StatCard = ({ title, value, change, icon: Icon, trend, description, loading = false }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-20 bg-muted rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {!loading && change && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{change}</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
    <div className={`bg-muted rounded animate-pulse ${className}`} />
  )

  if (!shopId) {
    return (
      <section className="w-full p-6">
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 font-medium">No shop selected. Please select a shop first to view dashboard.</p>
          <Button asChild className="mt-2">
            <Link to="/seller/shops">Select a Shop</Link>
          </Button>
        </div>
      </section>
    )
  }

  const summary = dashboardData?.summary || {}
  const latestOrders = Array.isArray(dashboardData?.latest_orders) ? dashboardData.latest_orders : []
  const lowStock = Array.isArray(dashboardData?.low_stock) ? dashboardData.low_stock : []
  const refunds = dashboardData?.refunds || { latest: [] }
  const shopPerformance = dashboardData?.shop_performance || {}
  const reports = dashboardData?.reports || { latest_notifications: [] }
  const dateRangeInfo = dashboardData?.date_range || {}

  return (
    <section className="w-full">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Seller Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {dateRangeInfo.start_date && dateRangeInfo.end_date ? (
                <>
                  Showing: {formatDate(dateRangeInfo.start_date)} - {formatDate(dateRangeInfo.end_date)}
                </>
              ) : (
                'Showing: Last 30 days'
              )}
            </p>
          </div>
        </div>
        
        <DateRangeFilter 
          onDateRangeChange={handleDateRangeChange}
          isLoading={isLoading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Period Sales" 
            value={isLoading ? "..." : formatCurrency(summary.period_sales || 0)} 
            change={summary.sales_change !== undefined ? `${summary.sales_change >= 0 ? '+' : ''}${summary.sales_change}%` : undefined} 
            trend={(summary.sales_change || 0) >= 0 ? "up" : "down"} 
            icon={DollarSign}
            description="Sales in selected period"
            loading={isLoading}
          />
          <StatCard 
            title="Period Orders" 
            value={isLoading ? "..." : (summary.period_orders || 0).toString()} 
            change={summary.orders_change !== undefined ? `${summary.orders_change >= 0 ? '+' : ''}${summary.orders_change}%` : undefined} 
            trend={(summary.orders_change || 0) >= 0 ? "up" : "down"} 
            icon={ShoppingCart}
            description="Orders in selected period"
            loading={isLoading}
          />
          <StatCard 
            title="Low Stock" 
            value={isLoading ? "..." : (summary.low_stock_count || 0).toString()} 
            change={summary.low_stock_change !== undefined ? `${summary.low_stock_change >= 0 ? '+' : ''}${summary.low_stock_change} more` : undefined} 
            trend="down" 
            icon={Package}
            description="Products & SKUs needing restock"
            loading={isLoading}
          />
          <StatCard 
            title="Refund Requests" 
            value={isLoading ? "..." : (summary.refund_requests || 0).toString()} 
            change={summary.refund_change !== undefined ? `${summary.refund_change >= 0 ? '+' : ''}${summary.refund_change} new` : undefined} 
            trend="down" 
            icon={RefreshCw}
            description="Pending/negotiation/dispute"
            loading={isLoading}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Latest Orders</CardTitle>
              <CardDescription>Most recent 5 orders</CardDescription>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
                <Badge key={status} variant="outline" className={`cursor-pointer hover:bg-gray-100 text-xs ${config.color}`}>
                  {config.label}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <LoadingSkeleton key={i} className="h-12" />
                ))}
              </div>
            ) : latestOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {dashboardData ? 'No orders found in this period' : 'Unable to load orders data'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Order ID</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Customer</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Status</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Amount</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestOrders.slice(0, 5).map((order: any) => {
                        const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG] || ORDER_STATUS_CONFIG.pending
                        return (
                          <tr key={order.id || order.order_id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-3 font-medium text-sm">
                              <Link to={`/seller/orders/${order.order_id || order.id}`} className="text-blue-600 hover:text-blue-800">
                                {order.order_id ? order.order_id.substring(0, 8) + '...' : 'ORD-' + (order.id || '').substring(0, 4)}
                              </Link>
                            </td>
                            <td className="py-3 px-3 text-sm">
                              {order.customer_name || order.customer_email || order.username || 'N/A'}
                            </td>
                            <td className="py-3 px-3">
                              <Badge className={`${statusConfig.color} capitalize text-xs flex items-center gap-1 w-fit`}>
                                <statusConfig.icon className="w-3 h-3" />
                                {statusConfig.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 font-medium text-sm">
                              {formatCurrency(order.total_amount || 0)}
                            </td>
                            <td className="py-3 px-3 text-gray-500 text-sm">
                              {formatDateTime(order.created_at || new Date())}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-center">
                  <Link to="/seller/orders" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    View all orders →
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Product Health</CardTitle>
                <CardDescription>Low stock & draft products</CardDescription>
              </div>
              <Badge variant="destructive" className="ml-2">
                {isLoading ? '...' : lowStock.length} items low
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <LoadingSkeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : lowStock.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {dashboardData ? 'No low stock items' : 'Unable to load low stock data'}
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Low Stock (Top 5)</h4>
                    {lowStock.slice(0, 5).map((item: any, index: number) => (
                      <div key={item.id || index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-sm">{item.product_name || 'Unnamed Product'}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Quantity: {item.quantity || 0}</span>
                            {item.critical_stock && (
                              <>
                                <span>•</span>
                                <span>Critical: {item.critical_stock}</span>
                              </>
                            )}
                            {item.sku_code && (
                              <>
                                <span>•</span>
                                <span>SKU: {item.sku_code}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/seller/products/${item.product_id || item.id}/edit`}>
                            <Package className="w-3 h-3 mr-1" />
                            Restock
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium">Draft Products:</span>
                    </div>
                    <span className="font-bold">{summary.draft_count || 0}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Refund & Dispute Alerts</CardTitle>
                <CardDescription>Critical alerts for sellers</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Badge variant="outline" className="bg-yellow-50">
                  Pending: {isLoading ? '...' : refunds.pending_count || 0}
                </Badge>
                <Badge variant="outline" className="bg-orange-50">
                  Disputes: {isLoading ? '...' : refunds.disputes_count || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <LoadingSkeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : !refunds.latest || refunds.latest.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {dashboardData ? 'No refund requests' : 'Unable to load refund data'}
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Latest Refund Requests</h4>
                    {refunds.latest.slice(0, 3).map((refund: any, index: number) => {
                      const statusConfig = REFUND_STATUS_CONFIG[refund.status as keyof typeof REFUND_STATUS_CONFIG] || REFUND_STATUS_CONFIG.pending
                      return (
                        <div key={refund.id || index} className="p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm line-clamp-1">{refund.reason || 'No reason provided'}</p>
                              <p className="text-xs text-gray-500">
                                Order: {(refund.order_id || '').substring(0, 8)}... • Amount: {formatCurrency(refund.requested_amount || refund.total_refund_amount || 0)}
                              </p>
                            </div>
                            <Badge className={`${statusConfig.color} capitalize text-xs flex items-center gap-1`}>
                              <statusConfig.icon className="w-3 h-3" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          {refund.customer_note && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">"{refund.customer_note}"</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Requested: {formatDateTime(refund.requested_at || new Date())}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between items-center">
                    <Link to="/seller/refunds" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Manage all refunds →
                    </Link>
                    {(refunds.total_count || refunds.latest.length) > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{(refunds.total_count || refunds.latest.length) - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shop Performance</CardTitle>
              <CardDescription>Simple numbers only</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <LoadingSkeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : !dashboardData ? (
                <div className="text-center py-8 text-muted-foreground">
                  Unable to load shop performance data
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold flex items-center justify-center gap-1">
                      {(shopPerformance.average_rating || 0).toFixed(1)} 
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    </div>
                    <p className="text-sm text-gray-500">Average Rating</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on {shopPerformance.total_reviews || 0} reviews
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{shopPerformance.total_reviews || 0}</div>
                    <p className="text-sm text-gray-500">Total Reviews</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last 30 days: {shopPerformance.recent_reviews || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{shopPerformance.total_followers || 0}</div>
                    <p className="text-sm text-gray-500">Total Followers</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      New followers: {shopPerformance.new_followers || 0}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{shopPerformance.total_products || 0}</div>
                    <p className="text-sm text-gray-500">Total Products</p>
                    <div className="flex justify-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>Active: {shopPerformance.active_products || 0}</span>
                      <span>•</span>
                      <span>Draft: {shopPerformance.draft_products || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Reports & Notifications</CardTitle>
                  <CardDescription>Urgent items only</CardDescription>
                </div>
                <Badge variant="outline" className="bg-red-50">
                  Active Reports: {isLoading ? '...' : reports.active_count || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <LoadingSkeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : !dashboardData ? (
                <div className="text-center py-8 text-muted-foreground">
                  Unable to load reports data
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    <div className={`p-3 ${(reports.active_count || 0) > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'} rounded-lg mb-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${(reports.active_count || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                          <span className="font-medium text-sm">Active Reports Against Shop:</span>
                        </div>
                        <span className={`font-bold ${(reports.active_count || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {reports.active_count || 0}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: pending / under_review • Total reports: {reports.total_count || 0}
                      </p>
                    </div>
                    
                    <h4 className="font-medium text-sm text-muted-foreground">Latest Notifications</h4>
                    {(!reports.latest_notifications || reports.latest_notifications.length === 0) ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No new notifications
                      </div>
                    ) : (
                      reports.latest_notifications.slice(0, 3).map((notification: any, index: number) => (
                        <div key={notification.id || index} className="p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Bell className={`w-3 h-3 ${
                                  notification.type === 'success' ? 'text-green-600' :
                                  notification.type === 'warning' ? 'text-yellow-600' :
                                  notification.type === 'error' ? 'text-red-600' : 'text-blue-600'
                                }`} />
                                <p className="font-medium text-sm">{notification.title || 'Notification'}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{notification.message || ''}</p>
                            </div>
                            <span className="text-xs text-gray-400">{notification.time || 'Recently'}</span>
                          </div>
                          {!notification.is_read && (
                            <div className="inline-flex items-center gap-1 mt-2">
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              <span className="text-xs text-blue-600">Unread</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <Link to="/seller/reports" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View all reports →
                    </Link>
                    <Link to="/seller/notifications" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      All notifications →
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
            <CardDescription>Current filter settings and data coverage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Date Range</p>
                <p className="font-medium">
                  {dateRangeInfo.start_date ? formatDate(dateRangeInfo.start_date) : 'N/A'} 
                  {' → '} 
                  {dateRangeInfo.end_date ? formatDate(dateRangeInfo.end_date) : 'N/A'}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">View Type</p>
                <p className="font-medium capitalize">{dateRangeInfo.range_type || 'monthly'} view</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="font-medium">
                  {summary.period_orders || 0} orders in period
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export default function SellerDashboard({ loaderData }: Route.ComponentProps) {
  return (
    <UserProvider user={loaderData.user}>
      <SellerSidebarLayout>
        <DashboardContent 
          user={loaderData.user} 
          shopId={loaderData.shopId} 
          dashboardData={loaderData.dashboardData}
        />
      </SellerSidebarLayout>
    </UserProvider>
  )
}