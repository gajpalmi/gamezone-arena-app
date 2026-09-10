import React, { useState, useEffect, useMemo } from 'react';
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
KeyboardAvoidingView,
Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { openImageMediaPicker } from '@/lib/imageMediaPicker';
import { Feather } from '@/components/Feather';
import { CategoryPicker } from '@/components/CategoryPicker';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import colors from '@/constants/colors';

import {
useCategories,
useMyBusinessDetail,
useCreateBusiness,
useUpdateBusiness,
useUploadBusinessImage,
useDeleteBusinessImage,
useSubmitBusiness,
useSupabaseAuth,
} from '@/hooks/useBusiness';

import { useUser } from '@clerk/expo';
import {
saveBusinessHours,
type BusinessHours,
setBusinessLogo,
} from '@/lib/business';

export default function BusinessEditScreen() {
const { id } = useLocalSearchParams<{ id?: string }>();
const router = useRouter();
const insets = useSafeAreaInsets();
const { user } = useUser();

useSupabaseAuth();

const {
data: categoriesData,
isLoading: categoriesLoading,
error: categoriesError,
refetch: refetchCategories,
} = useCategories();

const {
data: businessData,
isLoading: loadingBusiness,
refetch: refetchBusiness,
} = useMyBusinessDetail(id || '');

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
latitude: null as number | null,
longitude: null as number | null,
});

const [acceptedTerms, setAcceptedTerms] = useState(false);
const [publicContactConsent, setPublicContactConsent] = useState(false);

const [hours, setHours] = useState<BusinessHours[]>(
() =>
Array.from({ length: 7 }, (_, day_of_week) => ({
day_of_week,
opens_at: '09:00',
closes_at: '18:00',
is_closed: false,
}))
);

const [uploading, setUploading] = useState(false);
const [hoursError, setHoursError] = useState('');

const [categorySearch, setCategorySearch] = useState('');
const [subcategorySearch, setSubcategorySearch] = useState('');

useEffect(() => {
if (categoriesError) {
console.error(
'Business category loading failed',
categoriesError
);
}
}, [categoriesError]);

useEffect(() => {
if (!businessData?.business) return;

const business = businessData.business;  

setForm({  
  name: business.name || '',  
  category_id: business.category_id || '',  
  city: business.city || '',  
  phone: business.phone || '',  
  owner_name: business.owner_name || '',  
  owner_display_name: business.owner_display_name || '',  
  subcategory: business.subcategory || '',  
  email: business.email || '',  
  services_offered:  
    business.services_offered?.join(', ') || '',  
  price_range: business.price_range || '',  
  whatsapp: business.whatsapp || '',  
  service_areas:  
    business.service_areas?.join(', ') || '',  
  address: business.address || '',  
  description: business.description || '',  
  website: business.website || '',  
  latitude: business.latitude ?? null,
  longitude: business.longitude ?? null,
});  

setPublicContactConsent(  
  !!business.public_contact_consent_at  
);  

if (businessData.hours?.length) {  
  setHours(  
    Array.from({ length: 7 }, (_, day_of_week) => {  
      return (  
        businessData.hours.find(  
          (hour) => hour.day_of_week === day_of_week  
        ) ?? {  
          day_of_week,  
          opens_at: '09:00',  
          closes_at: '18:00',  
          is_closed: false,  
        }  
      );  
    })  
  );  
}

}, [businessData]);

const setField = (
key: keyof typeof form,
value: string
) => {
setForm((current) => ({
...current,
[key]: value,
}));
};

const subcategoriesBySlug: Record<string, string[]> = {
restaurants: [
'Restaurant',
'Fast Food',
'Catering',
'Cloud Kitchen',
'Other',
],

cafes: [  
  'Cafe',  
  'Bakery',  
  'Desserts',  
  'Juice & Beverages',  
  'Other',  
],  

'health-wellness': [  
  'Clinic',  
  'Fitness',  
  'Pharmacy',  
  'Wellness',  
  'Other',  
],  

'home-services': [  
  'Electrician',  
  'Plumber',  
  'Cleaning',  
  'Repair',  
  'Carpenter',  
  'Painter',  
  'Other',  
],  

automotive: [  
  'Garage',  
  'Car Wash',  
  'Spare Parts',  
  'Two Wheeler Repair',  
  'Car Repair',  
  'Other',  
],  

'beauty-personal-care': [  
  'Salon',  
  'Spa',  
  'Makeup',  
  'Barber',  
  'Beauty',  
  'Other',  
],  

'professional-services': [  
  'Legal',  
  'Accounting',  
  'Consulting',  
  'Insurance',  
  'Other',  
],  

retail: [  
  'Grocery',  
  'Electronics',  
  'Clothing',  
  'Furniture',  
  'Mobile Shop',  
  'Other',  
],  

education: [  
  'Tutor',  
  'Coaching',  
  'School',  
  'Computer Training',  
  'Other',  
],  

'arts-entertainment': [  
  'Events',  
  'Photography',  
  'Gaming',  
  'Music',  
  'Other',  
],

};

const selectedCategory = useMemo(() => {
return categoriesData?.find(
(category) => category.id === form.category_id
);
}, [categoriesData, form.category_id]);

