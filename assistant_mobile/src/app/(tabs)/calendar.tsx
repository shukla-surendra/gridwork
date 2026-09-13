import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function CalendarScreen() {
    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title">Calendar</ThemedText>
            <ThemedText>Coming soon...</ThemedText>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
}); 