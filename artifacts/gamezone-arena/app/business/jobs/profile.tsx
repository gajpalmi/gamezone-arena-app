import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import type * as ImagePicker from "expo-image-picker";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useJobCategories, useJobMutation, useMySeekerProfile } from "@/hooks/useJobs";
import { uploadSeekerPhoto, type SeekerProfileInput } from "@/lib/jobs";
import { openImageMediaPicker } from "@/lib/imageMediaPicker";
import { Button, styles as s } from "@/components/JobsUi";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

const legal = "2026-09-10";
const initial = (): SeekerProfileInput => ({ display_name:"", photo_path:null, category:"", role:"", skills:[], experience:"", education:null, expected_salary_min:null, expected_salary_max:null, preferred_work_types:["full_time"], preferred_work_mode:"on_site", city:null, area:null, available_from:null, bio:null, contact_phone:null, whatsapp:null, email:null, contact_public:false, profile_public:false, terms_version:legal, terms_accepted_at:"" });

export default function Profile() {
  useSupabaseAuth();
  const router = useRouter();
  const q = useMySeekerProfile();
  const categories = useJobCategories();
  const m = useJobMutation();
  const [f,setF] = useState<SeekerProfileInput>(initial());
  const [skills,setSkills] = useState("");
  const [terms,setTerms] = useState(false);
  const [photo,setPhoto] = useState<ImagePicker.ImagePickerAsset|null>(null);
  const [locationSearch,setLocationSearch] = useState("");
  useEffect(()=>{ if(q.data){ setF({...q.data,category:q.data.category??""}); setSkills(q.data.skills.join(", ")); setLocationSearch([q.data.area,q.data.city].filter(Boolean).join(", ")); } },[q.data]);
  useEffect(()=>{ if(categories.error) console.error("Job category loading failed", categories.error); },[categories.error]);
  const field=(k:keyof SeekerProfileInput,l:string)=><><Text style={s.label}>{l}</Text><TextInput style={s.input} value={String(f[k]??"")} onChangeText={v=>setF({...f,[k]:v} as SeekerProfileInput)} placeholder={l} placeholderTextColor={s.subtitle.color}/></>;
  const choosePhoto=()=>openImageMediaPicker({title:"Add Profile Photo",onPicked:assets=>setPhoto(assets[0])});
  const save=()=>m.mutate({type:"profile",value:{...f,photo_path:q.data?.photo_path??null,skills:skills.split(",").map(x=>x.trim()).filter(Boolean),terms_accepted_at:terms?new Date().toISOString():f.terms_accepted_at}},{onSuccess:async profile=>{if(photo)try{const blob=await(await fetch(photo.uri)).blob();await uploadSeekerPhoto((profile as any).id,photo.fileName||photo.uri.split("/").pop()||"profile.jpg",blob,photo.mimeType||"image/jpeg");setPhoto(null)}catch(e){console.error("Profile photo upload failed",e);Alert.alert("Profile saved, photo upload failed","Photo upload failed. Please try again.");return}Alert.alert("Saved successfully","Your worker profile was saved.");router.replace("/business/jobs" as never)},onError:(e:Error)=>{console.error("Profile save failed",e);Alert.alert("Unable to save","Please try again.")}});
  const submit=()=>{if(!q.data?.id)return Alert.alert("Save first","Save the worker profile before submitting it.");m.mutate({type:"submit-profile",id:q.data.id},{onSuccess:()=>{Alert.alert("Submitted for review","Your worker profile is pending moderation.");router.replace("/business/jobs" as never)},onError:(e:Error)=>{console.error("Profile submit failed",e);Alert.alert("Unable to publish","Please complete the required profile fields and try again.")}})};
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <Text style={s.title}>Job seeker profile</Text><Text style={s.subtitle}>Only profile fields you mark public are shown to employers. Contact details remain private unless you explicitly allow them.</Text>
    <Button label={photo?"Replace profile photo":"Add profile photo (optional)"} onPress={choosePhoto}/>
    {photo?<><Image source={{uri:photo.uri}} style={{width:100,height:100,borderRadius:50,alignSelf:"center"}}/><Text style={s.meta}>{photo.fileName||"Selected image"}</Text><Button label="Remove selected photo" onPress={()=>setPhoto(null)}/></>:q.data?.photo_path?<Text style={s.meta}>A private profile photo is attached.</Text>:null}
    {field("display_name","Display name")}<Text style={s.label}>Job category</Text>
    <TextInput style={s.input} value={String(f.category??"")} editable={false} placeholder="Choose a category below" placeholderTextColor={s.subtitle.color}/>
    {categories.isLoading?<Text style={s.meta}>Loading categories…</Text>:categories.error?<><Text style={s.meta}>Unable to load categories. Please try again.</Text><Button label="Retry categories" onPress={()=>void categories.refetch()}/></>:<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,marginBottom:12}}>{(categories.data??[]).map(c=><Pressable key={c.id} style={s.card} onPress={()=>setF({...f,category:c.name,category_id:c.id})}><Text style={s.meta}>{f.category_id===c.id?"✓ ":""}{c.name}</Text></Pressable>)}</ScrollView>}
    {field("role","Job role")}<Text style={s.label}>Skills</Text><TextInput style={s.input} value={skills} onChangeText={setSkills} placeholder="Comma separated skills" placeholderTextColor={s.subtitle.color}/>{field("experience","Experience")}{field("education","Education")}<LocationAutocomplete value={locationSearch} onChangeText={setLocationSearch} onSelect={location=>{setLocationSearch(location.address);setF({...f,city:location.city||f.city,area:location.area||f.area})}}/>{field("city","City")}{field("area","Area")}{field("available_from","Available from")}{field("bio","Short bio")}{field("contact_phone","Contact phone")}{field("whatsapp","WhatsApp (optional)")}{field("email","Email (optional)")}
    <Pressable style={s.card} onPress={()=>setF({...f,profile_public:!f.profile_public})}><Text style={s.meta}>{f.profile_public?"✓":"□"} Show professional profile publicly</Text></Pressable><Pressable style={s.card} onPress={()=>setF({...f,contact_public:!f.contact_public})}><Text style={s.meta}>{f.contact_public?"✓":"□"} Allow employers to see my contact details</Text></Pressable><Pressable style={s.card} onPress={()=>setTerms(!terms)}><Text style={s.meta}>{terms?"✓":"□"} I accept the privacy notice and Terms.</Text></Pressable><Button kind label={m.isPending?"Saving…":"Save profile"} onPress={save}/>{q.data&&["draft","rejected"].includes(q.data.status)?<Button label={m.isPending?"Submitting…":"Submit profile for review"} onPress={submit}/>:null}
  </ScrollView>;
}