import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

// Mock conversation data
const mockConversations = [
  {
    id: '1',
    name: 'Maria Santos',
    lastMessage: 'Thanks for the quick delivery!',
    time: '10:30 AM',
    unread: 2,
    avatar: '👩',
    messages: [
      { id: 'm1', text: 'Hi, when will my order arrive?', time: '10:25 AM', isOwn: false },
      { id: 'm2', text: 'It should arrive in 15 minutes', time: '10:26 AM', isOwn: true },
      { id: 'm3', text: 'Thanks for the update!', time: '10:30 AM', isOwn: false },
    ]
  },
  {
    id: '2',
    name: 'Laptop World',
    lastMessage: 'New delivery request available',
    time: '9:45 AM',
    unread: 0,
    avatar: '🏢',
    messages: [
      { id: 'm4', text: 'We have a new delivery for you', time: '9:45 AM', isOwn: false },
    ]
  },
  {
    id: '3',
    name: 'Tech Gadget Store',
    lastMessage: 'Order #ORD-7845 is ready',
    time: 'Yesterday',
    unread: 0,
    avatar: '🏪',
    messages: [
      { id: 'm5', text: 'Your package is ready for pickup', time: 'Yesterday', isOwn: false },
      { id: 'm6', text: 'I will be there in 30 mins', time: 'Yesterday', isOwn: true },
    ]
  },
];

export default function RiderMessagesScreen() {
  const [conversations, setConversations] = useState(mockConversations);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (activeChat) {
      const chat = conversations.find(c => c.id === activeChat);
      if (chat) {
        setCurrentMessages(chat.messages || []);
      }
    }
  }, [activeChat]);

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    const newMessage = {
      id: `m${Date.now()}`,
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    };

    // Update current messages
    const updatedMessages = [...currentMessages, newMessage];
    setCurrentMessages(updatedMessages);

    // Update conversation
    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeChat 
          ? { ...conv, messages: [...conv.messages, newMessage] } 
          : conv
      )
    );

    setInputText('');
  };

  const openChat = (conversationId: string) => {
    setActiveChat(conversationId);
  };

  const goBackToConversations = () => {
    setActiveChat(null);
  };

  const renderConversation = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.conversationItem} 
      onPress={() => openChat(item.id)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.avatar}</Text>
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.conversationTime}>{item.time}</Text>
        </View>
        <View style={styles.conversationBottom}>
          <Text style={styles.conversationPreview}>{item.lastMessage}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[styles.messageContainer, item.isOwn ? styles.ownMessage : styles.otherMessage]}>
      <View style={[styles.messageBubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={item.isOwn ? styles.ownMessageText : styles.otherMessageText}>
          {item.text}
        </Text>
        <Text style={styles.messageTime}>{item.time}</Text>
      </View>
    </View>
  );

  if (activeChat) {
    const chat = conversations.find(c => c.id === activeChat);
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToConversations}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.chatInfo}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarText}>{chat?.avatar}</Text>
            </View>
            <View>
              <Text style={styles.chatName}>{chat?.name}</Text>
              <Text style={styles.chatStatus}>Online</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={currentMessages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, inputText.trim() === '' && styles.sendButtonDisabled]} 
            onPress={handleSendMessage}
            disabled={inputText.trim() === ''}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        style={styles.conversationsList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  conversationTime: {
    fontSize: 12,
    color: '#64748b',
  },
  conversationBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Chat screen styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  chatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  chatStatus: {
    fontSize: 12,
    color: '#10b981',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
  },
  ownBubble: {
    backgroundColor: '#3b82f6',
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ownMessageText: {
    color: '#fff',
    fontSize: 14,
  },
  otherMessageText: {
    color: '#0f172a',
    fontSize: 14,
  },
  messageTime: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 24,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});