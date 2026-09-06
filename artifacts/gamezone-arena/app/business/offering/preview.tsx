import React from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import colors from "@/constants/colors";
import { Button } from "@/components/JobsUi";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useOffering, useOfferingAction } from "@/hooks/useOfferings";

export default function OfferingPreview() {
  useSupabaseAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const detail = useOffering(id ?? "");
  const action = useOfferingAction();
  if (detail.isLoading) return <View style={s.root}><ActivityIndicator color={colors.light.primary}/></View>;
  if (!detail.data) return <View style={s.root}><Text style={s.error}>{detail.error ? (detail.error as Error).message : "Preview unavailable."}</Text></View>;
  const { offering, photos } = detail.data;
  const edit = () => router.replace(`/business/offering/edit?id=${offering.id}` as never);
  const publish = () => action.mutate({ type: "submit", id: offering.id }, {
    onSuccess: () => { Alert.alert("Submitted", "Your listing is pending moderation."); router.replace("/business/offerings-mine" as never); },
    onError: error => { console.error("Offering publish failed", error); Alert.alert("Unable to publish. Please try again.", (error as Error).message); },
  });
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <Text style={s.title}>Preview {offering.kind === "product" ? "Product" : "Service"}</Text>
    <Text style={s.meta}>This is how your listing information will appear after approval.</Text>
    <Text style={s.kind}>{offering.category}{offering.subcategory ? ` · ${offering.subcategory}` : ""}</Text>
    <Text style={s.name}>{offering.name}</Text>
    {photos.length ? <ScrollView horizontal contentContainerStyle={s.photos}>{photos.filter(photo => photo.signedUrl).map(photo => <Image key={photo.id} source={{ uri: photo.signedUrl! }} style={s.image}/>)}</ScrollView> : null}
    <View style={s.card}><Text style={s.text}>{offering.description}</Text><Text style={s.text}>{offering.price == null ? "Contact for price" : `₹${offering.price} ${offering.price_unit}`}</Text><Text style={s.text}>📍 {offering.location_text || [offering.area, offering.city].filter(Boolean).join(", ")}</Text>{offering.service_area ? <Text style={s.text}>Service area: {offering.service_area}</Text> : null}{offering.delivery_info ? <Text style={s.text}>Delivery: {offering.delivery_info}</Text> : null}{offering.availability_hours ? <Text style={s.text}>Hours: {offering.availability_hours}</Text> : null}</View>
    <Button label="Edit" onPress={edit}/><Button label="Save Draft" onPress={() => router.replace("/business/offerings-mine" as never)}/><Button kind label={action.isPending ? "Submitting…" : "Publish / Submit"} onPress={publish}/><Button label="Back" onPress={edit}/>
  </ScrollView>;
}

const s = StyleSheet.create({root:{flex:1,backgroundColor:colors.light.background},content:{padding:20,gap:12,paddingBottom:60},title:{color:colors.light.foreground,fontSize:25,fontWeight:"900"},meta:{color:colors.light.mutedForeground},kind:{color:colors.light.primary,fontWeight:"800"},name:{color:colors.light.foreground,fontSize:24,fontWeight:"900"},photos:{gap:8},image:{width:230,height:170,borderRadius:12},card:{backgroundColor:colors.light.card,borderColor:colors.light.border,borderWidth:1,borderRadius:12,padding:14,gap:8},text:{color:colors.light.foreground},error:{color:colors.light.destructive,textAlign:"center",marginTop:80}});