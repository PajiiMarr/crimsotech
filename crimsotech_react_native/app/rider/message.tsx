import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

// --- Types & Colors ---
const COLORS = {
  primary: '#F97316',
  bg: '#FFFFFF',
  textMain: '#111827',
  textMuted: '#6B7280',
  bubbleLeft: '#F3F4F6',
  badgeFragile: '#FEF2F2',
  badgeFragileText: '#DC2626',
};

// --- Mock Data ---
const CONVERSATIONS = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    lastMsg: 'Please handle the laptop carefully.',
    time: '2:45 PM',
    unread: 2,
    type: 'customer',
    label: 'Fragile Item',
    parcel: 'Second-hand Laptop',
  },
  {
    id: '2',
    name: 'TechResale Store',
    lastMsg: 'Parcel is ready for pickup at Gate 3.',
    time: '10:20 AM',
    unread: 0,
    type: 'store',
    label: 'High-Value',
    parcel: 'Used Smartphone',
  },
];

export default function MessagePage() {
  const { userRole } = useAuth();
  const [selectedChat, setSelectedChat] = useState<typeof CONVERSATIONS[0] | null>(null);
  const [inputText, setInputText] = useState('');

  // Role Guard
  if (userRole && userRole !== 'rider') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  // --- Inbox / List View ---
  const renderInbox = () => (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Messages</Text>
        <TouchableOpacity><Feather name="search" size={20} color={COLORS.textMain} /></TouchableOpacity>
      </View>
      <FlatList
        data={CONVERSATIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatRow} onPress={() => setSelectedChat(item)}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons 
                name={item.type === 'customer' ? "package-variant" : "storefront"} 
                size={24} color={COLORS.primary} 
              />
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.senderName}>{item.name}</Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMsg}</Text>
              <View style={styles.statusBadgeInbox}>
                <Text style={styles.statusBadgeText}>{item.label}</Text>
              </View>
            </View>
            {item.unread > 0 && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="message-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Messages from customers will appear here.</Text>
          </View>
        }
      />
    </View>
  );

  // --- Chat / Conversation View ---
  const renderChat = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setSelectedChat(null)}>
          <Feather name="arrow-left" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerName}>{selectedChat?.name}</Text>
          <View style={styles.headerSubRow}>
            <Feather name="box" size={12} color={COLORS.primary} />
            <Text style={styles.headerSubtext}>Electronics Delivery in Progress</Text>
          </View>
        </View>
      </View>

      {/* Safety Reminder */}
      <View style={styles.safetyBanner}>
        <Feather name="alert-triangle" size={16} color={COLORS.badgeFragileText} />
        <Text style={styles.safetyText}>Do not open the parcel. Report damage immediately.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.chatScroll}>
        <Text style={styles.systemMsg}>Pickup completed • 2:30 PM</Text>
        
        {/* Customer Message */}
        <View style={styles.msgLeft}>
          <View style={styles.bubbleLeft}>
            <Text style={styles.textLeft}>{selectedChat?.lastMsg}</Text>
          </View>
        </View>

        {/* Condition Photo Attachment */}
        <View style={styles.msgRight}>
          <View style={styles.photoAttachment}>
            <View style={styles.photoPlaceholder}>
              <Feather name="image" size={24} color="#FFF" />
            </View>
            <View style={styles.photoLabelRow}>
              <Text style={styles.photoLabel}>Condition Photo</Text>
              <Feather name="check-circle" size={12} color={COLORS.primary} />
            </View>
          </View>
        </View>

        <View style={styles.msgRight}>
          <View style={styles.bubbleRight}>
            <Text style={styles.textRight}>I&apos;m on my way. I will handle it with care.</Text>
          </View>
        </View>

        <Text style={styles.systemMsg}>Delivered safely • 3:00 PM</Text>
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {["On my way", "Picked up", "Delivered safely"].map((chip) => (
            <TouchableOpacity key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.cameraBtn}>
            <Feather name="camera" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TextInput 
            style={styles.input} 
            placeholder="Type a message..." 
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={styles.sendBtn}>
            <Feather name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {selectedChat ? renderChat() : renderInbox()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 26, color: COLORS.textMuted },

  // Inbox List
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  topBarTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textMain },
  chatRow: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  senderName: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  chatTime: { fontSize: 12, color: COLORS.textMuted },
  lastMsg: { fontSize: 14, color: COLORS.textMuted },
  statusBadgeInbox: { marginTop: 6, backgroundColor: COLORS.badgeFragile, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 10, color: COLORS.badgeFragileText, fontWeight: '700' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  // Chat Interface
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitleContainer: { marginLeft: 16 },
  headerName: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerSubtext: { fontSize: 11, color: COLORS.textMuted },
  
  safetyBanner: { flexDirection: 'row', backgroundColor: COLORS.badgeFragile, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  safetyText: { fontSize: 11, color: COLORS.badgeFragileText, fontWeight: '600' },

  chatScroll: { padding: 16 },
  systemMsg: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginVertical: 16, fontWeight: '500' },
  
  msgLeft: { alignSelf: 'flex-start', maxWidth: '80%', marginBottom: 12 },
  bubbleLeft: { backgroundColor: COLORS.bubbleLeft, padding: 12, borderRadius: 16, borderTopLeftRadius: 4 },
  textLeft: { fontSize: 14, color: COLORS.textMain },

  msgRight: { alignSelf: 'flex-end', maxWidth: '80%', marginBottom: 12 },
  bubbleRight: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 16, borderTopRightRadius: 4 },
  textRight: { fontSize: 14, color: '#FFF' },

  photoAttachment: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  photoPlaceholder: { width: 150, height: 100, backgroundColor: '#D1D5DB', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  photoLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  photoLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },

  // Input Area
  inputWrapper: { padding: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  chipScroll: { marginBottom: 10 },
  chip: { backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#FED7AA' },
  chipText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cameraBtn: { padding: 8 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain, marginTop: 16 },
  emptySub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 40, marginTop: 8 },
});