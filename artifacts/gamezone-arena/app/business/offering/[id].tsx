import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import colors from "@/constants/colors";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useOffering, useOfferingAction, useOfferingBasketAction } from "@/hooks/useOfferings";
import { copyLink, offeringLink, shareLink } from "@/lib/share";

export default function Detail() {
  useSupabaseAuth();
  const { id } = useLocalSearchParams<{ id:string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useOffering(id);
  const action = useOfferingAction();
  const basket = useOfferingBasketAction();
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState<"spam" | "fraud" | "inappropriate_content" | "harassment" | "incorrect_information" | "other">("spam");
  const [reportDetails, setReportDetails] = useState("");

  if (isLoading) return <View style={styles.root}><ActivityIndicator color={colors.light.primary}/></View>;
  if (error || !data) return <View style={styles.root}><Text style={styles.error}>{error ? (error as Error).message : "Listing unavailable"}</Text>{error ? <Pressable style={styles.retry} onPress={() => void refetch()}><Text style={styles.retryText}>RETRY</Text></Pressable> : null}</View>;

  const offering = data.offering;
  const open = (url:string) => void Linking.openURL(url).catch(() => Alert.alert("Unavailable", "No compatible app is available."));
  const button = (label:string, onPress:()=>void, primary=false) => <Pressable
    testID={`offering-${label.toLowerCase().replaceAll(" ", "-")}`}
    style={[styles.button, primary && styles.primaryButton]}
    onPress={onPress}
    disabled={action.isPending || basket.isPending}
  ><Text style={[styles.buttonText, primary && styles.primaryButtonText]}>{label}</Text></Pressable>;

  const toggleSaved = () => action.mutate({ type:"favorite", id:offering.id, value:!data.isSaved }, {
    onSuccess:() => Alert.alert(data.isSaved ? "Removed" : "Saved", data.isSaved ? "Removed from saved listings." : "Added to saved listings."),
    onError:() => Alert.alert("Could not update", "Please try again."),
  });
  const buy = () => basket.mutate({ type:"add", id:offering.id }, {
    onSuccess:() => {
       Alert.alert("Added to basket", "Purchase request saved. Seller contact is available only when a server-side public contact projection confirms explicit consent and a valid value.", [
        { text:"View Basket", onPress:() => router.push("/business/offering/basket" as never) },
      ]);
    },
    onError:error => {
      console.error("Add product to basket failed", error);
      Alert.alert("Unable to add product", "Sign in as a buyer and make sure this product is still available.");
    },
  });

  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Back</Text></Pressable>
    <Text style={styles.kind}>
      {offering.kind === "product" ? offering.listing_intent === "buy" ? "WANT TO BUY" : "FOR SALE" : "SERVICE"} · {offering.category}
      {offering.subcategory ? ` · ${offering.subcategory}` : ""}
    </Text>
    <Text style={styles.name}>{offering.name}</Text>
    {data.photos.length ? <ScrollView horizontal contentContainerStyle={styles.photos}>
      {data.photos.filter(photo => photo.signedUrl).map(photo => <Image key={photo.id} source={{ uri:photo.signedUrl! }} style={styles.image}/>)}
    </ScrollView> : null}
    <Text style={styles.description}>{offering.description || "No description provided."}</Text>
    <Text style={styles.info}>{offering.price == null ? "Contact for price" : `₹${offering.price} ${offering.price_unit}`}</Text>
    <Text style={styles.info}>📍 {offering.location_text || [offering.area, offering.city].filter(Boolean).join(", ")}</Text>
    {offering.service_area ? <Text style={styles.info}>Service area: {offering.service_area}</Text> : null}

    {offering.kind === "product" && offering.listing_intent === "sell" ? <View style={styles.buyCard}>
      <Text style={styles.buyTitle}>Interested in this product?</Text>
      <Text style={styles.buyDescription}>Add it to your private basket. This records your purchase request; payment is not taken in the app.</Text>
      {button(basket.isPending ? "ADDING…" : "BUY / ADD TO BASKET", buy, true)}
    </View> : null}

    <View style={styles.actions}>
      {button("Map", () => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offering.location_text || `${offering.area || ""} ${offering.city}`)}`))}
      {button("Share", () => void shareLink(offering.name, `${offering.name}: ${offeringLink(offering.id)}`))}
       {button("Copy Link", () => void copyLink(offeringLink(offering.id)).then(() => Alert.alert("Copied", "Listing link copied.")).catch(() => Alert.alert("Copy unavailable", "Your device could not copy the listing link.")))}
      {button(data.isSaved ? "Unsave" : "Save", toggleSaved)}
      {button("Block", () => action.mutate({ type:"block", id:offering.id, value:true }, { onSuccess:() => router.replace("/business/offerings" as never) }))}
       {button("Report", () => setReporting(true))}
    </View>
     <Text style={styles.contactNotice}>Seller contact is shown only when explicit consent and a valid contact value are returned by a public-safe server projection. Contact is unavailable for this listing.</Text>
     {reporting ? <View style={styles.reportCard}>
       <Text style={styles.reportTitle}>Report listing</Text>
       <Text style={styles.reportHelp}>Select the closest reason. Details are optional.</Text>
       <View style={styles.reasonList}>{([
         ["spam", "Spam or misleading promotion"],
         ["fraud", "Fraud or scam"],
         ["incorrect_information", "Incorrect information"],
         ["inappropriate_content", "Inappropriate content"],
         ["harassment", "Harassment or hate"],
         ["other", "Other concern"],
       ] as const).map(([reason, label]) => <Pressable key={reason} style={[styles.reason, reportReason === reason && styles.reasonSelected]} onPress={() => setReportReason(reason)}><Text style={[styles.reasonText, reportReason === reason && styles.reasonTextSelected]}>{reportReason === reason ? "✓ " : ""}{label}</Text></Pressable>)}</View>
       <TextInput value={reportDetails} onChangeText={setReportDetails} multiline maxLength={2000} placeholder="Optional details" placeholderTextColor={colors.light.mutedForeground} style={styles.reportInput}/>
       <View style={styles.reportActions}>
         <Pressable style={styles.cancelReport} onPress={() => setReporting(false)}><Text style={styles.buttonText}>CANCEL</Text></Pressable>
         <Pressable disabled={action.isPending} style={styles.submitReport} onPress={() => action.mutate({ type:"report", id:offering.id, value:reportReason, reason:reportDetails }, { onSuccess:() => { setReporting(false); setReportDetails(""); Alert.alert("Reported", "Thank you for your report."); }, onError:(reportError: Error) => Alert.alert("Could not submit report", reportError.message || "Your selected reason and details are still available. Please try again.") })}><Text style={styles.primaryButtonText}>{action.isPending ? "SENDING…" : "SUBMIT REPORT"}</Text></Pressable>
       </View>
     </View> : null}
    <Text style={styles.reviews}>Reviews ({data.reviews.length})</Text>
    {data.reviews.map((review:any) => <Text key={review.id} style={styles.info}>★ {review.rating} {review.body}</Text>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.light.background},
  content:{padding:20,gap:12,paddingBottom:50},
  back:{color:colors.light.primary,fontWeight:"800"},
  kind:{color:colors.light.primary,fontSize:12,fontWeight:"900"},
  name:{color:colors.light.foreground,fontSize:28,fontWeight:"900"},
  photos:{gap:10},
  image:{height:190,width:250,borderRadius:12},
  description:{color:colors.light.mutedForeground,lineHeight:21},
  info:{color:colors.light.foreground,fontSize:14},
  buyCard:{backgroundColor:colors.light.primary+"15",borderColor:colors.light.primary,borderWidth:1,borderRadius:14,padding:14,gap:8},
  buyTitle:{color:colors.light.foreground,fontSize:17,fontWeight:"900"},
  buyDescription:{color:colors.light.mutedForeground,fontSize:12,lineHeight:18},
  actions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:10},
  button:{backgroundColor:colors.light.card,borderColor:colors.light.border,borderWidth:1,borderRadius:10,paddingVertical:10,paddingHorizontal:12},
  primaryButton:{backgroundColor:colors.light.primary,borderColor:colors.light.primary},
  buttonText:{color:colors.light.primary,fontWeight:"800",fontSize:12},
  primaryButtonText:{color:colors.light.primaryForeground},
  reviews:{color:colors.light.foreground,fontWeight:"900",fontSize:17,marginTop:12},
   error:{color:colors.light.destructive,textAlign:"center",marginTop:80},
   retry:{alignSelf:"center",marginTop:12,padding:12},
   retryText:{color:colors.light.primary,fontWeight:"900"},
   contactNotice:{color:colors.light.mutedForeground,fontSize:12},
   reportCard:{backgroundColor:colors.light.card,borderColor:colors.light.border,borderWidth:1,borderRadius:14,padding:14,gap:10},
   reportTitle:{color:colors.light.foreground,fontSize:17,fontWeight:"900"},
   reportHelp:{color:colors.light.mutedForeground,fontSize:12},
   reasonList:{gap:7},
   reason:{borderWidth:1,borderColor:colors.light.border,borderRadius:9,padding:10},
   reasonSelected:{borderColor:colors.light.primary,backgroundColor:colors.light.primary+"14"},
   reasonText:{color:colors.light.foreground,fontSize:12,fontWeight:"700"},
   reasonTextSelected:{color:colors.light.primary},
   reportInput:{borderWidth:1,borderColor:colors.light.border,borderRadius:10,padding:10,minHeight:72,color:colors.light.foreground,textAlignVertical:"top"},
   reportActions:{flexDirection:"row",gap:8},
   cancelReport:{flex:1,borderWidth:1,borderColor:colors.light.border,borderRadius:10,padding:11,alignItems:"center"},
   submitReport:{flex:1,backgroundColor:colors.light.primary,borderRadius:10,padding:11,alignItems:"center"},
});