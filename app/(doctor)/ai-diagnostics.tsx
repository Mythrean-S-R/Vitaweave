import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator,
} from 'react-native';
// @ts-ignore
import {
    BotMessageSquare, Send, Sparkles,
} from 'lucide-react-native';
import { useAIChat } from '../../hooks/useAIChat';

const QUICK_PROMPTS = [
    'Analyze patient vitals for high-risk cases',
    'Suggest treatment for high BP',
    'Drug interaction check: Metformin + Lisinopril',
    'Summarize prenatal care guidelines',
];

export default function AIDiagnosticsScreen() {
    const { messages, loading, initializing, sendMessage } = useAIChat('doctor_diagnostics');
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
                <ActivityIndicator size="large" color="#0891b2" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
                {messages.length <= 1 && (
                    <View style={styles.promptSection}>
                        <View style={styles.promptHeader}>
                            <Sparkles size={16} color="#0891b2" />
                            <Text style={styles.promptTitle}>Quick Actions</Text>
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
                                <BotMessageSquare size={16} color="#0891b2" />
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
                            <BotMessageSquare size={16} color="#0891b2" />
                        </View>
                        <View style={[styles.msgBubble, styles.bubbleBot]}>
                            <ActivityIndicator size="small" color="#0891b2" />
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask about diagnostics, patients..."
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
    promptTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0891b2' },
    promptChip: {
        backgroundColor: '#e0f2fe', paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#bae6fd',
    },
    promptText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#0891b2' },
    msgRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
    msgUser: { justifyContent: 'flex-end' },
    msgBot: { justifyContent: 'flex-start' },
    botAvatar: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: '#e0f2fe',
        justifyContent: 'center', alignItems: 'center', marginTop: 4,
    },
    msgBubble: { maxWidth: '78%', borderRadius: 16, padding: 14 },
    bubbleUser: { backgroundColor: '#0891b2', borderBottomRightRadius: 4 },
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
        width: 48, height: 48, borderRadius: 14, backgroundColor: '#0891b2',
        justifyContent: 'center', alignItems: 'center',
    },
    sendDisabled: { backgroundColor: '#94a3b8' },
});
