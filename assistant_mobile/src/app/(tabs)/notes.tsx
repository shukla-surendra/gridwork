import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import taskService, { Task } from '../../services/taskService';
import { Ionicons } from '@expo/vector-icons';

// This used to go through NotesService, a pure-local AsyncStorage store
// with an incompatible shape (getNotes()/addNote()/deleteNote(id)) that
// never touched the backend at all -- notes are just Task rows with
// task_type: 'NOTE' (the same generic-entity pattern used for Timeblocks),
// served by the real workspace-scoped tasks API via taskService.
export default function NotesScreen() {
    const [notes, setNotes] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [newNote, setNewNote] = useState({ title: '', description: '' });

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedNotes = await taskService.getAllNotes();
            setNotes(fetchedNotes);
        } catch (error) {
            console.error('Error loading notes:', error);
            setError('Failed to load notes. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNote = async () => {
        if (!newNote.title.trim() || !newNote.description.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            const createdNote = await taskService.create({
                title: newNote.title.trim(),
                description: newNote.description.trim(),
                task_type: 'NOTE',
            });
            setNotes([createdNote, ...notes]);
            setModalVisible(false);
            setNewNote({ title: '', description: '' });
        } catch (error) {
            console.error('Error creating note:', error);
            Alert.alert('Error', 'Failed to create note. Please try again.');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await taskService.delete(noteId);
            setNotes(notes.filter(note => note.task_id !== noteId));
        } catch (error) {
            console.error('Error deleting note:', error);
            Alert.alert('Error', 'Failed to delete note. Please try again.');
        }
    };

    const renderNote = ({ item }: { item: Task }) => (
        <ThemedView type="card" style={styles.noteCard}>
            <View style={styles.noteContentContainer}>
                <View style={styles.noteHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.noteTitle}>{item.title}</ThemedText>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteNote(item.task_id)}
                    >
                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                <ThemedText style={styles.noteDescription}>{item.description}</ThemedText>
            </View>
            <View style={styles.noteFooter}>
                <View style={styles.noteMeta}>
                    <View style={[styles.statusBadge, item.status === 'todo' ? styles.statusTodo : styles.statusDone]}>
                        <ThemedText style={styles.statusText}>{item.status}</ThemedText>
                    </View>
                    {item.updated_at && (
                        <ThemedText style={styles.noteDate}>
                            {new Date(item.updated_at).toLocaleDateString()}
                        </ThemedText>
                    )}
                </View>
            </View>
        </ThemedView>
    );

    if (loading) {
        return (
            <ThemedView style={styles.container}>
                <ActivityIndicator size="large" color="#007AFF" />
            </ThemedView>
        );
    }

    if (error) {
        return (
            <ThemedView style={styles.container}>
                <ThemedText type="title" style={styles.errorText}>{error}</ThemedText>
                <TouchableOpacity style={styles.retryButton} onPress={loadNotes}>
                    <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <FlatList
                data={notes}
                renderItem={renderNote}
                keyExtractor={item => item.task_id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <ThemedView style={styles.emptyContainer}>
                        <ThemedText>No notes yet. Create your first note!</ThemedText>
                    </ThemedView>
                }
            />

            <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <ThemedView type="card" style={styles.modalContent}>
                        <ThemedText type="title" style={styles.modalTitle}>New Note</ThemedText>
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Title"
                            value={newNote.title}
                            onChangeText={text => setNewNote({ ...newNote, title: text })}
                        />
                        
                        <TextInput
                            style={[styles.input, styles.contentInput]}
                            placeholder="Description"
                            value={newNote.description}
                            onChangeText={text => setNewNote({ ...newNote, description: text })}
                            multiline
                            numberOfLines={4}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={handleCreateNote}
                            >
                                <ThemedText style={styles.buttonText}>Create</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </ThemedView>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
    },
    noteCard: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    noteContentContainer: {
        padding: 16,
    },
    noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    noteTitle: {
        fontSize: 18,
        flex: 1,
        marginRight: 8,
    },
    deleteButton: {
        padding: 4,
    },
    noteDescription: {
        fontSize: 15,
        lineHeight: 22,
        color: '#666',
    },
    noteFooter: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    noteMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 60,
        alignItems: 'center',
    },
    statusTodo: {
        backgroundColor: '#FFE4E4',
    },
    statusDone: {
        backgroundColor: '#E4FFE4',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    noteDate: {
        fontSize: 12,
        color: '#999',
    },
    addButton: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: {
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    contentInput: {
        height: 120,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#E5E5EA',
    },
    createButton: {
        backgroundColor: '#007AFF',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignSelf: 'center',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
}); 