import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';

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

const wsUrlFromApiBase = (apiBaseUrl?: string): string | null => {
  if (!apiBaseUrl) return null;
  const trimmed = apiBaseUrl.trim();
  if (!trimmed) return null;

  const noApiSuffix = trimmed.replace(/\/api\/?$/i, '');
  if (noApiSuffix.startsWith('https://')) return noApiSuffix.replace(/^https:\/\//, 'wss://');
  if (noApiSuffix.startsWith('http://')) return noApiSuffix.replace(/^http:\/\//, 'ws://');
  return null;
};

const formatTime = (value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function CustomerMessagesPage() {
  const params = useLocalSearchParams<{ shopId?: string }>();
  const { userId, username } = useAuth();
  const flatListRef = useRef<FlatList<Message>>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  const wsBaseUrl = useMemo(() => {
    const envWs = process.env.EXPO_PUBLIC_WEBSOCKET_URL;
    if (envWs && envWs.trim()) return envWs.trim().replace(/\/$/, '');
    return wsUrlFromApiBase(process.env.EXPO_PUBLIC_API_URL) || wsUrlFromApiBase(AxiosInstance.defaults.baseURL);
  }, []);

  const selectedConversationData = useMemo(
    () => conversations.find((c) => c.id === selectedConversation) || null,
    [conversations, selectedConversation]
  );

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.participant_name.toLowerCase().includes(q));
  }, [conversations, searchTerm]);

  const connectWebSocket = useCallback(() => {
    if (!userId || !wsBaseUrl) return;

    try {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setConnectionError(null);
      const socket = new WebSocket(`${wsBaseUrl}/ws/chat/`);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);

        socket.send(
          JSON.stringify({
            type: 'authenticate',
            user_id: userId,
            username: username || 'Customer',
            conversation_id: selectedConversation || undefined,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'authenticated') {
            setIsAuthenticated(true);
            return;
          }

          if (data.type === 'new_message') {
            const incoming: Message = {
              id: data.message_id,
              sender_id: data.sender_id,
              sender_name: data.sender_name,
              content: data.content,
              timestamp: data.timestamp,
              status: (data.status || 'sent') as Message['status'],
              message_type: 'text',
            };

            if (data.conversation_id === selectedConversation) {
              setMessages((prev) => [...prev, incoming]);

              if (data.sender_id !== userId && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'read_receipt', message_id: data.message_id }));
              }
            }

            setConversations((prev) =>
              prev.map((c) =>
                c.id === data.conversation_id
                  ? {
                      ...c,
                      last_message: data.content,
                      last_message_time: data.timestamp,
                      unread_count: data.sender_id === userId || c.id === selectedConversation ? 0 : (c.unread_count || 0) + 1,
                    }
                  : c
              )
            );
          }

          if (data.type === 'message_read') {
            setMessages((prev) => prev.map((m) => (m.id === data.message_id ? { ...m, status: 'read' } : m)));
          }

          if (data.type === 'typing' && data.conversation_id === selectedConversation && data.user_id !== userId) {
            setIsTyping(Boolean(data.is_typing));
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1200);
          }

          if (data.type === 'conversation_history' && data.conversation_id === selectedConversation && Array.isArray(data.messages)) {
            const typedMessages: Message[] = data.messages.map((m: any) => ({
              id: m.id,
              sender_id: m.sender_id,
              sender_name: m.sender_name,
              content: m.content,
              timestamp: m.timestamp,
              status: (m.status || 'sent') as Message['status'],
              message_type: (m.message_type || 'text') as Message['message_type'],
              attachment_url: m.attachment_url,
            }));
            setMessages(typedMessages);
          }
        } catch (error) {
          console.error('WebSocket parse error:', error);
        }
      };

      socket.onerror = () => {
        setConnectionError('Connection failed');
        setIsConnected(false);
        setIsAuthenticated(false);
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        setIsAuthenticated(false);

        if (event.code !== 1000 && event.code !== 1001) {
          setConnectionError('Reconnecting...');
          reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(), 3000);
        }
      };
    } catch (error) {
      console.error('WebSocket connect error:', error);
    }
  }, [userId, username, selectedConversation, wsBaseUrl]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoadingConversations(true);
      const response = await AxiosInstance.get<Conversation[]>('/conversation/list/', {
        headers: { 'X-User-Id': userId },
      });
      const list = Array.isArray(response.data) ? response.data : [];
      setConversations(list);

      if (params.shopId) {
        const existing = list.find((c) => c.participant_id === params.shopId);
        if (existing) setSelectedConversation(existing.id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [userId, params.shopId]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!userId || !conversationId) return;
      try {
        setIsLoadingMessages(true);
        const response = await AxiosInstance.get<Message[]>(`/conversation/messages/${conversationId}/list/`, {
          headers: { 'X-User-Id': userId },
        });
        const list = Array.isArray(response.data) ? response.data : [];
        setMessages(
          list.map((m: any) => ({
            id: m.id,
            sender_id: m.sender_id,
            sender_name: m.sender_name,
            content: m.content,
            timestamp: m.timestamp,
            status: (m.status || 'sent') as Message['status'],
            message_type: (m.message_type || 'text') as Message['message_type'],
            attachment_url: m.attachment_url,
          }))
        );

        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)));
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [userId]
  );

  const handleSend = () => {
    if (!newMessage.trim() || !selectedConversation || !userId || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN || !isAuthenticated) return;

    const receiverId = conversations.find((c) => c.id === selectedConversation)?.participant_id;
    if (!receiverId) return;

    const payload = {
      type: 'message',
      content: newMessage.trim(),
      receiver_id: receiverId,
      conversation_id: selectedConversation,
      message_type: 'text',
    };

    wsRef.current.send(JSON.stringify(payload));

    const temp: Message = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      sender_name: username || 'You',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent',
      message_type: 'text',
    };

    setMessages((prev) => [...prev, temp]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation
          ? { ...c, last_message: temp.content, last_message_time: temp.timestamp }
          : c
      )
    );
    setNewMessage('');
  };

  const handleTyping = () => {
    if (!selectedConversation || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isAuthenticated) {
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'typing', conversation_id: selectedConversation, is_typing: true }));

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'typing', conversation_id: selectedConversation, is_typing: false }));
      }
    }, 900);
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      setShowMobileList(false);
    } else {
      setShowMobileList(true);
    }
  }, [selectedConversation, loadMessages]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectWebSocket]);

  useEffect(() => {
    if (messages.length) flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const selected = selectedConversation === item.id;
    return (
      <TouchableOpacity
        style={[styles.threadCard, selected && styles.threadCardSelected]}
        onPress={() => setSelectedConversation(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.threadRow}>
          <Text style={styles.threadName} numberOfLines={1}>{item.participant_name}</Text>
          <Text style={styles.threadTime}>{formatTime(item.last_message_time)}</Text>
        </View>
        <View style={styles.threadRow}>
          <Text style={styles.threadPreview} numberOfLines={1}>{item.last_message || 'No messages yet'}</Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const mine = item.sender_id === userId;
    return (
      <View style={[styles.messageRow, mine ? styles.messageMineRow : styles.messageOtherRow]}>
        <View style={[styles.messageBubble, mine ? styles.messageMine : styles.messageOther]}>
          <Text style={[styles.messageText, mine && styles.messageMineText]}>{item.content}</Text>
          <Text style={[styles.messageMeta, mine && styles.messageMineMeta]}>
            {formatTime(item.timestamp)} {mine ? `• ${item.status}` : ''}
          </Text>
        </View>
      </View>
    );
  };

  const conversationPane = (
    <View style={styles.pane}>
      <Text style={styles.title}>Messages</Text>
      <TextInput
        style={styles.searchInput}
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search conversations"
        placeholderTextColor="#9CA3AF"
      />

      {isLoadingConversations ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="small" color="#F97316" />
          <Text style={styles.helperText}>Loading conversations...</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.helperText}>No conversations found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );

  const chatPane = (
    <KeyboardAvoidingView
      style={styles.pane}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setShowMobileList(true)} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.chatHeaderTextWrap}>
          <Text style={styles.chatHeaderTitle} numberOfLines={1}>{selectedConversationData?.participant_name || 'Conversation'}</Text>
          <Text style={styles.chatHeaderSubtitle}>{connectionError || (isConnected ? 'Connected' : 'Disconnected')}</Text>
        </View>
      </View>

      {isLoadingMessages ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="small" color="#F97316" />
          <Text style={styles.helperText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.chatListContainer}
        />
      )}

      {isTyping && <Text style={styles.typingText}>Typing...</Text>}

      <View style={styles.composerRow}>
        <TextInput
          style={styles.composerInput}
          value={newMessage}
          onChangeText={(text) => {
            setNewMessage(text);
            handleTyping();
          }}
          placeholder="Type a message"
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!newMessage.trim() || !isConnected || !isAuthenticated) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim() || !isConnected || !isAuthenticated}
        >
          <Ionicons name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          {showMobileList || !selectedConversation ? conversationPane : chatPane}
        </View>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 12 },
  pane: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  searchInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    color: '#111827',
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  helperText: { color: '#6B7280', fontSize: 13 },
  listContainer: { paddingTop: 10, paddingBottom: 8, gap: 8 },
  threadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
  },
  threadCardSelected: { borderColor: '#FDBA74', backgroundColor: '#FFF7ED' },
  threadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  threadName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  threadTime: { fontSize: 11, color: '#9CA3AF' },
  threadPreview: { flex: 1, marginTop: 4, color: '#4B5563', fontSize: 13 },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  backBtn: { width: 30, alignItems: 'flex-start' },
  chatHeaderTextWrap: { flex: 1 },
  chatHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  chatHeaderSubtitle: { marginTop: 2, fontSize: 12, color: '#6B7280' },
  chatListContainer: { paddingTop: 10, paddingBottom: 8 },
  messageRow: { marginBottom: 8, flexDirection: 'row' },
  messageMineRow: { justifyContent: 'flex-end' },
  messageOtherRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '82%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  messageMine: { backgroundColor: '#F97316', borderBottomRightRadius: 4 },
  messageOther: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  messageText: { color: '#111827', fontSize: 14, lineHeight: 20 },
  messageMineText: { color: '#FFFFFF' },
  messageMeta: { marginTop: 4, fontSize: 10, color: '#6B7280' },
  messageMineMeta: { color: '#FFEDD5' },
  typingText: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    color: '#111827',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
