import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@/components/Feather";
import { CategoryPicker } from "@/components/CategoryPicker";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import colors from "@/constants/colors";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import {
  useDeleteOfferingPhoto,
  useOffering,
  useOfferingCategories,
  useOfferingPhoto,
  useSaveOffering,
} from "@/hooks/useOfferings";
import { openImageMediaPicker } from "@/lib/imageMediaPicker";
import type { OfferingInput } from "@/lib/offerings";

const legal = "2026-09-10";
type Field = "name" | "category" | "subcategory" | "description" | "price" | "city" | "contact_phone" | "whatsapp" | "consent" | "terms";
type Errors = Partial<Record<Field, string>>;

export default function OfferingEdit() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: "product" | "service" }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  useSupabaseAuth();

  const detail = useOffering(id ?? "");
  const save = useSaveOffering(id);
  const photo = useOfferingPhoto();
  const deletePhoto = useDeleteOfferingPhoto();
  const [terms, setTerms] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [prior, setPrior] = useState({
    termsVersion: null as string | null,
    termsAt: null as string | null,
    consentAt: null as string | null,
    phone: "",
    whatsapp: null as string | null,
  });
  const [f, setF] = useState({
    kind: kind === "service" ? "service" as const : "product" as const,
    listing_intent: "sell" as "buy" | "sell",
    name: "",
    category: "",
    subcategory: "",
    description: "",
    price: "",
    price_unit: "per item",
    in_stock: true,
    city: "",
    area: "",
    location_text: "",
    service_area: "",
    contact_phone: "",
    whatsapp: "",
    delivery_info: "",
    availability_hours: "",
  });
  const [localPhotos, setLocalPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const categories = useOfferingCategories(f.kind);
  const parents = (categories.data ?? []).filter(x => !x.parent_id);
  const selectedParent = parents.find(x => x.name === f.category);
  const children = (categories.data ?? []).filter(x => x.parent_id === selectedParent?.id);

  useEffect(() => {
    const o = detail.data?.offering;
    if (!o) return;
    setF({
      ...o,
      subcategory: o.subcategory ?? "",
      price: o.price?.toString() ?? "",
      area: o.area ?? "",
      location_text: o.location_text ?? "",
      service_area: o.service_area ?? "",
      whatsapp: o.whatsapp ?? "",
      delivery_info: o.delivery_info ?? "",
      availability_hours: o.availability_hours ?? "",
    });
    setPrior({
      termsVersion: o.terms_version,
      termsAt: o.terms_accepted_at,
      consentAt: o.contact_public_consent_at,
      phone: o.contact_phone,
      whatsapp: o.whatsapp,
    });
  }, [detail.data]);

  const clearError = (field: Field) => setErrors(current => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });

  const input = (field: keyof typeof f, placeholder: string, multi = false) => {
    const error = errors[field as Field];
    return <>
      <Text style={s.label}>{field.replaceAll("_", " ").toUpperCase()}</Text>
      <TextInput
        style={[s.input, multi && s.area, error && s.inputError]}
        placeholder={placeholder}
        placeholderTextColor={colors.light.mutedForeground}
        value={String(f[field] ?? "")}
        multiline={multi}
        onChangeText={value => {
          setF(current => ({ ...current, [field]: value }));
          clearError(field as Field);
        }}
      />
      {error ? <Text style={s.errorText}>↑ {error}</Text> : null}
    </>;
  };

  const validate = (preview: boolean) => {
    const next: Errors = {};
    if (f.name.trim().length < 2) next.name = "Name is required (minimum 2 characters).";
    if (!f.category.trim()) next.category = "Please select a category.";
    if (!f.subcategory.trim()) next.subcategory = "Please select or enter a subcategory.";
    if (!f.description.trim()) next.description = "Description is required.";
    if (!f.city.trim()) next.city = "City is required.";
    if (!/^\+?[0-9][0-9 ()-]{6,38}$/.test(f.contact_phone.trim())) next.contact_phone = "Enter a valid contact phone number.";
    if (f.whatsapp.trim() && !/^\+?[0-9][0-9 ()-]{6,38}$/.test(f.whatsapp.trim())) next.whatsapp = "Enter a valid WhatsApp number.";
    if (f.price.trim() && (!Number.isFinite(Number(f.price)) || Number(f.price) < 0)) next.price = "Enter a valid price of 0 or more.";

    const sameTerms = prior.termsVersion === legal && !!prior.termsAt;
    const sameContact = prior.phone === f.contact_phone && prior.whatsapp === (f.whatsapp || null) && !!prior.consentAt;
    if (preview && !sameContact && !consent) next.consent = "Public contact consent is required before Preview or Publish.";
    if (preview && !sameTerms && !terms) next.terms = "Terms and listing rules must be accepted before Preview or Publish.";

    setErrors(next);
    if (Object.keys(next).length) {
      scroll.current?.scrollTo({ y: 0, animated: true });
      Alert.alert("Required information missing", "Red fields show exactly what must be completed.");
      return null;
    }
    return { sameTerms, sameContact };
  };

  const pickPhoto = () => openImageMediaPicker({
    title: "Add Product or Service Photo",
    multiple: true,
    onPicked: assets => setLocalPhotos(current => [...current, ...assets].slice(0, 8)),
  });

  const uploadPhotos = async (offeringId: string) => {
    for (const asset of localPhotos) {
      const blob = await (await fetch(asset.uri)).blob();
      const filename = asset.fileName || asset.uri.split("/").pop() || "offering.jpg";
      const lower = filename.toLowerCase();
      const contentType = lower.endsWith(".png") ? "image/png" : lower.endsWith(".webp") ? "image/webp" : "image/jpeg";
      await photo.mutateAsync({ offeringId, filename, file: blob, contentType });
    }
  };

  const submit = (preview = false) => {
    const validation = validate(preview);
    if (!validation) return;
    const now = new Date().toISOString();
    const payload: OfferingInput = {
      business_id: null,
      kind: f.kind,
      listing_intent: f.kind === "product" ? f.listing_intent : "sell",
      name: f.name,
      category: f.category,
      subcategory: f.subcategory || null,
      description: f.description,
      price: f.price ? Number(f.price) : null,
      price_unit: f.price_unit,
      in_stock: f.in_stock,
      city: f.city,
      area: f.area || null,
      location_text: f.location_text || null,
      service_area: f.service_area || null,
      contact_phone: f.contact_phone,
      whatsapp: f.whatsapp || null,
      delivery_info: f.delivery_info || null,
      availability_hours: f.availability_hours || null,
      is_enabled: true,
      contact_public_consent_at: validation.sameContact ? prior.consentAt : consent ? now : null,
      terms_version: validation.sameTerms ? prior.termsVersion : terms ? legal : null,
      terms_accepted_at: validation.sameTerms ? prior.termsAt : terms ? now : null,
    };
    save.mutate(payload, {
      onSuccess: async result => {
        router.replace((preview ? `/business/offering/preview?id=${result.id}` : "/business/offerings-mine") as never);
        let photoUploadFailed = false;
        try {
          await uploadPhotos(result.id);
        } catch (error) {
          console.error("Offering photo upload failed", error);
          photoUploadFailed = true;
        }
        setLocalPhotos([]);
        setTimeout(() => Alert.alert(
          photoUploadFailed ? "Draft saved" : "Saved successfully",
          photoUploadFailed
            ? "The product was saved in My Listings, but one or more photos could not be uploaded."
            : preview ? "Opening listing preview." : "Your draft is now visible in My Listings.",
        ), 250);
      },
      onError: error => {
        console.error("Offering save failed", error);
        Alert.alert("Unable to save", "Please check the red required fields and try again.");
      },
    });
  };

  if (id && detail.isLoading) {
    return <View style={[s.root, s.center, { paddingTop: insets.top }]}><ActivityIndicator color={colors.light.primary}/></View>;
  }

  return <View style={[s.root, { paddingTop: insets.top }]}>
    <View style={s.head}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Go back"><Feather name="arrow-left" size={22} color={colors.light.foreground}/></Pressable>
      <Text style={s.title}>{id ? "Edit" : "Add"} {f.kind === "product" ? "Product" : "Service"}</Text>
      <View/>
    </View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {Object.keys(errors).length ? <View style={s.errorSummary}>
        <Text style={s.errorTitle}>Please complete the red fields</Text>
        {Object.values(errors).map(message => <Text key={message} style={s.errorSummaryText}>• {message}</Text>)}
      </View> : null}
      {input("name", `${f.kind === "product" ? "Product" : "Service"} name *`)}
      {f.kind === "product" ? <>
        <Text style={s.label}>PRODUCT OPTION *</Text>
        <View style={s.intentRow}>
          <Pressable
            style={[s.intentButton, f.listing_intent === "sell" && s.intentSelected]}
            onPress={() => setF(current => ({ ...current, listing_intent: "sell" }))}
          >
            <Text style={[s.intentText, f.listing_intent === "sell" && s.intentSelectedText]}>SELL PRODUCT</Text>
          </Pressable>
          <Pressable
            style={[s.intentButton, f.listing_intent === "buy" && s.intentSelected]}
            onPress={() => setF(current => ({ ...current, listing_intent: "buy" }))}
          >
            <Text style={[s.intentText, f.listing_intent === "buy" && s.intentSelectedText]}>WANT TO BUY</Text>
          </Pressable>
        </View>
      </> : null}
      <View style={errors.category && s.sectionError}>
        <CategoryPicker
          label="Category *"
          categories={parents}
          selectedId={selectedParent?.id}
          loading={categories.isLoading}
          error={categories.error}
          onRetry={() => void categories.refetch()}
          onChoose={category => {
            setF(current => ({ ...current, category: category.name, subcategory: "" }));
            clearError("category");
          }}
        />
      </View>
      {errors.category ? <Text style={s.errorText}>↑ {errors.category}</Text> : null}
      {!!f.category && <>
        <Text style={s.label}>SUBCATEGORY *</Text>
        <View style={[s.choices, errors.subcategory && s.sectionError]}>
          {children.length ? children.map(category => <Pressable
            key={category.id}
            style={[s.choice, f.subcategory === category.name && s.selected]}
            onPress={() => {
              setF(current => ({ ...current, subcategory: category.name }));
              clearError("subcategory");
            }}
          ><Text style={s.text}>{category.name}</Text></Pressable>) : <TextInput
            style={[s.input, errors.subcategory && s.inputError]}
            placeholder="Enter subcategory *"
            placeholderTextColor={colors.light.mutedForeground}
            value={f.subcategory}
            onChangeText={value => {
              setF(current => ({ ...current, subcategory: value }));
              clearError("subcategory");
            }}
          />}
        </View>
        {errors.subcategory ? <Text style={s.errorText}>↑ {errors.subcategory}</Text> : null}
      </>}
      {input("description", "Description *", true)}
      {input("price", "Price")}
      {input("price_unit", "per item / per hour")}
      {input("city", "City *")}
      {input("area", "Area / locality")}
      <LocationAutocomplete
        value={f.location_text}
        onChangeText={value => setF(current => ({ ...current, location_text: value }))}
        onSelect={location => {
          setF(current => ({
            ...current,
            location_text: location.address,
            city: location.city || current.city,
            area: location.area || current.area,
          }));
          clearError("city");
        }}
      />
      {f.kind === "service" && input("service_area", "Service area")}
      {input("contact_phone", "+91 contact number *")}
      {input("whatsapp", "WhatsApp number")}
      {f.kind === "product" && input("delivery_info", "Delivery information")}
      {f.kind === "service" && input("availability_hours", "Availability / hours")}
      <Text style={s.label}>PHOTOS</Text>
      <Pressable testID="upload-offering-photo" style={s.photo} onPress={pickPhoto}>
        <Text style={s.buttonText}>{photo.isPending ? "UPLOADING..." : "ADD PHOTO"}</Text>
      </Pressable>
      <View style={s.photos}>
        {localPhotos.map((item, index) => <Pressable key={`${item.uri}-${index}`} onPress={() => setLocalPhotos(current => current.filter((_, itemIndex) => itemIndex !== index))}>
          <Image source={{ uri: item.uri }} style={s.image}/><Text style={s.remove}>×</Text>
        </Pressable>)}
        {detail.data?.photos.map(item => <Pressable key={item.id} onPress={() => deletePhoto.mutate({ ...item, offering_id: id! })}>
          <Image source={{ uri: item.signedUrl ?? undefined }} style={s.image}/>
        </Pressable>)}
      </View>
      <View style={s.toggle}><Text style={s.text}>In stock / available</Text><Switch value={f.in_stock} onValueChange={value => setF(current => ({ ...current, in_stock: value }))}/></View>
      <Pressable style={[s.check, errors.consent && s.sectionError]} onPress={() => { setConsent(!consent); clearError("consent"); }}>
        <Feather name={consent ? "check-square" : "square"} size={22} color={errors.consent ? colors.light.destructive : colors.light.primary}/>
        <Text style={[s.text, errors.consent && s.errorLabel]}>I consent to show my contact details publicly.</Text>
      </Pressable>
      {errors.consent ? <Text style={s.errorText}>↑ {errors.consent}</Text> : null}
      <Pressable style={[s.check, errors.terms && s.sectionError]} onPress={() => { setTerms(!terms); clearError("terms"); }}>
        <Feather name={terms ? "check-square" : "square"} size={22} color={errors.terms ? colors.light.destructive : colors.light.primary}/>
        <Text style={[s.text, errors.terms && s.errorLabel]}>I accept the Terms and listing rules.</Text>
      </Pressable>
      {errors.terms ? <Text style={s.errorText}>↑ {errors.terms}</Text> : null}
      <Pressable testID="save-offering" style={s.button} onPress={() => submit(false)} disabled={save.isPending || photo.isPending}>
        <Text style={s.buttonText}>{save.isPending ? "SAVING..." : "SAVE DRAFT"}</Text>
      </Pressable>
      <Pressable testID="preview-offering" style={s.button} onPress={() => submit(true)} disabled={save.isPending || photo.isPending}>
        <Text style={s.buttonText}>{save.isPending ? "OPENING..." : "PREVIEW"}</Text>
      </Pressable>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  center: { alignItems: "center", justifyContent: "center" },
  head: { padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.light.foreground, fontWeight: "800", fontSize: 18 },
  content: { padding: 20, paddingBottom: 60 },
  label: { color: colors.light.mutedForeground, fontWeight: "700", fontSize: 11, marginBottom: 6 },
  input: { backgroundColor: colors.light.card, color: colors.light.foreground, borderColor: colors.light.border, borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 14 },
  inputError: { borderColor: colors.light.destructive, borderWidth: 2, marginBottom: 4 },
  area: { height: 100, textAlignVertical: "top" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  choice: { borderWidth: 1, borderColor: colors.light.border, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 11 },
  selected: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  intentRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  intentButton: { flex: 1, borderWidth: 1, borderColor: colors.light.border, backgroundColor: colors.light.card, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  intentSelected: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  intentText: { color: colors.light.foreground, fontSize: 12, fontWeight: "900" },
  intentSelectedText: { color: colors.light.primaryForeground },
  sectionError: { borderColor: colors.light.destructive, borderWidth: 2, borderRadius: 12, padding: 6 },
  errorText: { color: colors.light.destructive, fontSize: 12, fontWeight: "700", marginTop: -2, marginBottom: 12 },
  errorLabel: { color: colors.light.destructive },
  errorSummary: { borderWidth: 1, borderColor: colors.light.destructive, backgroundColor: colors.light.destructive + "12", borderRadius: 12, padding: 12, marginBottom: 18, gap: 4 },
  errorTitle: { color: colors.light.destructive, fontWeight: "900" },
  errorSummaryText: { color: colors.light.destructive, fontSize: 12 },
  toggle: { backgroundColor: colors.light.card, padding: 14, borderRadius: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  check: { flexDirection: "row", gap: 10, alignItems: "center", marginVertical: 8 },
  text: { color: colors.light.foreground, flex: 1, fontSize: 13 },
  button: { backgroundColor: colors.light.primary, borderRadius: 14, alignItems: "center", padding: 17, marginTop: 18 },
  photo: { backgroundColor: colors.light.primary, borderRadius: 10, padding: 12, alignItems: "center", marginBottom: 10 },
  photos: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  image: { height: 70, width: 70, borderRadius: 8 },
  remove: { position: "absolute", right: -3, top: -8, backgroundColor: colors.light.destructive, color: "white", borderRadius: 10, width: 20, textAlign: "center", fontWeight: "900" },
  buttonText: { color: colors.light.primaryForeground, fontWeight: "900" },
});