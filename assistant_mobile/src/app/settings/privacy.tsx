import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAssistantStore } from '../../store/assistantStore';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function PrivacySettingsScreen() {
  const { settings, updatePrivacySettings, isLoading, error, clearError } = useAssistantStore();
  const [dataCollection, setDataCollection] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [thirdPartySharing, setThirdPartySharing] = useState(false);

  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const cardColor = useThemeColor({ light: '#f0f0f0', dark: '#1C1C1E' }, 'background');
  const primaryColor = '#007AFF';
  const errorColor = '#ff3b30';

  useEffect(() => {
    if (settings?.privacy_settings) {
      setDataCollection(settings.privacy_settings.data_collection || false);
      setAnalytics(settings.privacy_settings.analytics || false);
      setLocationTracking(settings.privacy_settings.location_tracking || false);
      setThirdPartySharing(settings.privacy_settings.third_party_sharing || false);
    }
  }, [settings]);

  const handleSave = async () => {
    const updatedSettings = {
      data_collection: dataCollection,
      analytics,
      location_tracking: locationTracking,
      third_party_sharing: thirdPartySharing,
    };
    await updatePrivacySettings(updatedSettings);
    Alert.alert('Success', 'Privacy settings updated');
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
        <Text style={[styles.label, { color: textColor }]}>Data Collection</Text>
        <Switch value={dataCollection} onValueChange={setDataCollection} />
        <Text style={[styles.label, { color: textColor }]}>Analytics</Text>
        <Switch value={analytics} onValueChange={setAnalytics} />
        <Text style={[styles.label, { color: textColor }]}>Location Tracking</Text>
        <Switch value={locationTracking} onValueChange={setLocationTracking} />
        <Text style={[styles.label, { color: textColor }]}>Third-Party Sharing</Text>
        <Switch value={thirdPartySharing} onValueChange={setThirdPartySharing} />
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
  saveButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 16, borderRadius: 8, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  errorText: { flex: 1, fontSize: 14 },
  clearButton: { marginLeft: 8 },
}); 