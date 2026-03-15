// app/routes/notifications.tsx
import type { Route } from "./+types/notifications"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { Bell, CheckCheck, X, Loader2 } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router";

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Notifications",
        }
    ]
}

interface LoaderData {
    user: any;
}

export async function loader({ request, context }: Route.LoaderArgs): Promise<LoaderData> {
    const { fetchUserRole } = await import("~/middleware/role.server");
    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    return { user };
}

interface Notification {
    notification_id: string;
    title: string;
    message: string;
    notification_type: string;
    created_at: string;
    is_read: boolean;
    data?: any;
}

export default function Notifications({ loaderData }: { loaderData: LoaderData }) {
    const { user } = loaderData;

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const userId = user?.user_id || user?.id;

    const connectWebSocket = useCallback(() => {
        if (!userId) return;

        try {
            setConnectionError(null);
            setIsAuthenticated(false);

            const WS_URL = import.meta.env.VITE_WEBSOCKET_URL;

            if (!WS_URL) {
                console.error('VITE_WEBSOCKET_URL is not defined in environment');
                setConnectionError('WebSocket URL not configured');
                setIsLoading(false);
                return;
            }

            const baseUrl = WS_URL.endsWith('/') ? WS_URL.slice(0, -1) : WS_URL;
            const wsUrl = `${baseUrl}/ws/notifications/`;

            console.log('Connecting to notifications WebSocket:', wsUrl);
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setConnectionError(null);

                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'authenticate',
                        user_id: userId
                    }));
                }
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'authenticated':
                            console.log('WebSocket authenticated');
                            setIsAuthenticated(true);
                            setIsLoading(false);
                            if (data.notifications) {
                                setNotifications(data.notifications);
                            }
                            if (data.unread_count !== undefined) {
                                setUnreadCount(data.unread_count);
                            }
                            break;

                        case 'new_notification':
                            console.log('New notification received:', data);
                            setNotifications(prev => [{
                                notification_id: data.notification_id,
                                title: data.title || 'New Notification',
                                message: data.message || '',
                                notification_type: data.notification_type || 'info',
                                created_at: data.created_at || new Date().toISOString(),
                                is_read: false,
                                data: data.data || {}
                            }, ...prev]);
                            setUnreadCount(prev => prev + 1);
                            break;

                        case 'unread_count':
                            console.log('Unread count updated:', data.count);
                            setUnreadCount(data.count);
                            break;

                        case 'marked_read':
                            console.log('Marked as read:', data.notification_id);
                            setNotifications(prev =>
                                prev.map(n =>
                                    n.notification_id === data.notification_id
                                        ? { ...n, is_read: true }
                                        : n
                                )
                            );
                            if (data.unread_count !== undefined) {
                                setUnreadCount(data.unread_count);
                            }
                            break;

                        case 'marked_all_read':
                            console.log('Marked all as read');
                            setNotifications(prev =>
                                prev.map(n => ({ ...n, is_read: true }))
                            );
                            setUnreadCount(0);
                            break;

                        case 'error':
                            console.error('WebSocket error message:', data.message);
                            setConnectionError(data.message);
                            break;

                        default:
                            console.log('Unknown message type:', data.type);
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionError('Connection failed');
                setIsConnected(false);
                setIsAuthenticated(false);
                setIsLoading(false);
            };

            wsRef.current.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setIsConnected(false);
                setIsAuthenticated(false);

                if (event.code === 1006 || event.code === 1001) {
                    console.log('Attempting to reconnect in 3 seconds...');
                    setConnectionError('Reconnecting...');

                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket();
                    }, 3000);
                }
            };

        } catch (error) {
            console.error('Connection error:', error);
            setConnectionError('Failed to connect');
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket]);

    const markAsRead = (notificationId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticated) {
            wsRef.current.send(JSON.stringify({
                type: 'mark_read',
                notification_id: notificationId
            }));
        } else {
            console.warn('WebSocket not ready');
            setConnectionError('Cannot mark as read: WebSocket disconnected');
        }
    };

    const markAllAsRead = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticated) {
            wsRef.current.send(JSON.stringify({
                type: 'mark_all_read'
            }));
        } else {
            console.warn('WebSocket not ready');
            setConnectionError('Cannot mark all as read: WebSocket disconnected');
        }
    };

    const getNotificationLink = (notification: Notification): string => {
        if (!notification.data) return '#';

        const isAdmin = user?.isAdmin === true;
        const isModerator = user?.isModerator === true;
        const isSeller = user?.isSeller === true;

        switch (notification.notification_type) {
            case 'order_confirmation':
            case 'order_update':
            case 'order_status_change':
            case 'new_order':
                if (isAdmin) return `/admin/orders/${notification.data.order_id}`;
                if (isModerator) return `/moderator/orders/${notification.data.order_id}`;
                if (isSeller) return `/seller/seller-order-list/${notification.data.order_id}`;
                return `/view-order/${notification.data.order_id}`;

            case 'order_successful':
                return `/order-successful/${notification.data.order_id}`;

            case 'order_tracking':
                return `/track-order/${notification.data.order_id}`;

            case 'new_message':
                return `/messages?conversation=${notification.data.conversation_id}`;

            case 'product_published':
            case 'product_removal':
            case 'product_restoration':
            case 'product_suspension':
            case 'product_unsuspension':
                if (isAdmin) return `/admin/products/${notification.data.product_id}`;
                if (isModerator) return `/moderator/products/${notification.data.product_id}`;
                if (isSeller) return `/seller/seller-product/${notification.data.product_id}`;
                return `/product/${notification.data.product_id}`;

            case 'shop_created':
            case 'shop_updated':
            case 'shop_suspended':
            case 'shop_verified':
                if (isAdmin) return `/admin/shops/${notification.data.shop_id}`;
                if (isModerator) return `/moderator/shops/${notification.data.shop_id}`;
                return `/shop/${notification.data.shop_id}`;

            case 'refund_requested':
            case 'refund_approved':
            case 'refund_rejected':
            case 'return_requested':
            case 'return_approved':
            case 'return_rejected':
                if (isAdmin) return `/admin/view-refund-details/${notification.data.refundId}`;
                if (isSeller) return `/seller/view-refund-details/${notification.data.refundId}`;
                return `/view-return-refund/${notification.data.refundId}`;

            case 'dispute_filed':
            case 'dispute_resolved':
                if (isAdmin) return `/admin/dispute/${notification.data.disputeId}`;
                return `/file-dispute/${notification.data.refundId}`;

            case 'new_review':
            case 'review_response':
                return `/rate/${notification.data.orderId}/${notification.data.productId}`;

            case 'boost_approved':
            case 'boost_rejected':
            case 'boost_expiring':
            case 'boost_activated':
                if (isAdmin) return `/admin/boosting/${notification.data.boost_id}`;
                if (isModerator) return `/moderator/boosting/${notification.data.boost_id}`;
                if (isSeller) return `/seller/seller-boosts/${notification.data.boost_plan_id}`;
                return '#';

            case 'payment_success':
            case 'payment_failed':
                return `/payment?order=${notification.data.order_id}`;

            case 'voucher_created':
            case 'voucher_expiring':
            case 'voucher_redeemed':
                if (isAdmin) return '/admin/vouchers';
                if (isSeller) return '/seller/seller-vouchers';
                return '#';

            case 'new_delivery':
            case 'delivery_completed':
            case 'delivery_failed':
                return `/rider/delivery/${notification.data.delivery_id}/add-proof`;

            case 'profile_updated':
            case 'account_verified':
            case 'password_changed':
                return '/profile';

            case 'gift_received':
            case 'gift_sent':
                if (isSeller) return '/seller/gift';
                return '/comgift';

            case 'trade_request':
            case 'trade_accepted':
            case 'trade_declined':
                return '/trade';

            case 'subscription_activated':
            case 'subscription_expiring':
            case 'subscription_cancelled':
                return '/subscription-plan';

            default:
                return '#';
        }
    };

    const handleMarkAsRead = (e: React.MouseEvent, notificationId: string) => {
        e.preventDefault();
        e.stopPropagation();
        markAsRead(notificationId);
    };

    const formatTime = (timestamp: string) => {
        if (!timestamp) return 'Unknown time';

        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;

            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Invalid date';
        }
    };

    const getNotificationIcon = (type: string | undefined) => {
        const safeType = type || 'info';

        switch (safeType) {
            case 'order_confirmation':
            case 'order_update':
            case 'order_status_change':
            case 'new_order':
            case 'order_successful':
            case 'order_tracking':
                return '🛍️';
            case 'new_message':
                return '💬';
            case 'product_published':
                return '📦';
            case 'product_removal':
                return '❌';
            case 'product_restoration':
                return '🔄';
            case 'product_suspension':
                return '⚠️';
            case 'product_unsuspension':
                return '✅';
            case 'shop_created':
            case 'shop_updated':
            case 'shop_verified':
                return '🏪';
            case 'shop_suspended':
                return '🚫';
            case 'refund_requested':
            case 'refund_approved':
            case 'refund_rejected':
            case 'return_requested':
            case 'return_approved':
            case 'return_rejected':
                return '💰';
            case 'dispute_filed':
            case 'dispute_resolved':
                return '⚖️';
            case 'new_review':
            case 'review_response':
                return '⭐';
            case 'boost_approved':
            case 'boost_activated':
                return '🚀';
            case 'boost_rejected':
                return '📉';
            case 'boost_expiring':
                return '⏰';
            case 'payment_success':
                return '💳';
            case 'payment_failed':
                return '❌';
            case 'voucher_created':
            case 'voucher_redeemed':
                return '🎫';
            case 'voucher_expiring':
                return '⏳';
            case 'new_delivery':
                return '🚚';
            case 'delivery_completed':
                return '✅';
            case 'delivery_failed':
                return '❌';
            case 'profile_updated':
            case 'account_verified':
                return '👤';
            case 'password_changed':
                return '🔒';
            case 'gift_received':
            case 'gift_sent':
                return '🎁';
            case 'trade_request':
            case 'trade_accepted':
            case 'trade_declined':
                return '🤝';
            case 'subscription_activated':
                return '✨';
            case 'subscription_expiring':
                return '⚠️';
            case 'subscription_cancelled':
                return '🚫';
            case 'info':
                return 'ℹ️';
            case 'warning':
                return '⚠️';
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            default:
                return '🔔';
        }
    };

    const getNotificationTypeDisplay = (type: string | undefined) => {
        if (!type) return 'notification';
        return type.replace(/_/g, ' ');
    };

    if (isLoading) {
        return (
            <UserProvider user={user}>
                <SidebarLayout>
                    <div className="max-w-4xl mx-auto p-6">
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading notifications...</h3>
                        </div>
                    </div>
                </SidebarLayout>
            </UserProvider>
        );
    }

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="max-w-4xl mx-auto p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                            {unreadCount > 0 && (
                                <span className="bg-orange-500 text-white text-sm rounded-full px-2.5 py-1">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {connectionError ? (
                                <span className="text-sm text-red-600 flex items-center gap-1">
                                    <X className="w-4 h-4" />
                                    {connectionError}
                                </span>
                            ) : !isConnected ? (
                                <span className="text-sm text-yellow-600 flex items-center gap-1">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Connecting...
                                </span>
                            ) : !isAuthenticated ? (
                                <span className="text-sm text-yellow-600 flex items-center gap-1">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Authenticating...
                                </span>
                            ) : null}

                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-800 font-medium px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                                    disabled={!isAuthenticated}
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    Mark all as read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications list */}
                    {notifications.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                            <p className="text-gray-600">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm divide-y">
                            {notifications.map((notification) => {
                                const linkTo = getNotificationLink(notification);
                                const isClickable = linkTo !== '#';

                                const content = (
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div className="text-2xl">
                                            {getNotificationIcon(notification.notification_type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                        {notification.title || 'Notification'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mt-1 break-words">
                                                        {notification.message || 'No message'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                    {!notification.is_read && (
                                                        <button
                                                            onClick={(e) => handleMarkAsRead(e, notification.notification_id)}
                                                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                                            title="Mark as read"
                                                        >
                                                            <CheckCheck className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Type badge */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-400">
                                                    Type: {getNotificationTypeDisplay(notification.notification_type)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Unread dot */}
                                        {!notification.is_read && (
                                            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                                        )}
                                    </div>
                                );

                                return isClickable ? (
                                    <Link
                                        key={notification.notification_id}
                                        to={linkTo}
                                        onClick={() => {
                                            if (!notification.is_read) {
                                                markAsRead(notification.notification_id);
                                            }
                                        }}
                                        className={`block p-4 hover:bg-gray-50 transition-colors relative ${!notification.is_read ? 'bg-orange-50/50' : ''}`}
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <div
                                        key={notification.notification_id}
                                        className={`p-4 relative ${!notification.is_read ? 'bg-orange-50/50' : ''}`}
                                    >
                                        {content}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </SidebarLayout>
        </UserProvider>
    );
}