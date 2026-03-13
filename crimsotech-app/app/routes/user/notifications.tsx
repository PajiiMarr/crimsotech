// app/routes/notifications.tsx
import type { Route } from "./+types/notifications"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Notification",
        }
    ]
}

interface LoaderData {
    user: any;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    return { user };
}

export default function Notifications({ loaderData}: { loaderData: LoaderData }){
    const { user } = loaderData;
    const [notifications, setNotifications] = useState<any[]>([]);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        if (!user) return;
        
        const wsUrl = `${import.meta.env.VITE_WEBSOCKET_URL}/ws/notifications/`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            ws.send(JSON.stringify({
                type: 'authenticate',
                user_id: user.user_id || user.id
            }));
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'authenticated') {
                    console.log('WebSocket authenticated');
                } else if (data.type === 'new_notification') {
                    setNotifications(prev => [data, ...prev]);
                } else if (data.type === 'conversation_history' && data.notifications) {
                    setNotifications(data.notifications);
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };
        
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setSocket(null);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        setSocket(ws);
        
        return () => {
            ws.close();
        };
    }, [user]);

    const markAsRead = (notificationId: string) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'mark_read',
                notification_id: notificationId
            }));
            
            setNotifications(prev => 
                prev.map(n => 
                    n.notification_id === notificationId 
                        ? { ...n, is_read: true } 
                        : n
                )
            );
        }
    };

    const markAllAsRead = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'mark_all_read'
            }));
            
            setNotifications(prev => 
                prev.map(n => ({ ...n, is_read: true }))
            );
        }
    };

    return (
        <UserProvider user={user}>
            <SidebarLayout>
                <div className="max-w-4xl mx-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                        {notifications.some(n => !n.is_read) && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    
                    {notifications.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                            <p className="text-gray-600">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.notification_id}
                                    onClick={() => markAsRead(notification.notification_id)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                                        !notification.is_read ? 'bg-blue-50/50' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className={`font-medium ${
                                                    !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                                                }`}>
                                                    {notification.title}
                                                </h3>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{notification.message}</p>
                                            <span className="text-xs text-gray-400 mt-2 inline-block">
                                                Type: {notification.notification_type}
                                            </span>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SidebarLayout>
        </UserProvider>
    )
}