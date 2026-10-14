import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator,
} from 'react-native';
// @ts-ignore
import {
    BotMessageSquare, Send, Sparkles, Heart,
} from 'lucide-react-native';
import { useAIChat } from '../../hooks/useAIChat';

const QUICK_PROMPTS = [
    'What does my blood pressure reading mean?',
    'Tips for managing cold and fever',
    'When should I take my medications?',
    'Is my blood sugar level normal?',
];

export default function HealthChatScreen() {
    const { messages, loading, initializing, sendMessage } = useAIChat('patient_health');
    const [inputText, setInputText] = useState('');

    const handleSend = async (text?: string) => {
        const msg = text || inputText.trim();
        if (!msg) return;
        setInputText('');
        await sendMessage(msg);
    };

    if (initializing) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#059669" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
                {messages.length <= 1 && (
                    <View style={styles.promptSection}>
                        <View style={styles.promptHeader}>
                            <Sparkles size={16} color="#059669" />
                            <Text style={styles.promptTitle}>Ask Me Anything</Text>
                        </View>
                        {QUICK_PROMPTS.map((p, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.promptChip}
                                onPress={() => handleSend(p)}>
                                <Text style={styles.promptText}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {messages.map(m => (
                    <View
                        key={m.id}
                        style={[styles.msgRow, m.sender === 'user' ? styles.msgUser : styles.msgBot]}>
                        {m.sender === 'bot' && (
                            <View style={styles.botAvatar}>
                                <Heart size={16} color="#059669" />
                            </View>
                        )}
                        <View style={[
                            styles.msgBubble,
                            m.sender === 'user' ? styles.bubbleUser : styles.bubbleBot,
                        ]}>
                            <Text style={[
                                styles.msgText,
                                m.sender === 'user' && styles.msgTextUser,
                            ]}>{m.text}</Text>
                        </View>
                    </View>
                ))}

                {loading && (
                    <View style={[styles.msgRow, styles.msgBot]}>
                        <View style={styles.botAvatar}>
                            <Heart size={16} color="#059669" />
                        </View>
                        <View style={[styles.msgBubble, styles.bubbleBot]}>
                            <ActivityIndicator size="small" color="#059669" />
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask about your health..."
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={() => handleSend()}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !inputText && styles.sendDisabled]}
                    onPress={() => handleSend()}
                    disabled={!inputText || loading}>
                    <Send size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    chatArea: { flex: 1 },
    chatContent: { padding: 16, paddingBottom: 20 },
    promptSection: { marginBottom: 20 },
    promptHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    promptTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#059669' },
    promptChip: {
        backgroundColor: '#d1fae5', paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#a7f3d0',
    },
    promptText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#059669' },
    msgRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
    msgUser: { justifyContent: 'flex-end' },
    msgBot: { justifyContent: 'flex-start' },
    botAvatar: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: '#d1fae5',
        justifyContent: 'center', alignItems: 'center', marginTop: 4,
    },
    msgBubble: { maxWidth: '78%', borderRadius: 16, padding: 14 },
    bubbleUser: { backgroundColor: '#059669', borderBottomRightRadius: 4 },
    bubbleBot: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
    msgText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#334155', lineHeight: 20 },
    msgTextUser: { color: '#fff' },
    inputBar: {
        flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    },
    input: {
        flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14,
        paddingHorizontal: 16, height: 48, fontFamily: 'Inter-Regular', fontSize: 14,
    },
    sendBtn: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: '#059669',
        justifyContent: 'center', alignItems: 'center',
    },
    sendDisabled: { backgroundColor: '#94a3b8' },
});
