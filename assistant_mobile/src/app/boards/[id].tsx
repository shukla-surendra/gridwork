import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useBoardStore } from '../../store/boardStore';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { useTheme } from '../../hooks/useTheme';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams();
  const { currentBoard, isLoading, error, fetchBoard, fetchBoardItems, addBoardItem, updateBoardItem, removeBoardItem } = useBoardStore();
  const workspaceId = useWorkspaceId();
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (workspaceId && id) {
      fetchBoard(workspaceId, id as string);
      fetchBoardItems(workspaceId, id as string);
    }
  }, [workspaceId, id]);

  const handleRefresh = async () => {
    if (!workspaceId || !id) return;
    setIsRefreshing(true);
    await Promise.all([
      fetchBoard(workspaceId, id as string),
      fetchBoardItems(workspaceId, id as string),
    ]);
    setIsRefreshing(false);
  };

  const handleAddItem = () => {
    router.push(`/boards/${id}/items/create`);
  };

  const handleItemPress = (itemId: string) => {
    router.push(`/boards/${id}/items/${itemId}`);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!workspaceId || !id) return;

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
              await removeBoardItem(workspaceId, id as string, itemId);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleRefresh}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.background }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentBoard) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>Board not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{currentBoard.name}</Text>
          {currentBoard.description && (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {currentBoard.description}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleAddItem}
        >
          <Ionicons name="add" size={24} color={theme.colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentBoard.items}
        keyExtractor={(item) => item.item_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.itemCard, { backgroundColor: theme.colors.card }]}
            onPress={() => handleItemPress(item.item_id)}
          >
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.title}</Text>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item.item_id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            {item.description && (
              <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.itemFooter}>
              {item.status && (
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.statusText, { color: theme.colors.background }]}>{item.status}</Text>
                </View>
              )}
              {item.due_date && (
                <View style={styles.dueDate}>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.dueDateText, { color: theme.colors.textSecondary }]}>
                    {new Date(item.due_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No items yet</Text>
            <TouchableOpacity
              style={[styles.addEmptyButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleAddItem}
            >
              <Text style={[styles.addEmptyButtonText, { color: theme.colors.background }]}>Add Item</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
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
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  itemDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  addEmptyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addEmptyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 