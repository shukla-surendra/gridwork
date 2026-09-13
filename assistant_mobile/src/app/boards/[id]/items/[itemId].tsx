import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useBoardStore } from '../../../../store/boardStore';
import { useWorkspaceId } from '../../../../hooks/useWorkspaceId';
import { useTheme } from '../../../../hooks/useTheme';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function BoardItemDetailScreen() {
  const { id, itemId } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [dueDate, setDueDate] = useState('');
  const { currentBoard, updateBoardItem, removeBoardItem } = useBoardStore();
  const workspaceId = useWorkspaceId();
  const { theme } = useTheme();

  useEffect(() => {
    if (currentBoard?.items) {
      const item = currentBoard.items.find((i) => i.item_id === itemId);
      if (item) {
        setTitle(item.title);
        setDescription(item.description || '');
        setStatus(item.status || '');
        setDueDate(item.due_date || '');
      }
    }
  }, [currentBoard, itemId]);

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an item title');
      return;
    }

    if (!workspaceId || !id || !itemId) {
      Alert.alert('Error', 'No workspace, board, or item selected');
      return;
    }

    try {
      await updateBoardItem(workspaceId, id as string, itemId as string, {
        title: title.trim(),
        description: description.trim(),
        status: status.trim() || undefined,
        due_date: dueDate.trim() || undefined,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update item');
    }
  };

  const handleDelete = () => {
    if (!workspaceId || !id || !itemId) {
      Alert.alert('Error', 'No workspace, board, or item selected');
      return;
    }

    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBoardItem(workspaceId, id as string, itemId as string);
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Edit Item</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Title</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter item title"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter item description"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Status</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }]}
            value={status}
            onChangeText={setStatus}
            placeholder="Enter item status (optional)"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Due Date</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }]}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="Enter due date (YYYY-MM-DD)"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.updateButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleUpdate}
        >
          <Text style={[styles.updateButtonText, { color: theme.colors.background }]}>Update Item</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  updateButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 