const suggestedSubcategories = useMemo(() => {
if (!selectedCategory) return [];

return (  
  subcategoriesBySlug[selectedCategory.slug] || [  
    'Other',  
  ]  
);

}, [selectedCategory]);

const filteredSubcategories = useMemo(() => {
const search = subcategorySearch.trim().toLowerCase();

if (!search) return suggestedSubcategories;  

return suggestedSubcategories.filter((item) =>  
  item.toLowerCase().includes(search)  
);

}, [suggestedSubcategories, subcategorySearch]);

const filteredCategories = useMemo(() => {
if (!categoriesData) return [];

const search = categorySearch.trim().toLowerCase();  

if (!search) return categoriesData;  

return categoriesData.filter((category) => {  
  return (  
    category.name?.toLowerCase().includes(search) ||  
    category.slug?.toLowerCase().includes(search)  
  );  
});

}, [categoriesData, categorySearch]);

const handleSave = (
afterSave?: (businessId: string) => void,
requirePublishReady = false
) => {
const name = form.name.trim();
const categoryId = form.category_id.trim();
const city = form.city.trim();
const phone = form.phone.trim();

if (!name || !categoryId || !city || !phone) {  
  Alert.alert(  
    'Missing fields',  
    'Business Name, Category, City/Area and Phone Number are required.'  
  );  
  return;  
}  

if (  
  requirePublishReady &&  
  (!acceptedTerms || !publicContactConsent)  
) {  
  Alert.alert(  
    'Terms Required',  
    'You must accept the Listing Rules, Terms, Privacy Policy and public contact consent before previewing.'  
  );  
  return;  
}  

const acceptedAt = new Date().toISOString();  

const payload = {  
  ...form,  

  name,  

  category_id: categoryId,  

  city,  

  phone,  

  service_areas: form.service_areas  
    .split(',')  
    .map((area) => area.trim())  
    .filter(Boolean),  

  services_offered: form.services_offered  
    .split(',')  
    .map((service) => service.trim())  
    .filter(Boolean),  

  public_contact_consent_at:  
    publicContactConsent ? acceptedAt : null,  

  terms_version: acceptedTerms  
    ? '2026-09-06'  
    : null,  

  terms_accepted_at: acceptedTerms  
    ? acceptedAt  
    : null,  

  privacy_version: acceptedTerms  
    ? '2026-09-06'  
    : null,  

  privacy_accepted_at: acceptedTerms  
    ? acceptedAt  
    : null,  

  listing_rules_version: acceptedTerms  
    ? '2026-09-06'  
    : null,  

  listing_rules_accepted_at: acceptedTerms  
    ? acceptedAt  
    : null,  
};  

const mutation = id  
  ? updateBusiness  
  : createBusiness;  

mutation.mutate(payload, {  
  onSuccess: async (res) => {  
    try {
      setHoursError('');
      await saveBusinessHours(  
        res.id,  
        hours.map((hour) => ({  
          ...hour,  
          opens_at: hour.is_closed  
            ? null  
            : hour.opens_at,  
          closes_at: hour.is_closed  
            ? null  
            : hour.closes_at,  
        }))  
      );  
    } catch (error) {
      console.error(  
        'Business hours save failed',  
        error  
      );  
      setHoursError(error instanceof Error ? error.message : 'Business hours could not be saved. Please try again.');
      Alert.alert('Business hours not saved', 'Your business details were saved, but the hours could not be saved. Please try again.');
      return;
    }  

    if (afterSave) {  
      afterSave(res.id);  
      return;  
    }  

    router.replace('/business/mine' as any);
  },  

  onError: (err: any) => {  
    console.error(  
      'Business save failed:',  
      err  
    );  

    Alert.alert(  
      'Unable to save business',  
      err?.message ||  
        'Failed to save business. Please check the required fields and try again.'  
    );  
  },  
});

};

const uploadPickedAsset = async (
asset: ImagePicker.ImagePickerAsset,
kind: 'logo' | 'photo'
) => {
if (!id || !user) {
Alert.alert(
'Save your draft first',
'Save the required business details before adding a logo or photos.'
);
return;
}

setUploading(true);  

try {  
  const uri = asset.uri;  

  const response = await fetch(uri);  

  const blob = await response.blob();  

  const filename =  
    asset.fileName ||  
    uri.split('/').pop() ||  
    'image.jpg';  

  const lowerName =  
    filename.toLowerCase();  

  const contentType:  
    | 'image/jpeg'  
    | 'image/png'  
    | 'image/webp' =  
    lowerName.endsWith('.png')  
      ? 'image/png'  
      : lowerName.endsWith('.webp')  
      ? 'image/webp'  
      : 'image/jpeg';  

  uploadImage.mutate(  
    {  
      businessId: id,  
      filename,  
      file: blob,  
      contentType,  
      altText:  
        kind === 'logo'  
          ? 'Business logo'  
          : 'Business photo',  
    },  
    {  
      onSuccess: async (photo) => {  
        try {  
          if (kind === 'logo') {  
            await setBusinessLogo(photo.id);  
            await refetchBusiness();  
          }  

          Alert.alert(  
            'Photo saved',  
            kind === 'logo'  
              ? 'Your business logo has been updated.'  
              : 'Your business photo has been uploaded.'  
          );  
        } catch (error) {  
          Alert.alert(  
            'Photo uploaded',  
            error instanceof Error  
              ? `The image was saved, but the logo could not be set: ${error.message}`  
              : 'The image was saved, but the logo could not be set.'  
          );  
        }  
      },  

      onError: (error: Error) => {  
        Alert.alert(  
          'Photo upload failed',  
          error.message ||  
            'Please try again.'  
        );  
      },  

      onSettled: () => {  
        setUploading(false);  
      },  
    }  
  );  
} catch (error) {  
  setUploading(false);  

  Alert.alert(  
    'Photo upload failed',  
    error instanceof Error  
      ? error.message  
      : 'Please try again.'  
  );  
}

};

