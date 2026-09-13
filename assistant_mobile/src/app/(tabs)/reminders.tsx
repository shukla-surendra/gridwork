import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useReminderStore } from '../../store/reminderStore';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function RemindersScreen() {
  const [message, setMessage] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const {
    reminders,
    isLoading,
    error,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    clearError,
  } = useReminderStore();

  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const cardColor = useThemeColor({ light: '#f0f0f0', dark: '#1C1C1E' }, 'background');
  const primaryColor = '#007AFF';
  const errorColor = '#ff3b30';

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreate = async () => {
    if (!message || !remindAt) return;
    await createReminder({ message, remind_at: remindAt });
    setMessage('');
    setRemindAt('');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteReminder(id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}> 
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text>
          <TouchableOpacity onPress={clearError} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={errorColor} />
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.inputContainer, { backgroundColor: cardColor }]}> 
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Reminder message"
          placeholderTextColor="#888"
        />
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={remindAt}
          onChangeText={setRemindAt}
          placeholder="Remind at (ISO)"
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: primaryColor }]} onPress={handleCreate}>
          <Ionicons name="add" size={24} color={backgroundColor} />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <ActivityIndicator color={primaryColor} />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.reminderCard, { backgroundColor: cardColor }]}> 
              <Text style={[styles.reminderText, { color: textColor }]}>{item.message}</Text>
              <Text style={[styles.reminderDate, { color: textColor }]}>{item.remind_at}</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash" size={20} color={errorColor} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderRadius: 8, padding: 8 },
  input: { flex: 1, minHeight: 40, padding: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  addButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  reminderCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginBottom: 8 },
  reminderText: { fontSize: 16, flex: 1 },
  reminderDate: { fontSize: 12, marginLeft: 8, marginRight: 8 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 16, borderRadius: 8, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  errorText: { flex: 1, fontSize: 14 },
  clearButton: { marginLeft: 8 },
}); 