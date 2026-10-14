import { useCallback, useEffect, useState } from 'react';
import { getMedGemmaResponse } from '@/lib/gemini';
import {
    loadChatHistory,
    saveChatHistory,
    type ChatType,
    type StoredChatMessage,
} from '@/lib/chatHistory';
import { getStoredUserId } from '@/lib/authGuard';
import { Analytics } from '@/lib/analytics';

export type UIChatMessage = {
    id: string;
    text: string;
    sender: 'user' | 'bot';
};

function toUiMessage(msg: StoredChatMessage, index: number): UIChatMessage {
    return {
        id: `${msg.timestamp}_${index}`,
        text: msg.content,
        sender: msg.role === 'user' ? 'user' : 'bot',
    };
}

function toStoredMessage(msg: UIChatMessage): StoredChatMessage {
    return {
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: new Date().toISOString(),
    };
}

export function useAIChat(chatType: ChatType, options?: { localResponder?: (text: string) => string | null }) {
    const [messages, setMessages] = useState<UIChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setInitializing(true);
            const id = await getStoredUserId();
            setUserId(id);
            if (id) {
                const history = await loadChatHistory(id, chatType);
                setMessages(history.map(toUiMessage));
            }
            setInitializing(false);
        })();
    }, [chatType]);

    const persist = useCallback(
        async (nextMessages: UIChatMessage[]) => {
            if (!userId) return;
            await saveChatHistory(
                userId,
                chatType,
                nextMessages.map(toStoredMessage)
            );
        },
        [userId, chatType]
    );

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || loading) return;

            const userMsg: UIChatMessage = {
                id: Date.now().toString(),
                text: trimmed,
                sender: 'user',
            };

            const withUser = [...messages, userMsg];
            setMessages(withUser);
            setLoading(true);

            try {
                let responseText = options?.localResponder?.(trimmed) ?? null;
                if (!responseText) {
                    responseText = await getMedGemmaResponse(trimmed);
                }

                const botMsg: UIChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: responseText ?? 'No response from AI service.',
                    sender: 'bot',
                };

                const complete = [...withUser, botMsg];
                setMessages(complete);
                await persist(complete);
                Analytics.trackAiChat(chatType);
            } catch (error: any) {
                const errorMsg: UIChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: `⚠️ AI Service Error: ${error.message || 'Unable to reach AI service.'}`,
                    sender: 'bot',
                };
                const complete = [...withUser, errorMsg];
                setMessages(complete);
                await persist(complete);
            } finally {
                setLoading(false);
            }
        },
        [messages, loading, options, persist]
    );

    return {
        messages,
        loading,
        initializing,
        sendMessage,
        setMessages,
    };
}