const handlePickImage = (
kind: 'logo' | 'photo'
) => {
if (!id || !user) {
Alert.alert(
'Save your draft first',
'Save the required business details before adding media.'
);
return;
}

openImageMediaPicker({  
  title:  
    kind === 'logo'  
      ? 'Add Business Logo'  
      : 'Add One Business Photo',  

  multiple: false,  

  onPicked: ([asset]) => {  
    if (!asset) return;  

    return uploadPickedAsset(  
      asset,  
      kind  
    );  
  },  
});

};

const updateHour = (
index: number,
patch: Partial<BusinessHours>
) => {
setHours((current) =>
current.map((item, i) =>
i === index
? {
...item,
...patch,
}
: item
)
);
};

const isPending =
createBusiness.isPending ||
updateBusiness.isPending ||
submitBusiness.isPending;

if (id && loadingBusiness) {
return (
<View
style={[
styles.root,
styles.centered,
{
paddingTop: insets.top,
},
]}
>
<ActivityIndicator  
color={colors.light.primary}  
size="large"  
/>

<Text style={styles.loadingText}>  
      Loading business...  
    </Text>  
  </View>  
);

}

return (
<View
style={[
styles.root,
{
paddingTop: insets.top,
},
]}
>
<KeyboardAvoidingView
style={styles.keyboard}
behavior={
Platform.OS === 'ios'
? 'padding'
: undefined
}
>
{/* HEADER */}
<View style={styles.header}>
<Pressable
onPress={() => router.back()}
style={styles.backBtn}
>
<Feather  
name="arrow-left"  
size={20}  
color={colors.light.foreground}  
/>
</Pressable>

<Text style={styles.headerTitle}>  
        {id  
          ? 'Edit Listing'  
          : 'New Business Listing'}  
      </Text>  

      <View style={{ width: 40 }} />  
    </View>  

    <ScrollView  
      keyboardShouldPersistTaps="handled"  
      contentContainerStyle={  
        styles.scrollContent  
      }  
      showsVerticalScrollIndicator={false}  
    >  
      {/* BASIC INFO */}  
      <View style={styles.section}>  
        <Text style={styles.sectionTitle}>  
          Basic Information  
        </Text>  

        <Text style={styles.label}>  
          Business Name *  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="e.g. Apex PC Repairs"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={form.name}  
          onChangeText={(text) =>  
            setField('name', text)  
          }  
        />  

        <Text style={styles.label}>  
          Display Name  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="Public owner or business display name"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={form.owner_display_name}  
          onChangeText={(text) =>  
            setField(  
              'owner_display_name',  
              text  
            )  
          }  
        />  

        {/* CATEGORY SEARCH */}  
        <Text style={styles.label}>  
          Search Category  
        </Text>  

        <View style={styles.searchBox}>  
          <Feather  
            name="search"  
            size={18}  
            color={  
              colors.light.mutedForeground  
            }  
          />  

          <TextInput  
            style={styles.searchInput}  
            placeholder="Search all business categories..."  
            placeholderTextColor={  
              colors.light.mutedForeground  
            }  
            value={categorySearch}  
            onChangeText={  
              setCategorySearch  
            }  
          />  

          {categorySearch.length > 0 && (  
            <Pressable  
              onPress={() =>  
                setCategorySearch('')  
              }  
            >  
              <Feather  
                name="x"  
                size={18}  
                color={  
                  colors.light.mutedForeground  
                }  
              />  
            </Pressable>  
          )}  
        </View>  

        <CategoryPicker  
          label="Category *"  
          categories={  
            filteredCategories.length  
              ? filteredCategories  
              : categoriesData ?? []  
          }  
          selectedId={  
            form.category_id  
          }  
          loading={  
            categoriesLoading  
          }  
          error={  
            categoriesError  
          }  
          onRetry={() =>  
            void refetchCategories()  
          }  
          onChoose={(category) => {  
            setForm(  
              (current) => ({  
                ...current,  
                category_id:  
                  category.id,  
                subcategory: '',  
              })  
            );  

            setSubcategorySearch(  
              ''  
            );  
          }}  
        />  

        {/* SUBCATEGORY */}  
        <Text style={styles.label}>  
          Sub-category  
        </Text>  

        {selectedCategory ? (  
          <>  
            <View  
              style={styles.searchBox}  
            >  
              <Feather  
                name="search"  
                size={17}  
                color={  
                  colors.light  
                    .mutedForeground  
                }  
              />  

              <TextInput  
                style={  
                  styles.searchInput  
                }  
                placeholder="Search sub-category..."  
                placeholderTextColor={  
                  colors.light  
                    .mutedForeground  
                }  
                value={  
                  subcategorySearch  
                }  
                onChangeText={  
                  setSubcategorySearch  
                }  
              />  
            </View>  

            <View  
              style={  
                styles.categories  
              }  
            >  
              {filteredSubcategories.map(  
                (subcategory) => (  
                  <Pressable  
                    key={  
                      subcategory  
                    }  
                    style={[  
                      styles.catPill,  
                      form.subcategory ===  
                        subcategory &&  
                        styles.catPillActive,  
                    ]}  
                    onPress={() =>  
                      setField(  
                        'subcategory',  
                        subcategory  
                      )  
                    }  
                  >  
                    <Text  
                      style={[  
                        styles.catText,  
                        form.subcategory ===  
                          subcategory &&  
                          styles.catTextActive,  
                      ]}  
                    >  
                      {subcategory}  
                    </Text>  
                  </Pressable>  
                )  
              )}  
            </View>  
          </>  
        ) : (  
          <Text  
            style={styles.helperText}  
          >  
            Choose a category to see relevant sub-categories.  
          </Text>  
        )}  

        <TextInput  
          style={styles.input}  
          placeholder="Or enter a more specific sub-category"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={  
            form.subcategory  
          }  
          onChangeText={(text) =>  
            setField(  
              'subcategory',  
              text  
            )  
          }  
        />  
      </View>  

      {/* CONTACT & LOCATION */}  
      <View style={styles.section}>  
        <Text style={styles.sectionTitle}>  
          Contact & Location  
        </Text>  

        <View  
          style={styles.locationHeader}  
        >  
          <View  
            style={  
              styles.locationIcon  
            }  
          >  
            <Feather  
              name="map-pin"  
              size={19}  
              color={  
                colors.light.primary  
              }  
            />  
          </View>  

          <View  
            style={  
              styles.locationHeaderText  
            }  
          >  
            <Text  
              style={  
                styles.locationTitle  
              }  
            >  
              Business Location  
            </Text>  

            <Text  
              style={  
                styles.locationSubtitle  
              }  
            >  
              Search and select the full business address.  
            </Text>  
          </View>  
        </View>  

        <Text style={styles.label}>  
          City / Area *  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="e.g. Aligarh"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={form.city}  
          onChangeText={(text) =>  
            setField(  
              'city',  
              text  
            )  
          }  
        />  

        <Text style={styles.label}>  
          Search Full Location / Address  
        </Text>  

        <LocationAutocomplete  
          value={form.address}  
          latitude={form.latitude}
          longitude={form.longitude}
          showMap
          mapTitle="Choose business location"
          onChangeText={(address) =>  
            setForm(  
              (current) => ({  
                ...current,  
                address,  
              })  
            )  
          }  
          onSelect={(location) =>  
            setForm(  
              (current) => ({  
                ...current,  

                address:  
                  location.address ||  
                  current.address,  

                city:  
                  location.city ||  
                  current.city,  

                service_areas:  
                  current.service_areas ||  
                  location.area ||  
                  '',  
                latitude: location.latitude,
                longitude: location.longitude,
              })  
            )  
          }  
        />  

        <Text  
          style={  
            styles.locationHint  
          }  
        >  
          Select the correct location from the search results. The selected city and area will be used for your business listing.  
        </Text>  

        <Text style={styles.label}>  
          Full Address  
        </Text>  

        <TextInput  
          style={[  
            styles.input,  
            styles.textAreaSmall,  
          ]}  
          placeholder="House/shop number, street, landmark, locality..."  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={form.address}  
          onChangeText={(text) =>  
            setField(  
              'address',  
              text  
            )  
          }  
          multiline  
        />  

        <Text style={styles.label}>  
          Service Areas  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="e.g. Khetgaon, Aligarh, nearby areas"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={  
            form.service_areas  
          }  
          onChangeText={(text) =>  
            setField(  
              'service_areas',  
              text  
            )  
          }  
        />  

        <Text  
          style={  
            styles.helperText  
          }  
        >  
          You can add multiple areas separated by commas.  
        </Text>  

        <Text style={styles.label}>  
          Phone Number *  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="+91..."  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          keyboardType="phone-pad"  
          value={form.phone}  
          onChangeText={(text) =>  
            setField(  
              'phone',  
              text  
            )  
          }  
        />  

        <Text style={styles.label}>  
          Owner / Contact Name  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="Who should customers ask for?"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={form.owner_name}  
          onChangeText={(text) =>  
            setField(  
              'owner_name',  
              text  
            )  
          }  
        />  

        <Text style={styles.label}>  
          WhatsApp Number  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="+91... (Optional)"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          keyboardType="phone-pad"  
          value={form.whatsapp}  
          onChangeText={(text) =>  
            setField(  
              'whatsapp',  
              text  
            )  
          }  
        />  

        <Text style={styles.label}>  
          Email  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="name@example.com"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          keyboardType="email-address"  
          autoCapitalize="none"  
          value={form.email}  
          onChangeText={(text) =>  
            setField(  
              'email',  
              text  
            )  
          }  
        />  

        <Text style={styles.label}>  
          Services Offered  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="e.g. Repair, Installation, Home Delivery"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={  
            form.services_offered  
          }  
          onChangeText={(text) =>  
            setField(  
              'services_offered',  
              text  
            )  
          }  
        />  

        <Text style={styles.label}>  
          Price Range  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="e.g. ₹500–₹2,000"  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          value={  
            form.price_range  
          }  
          onChangeText={(text) =>  
            setField(  
              'price_range',  
              text  
            )  
          }  
        />  
      </View>  

      {/* DETAILS */}  
      <View style={styles.section}>  
        <Text style={styles.sectionTitle}>  
          Business Details  
        </Text>  

        <Text style={styles.label}>  
          Description  
        </Text>  

        <TextInput  
          style={[  
            styles.input,  
            styles.textArea,  
          ]}  
          placeholder="Tell customers about your business, services and experience..."  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          multiline  
          value={  
            form.description  
          }  
          onChangeText={(text) =>  
            setField(  
              'description',  
              text  
            )  
          }  
        />  

        <Text style={styles.label}>  
          Website  
        </Text>  

        <TextInput  
          style={styles.input}  
          placeholder="https://..."  
          placeholderTextColor={  
            colors.light.mutedForeground  
          }  
          keyboardType="url"  
          autoCapitalize="none"  
          value={form.website}  
          onChangeText={(text) =>  
            setField(  
              'website',  
              text  
            )  
          }  
        />  
      </View>  

      {/* HOURS */}  
      <View style={styles.section}>  
        <Text style={styles.sectionTitle}>  
          Weekly Opening Hours  
        </Text>  

        <Text  
          style={styles.helperText}  
        >  
          Set opening and closing time for each day.  
        </Text>  

        {[  
          'Sun',  
          'Mon',  
          'Tue',  
          'Wed',  
          'Thu',  
          'Fri',  
          'Sat',  
        ].map(  
          (day, index) => {  
            const hour =  
              hours[index];  

            return (  
              <View  
                key={day}  
                style={  
                  styles.hoursRow  
                }  
              >  
                <Text  
                  style={  
                    styles.day  
                  }  
                >  
                  {day}  
                </Text>  

                <Pressable  
                  style={[  
                    styles.closedToggle,  
                    hour.is_closed &&  
                      styles.closedToggleActive,  
                  ]}  
                  onPress={() =>  
                    updateHour(  
                      index,  
                      {  
                        is_closed:  
                          !hour.is_closed,  
                      }  
                    )  
                  }  
                >  
                  <Text  
                    style={[  
                      styles.closedText,  
                      hour.is_closed &&  
                        styles.closedTextActive,  
                    ]}  
                  >  
                    {hour.is_closed  
                      ? 'CLOSED'  
                      : 'OPEN'}  
                  </Text>  
                </Pressable>  

                {!hour.is_closed && (  
                  <>  
                    <TextInput  
                      style={  
                        styles.timeInput  
                      }  
                      value={  
                        hour.opens_at ??  
                        ''  
                      }  
                      onChangeText={(  
                        opens_at  
                      ) =>  
                        updateHour(  
                          index,  
                          {  
                            opens_at,  
                          }  
                        )  
                      }  
                      placeholder="09:00"  
                      placeholderTextColor={  
                        colors.light  
                          .mutedForeground  
                      }  
                    />  

                    <Text  
                      style={  
                        styles.to  
                      }  
                    >  
                      to  
                    </Text>  

                    <TextInput  
                      style={  
                        styles.timeInput  
                      }  
                      value={  
                        hour.closes_at ??  
                        ''  
                      }  
                      onChangeText={(  
                        closes_at  
                      ) =>  
                        updateHour(  
                          index,  
                          {  
                            closes_at,  
                          }  
                        )  
                      }  
                      placeholder="18:00"  
                      placeholderTextColor={  
                        colors.light  
                          .mutedForeground  
                      }  
                    />  
                  </>  
                )}  
              </View>  
            );  
          }  
        )}  
      </View>  

      {/* MEDIA */}  
      {id && (  
        <View  
          style={styles.section}  
        >  
          <Text  
            style={  
              styles.sectionTitle  
            }  
          >  
            Business Logo & Photos  
          </Text>  

          <Text  
            style={  
              styles.helperText  
            }  
          >  
            Add a logo and business photos one image at a time. JPG, PNG and WebP images up to 5 MB are supported.  
          </Text>  

          <View  
            style={  
              styles.mediaActions  
            }  
          >  
            <Pressable  
              style={  
                styles.mediaBtn  
              }  
              onPress={() =>  
                handlePickImage(  
                  'logo'  
                )  
              }  
              disabled={  
                uploading  
              }  
            >  
              <Feather  
                name="image"  
                size={20}  
                color={  
                  colors.light  
                    .primary  
                }  
              />  

              <Text  
                style={  
                  styles.mediaBtnText  
                }  
              >  
                ADD / REPLACE LOGO  
              </Text>  
            </Pressable>  

            <Pressable  
              style={  
                styles.mediaBtn  
              }  
              onPress={() =>  
                handlePickImage(  
                  'photo'  
                )  
              }  
              disabled={  
                uploading  
              }  
            >  
              <Feather  
                name="camera"  
                size={20}  
                color={  
                  colors.light  
                    .primary  
                }  
              />  

              <Text  
                style={  
                  styles.mediaBtnText  
                }  
              >  
                ADD BUSINESS PHOTO  
              </Text>  
            </Pressable>  
          </View>  

          {uploading && (  
            <View  
              style={  
                styles.uploading  
              }  
            >  
              <ActivityIndicator  
                color={  
                  colors.light  
                    .primary  
                }  
              />  

              <Text  
                style={  
                  styles.helperText  
                }  
              >  
                Uploading photo...  
              </Text>  
            </View>  
          )}  

          <View  
            style={  
              styles.photoGrid  
            }  
          >  
            {businessData?.photos  
              ?.filter(  
                (photo) =>  
                  photo.signedUrl  
              )  
              .map((photo) => (  
                <View  
                  key={photo.id}  
                  style={  
                    styles.photoWrap  
                  }  
                >  
                  <Image  
                    source={{  
                      uri:  
                        photo.signedUrl!,  
                    }}  
                    style={  
                      styles.photoPreview  
                    }  
                  />  

                  <View  
                    style={  
                      styles.photoControls  
                    }  
                  >  
                    <Pressable  
                      onPress={() =>  
                        void setBusinessLogo(  
                          photo.id  
                        )  
                          .then(  
                            async () => {  
                              await refetchBusiness();  

                              Alert.alert(  
                                'Logo updated',  
                                'This image is now your business logo.'  
                              );  
                            }  
                          )  
                          .catch(  
                            (  
                              error  
                            ) =>  
                              Alert.alert(  
                                'Logo update failed',  
                                error?.message ||  
                                  'Please try again.'  
                              )  
                          )  
                      }  
                    >  
                      <Text  
                        style={  
                          styles.logoItem  
                        }  
                      >  
                        {photo.is_logo  
                          ? '★ LOGO'  
                          : 'MAKE LOGO'}  
                      </Text>  
                    </Pressable>  

                    <Pressable  
                      disabled={  
                        deleteImage.isPending  
                      }  
                      onPress={() =>  
                        Alert.alert(  
                          'Remove photo',  
                          'Remove this photo from your listing?',  
                          [  
                            {  
                              text: 'Cancel',  
                              style:  
                                'cancel',  
                            },  
                            {  
                              text: 'Remove',  
                              style:  
                                'destructive',  
                              onPress:  
                                () =>  
                                  deleteImage.mutate(  
                                    photo,  
                                    {  
                                      onSuccess:  
                                        () =>  
                                          Alert.alert(  
                                            'Photo removed',  
                                            'The photo was removed.'  
                                          ),  
                                      onError:  
                                        (  
                                          error: Error  
                                        ) =>  
                                          Alert.alert(  
                                            'Remove failed',  
                                            error.message  
                                          ),  
                                    }  
                                  ),  
                            },  
                          ]  
                        )  
                      }  
                    >  
                      <Feather  
                        name="trash-2"  
                        size={17}  
                        color={  
                          colors.light  
                            .destructive  
                        }  
                      />  
                    </Pressable>  
                  </View>  
                </View>  
              ))}  
          </View>  

          {(!businessData?.photos ||  
            businessData.photos.length ===  
              0) && (  
            <Text  
              style={  
                styles.helperText  
              }  
            >  
              No photos yet.  
            </Text>  
          )}  
        </View>  
      )}  

      {/* TERMS */}  
      <View style={styles.section}>  
        <Pressable  
          style={  
            styles.checkboxRow  
          }  
          onPress={() =>  
            setPublicContactConsent(  
              (current) =>  
                !current  
            )  
          }  
        >  
          <View  
            style={[  
              styles.checkbox,  
              publicContactConsent &&  
                styles.checkboxActive,  
            ]}  
          >  
            {publicContactConsent && (  
              <Feather  
                name="check"  
                size={14}  
                color="#050A17"  
              />  
            )}  
          </View>  

          <Text  
            style={  
              styles.termsText  
            }  
          >  
            I consent to show my phone, WhatsApp, and email publicly.  
          </Text>  
        </Pressable>  

        <Pressable  
          style={[  
            styles.checkboxRow,  
            {  
              marginTop: 14,  
            },  
          ]}  
          onPress={() =>  
            setAcceptedTerms(  
              (current) =>  
                !current  
            )  
          }  
        >  
          <View  
            style={[  
              styles.checkbox,  
              acceptedTerms &&  
                styles.checkboxActive,  
            ]}  
          >  
            {acceptedTerms && (  
              <Feather  
                name="check"  
                size={14}  
                color="#050A17"  
              />  
            )}  
          </View>  

          <Text  
            style={  
              styles.termsText  
            }  
          >  
            I accept the{' '}  
            <Text  
              style={  
                styles.link  
              }  
              onPress={() =>  
                router.push(  
                  '/business/legal' as any  
                )  
              }  
            >  
              Terms, Listing Rules, and Privacy Policy  
            </Text>  
            .  
          </Text>  
        </Pressable>  
      </View>  

      {/* SAVE / PREVIEW */}  
      <View  
        style={  
          styles.footerActions  
        }  
      >  
        <Pressable  
          style={[  
            styles.secondaryBtn,  
            isPending &&  
              styles.disabledBtn,  
          ]}  
          onPress={() =>  
            handleSave(  
              (businessId) =>  
                router.replace(  
                  `/business/${businessId}` as any  
                ),  
              true  
            )  
          }  
          disabled={isPending}  
        >  
          <Feather  
            name="eye"  
            size={17}  
            color={  
              colors.light.foreground  
            }  
          />  

          <Text  
            style={  
              styles.secondaryBtnText  
            }  
          >  
            PREVIEW  
          </Text>  
        </Pressable>  

        <Pressable  
          style={[  
            styles.saveBtn,  
            isPending &&  
              styles.disabledBtn,  
          ]}  
          onPress={() =>  
            handleSave()  
          }  
          disabled={isPending}  
        >  
          {isPending ? (  
            <ActivityIndicator  
              color="#050A17"  
            />  
          ) : (  
            <>  
              <Feather  
                name="save"  
                size={17}  
                color={  
                  colors.light  
                    .primaryForeground  
                }  
              />  

              <Text  
                style={  
                  styles.saveBtnText  
                }  
              >  
                SAVE DRAFT  
              </Text>  
            </>  
          )}  
        </Pressable>  
      </View>  

      {/* SUBMIT */}  
      {id && (  
        <Pressable  
          style={[  
            styles.submitBtn,  
            isPending &&  
              styles.disabledBtn,  
          ]}  
          disabled={isPending}  
          onPress={() =>  
            submitBusiness.mutate(  
              id,  
              {  
                onSuccess: () => {  
                  Alert.alert(  
                    'Submitted for review',  
                    'Your business is now pending moderation.',  
                    [  
                      {  
                        text: 'OK',  
                        onPress:  
                          () =>  
                            router.replace(  
                              '/business/mine' as any  
                            ),  
                      },  
                    ]  
                  );  
                },  

                onError: (  
                  error: Error  
                ) =>  
                  Alert.alert(  
                    'Unable to submit',  
                    error.message ||  
                      'Please try again.'  
                  ),  
              }  
            )  
          }  
        >  
          <Feather  
            name="send"  
            size={18}  
            color={  
              colors.light  
                .background  
            }  
          />  

          <Text  
            style={  
              styles.submitBtnText  
            }  
          >  
            {submitBusiness.isPending  
              ? 'SUBMITTING...'  
              : 'SUBMIT FOR REVIEW'}  
          </Text>  
        </Pressable>  
      )}  

      <View  
        style={  
          styles.bottomSpace  
        }  
      />  
    </ScrollView>  
  </KeyboardAvoidingView>  
</View>

);
}

