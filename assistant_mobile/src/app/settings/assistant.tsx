import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { useAssistantStore } from '../../store/assistantStore';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function AssistantSettingsScreen() {
  const { settings, updateAssistantSettings, isLoading, error, clearError } = useAssistantStore();
  const [name, setName] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceGender, setVoiceGender] = useState('');
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [desktopNotifications, setDesktopNotifications] = useState(false);

  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const cardColor = useThemeColor({ light: '#f0f0f0', dark: '#1C1C1E' }, 'background');
  const primaryColor = '#007AFF';
  const errorColor = '#ff3b30';

  useEffect(() => {
    if (settings?.assistant_settings) {
      setName(settings.assistant_settings.name || '');
      setVoiceEnabled(settings.assistant_settings.voice_enabled || false);
      setVoiceGender(settings.assistant_settings.voice_gender || '');
      setLanguage(settings.assistant_settings.language || '');
      setTimezone(settings.assistant_settings.timezone || '');
      setEmailNotifications(settings.assistant_settings.notification_preferences?.email || false);
      setPushNotifications(settings.assistant_settings.notification_preferences?.push || false);
      setDesktopNotifications(settings.assistant_settings.notification_preferences?.desktop || false);
    }
  }, [settings]);

  const handleSave = async () => {
    const updatedSettings = {
      name,
      voice_enabled: voiceEnabled,
      voice_gender: voiceGender,
      language,
      timezone,
      notification_preferences: {
        email: emailNotifications,
        push: pushNotifications,
        desktop: desktopNotifications,
      },
    };
    await updateAssistantSettings(updatedSettings);
    Alert.alert('Success', 'Assistant settings updated');
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
        <Text style={[styles.label, { color: textColor }]}>Assistant Name</Text>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={name}
          onChangeText={setName}
          placeholder="Enter assistant name"
          placeholderTextColor="#888"
        />
        <Text style={[styles.label, { color: textColor }]}>Voice Enabled</Text>
        <Switch value={voiceEnabled} onValueChange={setVoiceEnabled} />
        <Text style={[styles.label, { color: textColor }]}>Voice Gender</Text>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={voiceGender}
          onChangeText={setVoiceGender}
          placeholder="Enter voice gender"
          placeholderTextColor="#888"
        />
        <Text style={[styles.label, { color: textColor }]}>Language</Text>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={language}
          onChangeText={setLanguage}
          placeholder="Enter language"
          placeholderTextColor="#888"
        />
        <Text style={[styles.label, { color: textColor }]}>Timezone</Text>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={timezone}
          onChangeText={setTimezone}
          placeholder="Enter timezone"
          placeholderTextColor="#888"
        />
        <Text style={[styles.label, { color: textColor }]}>Notification Preferences</Text>
        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: textColor }]}>Email</Text>
          <Switch value={emailNotifications} onValueChange={setEmailNotifications} />
        </View>
        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: textColor }]}>Push</Text>
          <Switch value={pushNotifications} onValueChange={setPushNotifications} />
        </View>
        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: textColor }]}>Desktop</Text>
          <Switch value={desktopNotifications} onValueChange={setDesktopNotifications} />
        </View>
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
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  switchLabel: { fontSize: 16 },
  saveButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 16, borderRadius: 8, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  errorText: { flex: 1, fontSize: 14 },
  clearButton: { marginLeft: 8 },
}); 