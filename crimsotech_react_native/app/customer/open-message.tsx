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
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
  message_type?: 'text' | 'image' | 'file';
  attachment?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_mime_type?: string;
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
    shopId?: string; 
    shopName?: string; 
    shopAvatar?: string; 
    shopUsername?: string;
    ownerId?: string;
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  
  // Determine display info
  const isFromShop = !!params.shopId;
  
  const displayName = isFromShop 
    ? (params.shopName || 'Shop') 
    : (params.userName || 'User');
  
  const displayUsername = isFromShop 
    ? params.shopUsername 
    : params.username;
  
  const displayAvatar = isFromShop ? params.shopAvatar : params.userAvatar;

  // Get the other user's ID
  useEffect(() => {
    if (params.ownerId) {
      setOtherUserId(params.ownerId);
      setIsLoadingMessages(false);
    } else if (params.userId) {
      setOtherUserId(params.userId);
      setIsLoadingMessages(false);
    } else if (params.shopId && !params.ownerId) {
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
    if (!currentUserId || !otherUserId) return;
    
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

  // Send image message using FormData
  const sendImageMessage = async (imageAsset: any) => {
    if (!otherUserId || !currentUserId) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('receiver_id', otherUserId);
      formData.append('message_type', 'image');
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }
      
      const fileObject = {
        uri: imageAsset.uri,
        name: imageAsset.fileName || `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      };
      
      formData.append('attachment', fileObject as any);

      const response = await AxiosInstance.post('/messages/', formData, {
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });
      
      const newMsg = response.data;
      setMessages(prev => [...prev, newMsg]);
      
      if (!conversationId && newMsg.conversation_id) {
        setConversationId(newMsg.conversation_id);
      }
      
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Failed to send image:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to send image');
    } finally {
      setUploadingFile(false);
      setAttachmentModalVisible(false);
    }
  };

  // Send file message using FormData
  const sendFileMessage = async (fileAsset: any) => {
    if (!otherUserId || !currentUserId) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('receiver_id', otherUserId);
      formData.append('message_type', 'file');
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }
      
      const fileObject = {
        uri: fileAsset.uri,
        name: fileAsset.name,
        type: fileAsset.mimeType || fileAsset.type || 'application/octet-stream',
      };
      
      formData.append('attachment', fileObject as any);

      const response = await AxiosInstance.post('/messages/', formData, {
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });
      
      const newMsg = response.data;
      setMessages(prev => [...prev, newMsg]);
      
      if (!conversationId && newMsg.conversation_id) {
        setConversationId(newMsg.conversation_id);
      }
      
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Failed to send file:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to send file');
    } finally {
      setUploadingFile(false);
      setAttachmentModalVisible(false);
    }
  };

  // Pick image from camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to send photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachmentModalVisible(false);
      sendImageMessage(result.assets[0]);
    }
  };

  // Pick image from gallery
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachmentModalVisible(false);
      sendImageMessage(result.assets[0]);
    }
  };

  // Pick file
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'text/plain'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const formatFileSize = (bytes: number): string => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        Alert.alert(
          'Send File',
          `Send "${asset.name}" (${formatFileSize(asset.size || 0)})?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send', onPress: () => {
              setAttachmentModalVisible(false);
              sendFileMessage(asset);
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  // Send a new text message
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

  const openAttachmentPreview = (url: string, messageType: string, fileName?: string) => {
    if (messageType === 'image') {
      setPreviewUrl(url);
      setPreviewModalVisible(true);
    } else {
      Alert.alert(
        'File Attachment',
        `File: ${fileName || 'Attachment'}`,
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const mine = item.sender === currentUserId;
    const isImage = item.message_type === 'image';
    const isFile = item.message_type === 'file';
    const attachmentUrl = ensureAbsoluteUrl(item.attachment_url || item.attachment);
    
    return (
      <View style={[styles.messageRow, mine ? styles.messageMineRow : styles.messageOtherRow]}>
        <View style={[styles.messageBubble, mine ? styles.messageMine : styles.messageOther]}>
          
          {/* Render image as actual image */}
          {attachmentUrl && isImage && (
            <TouchableOpacity 
              style={styles.imageWrapper}
              onPress={() => openAttachmentPreview(attachmentUrl, 'image')}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: attachmentUrl }} 
                style={styles.messageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          
          {/* Render file as document icon */}
          {attachmentUrl && isFile && (
            <TouchableOpacity 
              style={styles.fileWrapper}
              onPress={() => openAttachmentPreview(attachmentUrl, 'file', item.attachment_name)}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={36} color={mine ? "#FFFFFF" : "#F97316"} />
              <View style={styles.fileTextContainer}>
                <Text style={[styles.fileName, mine && styles.messageMineText]} numberOfLines={1}>
                  {item.attachment_name || 'File attachment'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Render text content */}
          {item.content ? (
            <Text style={[styles.messageText, mine && styles.messageMineText]}>{item.content}</Text>
          ) : null}
          
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
          {/* Header */}
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

          {/* Composer with attachment buttons */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View style={styles.composerRow}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => setAttachmentModalVisible(true)}
                disabled={uploadingFile}
              >
                <Ionicons name="add-circle" size={28} color="#F97316" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.composerInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={uploadingFile ? "Uploading..." : "Type a message..."}
                placeholderTextColor="#9CA3AF"
                multiline
                editable={!uploadingFile}
              />
              
              <TouchableOpacity
                style={[styles.sendBtn, (!newMessage.trim() || isSending || uploadingFile) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!newMessage.trim() || isSending || uploadingFile}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            
            {uploadingFile && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator size="small" color="#F97316" />
                <Text style={styles.uploadingText}>Uploading attachment...</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </CustomerLayout>

      {/* Attachment Modal - Beautiful Design */}
      <Modal
        visible={attachmentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAttachmentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.attachmentModalOverlay}
          activeOpacity={1}
          onPress={() => setAttachmentModalVisible(false)}
        >
          <View style={styles.attachmentModalContent}>
            <View style={styles.attachmentModalHeader}>
              <Text style={styles.attachmentModalTitle}>Add Attachment</Text>
              <TouchableOpacity onPress={() => setAttachmentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.attachmentOptions}>
              <TouchableOpacity style={styles.attachmentOption} onPress={takePhoto}>
                <View style={[styles.attachmentIconBg, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="camera" size={28} color="#EF4444" />
                </View>
                <View style={styles.attachmentOptionTextContainer}>
                  <Text style={styles.attachmentOptionTitle}>Take Photo</Text>
                  <Text style={styles.attachmentOptionDesc}>Capture a photo with your camera</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachmentOption} onPress={pickFromGallery}>
                <View style={[styles.attachmentIconBg, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="images" size={28} color="#22C55E" />
                </View>
                <View style={styles.attachmentOptionTextContainer}>
                  <Text style={styles.attachmentOptionTitle}>Choose from Gallery</Text>
                  <Text style={styles.attachmentOptionDesc}>Select an image from your gallery</Text>
                </View>
              </TouchableOpacity>

              {/* <TouchableOpacity style={styles.attachmentOption} onPress={pickFile}>
                <View style={[styles.attachmentIconBg, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="document" size={28} color="#3B82F6" />
                </View>
                <View style={styles.attachmentOptionTextContainer}>
                  <Text style={styles.attachmentOptionTitle}>Send File</Text>
                  <Text style={styles.attachmentOptionDesc}>PDF, DOC, TXT files</Text>
                </View>
              </TouchableOpacity> */}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.previewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewModalVisible(false)}
        >
          <View style={styles.previewContainer}>
            <TouchableOpacity
              style={styles.previewClose}
              onPress={() => setPreviewModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {previewUrl && (
              <Image
                source={{ uri: previewUrl }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  imageWrapper: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  fileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  fileTextContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
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
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#FFF7ED',
    borderTopWidth: 1,
    borderTopColor: '#FED7AA',
  },
  uploadingText: {
    fontSize: 12,
    color: '#F97316',
  },
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
  // Attachment Modal Styles
  attachmentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  attachmentModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  attachmentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  attachmentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  attachmentOptions: {
    gap: 16,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
  },
  attachmentIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentOptionTextContainer: {
    flex: 1,
  },
  attachmentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  attachmentOptionDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});