import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert, TextInput } from 'react-native';
// @ts-ignore
import { Mic, MicOff, Video, VideoOff, PhoneOff, Bot, FileText, Activity, Camera, Sparkles } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { videoService, generateChannelName, validateVideoCallConfig, getVideoCallPermissions, isVideoCallSupported } from '../../lib/agora';
import { getMedGemmaResponse } from '../../lib/gemini';
import { getStoredUserId } from '../../lib/authGuard';
import { completeTelemedicineSession } from '../../lib/appointmentWorkflow';
import { CameraView } from 'expo-camera';
import { logAuditEvent } from '../../lib/auditLog';

import { RemoteVideoSurface as RemoteVideoViews } from '../../components/RemoteVideoSurface';


export default function TelemedicineScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        appointmentId?: string;
        channelName?: string;
        patientName?: string;
    }>();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [callDuration, setCallDuration] = useState<number>(0);
    const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
    const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor'>('good');
    const [audioOnly, setAudioOnly] = useState(false);
    const [triagePrompt, setTriagePrompt] = useState(
        'Patient reports a persistent headache, mild fever, and dizziness over 2 days. Describe red flags, next steps, and whether referral is required.'
    );
    const [triageResponse, setTriageResponse] = useState('');
    const [isTriagePending, setIsTriagePending] = useState(false);
    const [sessionChannel, setSessionChannel] = useState<string | null>(null);
    const appointmentIdRef = useRef<string | undefined>(params.appointmentId);
    const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        initializeVideoCall();
        const unsubNet = NetInfo.addEventListener((state) => {
            const poor = state.isInternetReachable === false || state.type === 'none';
            setConnectionQuality(poor ? 'poor' : 'good');
            if (poor) {
                setAudioOnly(true);
                setIsVideoOff(true);
                void videoService.toggleVideo(false);
            }
        });
        const unsubRemote = videoService.onRemoteUsersChanged((users) => {
            setRemoteUsers(users);
        });

        return () => {
            cleanupCall();
            unsubNet();
            unsubRemote();
        };
    }, []);

    useEffect(() => {
        if (isConnected) {
            // Start call timer
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            // Stop call timer
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
            setCallDuration(0);
        }

        return () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
            }
        };
    }, [isConnected]);

    const initializeVideoCall = async () => {
        if (!isVideoCallSupported()) {
            Alert.alert('Not Supported', 'Video calling is not supported on this device.');
            return;
        }

        const hasPermissions = await getVideoCallPermissions();
        if (!hasPermissions) {
            Alert.alert('Permissions Required', 'Camera and microphone permissions are required for video calling.');
            return;
        }

        setIsConnecting(true);
        
        try {
            const doctorId = (await getStoredUserId()) ?? 'doctor';
            const initialized = await videoService.initialize();
            if (initialized) {
                const channelName = params.channelName ?? generateChannelName(doctorId, `session_${Date.now()}`);
                setSessionChannel(channelName);
                appointmentIdRef.current = params.appointmentId;
                const uid = Math.floor(Math.random() * 100000) + 1;
                const appointmentId = params.appointmentId;
                const config = {
                    channelName,
                    uid,
                    appointmentId,
                    token: await videoService.generateToken(channelName, uid, { appointmentId }),
                };

                if (validateVideoCallConfig(config)) {
                    const joined = await videoService.joinChannel(config);
                    if (joined) {
                        setIsConnected(true);
                        setRemoteUsers(videoService.getRemoteUsers());
                        await logAuditEvent({
                            action: 'create',
                            resourceType: 'telemedicine',
                            resourceId: params.appointmentId,
                            metadata: { channelName },
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to initialize video call:', error);
            Alert.alert('Connection Error', 'Failed to establish video connection.');
        } finally {
            setIsConnecting(false);
        }
    };

    const cleanupCall = async () => {
        try {
            await videoService.leaveChannel();
            videoService.cleanup();
            setIsConnected(false);
            setRemoteUsers([]);
        } catch (error) {
            console.error('Failed to cleanup call:', error);
        }
    };

    const handleEndCall = async () => {
        try {
            const doctorId = await getStoredUserId();
            if (appointmentIdRef.current && doctorId && sessionChannel) {
                await completeTelemedicineSession(
                    appointmentIdRef.current,
                    doctorId,
                    sessionChannel
                );
            }
        } catch (error) {
            console.error('Failed to complete appointment:', error);
        }
        await cleanupCall();
        router.back();
    };

    const toggleMute = async () => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        await videoService.toggleAudio(!newMuteState);
    };

    const toggleVideo = async () => {
        const newVideoState = !isVideoOff;
        setIsVideoOff(newVideoState);
        await videoService.toggleVideo(!newVideoState);
    };

    const switchCamera = async () => {
        await videoService.switchCamera();
    };

    const runSmartTriage = async () => {
        if (!triagePrompt.trim()) {
            Alert.alert('Input required', 'Please enter patient symptoms or clinical notes before running triage.');
            return;
        }

        setIsTriagePending(true);
        setTriageResponse('');

        try {
            const prompt = `You are a clinical tele-triage assistant. Review the following patient report and provide:\n1) urgent red flags,\n2) likely care pathway,\n3) recommended immediate actions,\n4) whether this patient should be referred for in-person evaluation.`;
            const response = await getMedGemmaResponse(prompt, triagePrompt);
            setTriageResponse(response.trim());
        } catch (error) {
            console.error('Triage assistant failed:', error);
            Alert.alert('AI Triage Error', 'Unable to generate recommendations.');
        } finally {
            setIsTriagePending(false);
        }
    };

    const formatCallDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const renderVideoContent = () => {
        if (isConnecting) {
            return (
                <View style={styles.connectingContainer}>
                    <ActivityIndicator size="large" color="#0891b2" />
                    <Text style={styles.connectingText}>Connecting to patient...</Text>
                </View>
            );
        }

        if (isVideoOff || !isConnected) {
            return (
                <View style={styles.videoPlaceholder}>
                    <Text style={styles.placeholderText}>
                        {isConnected ? 'Video Off' : 'Waiting for patient to join...'}
                    </Text>
                    {remoteUsers.length > 0 ? (
                        <Text style={styles.remoteInfo}>{`${remoteUsers.length} patient(s) connected`}</Text>
                    ) : null}
                </View>
            );
        }

        return (
            <View style={styles.videoContainer}>
                <RemoteVideoViews users={remoteUsers} />
                <Text style={styles.videoLabel}>Live consultation</Text>
                <Text style={styles.callDuration}>{formatCallDuration(callDuration)}</Text>
                <Text style={styles.remoteInfo}>{`${remoteUsers.length} patient(s) connected`}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Video Area */}
            {connectionQuality === 'poor' || audioOnly ? (
                <View style={{ backgroundColor: '#b45309', padding: 8 }}>
                    <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>
                        Poor connection - audio-only mode active
                    </Text>
                </View>
            ) : null}
            <View style={styles.videoArea}>
                {renderVideoContent()}

                {/* PIP Doctor Video */}
                <View style={styles.pipVideo}>
                    {isVideoOff ? (
                        <View style={styles.pipPlaceholder}>
                            <Text style={styles.pipText}>You</Text>
                        </View>
                    ) : (
                        <View style={styles.pipContainer}>
                            <CameraView style={StyleSheet.absoluteFill} facing="front" />
                        </View>
                    )}
                </View>

                {/* Call Controls Floating */}
                <View style={styles.controlsBar}>
                    <TouchableOpacity 
                        style={[styles.controlBtn, isMuted && styles.controlBtnOff]} 
                        onPress={toggleMute}
                        disabled={!isConnected}>
                        {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.controlBtn, isVideoOff && styles.controlBtnOff]} 
                        onPress={toggleVideo}
                        disabled={!isConnected}>
                        {isVideoOff ? <VideoOff size={24} color="#fff" /> : <Video size={24} color="#fff" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.controlBtn} 
                        onPress={switchCamera}
                        disabled={!isConnected}>
                        <Camera size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
                        <PhoneOff size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* AI Assistant / Notes Area */}
            <View style={styles.panelArea}>
                <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Live AI Assistant</Text>
                    <View style={styles.recordingBadge}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>Scribing</Text>
                    </View>
                </View>
                <View style={styles.triageWidget}>
                    <View style={styles.triageHeader}>
                        <View style={styles.triageHeaderBadge}>
                            <Sparkles size={16} color="#0f172a" />
                            <Text style={styles.triageHeaderText}>Smart Tele-Triage</Text>
                        </View>
                        <Text style={styles.triageSubtitle}>AI-guided care escalation suggestions during live visits.</Text>
                    </View>
                    <TextInput
                        style={styles.triageInput}
                        value={triagePrompt}
                        onChangeText={setTriagePrompt}
                        multiline
                        placeholder="Summarize patient symptoms, vitals, and concerns..."
                        placeholderTextColor="#94a3b8"
                    />
                    <View style={styles.triageActionRow}>
                        <TouchableOpacity
                            style={[styles.triageButton, isTriagePending && styles.triageButtonDisabled]}
                            onPress={runSmartTriage}
                            disabled={isTriagePending}
                        >
                            <Text style={styles.triageButtonText}>{isTriagePending ? 'Analyzing...' : 'Run Smart Triage'}</Text>
                        </TouchableOpacity>
                    </View>
                    {triageResponse ? (
                        <View style={styles.triageOutput}>
                            <Text style={styles.triageOutputTitle}>Triage Recommendation</Text>
                            <Text style={styles.triageOutputText}>{triageResponse}</Text>
                        </View>
                    ) : null}
                </View>
                <ScrollView style={styles.notesScroll} contentContainerStyle={{ padding: 15 }}>
                    <View style={styles.aiSuggestion}>
                        <Bot size={16} color="#0891b2" />
                        <Text style={styles.aiText}>Patient mentions continuous headache. Suggested action: Check BP immediately.</Text>
                    </View>

                    <View style={styles.noteItem}>
                        <Activity size={16} color="#475569" />
                        <Text style={styles.noteText}>Last recorded BP: 140/90 (2 weeks ago).</Text>
                    </View>

                    <View style={styles.noteItem}>
                        <FileText size={16} color="#475569" />
                        <Text style={styles.noteText}>Current Medications: Amlodipine 5mg.</Text>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    videoArea: { flex: 3, position: 'relative', backgroundColor: '#1e293b' },
    connectingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: 16
    },
    connectingText: { 
        fontFamily: 'Inter-Medium', 
        color: '#94a3b8',
        fontSize: 16,
        marginTop: 8
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#334155',
        margin: 20,
        borderRadius: 12
    },
    videoLabel: {
        fontFamily: 'Inter-Medium',
        color: '#f1f5f9',
        fontSize: 18
    },
    callDuration: {
        fontFamily: 'Inter-Regular',
        color: '#94a3b8',
        fontSize: 14,
        marginTop: 8
    },
    videoPlaceholder: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#334155',
        margin: 20,
        borderRadius: 12
    },
    placeholderText: { 
        fontFamily: 'Inter-Medium', 
        color: '#94a3b8',
        fontSize: 16
    },
    pipVideo: { 
        position: 'absolute', 
        top: Platform.OS === 'ios' ? 50 : 30, 
        right: 20, 
        width: 90, 
        height: 140, 
        borderRadius: 12, 
        overflow: 'hidden', 
        borderWidth: 2, 
        borderColor: '#fff',
        backgroundColor: '#475569'
    },
    pipContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#64748b'
    },
    pipPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#64748b'
    },
    pipText: {
        fontFamily: 'Inter-Medium',
        color: '#f1f5f9',
        fontSize: 12
    },
    controlsBar: { 
        position: 'absolute', 
        bottom: 30, 
        left: 0, 
        right: 0, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: 20 
    },
    controlBtn: { 
        width: 56, 
        height: 56, 
        borderRadius: 28, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    controlBtnOff: { backgroundColor: 'rgba(239,68,68,0.8)' },
    endCallBtn: { 
        width: 56, 
        height: 56, 
        borderRadius: 28, 
        backgroundColor: '#ef4444', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    panelArea: { 
        flex: 2, 
        backgroundColor: '#fff', 
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24 
    },
    remoteInfo: {
        marginTop: 12,
        color: '#94a3b8',
        fontFamily: 'Inter-Regular',
        fontSize: 12,
    },
    panelHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 20, 
        borderBottomWidth: 1, 
        borderBottomColor: '#e2e8f0' 
    },
    panelTitle: { 
        fontFamily: 'Inter-Bold', 
        fontSize: 16, 
        color: '#0f172a' 
    },
    recordingBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6, 
        backgroundColor: '#fee2e2', 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 12 
    },
    recordingDot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3, 
        backgroundColor: '#ef4444' 
    },
    recordingText: { 
        fontFamily: 'Inter-Medium', 
        fontSize: 11, 
        color: '#ef4444' 
    },
    notesScroll: { flex: 1 },
    triageWidget: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        backgroundColor: '#f8fafc'
    },
    triageHeader: {
        marginBottom: 12,
    },
    triageHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    triageHeaderText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#0f172a'
    },
    triageSubtitle: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18
    },
    triageInput: {
        minHeight: 90,
        backgroundColor: '#e2e8f0',
        borderRadius: 14,
        padding: 12,
        color: '#0f172a',
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        marginBottom: 12
    },
    triageActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 12,
    },
    triageButton: {
        backgroundColor: '#0891b2',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    triageButtonDisabled: {
        backgroundColor: '#94a3b8'
    },
    triageButtonText: {
        fontFamily: 'Inter-SemiBold',
        color: '#fff',
        fontSize: 13,
    },
    triageOutput: {
        backgroundColor: '#f1f5f9',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#cbd5e1'
    },
    triageOutputTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        color: '#0f172a',
        marginBottom: 8
    },
    triageOutputText: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: '#334155',
        lineHeight: 18
    },
    aiSuggestion: { 
        flexDirection: 'row', 
        backgroundColor: '#e0f2fe', 
        padding: 12, 
        borderRadius: 12, 
        marginBottom: 15, 
        gap: 10, 
        alignItems: 'flex-start', 
        borderWidth: 1, 
        borderColor: '#bae6fd' 
    },
    aiText: { 
        flex: 1, 
        fontFamily: 'Inter-Medium', 
        fontSize: 13, 
        color: '#0891b2', 
        lineHeight: 18 
    },
    noteItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10, 
        paddingVertical: 10, 
        borderBottomWidth: 1, 
        borderBottomColor: '#f1f5f9' 
    },
    noteText: { 
        fontFamily: 'Inter-Regular', 
        fontSize: 14, 
        color: '#334155' 
    },
});
