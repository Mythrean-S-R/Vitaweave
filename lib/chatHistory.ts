import { supabase } from './supabase';

export type ChatType = 'asha_assistant' | 'doctor_diagnostics' | 'patient_health';

export type StoredChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
};

const WELCOME_MESSAGES: Record<ChatType, string> = {
    asha_assistant:
        "Hello! I'm VitaWeave AI, your health assistant. I can help with patient queries, medication info, and health guidelines.",
    doctor_diagnostics:
        'Hello! I am your AI diagnostics assistant. I can help with patient analysis, drug interactions, and treatment suggestions.',
    patient_health:
        'Hello! I am your AI health assistant. I can help you understand health reports, wellness questions, and medications.',
};

export function getWelcomeMessage(chatType: ChatType): StoredChatMessage {
    return {
        role: 'assistant',
        content: WELCOME_MESSAGES[chatType],
        timestamp: new Date().toISOString(),
    };
}

export async function loadChatHistory(
    userId: string,
    chatType: ChatType
): Promise<StoredChatMessage[]> {
    const { data, error } = await supabase
        .from('ai_chat_history')
        .select('messages')
        .eq('user_id', userId)
        .eq('chat_type', chatType)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data?.messages) {
        return [getWelcomeMessage(chatType)];
    }

    const messages = data.messages as StoredChatMessage[];
    return messages.length > 0 ? messages : [getWelcomeMessage(chatType)];
}

export async function saveChatHistory(
    userId: string,
    chatType: ChatType,
    messages: StoredChatMessage[],
    patientId?: string
): Promise<void> {
    const trimmed = messages.slice(-100);

    const { data: existing } = await supabase
        .from('ai_chat_history')
        .select('id')
        .eq('user_id', userId)
        .eq('chat_type', chatType)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existing?.id) {
        await supabase
            .from('ai_chat_history')
            .update({ messages: trimmed, patient_id: patientId ?? null })
            .eq('id', existing.id);
        return;
    }

    await supabase.from('ai_chat_history').insert({
        user_id: userId,
        chat_type: chatType,
        messages: trimmed,
        patient_id: patientId ?? null,
    });
}

export async function clearChatHistory(userId: string, chatType: ChatType): Promise<void> {
    await supabase
        .from('ai_chat_history')
        .delete()
        .eq('user_id', userId)
        .eq('chat_type', chatType);

    await saveChatHistory(userId, chatType, [getWelcomeMessage(chatType)]);
}
