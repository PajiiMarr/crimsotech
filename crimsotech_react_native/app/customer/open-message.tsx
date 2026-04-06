import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from './CustomerLayout';
import AxiosInstance from '../../contexts/axios';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  conversation_id: string;
}

const formatTime = (value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ensureAbsoluteUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = AxiosInstance.defaults?.baseURL?.replace(/\/$/, "") || "";
  if (!base) return url;
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
};

export default function OpenMessagePage() {
  const params = useLocalSearchParams<{ 
    // Shop params (from view-shop)
    shopId?: string; 
    shopName?: string; 
    shopAvatar?: string; 
    shopUsername?: string;
    ownerId?: string;
    // User params (from messages list)
    userId?: string;
    userName?: string;
    userAvatar?: string;
    username?: string;
    conversationId?: string;
  }>();
  
  const { userId: currentUserId } = useAuth();
  const flatListRef = useRef<FlatList<Message>>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(params.conversationId || null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Determine display info
  const isFromShop = !!params.shopId;
  
  // Display name - priority: shopName > userName > 'User'
  const displayName = isFromShop 
    ? (params.shopName || 'Shop') 
    : (params.userName || 'User');
  
  // Display username - priority: shopUsername > username > null
  const displayUsername = isFromShop 
    ? params.shopUsername 
    : params.username;
  
  // Display avatar - priority: shopAvatar > userAvatar
  const displayAvatar = isFromShop ? params.shopAvatar : params.userAvatar;
  
  // Log for debugging
  console.log('OpenMessage params:', { 
    isFromShop, 
    displayName, 
    displayUsername, 
    displayAvatar,
    shopId: params.shopId,
    userId: params.userId,
    ownerId: params.ownerId
  });

  // Get the other user's ID
  useEffect(() => {
    if (params.ownerId) {
      // Coming from shop page with ownerId
      setOtherUserId(params.ownerId);
      setIsLoadingMessages(false);
    } else if (params.userId) {
      // Coming from messages list with userId
      setOtherUserId(params.userId);
      setIsLoadingMessages(false);
    } else if (params.shopId && !params.ownerId) {
      // Need to fetch shop owner ID from shop data
      const fetchShopOwner = async () => {
        try {
          const response = await AxiosInstance.get(`/shops/${params.shopId}/`);
          const shopData = response.data;
          if (shopData.owner_id) {
            setOtherUserId(shopData.owner_id);
          } else {
            setError('Could not find shop owner');
          }
          setIsLoadingMessages(false);
        } catch (error) {
          console.error('Failed to get shop owner:', error);
          setError('Could not find shop owner');
          setIsLoadingMessages(false);
        }
      };
      fetchShopOwner();
    } else {
      setIsLoadingMessages(false);
      setError('No user specified');
    }
  }, [params.ownerId, params.userId, params.shopId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!currentUserId || !otherUserId) {
      console.log('Cannot load messages: missing userId or otherUserId');
      return;
    }
    
    try {
      setIsLoadingMessages(true);
      const response = await AxiosInstance.get('/messages/', {
        headers: { 'X-User-Id': currentUserId },
        params: { other_user_id: otherUserId, page_size: 50 }
      });
      
      let messagesList = [];
      
      if (response.data.results) {
        messagesList = response.data.results;
      } else if (response.data.messages) {
        messagesList = response.data.messages;
      } else if (Array.isArray(response.data)) {
        messagesList = response.data;
      }
      
      setMessages(messagesList.reverse());
      
      // Set conversation ID from first message if exists
      if (!conversationId && messagesList.length > 0 && messagesList[0].conversation_id) {
        setConversationId(messagesList[0].conversation_id);
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUserId, otherUserId, conversationId]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    
    try {
      await AxiosInstance.post('/messages/mark-read/', 
        { conversation_id: conversationId },
        { headers: { 'X-User-Id': currentUserId } }
      );
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [conversationId, currentUserId]);

  // Send a new message
  const handleSend = async () => {
    if (!newMessage.trim() || !otherUserId || !currentUserId || isSending) return;

    setIsSending(true);
    try {
      const response = await AxiosInstance.post('/messages/', {
        receiver_id: otherUserId,
        content: newMessage.trim(),
        conversation_id: conversationId,
        message_type: 'text'
      }, {
        headers: { 'X-User-Id': currentUserId }
      });
      
      const newMsg = response.data;
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      if (!conversationId && newMsg.conversation_id) {
        setConversationId(newMsg.conversation_id);
      }
      
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Poll for new messages
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    pollingIntervalRef.current = setInterval(async () => {
      if (otherUserId && currentUserId) {
        try {
          const response = await AxiosInstance.get('/messages/', {
            headers: { 'X-User-Id': currentUserId },
            params: { other_user_id: otherUserId, page_size: 10 }
          });
          
          let newMessages = [];
          if (response.data.results) {
            newMessages = response.data.results;
          } else if (response.data.messages) {
            newMessages = response.data.messages;
          } else if (Array.isArray(response.data)) {
            newMessages = response.data;
          }
          
          newMessages = newMessages.reverse();
          
          if (newMessages.length > messages.length) {
            setMessages(newMessages);
            await markMessagesAsRead();
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }
    }, 5000);
  }, [otherUserId, currentUserId, messages.length, markMessagesAsRead]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (otherUserId) {
      loadMessages();
      startPolling();
    }
    return () => stopPolling();
  }, [otherUserId, loadMessages, startPolling, stopPolling]);

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [conversationId, messages.length, markMessagesAsRead]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderMessageItem = ({ item }: { item: Message }) => {
    const mine = item.sender === currentUserId;
    return (
      <View style={[styles.messageRow, mine ? styles.messageMineRow : styles.messageOtherRow]}>
        <View style={[styles.messageBubble, mine ? styles.messageMine : styles.messageOther]}>
          <Text style={[styles.messageText, mine && styles.messageMineText]}>{item.content}</Text>
          <Text style={[styles.messageMeta, mine && styles.messageMineMeta]}>
            {formatTime(item.created_at)} {mine ? `• ${item.status}` : ''}
          </Text>
        </View>
      </View>
    );
  };

  const avatarUrl = ensureAbsoluteUrl(displayAvatar);

  // Loading state
  if (isLoadingMessages && !otherUserId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CustomerLayout disableScroll>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.helperText}>Loading conversation...</Text>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CustomerLayout disableScroll>
          <View style={styles.centerContent}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </CustomerLayout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          {/* Header - Unified design */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#111827" />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{displayName}</Text>
                {displayUsername && displayUsername !== displayName && (
                  <Text style={styles.headerUsername}>@{displayUsername}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.chatListContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyChatTitle}>No messages yet</Text>
                <Text style={styles.emptyChatText}>Send a message to start chatting</Text>
              </View>
            }
          />

          {/* Composer */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View style={styles.composerRow}>
              <TextInput
                style={styles.composerInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!newMessage.trim() || isSending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </CustomerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerUsername: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  helperText: { color: '#6B7280', fontSize: 13 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginTop: 8 },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F97316',
    borderRadius: 8,
  },
  backButtonText: { color: '#FFFFFF', fontWeight: '600' },
  chatListContainer: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  messageRow: { marginBottom: 12, flexDirection: 'row' },
  messageMineRow: { justifyContent: 'flex-end' },
  messageOtherRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  messageMine: { backgroundColor: '#F97316', borderBottomRightRadius: 4 },
  messageOther: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  messageText: { color: '#111827', fontSize: 15, lineHeight: 20 },
  messageMineText: { color: '#FFFFFF' },
  messageMeta: { marginTop: 4, fontSize: 10, color: '#6B7280' },
  messageMineMeta: { color: '#FFEDD5' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    color: '#111827',
    fontSize: 15,
    backgroundColor: '#F9FAFB',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyChatText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});