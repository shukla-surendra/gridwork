import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAssistantStore } from '../../store/assistantStore';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function ThemeSettingsScreen() {
  const { settings, updateThemeSettings, isLoading, error, clearError } = useAssistantStore();
  const [theme, setTheme] = useState('light');
  const [accentColor, setAccentColor] = useState('#007AFF');
  const [fontSize, setFontSize] = useState('medium');

  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const cardColor = useThemeColor({ light: '#f0f0f0', dark: '#1C1C1E' }, 'background');
  const primaryColor = '#007AFF';
  const errorColor = '#ff3b30';

  useEffect(() => {
    if (settings?.theme_settings) {
      setTheme(settings.theme_settings.theme || 'light');
      setAccentColor(settings.theme_settings.accent_color || '#007AFF');
      setFontSize(settings.theme_settings.font_size || 'medium');
    }
  }, [settings]);

  const handleSave = async () => {
    const updatedSettings = {
      theme,
      accent_color: accentColor,
      font_size: fontSize,
    };
    await updateThemeSettings(updatedSettings);
    Alert.alert('Success', 'Theme settings updated');
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
        <Text style={[styles.label, { color: textColor }]}>Theme</Text>
        <View style={styles.themeContainer}>
          <TouchableOpacity
            style={[styles.themeButton, { backgroundColor: theme === 'light' ? primaryColor : 'transparent' }]}
            onPress={() => setTheme('light')}
          >
            <Text style={{ color: theme === 'light' ? '#fff' : textColor }}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.themeButton, { backgroundColor: theme === 'dark' ? primaryColor : 'transparent' }]}
            onPress={() => setTheme('dark')}
          >
            <Text style={{ color: theme === 'dark' ? '#fff' : textColor }}>Dark</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.label, { color: textColor }]}>Accent Color</Text>
        <View style={styles.colorContainer}>
          {['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#5856D6'].map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorButton, { backgroundColor: color }]}
              onPress={() => setAccentColor(color)}
            />
          ))}
        </View>
        <Text style={[styles.label, { color: textColor }]}>Font Size</Text>
        <View style={styles.fontContainer}>
          <TouchableOpacity
            style={[styles.fontButton, { backgroundColor: fontSize === 'small' ? primaryColor : 'transparent' }]}
            onPress={() => setFontSize('small')}
          >
            <Text style={{ color: fontSize === 'small' ? '#fff' : textColor }}>Small</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fontButton, { backgroundColor: fontSize === 'medium' ? primaryColor : 'transparent' }]}
            onPress={() => setFontSize('medium')}
          >
            <Text style={{ color: fontSize === 'medium' ? '#fff' : textColor }}>Medium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fontButton, { backgroundColor: fontSize === 'large' ? primaryColor : 'transparent' }]}
            onPress={() => setFontSize('large')}
          >
            <Text style={{ color: fontSize === 'large' ? '#fff' : textColor }}>Large</Text>
          </TouchableOpacity>
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
  themeContainer: { flexDirection: 'row', marginBottom: 16 },
  themeButton: { flex: 1, padding: 8, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  colorContainer: { flexDirection: 'row', marginBottom: 16 },
  colorButton: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  fontContainer: { flexDirection: 'row', marginBottom: 16 },
  fontButton: { flex: 1, padding: 8, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  saveButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 16, borderRadius: 8, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  errorText: { flex: 1, fontSize: 14 },
  clearButton: { marginLeft: 8 },
}); 