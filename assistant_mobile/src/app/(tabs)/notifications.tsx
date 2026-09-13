import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNotificationStore } from '../../store/notificationStore';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function NotificationsScreen() {
  const workspaceId = useWorkspaceId();
  const { notifications, isLoading, error, fetchNotifications, markAsRead, deleteNotification, clearError } = useNotificationStore();

  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const cardColor = useThemeColor({ light: '#f0f0f0', dark: '#1C1C1E' }, 'background');
  const primaryColor = '#007AFF';
  const errorColor = '#ff3b30';

  useEffect(() => {
    if (workspaceId) fetchNotifications(workspaceId);
  }, [workspaceId]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (workspaceId) await markAsRead(workspaceId, notificationId);
  };

  const handleDelete = async (notificationId: string) => {
    if (workspaceId) {
      Alert.alert('Delete Notification', 'Are you sure you want to delete this notification?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => await deleteNotification(workspaceId, notificationId) },
      ]);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={[styles.card, { backgroundColor: cardColor, opacity: item.read ? 0.6 : 1 }]}> 
      <Text style={[styles.title, { color: textColor }]}>{item.title}</Text>
      <Text style={[styles.message, { color: textColor }]}>{item.message}</Text>
      <View style={styles.actions}>
        {!item.read && (
          <TouchableOpacity onPress={() => handleMarkAsRead(item.notification_id)} style={[styles.actionButton, { backgroundColor: primaryColor }]}> 
            <Text style={styles.actionText}>Mark as Read</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleDelete(item.notification_id)} style={[styles.actionButton, { backgroundColor: errorColor }]}> 
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}> 
      {isLoading && <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 32 }} />}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text>
          <TouchableOpacity onPress={clearError} style={styles.clearButton}>
            <Text style={{ color: errorColor }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.notification_id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={!isLoading ? <Text style={{ color: textColor, textAlign: 'center', marginTop: 32 }}>No notifications</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { padding: 16, borderRadius: 8, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  message: { fontSize: 14, marginBottom: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionButton: { padding: 8, borderRadius: 8, marginLeft: 8 },
  actionText: { color: '#fff', fontSize: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 16, borderRadius: 8, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  errorText: { flex: 1, fontSize: 14 },
  clearButton: { marginLeft: 8 },
}); 