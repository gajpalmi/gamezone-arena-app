import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@/components/Feather';
import colors from '@/constants/colors';
import {
  useCategories,
  useBusinessDetail,
  useCreateBusiness,
  useUpdateBusiness,
  useUploadBusinessImage,
  useSupabaseAuth
} from '@/hooks/useBusiness';
import { useUser } from '@clerk/expo';

export default function BusinessEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  useSupabaseAuth();

  const { data: categoriesData } = useCategories();
  const { data: businessData, isLoading: loadingBusiness } = useBusinessDetail(id || '');
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness(id || '');
  const uploadImage = useUploadBusinessImage();

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    city: '',
    phone: '',
    owner_name: '',
    whatsapp: '',
    service_areas: '',
    address: '',
    description: '',
    website: '',
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (businessData?.business) {
      setForm({
        name: businessData.business.name || '',
        category_id: businessData.business.category_id || '',
        city: businessData.business.city || '',
        phone: businessData.business.phone || '',
        owner_name: businessData.business.owner_name || '',
        whatsapp: businessData.business.whatsapp || '',
        service_areas: businessData.business.service_areas?.join(', ') || '',
        address: businessData.business.address || '',
        description: businessData.business.description || '',
        website: businessData.business.website || '',
      });
      setAcceptedTerms(true); // if already exists, they accepted
    }
  }, [businessData]);

  const handleSave = () => {
    if (!form.name || !form.category_id || !form.city || !form.phone) {
      Alert.alert('Missing fields', 'Name, category, city, and phone are required.');
      return;
    }
    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'You must accept the Listing Rules, Terms, and Privacy Policy.');
      return;
    }

    const acceptedAt = new Date().toISOString();
    const payload = {
      ...form,
      service_areas: form.service_areas.split(',').map((area) => area.trim()).filter(Boolean),
      terms_version: '2026-09-06',
      terms_accepted_at: acceptedAt,
      privacy_version: '2026-09-06',
      privacy_accepted_at: acceptedAt,
      listing_rules_version: '2026-09-06',
      listing_rules_accepted_at: acceptedAt,
    };
    const mutation = id ? updateBusiness : createBusiness;
    mutation.mutate(payload, {
      onSuccess: (res) => {
        Alert.alert('Success', 'Business saved as draft.');
        if (!id) {
          router.replace(`/business/edit?id=${res.id}` as any);
        }
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message || 'Failed to save business');
      }
    });
  };

  const handlePickImage = async () => {
    if (!id || !user) return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const uri = result.assets[0].uri;
        let blob: Blob;
        
        if (Platform.OS === 'web') {
          const res = await fetch(uri);
          blob = await res.blob();
        } else {
          // React Native
          const res = await fetch(uri);
          blob = await res.blob();
        }
        
        const filename = uri.split('/').pop() || 'image.jpg';
        let contentType: "image/jpeg" | "image/png" | "image/webp" = 'image/jpeg';
        if (filename.endsWith('.png')) contentType = 'image/png';
        if (filename.endsWith('.webp')) contentType = 'image/webp';

        uploadImage.mutate({
          businessId: id,
          filename,
          file: blob,
          contentType,
          altText: 'Business Photo',
        }, {
          onSuccess: () => {
            Alert.alert('Success', 'Image uploaded.');
          },
          onError: (e: any) => {
            Alert.alert('Upload failed', e.message);
          },
          onSettled: () => setUploading(false)
        });
      } catch (err: any) {
        Alert.alert('Error', err.message);
        setUploading(false);
      }
    }
  };

  if (id && loadingBusiness) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.light.primary} size="large" />
      </View>
    );
  }

  const isPending = createBusiness.isPending || updateBusiness.isPending;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>{id ? 'Edit Listing' : 'New Listing'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          
          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Apex PC Repairs"
            placeholderTextColor={colors.light.mutedForeground}
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.categories}>
            {categoriesData?.map(cat => (
              <Pressable
                key={cat.id}
                style={[styles.catPill, form.category_id === cat.id && styles.catPillActive]}
                onPress={() => setForm({ ...form, category_id: cat.id })}
              >
                <Text style={[styles.catText, form.category_id === cat.id && styles.catTextActive]}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Location</Text>
          
          <Text style={styles.label}>City / Area *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mumbai"
            placeholderTextColor={colors.light.mutedForeground}
            value={form.city}
            onChangeText={(t) => setForm({ ...form, city: t })}
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+91..."
            placeholderTextColor={colors.light.mutedForeground}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(t) => setForm({ ...form, phone: t })}
          />
          <Text style={styles.label}>Owner / Contact Name</Text>
          <TextInput style={styles.input} placeholder="Who should customers ask for?" placeholderTextColor={colors.light.mutedForeground} value={form.owner_name} onChangeText={(t) => setForm({ ...form, owner_name: t })} />
          <Text style={styles.label}>WhatsApp Number (Optional)</Text>
          <TextInput style={styles.input} placeholder="+91..." placeholderTextColor={colors.light.mutedForeground} keyboardType="phone-pad" value={form.whatsapp} onChangeText={(t) => setForm({ ...form, whatsapp: t })} />

          <Text style={styles.label}>Full Address (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Shop 12, Main Street..."
            placeholderTextColor={colors.light.mutedForeground}
            value={form.address}
            onChangeText={(t) => setForm({ ...form, address: t })}
          />
          <Text style={styles.label}>Service Areas (Optional)</Text>
          <TextInput style={styles.input} placeholder="e.g. Andheri, Bandra (comma-separated)" placeholderTextColor={colors.light.mutedForeground} value={form.service_areas} onChangeText={(t) => setForm({ ...form, service_areas: t })} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell customers about your services..."
            placeholderTextColor={colors.light.mutedForeground}
            multiline
            value={form.description}
            onChangeText={(t) => setForm({ ...form, description: t })}
          />

          <Text style={styles.label}>Website (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={colors.light.mutedForeground}
            keyboardType="url"
            autoCapitalize="none"
            value={form.website}
            onChangeText={(t) => setForm({ ...form, website: t })}
          />
        </View>

        {id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.helperText}>Add photos to make your listing stand out.</Text>
            
            <Pressable style={styles.photoBtn} onPress={handlePickImage} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color={colors.light.primary} />
              ) : (
                <>
                  <Feather name="camera" size={20} color={colors.light.primary} />
                  <Text style={styles.photoBtnText}>Upload Photo</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Pressable style={styles.checkboxRow} onPress={() => setAcceptedTerms(!acceptedTerms)}>
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
              {acceptedTerms && <Feather name="check" size={14} color="#050A17" />}
            </View>
            <Text style={styles.termsText}>
              I accept the <Text style={styles.link} onPress={() => router.push('/business/legal' as any)}>Terms, Listing Rules, and Privacy Policy</Text>.
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={isPending}>
          {isPending ? (
            <ActivityIndicator color="#050A17" />
          ) : (
            <Text style={styles.saveBtnText}>SAVE LISTING</Text>
          )}
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.light.foreground },
  scrollContent: { padding: 20, paddingBottom: 60 },
  section: { backgroundColor: colors.light.card, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.light.border },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.light.foreground, marginBottom: 16 },
  label: { color: colors.light.mutedForeground, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.light.input, borderRadius: 12, paddingHorizontal: 16, height: 50, color: colors.light.foreground, marginBottom: 16, fontSize: 15 },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.light.input, borderWidth: 1, borderColor: colors.light.border },
  catPillActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  catText: { color: colors.light.mutedForeground, fontSize: 13, fontWeight: '600' },
  catTextActive: { color: colors.light.primaryForeground },
  helperText: { color: colors.light.mutedForeground, fontSize: 13, marginBottom: 12 },
  photoBtn: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.light.primary, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.light.primary + '10' },
  photoBtnText: { color: colors.light.primary, fontSize: 14, fontWeight: '700' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.input },
  checkboxActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  termsText: { flex: 1, color: colors.light.mutedForeground, fontSize: 13, lineHeight: 20 },
  link: { color: colors.light.primary, fontWeight: '700' },
  saveBtn: { height: 54, borderRadius: 16, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: colors.light.primaryForeground, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
