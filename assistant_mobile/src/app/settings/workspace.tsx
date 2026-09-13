import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { useAssistantStore } from '../../store/assistantStore';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function WorkspaceSettingsScreen() {
  const { settings, updateWorkspaceSettings, isLoading, error, clearError } = useAssistantStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultView, setDefaultView] = useState('board');
  const [autoArchive, setAutoArchive] = useState(false);
  const [archiveDays, setArchiveDays] = useState('30');

  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const cardColor = useThemeColor({ light: '#f0f0f0', dark: '#1C1C1E' }, 'background');
  const primaryColor = '#007AFF';
  const errorColor = '#ff3b30';

  useEffect(() => {
    if (settings?.workspace_settings) {
      setName(settings.workspace_settings.name || '');
      setDescription(settings.workspace_settings.description || '');
      setDefaultView(settings.workspace_settings.default_view || 'board');
      setAutoArchive(settings.workspace_settings.auto_archive || false);
      setArchiveDays(settings.workspace_settings.archive_days?.toString() || '30');
    }
  }, [settings]);

  const handleSave = async () => {
    const updatedSettings = {
      name,
      description,
      default_view: defaultView,
      auto_archive: autoArchive,
      archive_days: parseInt(archiveDays, 10),
    };
    await updateWorkspaceSettings(updatedSettings);
    Alert.alert('Success', 'Workspace settings updated');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text>
          <TouchableOpacity onPress={clearError} style={styles.clearButton}>
            <Text style={{ color: errorColor }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.label, { color: textColor }]}>Workspace Name</Text>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={name}
          onChangeText={setName}
          placeholder="Enter workspace name"
          placeholderTextColor="#888"
        />
        <Text style={[styles.label, { color: textColor }]}>Description</Text>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter workspace description"
          placeholderTextColor="#888"
        />
        <Text style={[styles.label, { color: textColor }]}>Default View</Text>
        <View style={styles.viewContainer}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: defaultView === 'board' ? primaryColor : 'transparent' }]}
            onPress={() => setDefaultView('board')}
          >
            <Text style={{ color: defaultView === 'board' ? '#fff' : textColor }}>Board</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: defaultView === 'list' ? primaryColor : 'transparent' }]}
            onPress={() => setDefaultView('list')}
          >
            <Text style={{ color: defaultView === 'list' ? '#fff' : textColor }}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: defaultView === 'calendar' ? primaryColor : 'transparent' }]}
            onPress={() => setDefaultView('calendar')}
          >
            <Text style={{ color: defaultView === 'calendar' ? '#fff' : textColor }}>Calendar</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.label, { color: textColor }]}>Auto Archive</Text>
        <Switch value={autoArchive} onValueChange={setAutoArchive} />
        <Text style={[styles.label, { color: textColor }]}>Archive Days</Text>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={archiveDays}
          onChangeText={setArchiveDays}
          placeholder="Enter archive days"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />
      </View>
      <TouchableOpacity style={[styles.saveButton, { backgroundColor: primaryColor }]} onPress={handleSave} disabled={isLoading}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { padding: 16, borderRadius: 8, marginBottom: 16 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { height: 40, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 8, marginBottom: 16 },
  viewContainer: { flexDirection: 'row', marginBottom: 16 },
  viewButton: { flex: 1, padding: 8, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  saveButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 16, borderRadius: 8, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  errorText: { flex: 1, fontSize: 14 },
  clearButton: { marginLeft: 8 },
}); 