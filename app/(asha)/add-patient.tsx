import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
    Image, ActionSheetIOS, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { UserPlus, User, Hash, AlertTriangle, ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addPatient } from '../../lib/api';
import { mapPatientToDbInsert } from '../../lib/patientMapper';
import { Colors, Fonts } from '../_constants/theme';
import { supabase } from '../../lib/supabase';
import { imageUploadService } from '../../lib/imageUpload';
import { newLocalId } from '../../lib/db/database';
import { getStoredUserId } from '../../lib/authGuard';

export default function AddPatientScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [condition, setCondition] = useState('');
    const [gender, setGender] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [showImageOptions, setShowImageOptions] = useState(false);

    const handleImageUpload = async (source: 'camera' | 'gallery') => {
        try {
            setLoading(true);
            setShowImageOptions(false);
            
            const result = source === 'camera' 
                ? await imageUploadService.pickFromCamera()
                : await imageUploadService.pickFromGallery();
            
            if (result.error) {
                Alert.alert('Upload Error', result.error);
            } else {
                setImageUrl(result.url);
            }
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message || 'Failed to upload image');
        } finally {
            setLoading(false);
        }
    };

    const showImagePicker = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        handleImageUpload('camera');
                    } else if (buttonIndex === 2) {
                        handleImageUpload('gallery');
                    }
                }
            );
        } else {
            setShowImageOptions(true);
        }
    };

    const handleSave = async () => {
        if (!name || !age || !condition) {
            Alert.alert('Missing Fields', 'Please fill in Name, Age, and Primary Condition.');
            return;
        }

        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const storedId = await getStoredUserId();
            const ashaId = userData?.user?.id || storedId || undefined;

            // Use uploaded image or default avatar
            const finalImageUrl = imageUrl || imageUploadService.getDefaultAvatar();

            const newPatientData = mapPatientToDbInsert(
                {
                    name,
                    age: parseInt(age, 10),
                    condition,
                    phone,
                    image: finalImageUrl,
                    status: 'Stable',
                    riskLevel: 'Low',
                },
                {
                    id: newLocalId(),
                    gender: gender || 'Not Specified',
                    assigned_asha_id: ashaId,
                }
            );

            const { data, error } = await addPatient(newPatientData);

            const ageNum = parseInt(age, 10);
            if (!error && ageNum < 16 && ashaId) {
                const dob = new Date();
                dob.setFullYear(dob.getFullYear() - ageNum);
                const { scheduleUipForChild } = await import('../../lib/repositories/vaccinationRepo');
                const patientId =
                    data && typeof data === 'object' && 'id' in data
                        ? String((data as { id: string }).id)
                        : String((newPatientData as { id?: string }).id ?? '');
                if (patientId) {
                    await scheduleUipForChild({
                        patientId,
                        childName: name,
                        dateOfBirth: dob.toISOString().slice(0, 10),
                        assignedAshaId: ashaId,
                    });
                }
            }

            if (error) {
                console.error("Supabase insert error:", error);
                throw error;
            }

            Alert.alert('Success', 'Patient registered successfully.');
            router.back();
        } catch (error: any) {
            console.error('Registration error:', error);
            
            // Handle specific error types
            if (error.message?.includes('Network request failed')) {
                Alert.alert(
                    'Network Error', 
                    'Unable to connect to the server. Please check your internet connection and try again.',
                    [{ text: 'OK' }]
                );
            } else if (error.message?.includes('duplicate key')) {
                Alert.alert(
                    'Duplicate Entry', 
                    'A patient with this information already exists.',
                    [{ text: 'OK' }]
                );
            } else if (error.message?.includes('permission')) {
                Alert.alert(
                    'Permission Denied', 
                    'You do not have permission to register patients. Please contact your administrator.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Registration Failed', 
                    error.message || 'An unexpected error occurred while registering the patient. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.headerBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Register Patient</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                    <Text style={styles.sectionTitle}>Patient Photo</Text>

                    <TouchableOpacity style={styles.imageUploadContainer} onPress={showImagePicker}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.patientImage} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Camera size={32} color="#94a3b8" />
                                <Text style={styles.imagePlaceholderText}>Add Patient Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.sectionTitle}>Basic Information</Text>

                    <View style={styles.inputWrapper}>
                        <User size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputWrapper, { flex: 1, marginRight: 12 }]}>
                            <Hash size={20} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Age"
                                value={age}
                                onChangeText={setAge}
                                keyboardType="number-pad"
                                maxLength={3}
                            />
                        </View>
                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                            <TextInput
                                style={styles.input}
                                placeholder="Gender"
                                value={gender}
                                onChangeText={setGender}
                            />
                        </View>
                    </View>

                    <View style={styles.inputWrapper}>
                        <User size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number (Optional)"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Medical Details</Text>

                    <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                        <AlertTriangle size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { height: 76, textAlignVertical: 'top' }]}
                            placeholder="Primary Condition (e.g., Hypertension, Pregnancy)"
                            value={condition}
                            onChangeText={setCondition}
                            multiline
                        />
                    </View>

                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, (!name || !age || !condition) && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={loading || !name || !age || !condition}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Save Patient Record</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textPrimary },
    scroll: {
        padding: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 16,
    },
    imageUploadContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    patientImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: Colors.primary,
    },
    imagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f1f5f9',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    imagePlaceholderText: {
        fontFamily: Fonts.medium,
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    row: { flexDirection: 'row' },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 16, height: 56, marginBottom: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontFamily: Fonts.regular, fontSize: 16, color: '#0f172a' },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    button: {
        backgroundColor: Colors.primary, borderRadius: 14, height: 56,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    buttonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
    buttonText: { fontFamily: Fonts.bold, fontSize: 16, color: '#fff' },
});
