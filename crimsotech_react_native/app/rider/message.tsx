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
  primary: '#DC2626',
  bg: '#FFFFFF',
  textMain: '#1E293B',
  textMuted: '#64748B',
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
  message: { fontSize: 16, color: COLORS.textMuted },

  // Inbox List
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  topBarTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textMain },
  chatRow: { flexDirection: 'row', padding: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  chatInfo: { flex: 1, marginLeft: 10 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  senderName: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  chatTime: { fontSize: 11, color: COLORS.textMuted },
  lastMsg: { fontSize: 12, color: COLORS.textMuted },
  statusBadgeInbox: { marginTop: 4, backgroundColor: COLORS.badgeFragile, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 9, color: COLORS.badgeFragileText, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },

  // Chat Interface
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitleContainer: { marginLeft: 12 },
  headerName: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerSubtext: { fontSize: 10, color: COLORS.textMuted },

  safetyBanner: { flexDirection: 'row', backgroundColor: COLORS.badgeFragile, padding: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  safetyText: { fontSize: 10, color: COLORS.badgeFragileText, fontWeight: '600' },

  chatScroll: { padding: 12 },
  systemMsg: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11, marginVertical: 12, fontWeight: '500' },

  msgLeft: { alignSelf: 'flex-start', maxWidth: '80%', marginBottom: 10 },
  bubbleLeft: { backgroundColor: COLORS.bubbleLeft, padding: 10, borderRadius: 12, borderTopLeftRadius: 4 },
  textLeft: { fontSize: 12, color: COLORS.textMain },

  msgRight: { alignSelf: 'flex-end', maxWidth: '80%', marginBottom: 10 },
  bubbleRight: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 12, borderTopRightRadius: 4 },
  textRight: { fontSize: 12, color: '#FFF' },

  photoAttachment: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  photoPlaceholder: { width: 140, height: 90, backgroundColor: '#D1D5DB', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  photoLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  photoLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  // Input Area
  inputWrapper: { padding: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  chipScroll: { marginBottom: 8 },
  chip: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, marginRight: 6, borderWidth: 1, borderColor: '#FECACA' },
  chipText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cameraBtn: { padding: 6 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12 },
  sendBtn: { backgroundColor: COLORS.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', marginTop: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textMain, marginTop: 12 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32, marginTop: 6 },
});