const styles = StyleSheet.create({
root: {
flex: 1,
backgroundColor:
colors.light.background,
},

keyboard: {
flex: 1,
},

centered: {
alignItems: 'center',
justifyContent: 'center',
},

loadingText: {
marginTop: 12,
color:
colors.light.mutedForeground,
fontSize: 13,
},

header: {
flexDirection: 'row',
alignItems: 'center',
justifyContent:
'space-between',
paddingHorizontal: 20,
paddingVertical: 12,
},

backBtn: {
width: 40,
height: 40,
borderRadius: 20,
backgroundColor:
colors.light.card,
alignItems: 'center',
justifyContent: 'center',
borderWidth: 1,
borderColor:
colors.light.border,
},

headerTitle: {
fontSize: 18,
fontWeight: '800',
color:
colors.light.foreground,
},

scrollContent: {
padding: 20,
paddingBottom: 60,
},

section: {
backgroundColor:
colors.light.card,
borderRadius: 16,
padding: 16,
marginBottom: 20,
borderWidth: 1,
borderColor:
colors.light.border,
},

sectionTitle: {
fontSize: 17,
fontWeight: '800',
color:
colors.light.foreground,
marginBottom: 16,
},

label: {
color:
colors.light.mutedForeground,
fontSize: 12,
fontWeight: '700',
marginBottom: 8,
textTransform: 'uppercase',
letterSpacing: 0.5,
},

input: {
backgroundColor:
colors.light.input,
borderRadius: 12,
paddingHorizontal: 16,
height: 50,
color:
colors.light.foreground,
marginBottom: 16,
fontSize: 15,
borderWidth: 1,
borderColor:
colors.light.border,
},

textArea: {
height: 120,
paddingTop: 16,
textAlignVertical:
'top',
},

textAreaSmall: {
height: 90,
paddingTop: 14,
textAlignVertical:
'top',
},

searchBox: {
minHeight: 50,
backgroundColor:
colors.light.input,
borderRadius: 12,
paddingHorizontal: 14,
flexDirection: 'row',
alignItems: 'center',
gap: 9,
borderWidth: 1,
borderColor:
colors.light.border,
marginBottom: 12,
},

searchInput: {
flex: 1,
color:
colors.light.foreground,
fontSize: 14,
minHeight: 48,
},

categories: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: 8,
marginBottom: 10,
},

catPill: {
paddingHorizontal: 14,
paddingVertical: 9,
borderRadius: 20,
backgroundColor:
colors.light.input,
borderWidth: 1,
borderColor:
colors.light.border,
},

catPillActive: {
backgroundColor:
colors.light.primary,
borderColor:
colors.light.primary,
},

catText: {
color:
colors.light.mutedForeground,
fontSize: 13,
fontWeight: '600',
},

catTextActive: {
color:
colors.light.primaryForeground,
},

helperText: {
color:
colors.light.mutedForeground,
fontSize: 13,
lineHeight: 19,
marginBottom: 12,
},

locationHeader: {
flexDirection: 'row',
alignItems: 'center',
padding: 12,
borderRadius: 12,
backgroundColor:
colors.light.primary + '10',
borderWidth: 1,
borderColor:
colors.light.primary + '30',
marginBottom: 16,
},

locationIcon: {
width: 40,
height: 40,
borderRadius: 20,
backgroundColor:
colors.light.card,
alignItems: 'center',
justifyContent: 'center',
marginRight: 10,
},

locationHeaderText: {
flex: 1,
},

locationTitle: {
fontSize: 14,
fontWeight: '800',
color:
colors.light.foreground,
},

locationSubtitle: {
marginTop: 3,
fontSize: 12,
lineHeight: 17,
color:
colors.light.mutedForeground,
},

locationHint: {
marginTop: -6,
marginBottom: 16,
fontSize: 12,
lineHeight: 18,
color:
colors.light.mutedForeground,
},

logoRow: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: 8,
},

