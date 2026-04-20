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

interface Conversation {
  conversation_id: string;
  user_id: string;
  user_name: string;      
  username?: string;       
  shop_name?: string; 
  user_avatar?: string;
  last_message?: string;
  last_message_time?: string;
  last_message_type?: string;
  unread_count: number;
}

const formatTime = (value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export default function CustomerMessagesPage() {
  const params = useLocalSearchParams<{ shopId?: string; userId?: string; userName?: string }>();
  const { userId: currentUserId } = useAuth();
  const flatListRef = useRef<FlatList<Message>>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const selectedConversationData = useMemo(
    () => conversations.find((c) => c.conversation_id === selectedConversation) || null,
    [conversations, selectedConversation]
  );

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.user_name.toLowerCase().includes(q));
  }, [conversations, searchTerm]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setIsLoadingConversations(true);
      const response = await AxiosInstance.get('/messages/conversations/', {
        headers: { 'X-User-Id': currentUserId },
      });
      
      const data = response.data;
      console.log('Conversations response:', data);
      
      const list = data.conversations || [];
      setConversations(list);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUserId]);

  // Load messages for a conversation
  const loadMessages = useCallback(async () => {
    if (!currentUserId || !selectedUserId) return;
    
    try {
      setIsLoadingMessages(true);
      const response = await AxiosInstance.get('/messages/', {
        headers: { 'X-User-Id': currentUserId },
        params: { other_user_id: selectedUserId, page_size: 100 }
      });
      
      console.log('Messages response:', response.data);
      
      const data = response.data;
      let messagesList = [];
      
      if (data.results) {
        messagesList = data.results;
      } else if (data.messages) {
        messagesList = data.messages;
      } else if (Array.isArray(data)) {
        messagesList = data;
      }
      
      // Messages come as newest first, reverse to show oldest first
      const reversedMessages = [...messagesList].reverse();
      setMessages(reversedMessages);
      
      // Set conversation ID from first message if exists
      if (reversedMessages.length > 0 && reversedMessages[0].conversation_id) {
        setConversationId(reversedMessages[0].conversation_id);
      }
      
      // Mark messages as read
      const convId = conversationId || (reversedMessages[0]?.conversation_id);
      if (convId) {
        await AxiosInstance.post('/messages/mark-read/', 
          { conversation_id: convId },
          { headers: { 'X-User-Id': currentUserId } }
        );
      }
      
      // Update unread count in conversations list
      setConversations(prev => prev.map(c => 
        c.user_id === selectedUserId
          ? { ...c, unread_count: 0 }
          : c
      ));
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUserId, selectedUserId, conversationId]);

  // Send a new message
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId || !currentUserId || isSending) return;

    setIsSending(true);
    try {
      const response = await AxiosInstance.post('/messages/', {
        receiver_id: selectedUserId,
        content: newMessage.trim(),
        conversation_id: conversationId,
        message_type: 'text'
      }, {
        headers: { 'X-User-Id': currentUserId }
      });
      
      const newMsg = response.data;
      console.log('Sent message response:', newMsg);
      
      setMessages(prev => [...prev, newMsg]);
      
      // Update conversation ID if this is the first message
      if (!conversationId && newMsg.conversation_id) {
        setConversationId(newMsg.conversation_id);
      }
      
      // Update conversations list
      setConversations(prev => {
        const existing = prev.find(c => c.user_id === selectedUserId);
        if (existing) {
          return prev.map(c => 
            c.user_id === selectedUserId
              ? { 
                  ...c, 
                  last_message: newMsg.content, 
                  last_message_time: newMsg.created_at,
                  unread_count: 0
                }
              : c
          );
        } else {
          // Add new conversation
          return [{
            conversation_id: newMsg.conversation_id,
            user_id: selectedUserId,
            user_name: params.userName || 'User',
            last_message: newMsg.content,
            last_message_time: newMsg.created_at,
            last_message_type: 'text',
            unread_count: 0
          }, ...prev];
        }
      });
      
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Poll for new messages every 5 seconds
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      if (selectedUserId && currentUserId) {
        try {
          const response = await AxiosInstance.get('/messages/', {
            headers: { 'X-User-Id': currentUserId },
            params: { other_user_id: selectedUserId, page_size: 10 }
          });
          
          const data = response.data;
          let newMessages = [];
          
          if (data.results) {
            newMessages = data.results;
          } else if (data.messages) {
            newMessages = data.messages;
          } else if (Array.isArray(data)) {
            newMessages = data;
          }
          
          const reversedNewMessages = [...newMessages].reverse();
          
          if (reversedNewMessages.length !== messages.length) {
            setMessages(reversedNewMessages);
            
            // Mark as read
            if (conversationId) {
              await AxiosInstance.post('/messages/mark-read/', 
                { conversation_id: conversationId },
                { headers: { 'X-User-Id': currentUserId } }
              );
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }
    }, 5000);
  }, [selectedUserId, currentUserId, messages.length, conversationId]);
  
  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    // Navigate to open-message with all conversation data
    router.push({
      pathname: "/customer/open-message",
      params: { 
        userId: conversation.user_id,
        userName: conversation.user_name,
        userAvatar: conversation.user_avatar || '',
        username: conversation.username || '',  // Add the username
        shopName: conversation.shop_name || '',
        conversationId: conversation.conversation_id || ''
      }
    });
  };

  // Start a new conversation
  const handleNewConversation = () => {
    // router.push('/customer/open-message/');
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages();
      startPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [selectedUserId, loadMessages, startPolling, stopPolling]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Updated renderConversationItem with profile picture support
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const selected = selectedConversation === item.conversation_id;
    const hasShop = !!item.shop_name;
    
    return (
      <TouchableOpacity
        style={[styles.threadCard, selected && styles.threadCardSelected]}
        onPress={() => handleSelectConversation(item)}
        activeOpacity={0.8}
      >
        <View style={styles.threadRow}>
          <View style={styles.threadLeft}>
            {/* Avatar with profile picture support */}
            {item.user_avatar ? (
              <Image 
                source={{ uri: item.user_avatar }}
                style={styles.avatarImage}
                onError={(e) => console.log('Avatar load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.user_name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.threadInfo}>
              <Text style={styles.threadName} numberOfLines={1}>{item.user_name}</Text>
              {item.username && (
                <Text style={styles.threadUsername} numberOfLines={1}>@{item.username}</Text>
              )}
              <Text style={styles.threadPreview} numberOfLines={1}>
                {item.last_message || 'No messages yet'}
              </Text>
            </View>
          </View>
          <View style={styles.threadRight}>
            <Text style={styles.threadTime}>{formatDate(item.last_message_time || '')}</Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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

  const conversationPane = (
    <View style={styles.pane}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Messages</Text>
        {/* <TouchableOpacity onPress={handleNewConversation} style={styles.newChatBtn}>
          <Ionicons name="create-outline" size={22} color="#F97316" />
        </TouchableOpacity> */}
      </View>
      
      <TextInput
        style={styles.searchInput}
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search conversations..."
        placeholderTextColor="#9CA3AF"
      />

      {isLoadingConversations ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="small" color="#F97316" />
          <Text style={styles.helperText}>Loading conversations...</Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>Start a conversation with a shop</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.conversation_id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.chatHeaderTextWrap}>
          <Text style={styles.chatHeaderTitle} numberOfLines={1}>
            {selectedConversationData?.user_name || 'Conversation'}
          </Text>
          {selectedConversationData?.username && (
            <Text style={styles.chatHeaderSubtitle} numberOfLines={1}>
              @{selectedConversationData.username}
            </Text>
          )}
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyChatTitle}>No messages yet</Text>
              <Text style={styles.emptyChatText}>Send a message to start chatting</Text>
            </View>
          }
        />
      )}

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
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomerLayout disableScroll>
        <View style={styles.container}>
          {(showMobileList || !selectedConversation) ? conversationPane : chatPane}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    color: '#111827',
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  helperText: { color: '#6B7280', fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  listContainer: { paddingTop: 8, paddingBottom: 8, gap: 8 },
  threadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  threadCardSelected: { borderColor: '#FDBA74', backgroundColor: '#FFF7ED' },
  threadRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    gap: 8,
  },
  threadLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  threadInfo: {
    flex: 1,
  },
  threadName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  threadPreview: { marginTop: 4, color: '#6B7280', fontSize: 13 },
  threadRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  threadTime: { fontSize: 11, color: '#9CA3AF' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  chatHeaderTextWrap: { flex: 1 },
  chatHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  chatHeaderSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  chatListContainer: { paddingTop: 10, paddingBottom: 8, flexGrow: 1 },
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
    gap: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#E5E7EB', 
    paddingTop: 8,
    marginTop: 8,
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
  threadUsername: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});