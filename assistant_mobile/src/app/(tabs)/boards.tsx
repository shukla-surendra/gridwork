import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useBoardStore } from '../../store/boardStore';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { router } from 'expo-router';

export default function BoardsScreen() {
  const { boards, isLoading, error, fetchBoards } = useBoardStore();
  const workspaceId = useWorkspaceId();
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      fetchBoards(workspaceId);
    }
  }, [workspaceId]);

  const handleRefresh = async () => {
    if (!workspaceId) return;
    setIsRefreshing(true);
    await fetchBoards(workspaceId);
    setIsRefreshing(false);
  };

  const handleCreateBoard = () => {
    router.push('/boards/create');
  };

  const handleBoardPress = (boardId: string) => {
    router.push(`/boards/${boardId}`);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Boards</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreateBoard}
        >
          <Ionicons name="add" size={24} color={theme.colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={boards}
        keyExtractor={(item) => item.board_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.boardCard, { backgroundColor: theme.colors.card }]}
            onPress={() => handleBoardPress(item.board_id)}
          >
            <View style={styles.boardHeader}>
              <Text style={[styles.boardTitle, { color: theme.colors.text }]}>{item.name}</Text>
              {item.properties?.is_template && (
                <View style={[styles.templateBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.templateText, { color: theme.colors.background }]}>Template</Text>
                </View>
              )}
            </View>
            {item.description && (
              <Text style={[styles.boardDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.boardFooter}>
              <View style={styles.boardStats}>
                <Ionicons name="list" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {item.items?.length || 0} items
                </Text>
              </View>
              {item.properties?.is_public && (
                <View style={styles.boardStats}>
                  <Ionicons name="globe" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>Public</Text>
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
            <Ionicons name="grid-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No boards yet</Text>
            <TouchableOpacity
              style={[styles.createEmptyButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateBoard}
            >
              <Text style={[styles.createEmptyButtonText, { color: theme.colors.background }]}>Create Board</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  boardCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  templateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  templateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  boardDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  boardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
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
  createEmptyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createEmptyButtonText: {
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