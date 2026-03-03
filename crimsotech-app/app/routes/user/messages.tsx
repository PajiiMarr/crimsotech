import type { Route } from "./+types/messages"
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import AxiosInstance from '~/components/axios/Axios';

export function meta(): Route.MetaDescriptors {
    return [
        {
            title: "Messages",
        }
    ]
}

interface LoaderData {
    user: any;
}

export async function loader({ request, context}: Route.LoaderArgs): Promise<LoaderData> {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");

    let user = (context as any).user;
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    // Get session for authentication
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));

    return { user };
}

// Types
interface Message {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
    message_type: 'text' | 'image' | 'file';
    attachment_url?: string;
}

interface Conversation {
    id: string;
    participant_id: string;
    participant_name: string;
    participant_avatar?: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
    is_online?: boolean;
}

export default function Messages({ loaderData }: { loaderData: LoaderData }) {
    const { user } = loaderData;
    const navigate = useNavigate();
    
    // Get the user ID
    const userId = user?.user_id || user?.id;
    const userName = user?.username || user?.email || 'User';
    
    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showMobileList, setShowMobileList] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    
    const goBack = () => {
        navigate(-1); // Navigate to previous route
    };
    
    useEffect(() => {
        if (!userId) return;
        
        const connectWebSocket = () => {
            try {
                setConnectionError(null);
                setIsAuthenticated(false);
                
                // Use VITE_WEBSOCKET_URL from environment
                const WS_URL = import.meta.env.VITE_WEBSOCKET_URL;
                
                if (!WS_URL) {
                    console.error('VITE_WEBSOCKET_URL is not defined in environment');
                    setConnectionError('WebSocket URL not configured');
                    return;
                }
                
                // Ensure the URL ends with /ws/chat/
                const baseUrl = WS_URL.endsWith('/') ? WS_URL.slice(0, -1) : WS_URL;
                const wsUrl = `${baseUrl}/ws/chat/`;
                
                console.log('Connecting to WebSocket:', wsUrl);
                wsRef.current = new WebSocket(wsUrl);
                
                wsRef.current.onopen = () => {
                    console.log('WebSocket connected');
                    setIsConnected(true);
                    setConnectionError(null);
                    
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        const authMessage: any = {
                            type: 'authenticate',
                            user_id: userId,
                            username: userName
                        };
                        
                        if (selectedConversation) {
                            authMessage.conversation_id = selectedConversation;
                        }
                        
                        wsRef.current.send(JSON.stringify(authMessage));
                    }
                };
                
                wsRef.current.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'authenticated') {
                            console.log('WebSocket authenticated');
                            setIsAuthenticated(true);
                        }
                        
                        handleWebSocketMessage(data);
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                };
                
                wsRef.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setConnectionError('Connection failed');
                    setIsConnected(false);
                    setIsAuthenticated(false);
                };
                
                wsRef.current.onclose = (event) => {
                    console.log('WebSocket closed:', event.code, event.reason);
                    setIsConnected(false);
                    setIsAuthenticated(false);
                    
                    if (event.code === 1006) {
                        setConnectionError('Auth failed');
                    } else if (event.code !== 1000 && event.code !== 1001) {
                        setConnectionError('Reconnecting...');
                        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
                    }
                };
            } catch (error) {
                console.error('Connection error:', error);
            }
        };
        
        connectWebSocket();
        
        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [userId, selectedConversation]);
    
    // Load conversations
    useEffect(() => {
        if (!userId) return;
        loadConversations();
    }, [userId]);
    
    // Load messages when conversation changes
    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation);
            setShowMobileList(false);
        } else {
            setShowMobileList(true);
        }
    }, [selectedConversation]);
    
    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const loadConversations = async () => {
        try {
            const response = await AxiosInstance.get('/conversation/list/', {
                headers: { 'X-User-Id': userId }
            });
            setConversations(response.data);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };
    
    const loadMessages = async (conversationId: string) => {
        try {
            const response = await AxiosInstance.get(
                `/conversation/messages/${conversationId}/list/`,
                { headers: { 'X-User-Id': userId } }
            );
            setMessages(response.data);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };
    
    const handleWebSocketMessage = (data: any) => {
        switch (data.type) {
            case 'new_message':
                if (selectedConversation === data.conversation_id) {
                    const newMsg: Message = {
                        id: data.message_id,
                        sender_id: data.sender_id,
                        sender_name: data.sender_name,
                        content: data.content,
                        timestamp: data.timestamp,
                        status: data.status as 'sent' | 'delivered' | 'read',
                        message_type: 'text'
                    };
                    setMessages(prev => [...prev, newMsg]);
                    
                    if (data.sender_id !== userId && isAuthenticated) {
                        wsRef.current?.send(JSON.stringify({
                            type: 'read_receipt',
                            message_id: data.message_id
                        }));
                    }
                } else if (data.sender_id !== userId) {
                    setConversations(prev => 
                        prev.map(conv => 
                            conv.id === data.conversation_id 
                                ? { ...conv, unread_count: (conv.unread_count || 0) + 1, last_message: data.content }
                                : conv
                        )
                    );
                }
                break;
                
            case 'message_read':
                setMessages(prev =>
                    prev.map(msg => 
                        msg.id === data.message_id 
                            ? { ...msg, status: 'read' as const }
                            : msg
                    )
                );
                break;
                
            case 'typing':
                if (data.user_id !== userId && data.conversation_id === selectedConversation) {
                    setIsTyping(data.is_typing);
                    if (!data.is_typing) setTimeout(() => setIsTyping(false), 1000);
                }
                break;
                
            case 'conversation_history':
                const typedMessages: Message[] = data.messages.map((msg: any) => ({
                    ...msg,
                    status: msg.status as 'sent' | 'delivered' | 'read'
                }));
                setMessages(typedMessages);
                break;
        }
    };
    
    const sendMessage = () => {
        if (!newMessage.trim() || !selectedConversation || !wsRef.current) return;
        
        if (wsRef.current.readyState !== WebSocket.OPEN) {
            setConnectionError('WebSocket not connected');
            return;
        }
        
        if (!isAuthenticated) {
            setConnectionError('Waiting for authentication...');
            return;
        }
        
        const receiverId = conversations.find(c => c.id === selectedConversation)?.participant_id;
        if (!receiverId) return;
        
        try {
            wsRef.current.send(JSON.stringify({
                type: 'message',
                content: newMessage,
                receiver_id: receiverId,
                conversation_id: selectedConversation,
                message_type: 'text'
            }));
            
            const tempMessage: Message = {
                id: `temp-${Date.now()}`,
                sender_id: userId,
                sender_name: 'You',
                content: newMessage,
                timestamp: new Date().toISOString(),
                status: 'sent',
                message_type: 'text'
            };
            
            setMessages(prev => [...prev, tempMessage]);
            
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === selectedConversation
                        ? { ...conv, last_message: newMessage, last_message_time: new Date().toISOString() }
                        : conv
                )
            );
            
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };
    
    const handleTyping = () => {
        if (!wsRef.current || !selectedConversation || !isAuthenticated) return;
        if (wsRef.current.readyState !== WebSocket.OPEN) return;
        
        wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: true }));
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            wsRef.current?.send(JSON.stringify({ type: 'typing', is_typing: false }));
        }, 2000);
    };
    
    const searchUsers = async (term: string) => {
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        
        setIsLoadingUsers(true);
        try {
            const response = await AxiosInstance.get(`/conversation/search/?q=${term}`, {
                headers: { 'X-User-Id': userId }
            });
            setSearchResults(response.data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };
    
    const startNewConversation = async (otherUserId: string, username: string) => {
        try {
            const response = await AxiosInstance.post('/conversation/start/', 
                { user_id: otherUserId },
                { headers: { 'X-User-Id': userId } }
            );
            
            const newConv = {
                id: response.data.id,
                participant_id: otherUserId,
                participant_name: username,
                last_message: '',
                last_message_time: new Date().toISOString(),
                unread_count: 0
            };
            
            setConversations(prev => [newConv, ...prev]);
            setSelectedConversation(response.data.id);
            setShowUserSearch(false);
            setSearchTerm('');
            setSearchResults([]);
        } catch (error) {
            console.error('Failed to start conversation:', error);
        }
    };
    
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (days === 1) return 'Yesterday';
        if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };
    
    return (
        <UserProvider user={user}>
            <div className="h-[calc(100vh-4rem)] flex bg-orange-50">
                {/* Conversation List */}
                <div className={`${showMobileList ? 'block' : 'hidden'} md:block w-full md:w-80 border-r border-orange-200 bg-white`}>
                    <div className="p-4 border-b border-orange-200">
                        <div className="flex items-center gap-2 mb-4">
                            {/* Back Button */}
                            <button
                                onClick={goBack}
                                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                aria-label="Go back"
                            >
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <h2 className="text-xl font-semibold text-orange-900">Messages</h2>
                            <div className="flex-1"></div>
                            <button
                                onClick={() => setShowUserSearch(!showUserSearch)}
                                className="p-2 hover:bg-orange-100 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* User Search */}
                        {showUserSearch && (
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        searchUsers(e.target.value);
                                    }}
                                    placeholder="Search users..."
                                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    autoFocus
                                />
                                
                                {isLoadingUsers && (
                                    <div className="mt-2 text-sm text-orange-600">Searching...</div>
                                )}
                                
                                {searchResults.length > 0 && (
                                    <div className="mt-2 border border-orange-200 rounded-lg overflow-hidden">
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => startNewConversation(result.id, result.username)}
                                                className="w-full px-3 py-2 text-left hover:bg-orange-50 border-b border-orange-200 last:border-b-0 transition-colors"
                                            >
                                                <div className="font-medium text-orange-900">{result.username}</div>
                                                <div className="text-sm text-orange-600">{result.email}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Conversations */}
                    <div className="overflow-y-auto h-[calc(100vh-12rem)]">
                        {conversations.length === 0 ? (
                            <div className="p-8 text-center text-orange-400">
                                No conversations yet
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv.id)}
                                    className={`w-full p-4 text-left hover:bg-orange-50 border-b border-orange-100 transition-colors ${selectedConversation === conv.id ? 'bg-orange-100' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-medium text-orange-900 truncate">{conv.participant_name}</h3>
                                                <span className="text-xs text-orange-500">{formatTime(conv.last_message_time)}</span>
                                            </div>
                                            <p className="text-sm text-orange-700 truncate">{conv.last_message || 'No messages yet'}</p>
                                        </div>
                                        {conv.unread_count > 0 && (
                                            <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-2 py-1">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
                
                {/* Chat Area */}
                {selectedConversation ? (
                    <div className={`${!showMobileList ? 'block' : 'hidden'} md:block flex-1 flex flex-col bg-white`}>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-orange-200 flex items-center justify-between">
                            <div className="flex items-center">
                                <button
                                    onClick={() => setShowMobileList(true)}
                                    className="md:hidden mr-2 p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div>
                                    <h3 className="font-medium text-orange-900">
                                        {conversations.find(c => c.id === selectedConversation)?.participant_name}
                                    </h3>
                                    {isTyping && <p className="text-xs text-orange-500">Typing...</p>}
                                </div>
                            </div>
                        </div>
                        
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-orange-400">
                                    No messages yet
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%]`}>
                                            <div className={`rounded-lg px-4 py-2 ${
                                                msg.sender_id === userId 
                                                    ? 'bg-orange-500 text-white' 
                                                    : 'bg-orange-100 text-orange-900'
                                            }`}>
                                                <p className="text-sm break-words">{msg.content}</p>
                                            </div>
                                            <div className={`flex items-center mt-1 text-xs text-orange-500 ${msg.sender_id === userId ? 'justify-end' : ''}`}>
                                                <span>{formatTime(msg.timestamp)}</span>
                                                {msg.sender_id === userId && (
                                                    <span className="ml-2">
                                                        {msg.status === 'sent' && '✓'}
                                                        {msg.status === 'delivered' && '✓✓'}
                                                        {msg.status === 'read' && (
                                                            <span className="text-orange-500">✓✓</span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        {/* Input */}
                        <div className="p-4 border-t border-orange-200">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        // Handle file upload
                                    }}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                    disabled={!isAuthenticated}
                                >
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                </button>
                                
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder={!isAuthenticated ? "Authenticating..." : "Type a message..."}
                                    disabled={!isAuthenticated}
                                    className="flex-1 px-4 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-orange-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || !isAuthenticated}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center bg-white">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto text-orange-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <h3 className="text-lg font-medium text-orange-900 mb-2">No conversation selected</h3>
                            <p className="text-orange-500">Choose a conversation to start chatting</p>
                        </div>
                    </div>
                )}
            </div>
        </UserProvider>
    );
}