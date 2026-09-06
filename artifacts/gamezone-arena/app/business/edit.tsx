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
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { openImageMediaPicker } from '@/lib/imageMediaPicker';
import { Feather } from '@/components/Feather';
import { CategoryPicker } from '@/components/CategoryPicker';
import colors from '@/constants/colors';
import {
  useCategories,
  useBusinessDetail,
  useCreateBusiness,
  useUpdateBusiness,
  useUploadBusinessImage,
  useDeleteBusinessImage,
  useSubmitBusiness,
  useSupabaseAuth
} from '@/hooks/useBusiness';
import { useUser } from '@clerk/expo';
import { saveBusinessHours, type BusinessHours } from '@/lib/business';
import { setBusinessLogo } from '@/lib/business';

export default function BusinessEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  useSupabaseAuth();

  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategories();
  const { data: businessData, isLoading: loadingBusiness, refetch: refetchBusiness } = useBusinessDetail(id || '');
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness(id || '');
  const uploadImage = useUploadBusinessImage();
  const deleteImage = useDeleteBusinessImage();
  const submitBusiness = useSubmitBusiness();

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    city: '',
    phone: '',
    owner_name: '',
    owner_display_name: '',
    subcategory: '',
    email: '',
    services_offered: '',
    price_range: '',
    whatsapp: '',
    service_areas: '',
    address: '',
    description: '',
    website: '',
  });
  useEffect(() => {
    if (categoriesError) console.error('Business category loading failed', categoriesError);
  }, [categoriesError]);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [publicContactConsent, setPublicContactConsent] = useState(false);
  const [hours, setHours] = useState<BusinessHours[]>(() => Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, opens_at: '09:00', closes_at: '18:00', is_closed: false })));
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (businessData?.business) {
      setForm({
        name: businessData.business.name || '',
        category_id: businessData.business.category_id || '',
        city: businessData.business.city || '',
        phone: businessData.business.phone || '',
        owner_name: businessData.business.owner_name || '',
        owner_display_name: businessData.business.owner_display_name || '',
        subcategory: businessData.business.subcategory || '',
        email: businessData.business.email || '',
        services_offered: businessData.business.services_offered?.join(', ') || '',
        price_range: businessData.business.price_range || '',
        whatsapp: businessData.business.whatsapp || '',
        service_areas: businessData.business.service_areas?.join(', ') || '',
        address: businessData.business.address || '',
        description: businessData.business.description || '',
        website: businessData.business.website || '',
      });
      setPublicContactConsent(!!businessData.business.public_contact_consent_at);
      if (businessData.hours?.length) setHours(Array.from({ length: 7 }, (_, day_of_week) => businessData.hours.find((hour) => hour.day_of_week === day_of_week) ?? { day_of_week, opens_at: '09:00', closes_at: '18:00', is_closed: false }));
    }
  }, [businessData]);

  const handleSave = (afterSave?: (businessId: string) => void, requirePublishReady = false) => {
    if (!form.name || !form.category_id || !form.city || !form.phone) {
      Alert.alert('Missing fields', 'Name, category, city, and phone are required.');
      return;
    }
    if (requirePublishReady && (!acceptedTerms || !publicContactConsent)) {
      Alert.alert('Terms Required', 'You must accept the Listing Rules, Terms, and Privacy Policy.');
      return;
    }

    const acceptedAt = new Date().toISOString();
    const payload = {
      ...form,
      service_areas: form.service_areas.split(',').map((area) => area.trim()).filter(Boolean),
      services_offered: form.services_offered.split(',').map((area) => area.trim()).filter(Boolean),
      public_contact_consent_at: publicContactConsent ? acceptedAt : null,
      terms_version: acceptedTerms ? '2026-09-06' : null,
      terms_accepted_at: acceptedTerms ? acceptedAt : null,
      privacy_version: acceptedTerms ? '2026-09-06' : null,
      privacy_accepted_at: acceptedTerms ? acceptedAt : null,
      listing_rules_version: acceptedTerms ? '2026-09-06' : null,
      listing_rules_accepted_at: acceptedTerms ? acceptedAt : null,
    };
    const mutation = id ? updateBusiness : createBusiness;
    mutation.mutate(payload, {
      onSuccess: async (res) => {
        try {
          await saveBusinessHours(res.id, hours.map((hour) => ({ ...hour, opens_at: hour.is_closed ? null : hour.opens_at, closes_at: hour.is_closed ? null : hour.closes_at })));
          Alert.alert('Success', 'Business and weekly hours saved as draft.');
        } catch (error) {
          Alert.alert('Business saved, hours failed', error instanceof Error ? error.message : 'Please retry saving weekly hours.');
        }
        if (!id) {
          Alert.alert('Draft saved', 'Your listing is saved. Add a logo or photos, then preview or submit it for review.');
          router.replace(`/business/edit?id=${res.id}` as any);
        }
        afterSave?.(res.id);
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message || 'Failed to save business');
      }
    });
  };

  const uploadPickedAsset = async (asset: ImagePicker.ImagePickerAsset, kind: 'logo' | 'photo') => {
    if (!id || !user) {
      Alert.alert('Save your draft first', 'Save the required business details before adding a logo or photos.');
      return;
    }
    setUploading(true);
    try {
      const uri = asset.uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = asset.fileName || uri.split('/').pop() || 'image.jpg';
      const lowerName = filename.toLowerCase();
      const contentType: 'image/jpeg' | 'image/png' | 'image/webp' =
        lowerName.endsWith('.png') ? 'image/png' : lowerName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      uploadImage.mutate({
        businessId: id, filename, file: blob, contentType,
        altText: kind === 'logo' ? 'Business logo' : 'Business photo',
      }, {
        onSuccess: async (photo) => {
          try {
            if (kind === 'logo') {
              await setBusinessLogo(photo.id);
              await refetchBusiness();
            }
            Alert.alert('Photo saved', kind === 'logo' ? 'Your business logo has been updated.' : 'Your business photo has been uploaded.');
          } catch (error) {
            Alert.alert('Photo uploaded', error instanceof Error ? `The image was saved, but the logo could not be set: ${error.message}` : 'The image was saved, but the logo could not be set.');
          }
        },
        onError: (error: Error) => Alert.alert('Photo upload failed', error.message || 'Please try again.'),
        onSettled: () => setUploading(false),
      });
    } catch (error) {
      setUploading(false);
      Alert.alert('Photo upload failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handlePickImage = (kind: 'logo' | 'photo') => {
    if (!id || !user) {
      Alert.alert('Save your draft first', 'Save the required business details before adding media.');
      return;
    }
    openImageMediaPicker({ title: kind === 'logo' ? 'Add Business Logo' : 'Add Business Photo', onPicked: assets => uploadPickedAsset(assets[0], kind) });
  };

  if (id && loadingBusiness) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.light.primary} size="large" />
      </View>
    );
  }

  const isPending = createBusiness.isPending || updateBusiness.isPending || submitBusiness.isPending;
  const selectedCategory = categoriesData?.find((category) => category.id === form.category_id);
  const subcategoriesBySlug: Record<string, string[]> = {
    restaurants: ['Restaurant', 'Fast Food', 'Catering', 'Cloud Kitchen'],
    cafes: ['Cafe', 'Bakery', 'Desserts', 'Juice & Beverages'],
    'health-wellness': ['Clinic', 'Fitness', 'Pharmacy', 'Wellness'],
    'home-services': ['Electrician', 'Plumber', 'Cleaning', 'Repair'],
    automotive: ['Garage', 'Car Wash', 'Spare Parts', 'Two Wheeler Repair'],
    'beauty-personal-care': ['Salon', 'Spa', 'Makeup', 'Barber'],
    'professional-services': ['Legal', 'Accounting', 'Consulting', 'Insurance'],
    retail: ['Grocery', 'Electronics', 'Clothing', 'Furniture'],
    education: ['Tutor', 'Coaching', 'School', 'Computer Training'],
    'arts-entertainment': ['Events', 'Photography', 'Gaming', 'Music'],
  };
  const suggestedSubcategories = selectedCategory ? (subcategoriesBySlug[selectedCategory.slug] || ['Other']) : [];

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
          <Text style={styles.label}>Display Name</Text><TextInput style={styles.input} placeholder="Public owner or business display name" placeholderTextColor={colors.light.mutedForeground} value={form.owner_display_name} onChangeText={(t) => setForm({ ...form, owner_display_name: t })} />

          <CategoryPicker
            label="Category *"
            categories={categoriesData ?? []}
            selectedId={form.category_id}
            loading={categoriesLoading}
            error={categoriesError}
            onRetry={() => void refetchCategories()}
            onChoose={(category) => setForm({ ...form, category_id: category.id, subcategory: '' })}
          />
          <Text style={styles.label}>Sub-category</Text>
          {selectedCategory ? <View style={styles.categories}>{suggestedSubcategories.map((subcategory) => <Pressable key={subcategory} style={[styles.catPill, form.subcategory === subcategory && styles.catPillActive]} onPress={() => setForm({ ...form, subcategory })}><Text style={[styles.catText, form.subcategory === subcategory && styles.catTextActive]}>{subcategory}</Text></Pressable>)}</View> : <Text style={styles.helperText}>Choose a category to see relevant sub-categories.</Text>}
          <TextInput style={styles.input} placeholder="Or enter a more specific sub-category" placeholderTextColor={colors.light.mutedForeground} value={form.subcategory} onChangeText={(t) => setForm({ ...form, subcategory: t })} />
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
          <Text style={styles.label}>Email (Optional)</Text><TextInput style={styles.input} placeholder="name@example.com" placeholderTextColor={colors.light.mutedForeground} keyboardType="email-address" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} />

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
          <Text style={styles.label}>Services Offered</Text><TextInput style={styles.input} placeholder="Comma-separated services" placeholderTextColor={colors.light.mutedForeground} value={form.services_offered} onChangeText={(t) => setForm({ ...form, services_offered: t })} />
          <Text style={styles.label}>Price Range</Text><TextInput style={styles.input} placeholder="e.g. ₹500–₹2,000" placeholderTextColor={colors.light.mutedForeground} value={form.price_range} onChangeText={(t) => setForm({ ...form, price_range: t })} />
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly opening hours</Text>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
            const hour = hours[index];
            return <View key={day} style={styles.hoursRow}><Text style={styles.day}>{day}</Text><Pressable style={styles.closedToggle} onPress={() => setHours(hours.map((item, i) => i === index ? { ...item, is_closed: !item.is_closed } : item))}><Text style={styles.closedText}>{hour.is_closed ? 'CLOSED' : 'OPEN'}</Text></Pressable>{!hour.is_closed && <><TextInput style={styles.timeInput} value={hour.opens_at ?? ''} onChangeText={(opens_at) => setHours(hours.map((item, i) => i === index ? { ...item, opens_at } : item))} placeholder="09:00" placeholderTextColor={colors.light.mutedForeground} /><Text style={styles.to}>to</Text><TextInput style={styles.timeInput} value={hour.closes_at ?? ''} onChangeText={(closes_at) => setHours(hours.map((item, i) => i === index ? { ...item, closes_at } : item))} placeholder="18:00" placeholderTextColor={colors.light.mutedForeground} /></>}</View>;
          })}
        </View>

        {id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business logo & photos</Text>
            <Text style={styles.helperText}>Add a logo and photos to make your listing stand out. Images are private until your listing is approved.</Text>
            <View style={styles.mediaActions}>
              <Pressable style={styles.mediaBtn} onPress={() => handlePickImage('logo')} disabled={uploading}><Feather name="image" size={18} color={colors.light.primary} /><Text style={styles.mediaBtnText}>ADD / REPLACE LOGO</Text></Pressable>
              <Pressable style={styles.mediaBtn} onPress={() => handlePickImage('photo')} disabled={uploading}><Feather name="camera" size={18} color={colors.light.primary} /><Text style={styles.mediaBtnText}>ADD BUSINESS PHOTO</Text></Pressable>
            </View>
            {uploading && <View style={styles.uploading}><ActivityIndicator color={colors.light.primary} /><Text style={styles.helperText}>Uploading photo…</Text></View>}
            <View style={styles.photoGrid}>
              {businessData?.photos.filter((photo) => photo.signedUrl).map((photo) => <View key={photo.id} style={styles.photoWrap}><Image source={{ uri: photo.signedUrl! }} style={styles.photoPreview} /><View style={styles.photoControls}><Pressable onPress={() => void setBusinessLogo(photo.id).then(async () => { await refetchBusiness(); Alert.alert('Logo updated', 'This image is now your business logo.'); }).catch((error) => Alert.alert('Logo update failed', error.message))}><Text style={styles.logoItem}>{photo.is_logo ? '★ LOGO' : 'MAKE LOGO'}</Text></Pressable><Pressable disabled={deleteImage.isPending} onPress={() => Alert.alert('Remove photo', 'Remove this photo from your listing?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => deleteImage.mutate(photo, { onSuccess: () => Alert.alert('Photo removed', 'The photo was removed.'), onError: (error: Error) => Alert.alert('Remove failed', error.message) }) }])}><Feather name="trash-2" size={16} color={colors.light.destructive} /></Pressable></View></View>)}
            </View>
            {businessData?.photos.length === 0 && <Text style={styles.helperText}>No photos yet.</Text>}
          </View>
        )}

        <View style={styles.section}>
          <Pressable style={styles.checkboxRow} onPress={() => setPublicContactConsent(!publicContactConsent)}>
            <View style={[styles.checkbox, publicContactConsent && styles.checkboxActive]}>{publicContactConsent && <Feather name="check" size={14} color="#050A17" />}</View>
            <Text style={styles.termsText}>I consent to show my phone, WhatsApp, and email publicly.</Text>
          </Pressable>
          <Pressable style={styles.checkboxRow} onPress={() => setAcceptedTerms(!acceptedTerms)}>
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
              {acceptedTerms && <Feather name="check" size={14} color="#050A17" />}
            </View>
            <Text style={styles.termsText}>
              I accept the <Text style={styles.link} onPress={() => router.push('/business/legal' as any)}>Terms, Listing Rules, and Privacy Policy</Text>.
            </Text>
          </Pressable>
        </View>

        <View style={styles.footerActions}>
        <Pressable style={[styles.secondaryBtn, isPending && styles.disabledBtn]} onPress={() => id ? router.push(`/business/${id}` as any) : handleSave((businessId) => router.replace(`/business/${businessId}` as any), true)} disabled={isPending}>
          <Text style={styles.secondaryBtnText}>PREVIEW</Text>
        </Pressable>
        <Pressable style={[styles.saveBtn, isPending && styles.disabledBtn]} onPress={() => handleSave()} disabled={isPending}>
          {isPending ? (
            <ActivityIndicator color="#050A17" />
          ) : (
            <Text style={styles.saveBtnText}>SAVE DRAFT</Text>
          )}
        </Pressable>
        </View>
        {id && <Pressable style={[styles.submitBtn, isPending && styles.disabledBtn]} disabled={isPending} onPress={() => submitBusiness.mutate(id, { onSuccess: () => { Alert.alert('Submitted for review', 'Your business is now pending moderation.'); router.replace('/business/mine' as any); }, onError: (error: Error) => Alert.alert('Unable to submit', error.message || 'Please try again.') })}><Text style={styles.submitBtnText}>{submitBusiness.isPending ? 'SUBMITTING…' : 'SUBMIT FOR REVIEW'}</Text></Pressable>}

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
  logoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  logoItem: { color: colors.light.primary, fontSize: 11, fontWeight: '800' },
  mediaActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  mediaBtn: { width: '48%', minHeight: 44, padding: 8, borderRadius: 10, backgroundColor: colors.light.primary + '10', borderWidth: 1, borderColor: colors.light.primary + '40', alignItems: 'center', justifyContent: 'center', gap: 4 },
  mediaBtnText: { color: colors.light.primary, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  uploading: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { width: 130, backgroundColor: colors.light.input, borderRadius: 10, overflow: 'hidden' },
  photoPreview: { width: 130, height: 96, backgroundColor: colors.light.border },
  photoControls: { padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.input },
  checkboxActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  termsText: { flex: 1, color: colors.light.mutedForeground, fontSize: 13, lineHeight: 20 },
  link: { color: colors.light.primary, fontWeight: '700' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  day: { color: colors.light.foreground, width: 30, fontSize: 12, fontWeight: '800' },
  closedToggle: { borderWidth: 1, borderColor: colors.light.primary, borderRadius: 6, padding: 6, width: 57, alignItems: 'center' },
  closedText: { color: colors.light.primary, fontSize: 9, fontWeight: '900' },
  timeInput: { flex: 1, height: 36, backgroundColor: colors.light.input, borderRadius: 7, color: colors.light.foreground, paddingHorizontal: 8, fontSize: 12 },
  to: { color: colors.light.mutedForeground, fontSize: 11 },
  footerActions: { flexDirection: 'row', gap: 10 },
  saveBtn: { height: 54, borderRadius: 16, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center', flex: 1 },
  secondaryBtn: { height: 54, borderRadius: 16, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center', flex: 1 },
  secondaryBtnText: { color: colors.light.foreground, fontSize: 13, fontWeight: '900', letterSpacing: .5 },
  saveBtnText: { color: colors.light.primaryForeground, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  submitBtn: { height: 54, borderRadius: 16, backgroundColor: colors.light.foreground, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  submitBtnText: { color: colors.light.background, fontSize: 14, fontWeight: '900', letterSpacing: .7 },
  disabledBtn: { opacity: .55 },
});
