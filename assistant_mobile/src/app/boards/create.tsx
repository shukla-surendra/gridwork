import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useBoardStore } from '../../store/boardStore';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { useTheme } from '../../hooks/useTheme';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CreateBoardScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const { addBoard } = useBoardStore();
  const workspaceId = useWorkspaceId();
  const { theme } = useTheme();

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a board title');
      return;
    }

    if (!workspaceId) {
      Alert.alert('Error', 'No workspace selected');
      return;
    }

    try {
      await addBoard(workspaceId, {
        name: title.trim(),
        description: description.trim(),
        properties: { is_template: isTemplate, is_public: isPublic },
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create board');
    }
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Create Board</Text>
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
            placeholder="Enter board title"
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
            placeholder="Enter board description"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={styles.option}
            onPress={() => setIsTemplate(!isTemplate)}
          >
            <View style={[styles.checkbox, { 
              backgroundColor: isTemplate ? theme.colors.primary : theme.colors.card,
              borderColor: theme.colors.border,
            }]}>
              {isTemplate && (
                <Ionicons name="checkmark" size={16} color={theme.colors.background} />
              )}
            </View>
            <Text style={[styles.optionText, { color: theme.colors.text }]}>Use as template</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={[styles.checkbox, { 
              backgroundColor: isPublic ? theme.colors.primary : theme.colors.card,
              borderColor: theme.colors.border,
            }]}>
              {isPublic && (
                <Ionicons name="checkmark" size={16} color={theme.colors.background} />
              )}
            </View>
            <Text style={[styles.optionText, { color: theme.colors.text }]}>Make public</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreate}
        >
          <Text style={[styles.createButtonText, { color: theme.colors.background }]}>Create Board</Text>
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
  options: {
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 