logoItem: {
color:
colors.light.primary,
fontSize: 11,
fontWeight: '800',
},

mediaActions: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: 8,
marginBottom: 12,
},

mediaBtn: {
width: '48%',
minHeight: 52,
padding: 8,
borderRadius: 10,
backgroundColor:
colors.light.primary + '10',
borderWidth: 1,
borderColor:
colors.light.primary + '40',
alignItems: 'center',
justifyContent: 'center',
gap: 4,
},

mediaBtnText: {
color:
colors.light.primary,
fontSize: 10,
fontWeight: '800',
textAlign: 'center',
},

uploading: {
flexDirection: 'row',
gap: 8,
alignItems: 'center',
marginBottom: 10,
},

photoGrid: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: 10,
},

photoWrap: {
width: 130,
backgroundColor:
colors.light.input,
borderRadius: 10,
overflow: 'hidden',
},

photoPreview: {
width: 130,
height: 96,
backgroundColor:
colors.light.border,
},

photoControls: {
padding: 8,
flexDirection: 'row',
justifyContent:
'space-between',
alignItems: 'center',
},

checkboxRow: {
flexDirection: 'row',
alignItems: 'center',
gap: 12,
},

checkbox: {
width: 24,
height: 24,
borderRadius: 6,
borderWidth: 2,
borderColor:
colors.light.border,
alignItems: 'center',
justifyContent: 'center',
backgroundColor:
colors.light.input,
},

