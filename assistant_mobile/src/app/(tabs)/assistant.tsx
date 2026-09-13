import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useAssistantStore } from '../../store/assistantStore';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function AssistantScreen() {
  const [command, setCommand] = useState('');
  const {
    settings,
    isLoading,
    error,
    lastResponse,
    fetchSettings,
    processCommand,
    clearError,
  } = useAssistantStore();

  // Use theme colors
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const cardColor = useThemeColor({ light: '#f0f0f0', dark: '#1C1C1E' }, 'background');
  const primaryColor = '#007AFF'; // You can also import from constants if needed
  const errorColor = '#ff3b30';
  const textSecondary = '#888';

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async () => {
    if (command.trim()) {
      await processCommand(command);
      setCommand('');
    }
  };

  const renderResponse = () => {
    if (!lastResponse) return null;

    if (lastResponse.requires_clarification) {
      return (
        <View style={styles.clarificationContainer}>
          <Text style={[styles.clarificationTitle, { color: textColor }]}>I need some clarification:</Text>
          {lastResponse.questions?.map((question, index) => (
            <Text key={index} style={[styles.question, { color: textColor }]}>• {question}</Text>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.responseContainer}>
        <Text style={[styles.message, { color: textColor }]}>{lastResponse.message}</Text>
        {lastResponse.data && Object.keys(lastResponse.data).length > 0 && (
          <View style={styles.dataContainer}>
            <Text style={[styles.dataTitle, { color: textColor }]}>Details:</Text>
            {Object.entries(lastResponse.data).map(([key, value]) => (
              <Text key={key} style={[styles.dataItem, { color: textColor }]}>
                {key}: {JSON.stringify(value)}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text>
            <TouchableOpacity onPress={clearError} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={errorColor} />
            </TouchableOpacity>
          </View>
        )}
        {renderResponse()}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: cardColor }]}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={command}
          onChangeText={setCommand}
          placeholder="Type your command..."
          placeholderTextColor={textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: primaryColor }]}
          onPress={handleSubmit}
          disabled={isLoading || !command.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color={backgroundColor} />
          ) : (
            <Ionicons name="send" size={24} color={backgroundColor} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  responseContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
  },
  dataContainer: {
    marginTop: 8,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dataItem: {
    fontSize: 14,
    marginBottom: 2,
  },
  clarificationContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  clarificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  question: {
    fontSize: 14,
    marginBottom: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  clearButton: {
    marginLeft: 8,
  },
}); 