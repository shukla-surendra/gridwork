import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Modal,
    Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import taskService, { Task, TaskComment } from '../services/taskService';
import { useThemeColor } from '../hooks/useThemeColor';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';

// The backend has no task activity-log endpoint at all -- this tab always
// renders empty rather than being wired to a real data source. Left as-is
// (harmless empty state, not a crash) since building real activity
// tracking is a new feature, not a fix to something broken.
interface Activity {
    id: string;
    type: string;
    user: string;
    created_at: string;
    details: string;
}

export default function TaskDetailScreen() {
    const router = useRouter();
    const { taskId } = useLocalSearchParams<{ taskId?: string }>();
    const [task, setTask] = useState<Partial<Task>>({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [editing, setEditing] = useState(false);

    const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
    const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
    const borderColor = useThemeColor({ light: '#f0f0f0', dark: '#38383A' }, 'border');

    useEffect(() => {
        if (taskId) {
            loadTask();
        } else {
            setLoading(false);
        }
    }, [taskId]);

    const loadTask = async () => {
        try {
            const loadedTask = await taskService.get(taskId!);
            setTask(loadedTask);
        } catch (error) {
            console.error('Error loading task:', error);
            Alert.alert('Error', 'Failed to load task');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!task.title) {
            Alert.alert('Error', 'Title is required');
            return;
        }

        setSaving(true);
        try {
            if (taskId) {
                await taskService.update(taskId, task);
            } else {
                await taskService.create({
                    ...task,
                    title: task.title!, // already validated non-empty above
                    task_type: 'TASK',
                });
            }
            router.back();
        } catch (error) {
            console.error('Error saving task:', error);
            Alert.alert('Error', 'Failed to save task');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!taskId) return;

        try {
            await taskService.delete(taskId);
            router.back();
        } catch (error) {
            console.error('Error deleting task:', error);
            Alert.alert('Error', 'Failed to delete task');
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !taskId) return;

        try {
            // user_id is sourced from the logged-in profile inside
            // taskService.addComment itself -- no need to pass one here.
            await taskService.addComment(taskId, {
                content: newComment,
            });
            setNewComment('');
            loadTask(); // Refresh task data
        } catch (error) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', 'Failed to add comment');
        }
    };

    const handleDateSelect = () => {
        const today = new Date();
        const options = [
            { label: 'Today', value: today.toISOString() },
            { label: 'Tomorrow', value: new Date(today.setDate(today.getDate() + 1)).toISOString() },
            { label: 'Next Week', value: new Date(today.setDate(today.getDate() + 7)).toISOString() },
            { label: 'No Due Date', value: '' },
        ];

        Alert.alert(
            'Select Due Date',
            '',
            options.map(option => ({
                text: option.label,
                onPress: () => setTask({ ...task, due_on: option.value }),
            }))
        );
    };

    const renderDetailsTab = () => (
        <View style={styles.form}>
            <TextInput
                style={[styles.input, { color: textColor, borderColor }]}
                placeholder="Title"
                placeholderTextColor="#999"
                value={task.title}
                onChangeText={(text) => setTask({ ...task, title: text })}
                editable={editing}
            />
            <TextInput
                style={[styles.input, styles.textArea, { color: textColor, borderColor }]}
                placeholder="Description"
                placeholderTextColor="#999"
                value={task.description}
                onChangeText={(text) => setTask({ ...task, description: text })}
                multiline
                numberOfLines={4}
                editable={editing}
            />
            
            <View style={[styles.section, { borderBottomColor: borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Status</Text>
                <View style={styles.statusContainer}>
                    {['todo', 'in_progress', 'done'].map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.statusButton,
                                task.status === status && styles.statusButtonActive,
                            ]}
                            onPress={() => setTask({ ...task, status: status as Task['status'] })}
                            disabled={!editing}
                        >
                            <Text
                                style={[
                                    styles.statusText,
                                    task.status === status && styles.statusTextActive,
                                ]}
                            >
                                {status.replace('_', ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={[styles.section, { borderBottomColor: borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Priority</Text>
                <View style={styles.priorityContainer}>
                    {['low', 'medium', 'high'].map((priority) => (
                        <TouchableOpacity
                            key={priority}
                            style={[
                                styles.priorityButton,
                                task.priority === priority && styles.priorityButtonActive,
                            ]}
                            onPress={() =>
                                setTask({ ...task, priority: priority as Task['priority'] })
                            }
                            disabled={!editing}
                        >
                            <Text
                                style={[
                                    styles.priorityText,
                                    task.priority === priority && styles.priorityTextActive,
                                ]}
                            >
                                {priority}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={[styles.section, { borderBottomColor: borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Story Points</Text>
                <Picker
                    selectedValue={task.story_points}
                    onValueChange={(value: number) => setTask({ ...task, story_points: value })}
                    enabled={editing}
                >
                    {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                        <Picker.Item key={points} label={points.toString()} value={points} />
                    ))}
                </Picker>
            </View>

            <View style={[styles.section, { borderBottomColor: borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Due Date</Text>
                <TouchableOpacity
                    style={[styles.dateButton, { borderColor }]}
                    onPress={handleDateSelect}
                    disabled={!editing}
                >
                    <Text style={{ color: textColor }}>
                        {task.due_on ? format(new Date(task.due_on), 'MMM d, yyyy') : 'Set due date'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderCommentsTab = () => (
        <View style={styles.commentsContainer}>
            {task.comments?.map((comment: TaskComment) => (
                <View key={comment.comment_id} style={[styles.comment, { borderColor }]}>
                    <View style={styles.commentHeader}>
                        <Text style={[styles.commentUser, { color: textColor }]}>
                            {comment.user ? `${comment.user.first_name} ${comment.user.last_name}` : 'Unknown'}
                        </Text>
                        <Text style={[styles.commentDate, { color: textColor }]}>
                            {format(new Date(comment.created_at), 'MMM d, yyyy')}
                        </Text>
                    </View>
                    <Text style={[styles.commentContent, { color: textColor }]}>
                        {comment.content}
                    </Text>
                </View>
            ))}
            <View style={[styles.commentInput, { borderColor }]}>
                <TextInput
                    style={[styles.input, { color: textColor }]}
                    placeholder="Add a comment..."
                    placeholderTextColor="#999"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                />
                <TouchableOpacity
                    style={styles.commentButton}
                    onPress={handleAddComment}
                    disabled={!newComment.trim()}
                >
                    <Text style={styles.commentButtonText}>Post</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // No backend endpoint backs this yet -- always empty (see the Task
    // import note above), kept as a placeholder tab rather than removed.
    const activityLog: Activity[] = [];

    const renderActivityTab = () => (
        <View style={styles.activityContainer}>
            {activityLog.map((activity) => (
                <View key={activity.id} style={[styles.activityItem, { borderColor }]}>
                    <View style={styles.activityHeader}>
                        <Text style={[styles.activityUser, { color: textColor }]}>
                            {activity.user}
                        </Text>
                        <Text style={[styles.activityDate, { color: textColor }]}>
                            {format(new Date(activity.created_at), 'MMM d, yyyy')}
                        </Text>
                    </View>
                    <Text style={[styles.activityType, { color: textColor }]}>
                        {activity.type}
                    </Text>
                    <Text style={[styles.activityDetails, { color: textColor }]}>
                        {activity.details}
                    </Text>
                </View>
            ))}
        </View>
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={textColor} />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    {taskId && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowDeleteModal(true)}
                        >
                            <Ionicons name="trash-outline" size={24} color="#ff3b30" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setEditing(!editing)}
                    >
                        <Ionicons
                            name={editing ? 'checkmark-outline' : 'create-outline'}
                            size={24}
                            color={textColor}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.tabs}>
                {['details', 'comments', 'activity'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.tab,
                            activeTab === tab && styles.activeTab,
                            { borderColor },
                        ]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === tab && styles.activeTabText,
                                { color: textColor },
                            ]}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.content}>
                {activeTab === 'details' && renderDetailsTab()}
                {activeTab === 'comments' && renderCommentsTab()}
                {activeTab === 'activity' && renderActivityTab()}
            </ScrollView>

            {editing && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: '#007AFF' }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor }]}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>
                            Delete Task
                        </Text>
                        <Text style={[styles.modalText, { color: textColor }]}>
                            Are you sure you want to delete this task? This action cannot be undone.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor }]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={{ color: textColor }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.deleteButton]}
                                onPress={handleDelete}
                            >
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        borderBottomWidth: 1,
    },
    headerActions: {
        flexDirection: 'row',
    },
    actionButton: {
        marginLeft: 16,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#007AFF',
    },
    content: {
        flex: 1,
    },
    form: {
        padding: 16,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 15,
    },
    section: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statusButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginHorizontal: 4,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    statusButtonActive: {
        backgroundColor: '#007AFF',
    },
    statusText: {
        fontSize: 14,
        color: '#666',
    },
    statusTextActive: {
        color: '#fff',
    },
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginHorizontal: 4,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    priorityButtonActive: {
        backgroundColor: '#007AFF',
    },
    priorityText: {
        fontSize: 14,
        color: '#666',
    },
    priorityTextActive: {
        color: '#fff',
    },
    dateButton: {
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        justifyContent: 'center',
    },
    commentsContainer: {
        padding: 16,
    },
    comment: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    commentUser: {
        fontWeight: '600',
    },
    commentDate: {
        fontSize: 12,
    },
    commentContent: {
        fontSize: 14,
    },
    commentInput: {
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 16,
    },
    commentButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    commentButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    activityContainer: {
        padding: 16,
    },
    activityItem: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    activityUser: {
        fontWeight: '600',
    },
    activityDate: {
        fontSize: 12,
    },
    activityType: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    activityDetails: {
        fontSize: 14,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    saveButton: {
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginLeft: 12,
        borderWidth: 1,
    },
    deleteButton: {
        backgroundColor: '#ff3b30',
        borderColor: '#ff3b30',
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
}); 