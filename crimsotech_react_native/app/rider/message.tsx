import React, { useState, useRef, useEffect } from "react";
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
  StatusBar,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";

// --- Types & Colors ---
const COLORS = {
  primary: "#111827",
  bg: "#FFFFFF",
  textMain: "#374151",
  textMuted: "#9CA3AF",
  riderBubble: "#EA580C",
  clientBubble: "#F3F4F6",
  online: "#EA580C",
  offline: "#9CA3AF",
};

// --- Message Type ---
interface Message {
  id: string;
  text: string;
  sender: "rider" | "client";
  timestamp: string;
  status?: "sent" | "delivered" | "seen";
}

// --- Client Type ---
interface Client {
  id: string;
  name: string;
  orderId: string;
  isOnline: boolean;
  avatar: string;
}

// --- All Clients/Conversations ---
const ALL_CLIENTS: Client[] = [
  {
    id: "1",
    name: "Juan Dela Cruz",
    orderId: "ORD-2024-5431",
    isOnline: true,
    avatar: "JD",
  },
  {
    id: "2",
    name: "Maria Santos",
    orderId: "ORD-2024-5432",
    isOnline: true,
    avatar: "MS",
  },
  {
    id: "3",
    name: "Ramon Garcia",
    orderId: "ORD-2024-5433",
    isOnline: false,
    avatar: "RG",
  },
];

// --- Client Messages Map ---
const CLIENT_MESSAGES_MAP: { [key: string]: Message[] } = {
  "1": [
    {
      id: "1",
      text: "Hello! I just ordered a used laptop. Can you pick it up from TechHub Store?",
      sender: "client",
      timestamp: "10:15 AM",
      status: "seen",
    },
    {
      id: "2",
      text: "Yes, I&apos;m heading there now. Should arrive in 10 minutes.",
      sender: "rider",
      timestamp: "10:17 AM",
      status: "seen",
    },
    {
      id: "3",
      text: "Great! Please handle it carefully, it&apos;s quite fragile.",
      sender: "client",
      timestamp: "10:18 AM",
      status: "seen",
    },
    {
      id: "4",
      text: "Don&apos;t worry, I&apos;ll take good care of it. I&apos;ve picked up many electronics before.",
      sender: "rider",
      timestamp: "10:20 AM",
      status: "delivered",
    },
    {
      id: "5",
      text: "I&apos;ve picked up the package. On my way to your location now.",
      sender: "rider",
      timestamp: "10:35 AM",
      status: "seen",
    },
    {
      id: "6",
      text: "Thank you! How long will it take?",
      sender: "client",
      timestamp: "10:36 AM",
      status: "seen",
    },
    {
      id: "7",
      text: "Approximately 15 minutes. Traffic is light.",
      sender: "rider",
      timestamp: "10:37 AM",
      status: "delivered",
    },
  ],
  "2": [
    {
      id: "8",
      text: "Hi! I need a second-hand phone case.",
      sender: "client",
      timestamp: "9:45 AM",
      status: "seen",
    },
    {
      id: "9",
      text: "Sure! I can get that for you. Which store?",
      sender: "rider",
      timestamp: "9:47 AM",
      status: "seen",
    },
    {
      id: "10",
      text: "The one at SM Mall of Asia.",
      sender: "client",
      timestamp: "9:48 AM",
      status: "seen",
    },
    {
      id: "11",
      text: "On my way now!",
      sender: "rider",
      timestamp: "9:55 AM",
      status: "delivered",
    },
  ],
  "3": [
    {
      id: "12",
      text: "When can you deliver my books?",
      sender: "client",
      timestamp: "8:30 AM",
      status: "seen",
    },
    {
      id: "13",
      text: "By 5 PM today!",
      sender: "rider",
      timestamp: "8:35 AM",
      status: "seen",
    },
  ],
};

// --- Quick Reply Options ---
const QUICK_REPLIES = [
  "I'm on the way",
  "Arrived at pickup",
  "Package picked up",
  "Arrived at location",
  "Please come down",
  "Delivered successfully",
];