checkboxActive: {
backgroundColor:
colors.light.primary,
borderColor:
colors.light.primary,
},

termsText: {
flex: 1,
color:
colors.light.mutedForeground,
fontSize: 13,
lineHeight: 20,
},

link: {
color:
colors.light.primary,
fontWeight: '700',
},

hoursRow: {
flexDirection: 'row',
alignItems: 'center',
gap: 7,
marginBottom: 10,
},

day: {
color:
colors.light.foreground,
width: 30,
fontSize: 12,
fontWeight: '800',
},

closedToggle: {
borderWidth: 1,
borderColor:
colors.light.primary,
borderRadius: 6,
padding: 6,
width: 57,
alignItems: 'center',
},

closedToggleActive: {
backgroundColor:
colors.light.primary,
},

closedText: {
color:
colors.light.primary,
fontSize: 9,
fontWeight: '900',
},

closedTextActive: {
color:
colors.light.primaryForeground,
},

timeInput: {
flex: 1,
height: 38,
backgroundColor:
colors.light.input,
borderRadius: 7,
color:
colors.light.foreground,
paddingHorizontal: 8,
fontSize: 12,
borderWidth: 1,
borderColor:
colors.light.border,
},

to: {
color:
colors.light.mutedForeground,
fontSize: 11,
},

