import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import taskService, { Task } from '../../services/taskService';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function TasksScreen() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
    const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
    const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#38383A' }, 'border');

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const tasks = await taskService.getAll();
            setTasks(tasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
            Alert.alert('Error', 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleTaskPress = (task: Task) => {
        router.push({
            pathname: '/task-detail',
            params: { taskId: task.task_id }
        });
    };

    const handleAddTask = () => {
        router.push({
            pathname: '/task-detail'
        });
    };

    const renderTaskItem = ({ item }: { item: Task }) => (
        <TouchableOpacity
            style={[styles.taskItem, { borderBottomColor: borderColor }]}
            onPress={() => handleTaskPress(item)}
        >
            <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, { color: textColor }]}>{item.title}</Text>
                {item.description && (
                    <Text style={[styles.taskDescription, { color: textColor }]}>
                        {item.description}
                    </Text>
                )}
                <View style={styles.taskMeta}>
                    <Text style={[styles.taskStatus, { color: textColor }]}>
                        {item.status.replace('_', ' ')}
                    </Text>
                    {item.due_on && (
                        <Text style={[styles.taskDueDate, { color: textColor }]}>
                            Due: {new Date(item.due_on).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor }]}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <FlatList
                data={tasks}
                renderItem={renderTaskItem}
                keyExtractor={(item) => item.task_id}
                contentContainerStyle={styles.listContainer}
            />
            <TouchableOpacity
                style={[styles.addButton, { backgroundColor: '#007AFF' }]}
                onPress={handleAddTask}
            >
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    taskDescription: {
        fontSize: 14,
        marginBottom: 8,
    },
    taskMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    taskStatus: {
        fontSize: 12,
        textTransform: 'capitalize',
    },
    taskDueDate: {
        fontSize: 12,
    },
    addButton: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
}); 