export default function MessagePage() {
  const { userRole } = useAuth();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load messages when client is selected
  useEffect(() => {
    if (selectedClient) {
      setMessages(CLIENT_MESSAGES_MAP[selectedClient.id] || []);
    }
  }, [selectedClient]);

  // Simulate client typing
  useEffect(() => {
    const typingInterval = setInterval(() => {
      const shouldType = Math.random() > 0.9;
      setIsTyping(shouldType);
      if (shouldType) {
        setTimeout(() => setIsTyping(false), 3000);
      }
    }, 10000);

    return () => clearInterval(typingInterval);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Role Guard
  if (userRole && userRole !== "rider") {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Not authorized to view this page</Text>
      </SafeAreaView>
    );
  }

  // Send Message
  const handleSend = () => {
    if (inputText.trim() === "") return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "rider",
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      status: "sent",
    };

    setMessages([...messages, newMessage]);
    setInputText("");

    // Simulate status updates
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "delivered" } : msg,
        ),
      );
    }, 1000);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "seen" } : msg,
        ),
      );
    }, 2000);
  };

  // Quick Reply
  const handleQuickReply = (text: string) => {
    setInputText(text);
  };

  // Call Client
  const handleCall = () => {
    console.log("Calling client...");
  };

  // Share Location
  const handleShareLocation = () => {
    console.log("Sharing location...");
  };

  // Attach Image
  const handleAttachImage = () => {
    console.log("Attaching image...");
  };

  // Get last message for conversation list
  const getLastMessage = (client: Client): string => {
    const clientMsgs = CLIENT_MESSAGES_MAP[client.id];
    if (clientMsgs && clientMsgs.length > 0) {
      return clientMsgs[clientMsgs.length - 1].text.substring(0, 40) + "...";
    }
    return "No messages yet";
  };

  // Get last message time for conversation list
  const getLastMessageTime = (client: Client): string => {
    const clientMsgs = CLIENT_MESSAGES_MAP[client.id];
    if (clientMsgs && clientMsgs.length > 0) {
      return clientMsgs[clientMsgs.length - 1].timestamp;
    }
    return "";
  };

  // Render Conversation List Item
  const renderConversation = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.conversationListItem}
      onPress={() => setSelectedClient(item)}
    >
      <View
        style={[
          styles.avatar,
          {
            width: 56,
            height: 56,
            borderRadius: 28,
          },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize: 18 }]}>{item.avatar}</Text>
        <View
          style={[
            styles.onlineIndicator,
            {
              backgroundColor: item.isOnline ? COLORS.online : COLORS.offline,
            },
          ]}
        />
      </View>

      <View style={styles.conversationListContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.messageTime}>{getLastMessageTime(item)}</Text>
        </View>
        <Text style={styles.lastMessage}>{getLastMessage(item)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render Message Item
  const renderMessage = ({ item }: { item: Message }) => {
    const isRider = item.sender === "rider";

    return (
      <View
        style={[
          styles.messageContainer,
          isRider && styles.messageRightContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isRider ? styles.riderBubble : styles.clientBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isRider ? styles.riderText : styles.clientText,
            ]}
          >
            {item.text}
          </Text>
        </View>
        <View
          style={[styles.messageFooter, isRider && styles.messageFooterRight]}
        >
          <Text style={styles.timestamp}>{item.timestamp}</Text>
          {isRider && item.status && (
            <View style={styles.statusContainer}>
              {item.status === "sent" && (
                <Feather name="check" size={12} color={COLORS.textMuted} />
              )}
              {item.status === "delivered" && (
                <Feather
                  name="check-circle"
                  size={12}
                  color={COLORS.textMuted}
                />
              )}
              {item.status === "seen" && (
                <Ionicons
                  name="checkmark-done"
                  size={12}
                  color={COLORS.online}
                />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Show conversation list or chat detail
  if (!selectedClient) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

        {/* Header for Conversation List */}
        <View style={styles.conversationListHeader}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            style={styles.composeButton}
            onPress={() => router.push("/rider/message-settings")}
          >
            <Feather name="menu" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Conversations List */}
        <FlatList
          data={ALL_CLIENTS}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationListContainer}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  // Show detailed chat view
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setSelectedClient(null)}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={COLORS.textMain} />
        </TouchableOpacity>

        <View style={styles.clientInfoContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{selectedClient.avatar}</Text>
            <View
              style={[
                styles.onlineIndicator,
                {
                  backgroundColor: selectedClient.isOnline
                    ? COLORS.online
                    : COLORS.offline,
                },
              ]}
            />
          </View>
          <View style={styles.clientDetails}>
            <Text style={styles.clientName}>{selectedClient.name}</Text>
            <View style={styles.orderStatusRow}>
              <Text style={styles.orderId}>{selectedClient.orderId}</Text>
              <View style={styles.statusDot} />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: selectedClient.isOnline
                      ? COLORS.online
                      : COLORS.offline,
                  },
                ]}
              >
                {selectedClient.isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleCall} style={styles.callButton}>
          <Feather name="phone-call" size={20} color="#EA580C" />
        </TouchableOpacity>
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, styles.typingDotDelay1]} />
                <View style={[styles.typingDot, styles.typingDotDelay2]} />
              </View>
              <Text style={styles.typingText}>
                {selectedClient.name} is typing...
              </Text>
            </View>
          ) : null
        }
      />

      {/* Message Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Quick Reply Buttons */}
        <View style={styles.quickReplyContainer}>
          <FlatList
            horizontal
            data={QUICK_REPLIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.quickReplyButton}
                onPress={() => handleQuickReply(item)}
              >
                <Text style={styles.quickReplyText}>{item}</Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReplyList}
          />
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={handleAttachImage}
            style={styles.attachButton}
          >
            <Feather name="image" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareLocation}
            style={styles.attachButton}
          >
            <Ionicons
              name="location-sharp"
              size={22}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              inputText.trim() === "" && styles.sendButtonDisabled,
            ]}
            disabled={inputText.trim() === ""}
          >
            <Feather name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // 1️⃣ Conversation List Header
  conversationListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  composeButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },

  // Conversation List Container
  conversationListContainer: {
    paddingVertical: 8,
  },
  conversationListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  conversationListContent: {
    marginLeft: 12,
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  lastMessage: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "400",
  },

  // 1️⃣ Header (Chat Detail)
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  clientInfoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  clientDetails: {
    marginLeft: 12,
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 2,
  },
  orderStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orderId: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  statusDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textMuted,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  callButton: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },

  // 2️⃣ Message List
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  messageRightContainer: {
    alignSelf: "flex-end",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  riderBubble: {
    backgroundColor: COLORS.riderBubble,
    borderBottomRightRadius: 4,
  },
  clientBubble: {
    backgroundColor: COLORS.clientBubble,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  riderText: {
    color: "#FFFFFF",
  },
  clientText: {
    color: COLORS.textMain,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  messageFooterRight: {
    justifyContent: "flex-end",
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  statusContainer: {
    marginLeft: 4,
  },

  // Typing Indicator
  typingContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: "row",
    backgroundColor: COLORS.clientBubble,
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
    opacity: 0.6,
  },
  typingDotDelay1: {
    opacity: 0.4,
  },
  typingDotDelay2: {
    opacity: 0.2,
  },
  typingText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 4,
  },

  // 4️⃣ Quick Replies
  quickReplyContainer: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingVertical: 8,
  },
  quickReplyList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickReplyButton: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickReplyText: {
    fontSize: 12,
    color: COLORS.textMain,
    fontWeight: "600",
  },

  // 3️⃣ Input Area
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 10,
  },
  attachButton: {
    padding: 6,
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textMain,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.riderBubble,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.riderBubble,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
    shadowOpacity: 0,
  },
});