footerActions: {
flexDirection: 'row',
gap: 10,
marginBottom: 12,
},

saveBtn: {
height: 54,
borderRadius: 16,
backgroundColor:
colors.light.primary,
alignItems: 'center',
justifyContent: 'center',
flex: 1,
flexDirection: 'row',
gap: 8,
},

secondaryBtn: {
height: 54,
borderRadius: 16,
backgroundColor:
colors.light.card,
borderWidth: 1,
borderColor:
colors.light.border,
alignItems: 'center',
justifyContent: 'center',
flex: 1,
flexDirection: 'row',
gap: 8,
},

secondaryBtnText: {
color:
colors.light.foreground,
fontSize: 13,
fontWeight: '900',
letterSpacing: 0.5,
},

saveBtnText: {
color:
colors.light.primaryForeground,
fontSize: 14,
fontWeight: '900',
letterSpacing: 0.7,
},

submitBtn: {
height: 54,
borderRadius: 16,
backgroundColor:
colors.light.foreground,
alignItems: 'center',
justifyContent: 'center',
marginTop: 0,
flexDirection: 'row',
gap: 8,
},

submitBtnText: {
color:
colors.light.background,
fontSize: 14,
fontWeight: '900',
letterSpacing: 0.7,
},

disabledBtn: {
opacity: 0.55,
},

bottomSpace: {
height: 30,
},
});