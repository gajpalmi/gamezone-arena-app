import React,{useEffect,useState}from"react";
import{Alert,Image,ScrollView,Text,TextInput}from"react-native";
import type * as ImagePicker from"expo-image-picker";
import{useLocalSearchParams,useRouter}from"expo-router";
import{useSupabaseAuth}from"@/hooks/useBusiness";
import{useJobMutation,useMySeekerProfile}from"@/hooks/useJobs";
import{uploadApplicationResume}from"@/lib/jobs";
import{openImageMediaPicker}from"@/lib/imageMediaPicker";
import{Button,styles as s}from"@/components/JobsUi";

export default function Apply(){
  useSupabaseAuth();const{jobId}=useLocalSearchParams<{jobId:string}>();const r=useRouter();const p=useMySeekerProfile();const m=useJobMutation();
  const[f,setF]=useState({applicant_name:"",phone:"",email:"",experience:"",skills:"",introduction:"",message:""});
  const[resume,setResume]=useState<ImagePicker.ImagePickerAsset|null>(null);
  useEffect(()=>{const x=p.data;if(x)setF(v=>({...v,applicant_name:x.display_name,experience:x.experience_months==null?"":String(x.experience_months),skills:x.skills.join(", "),introduction:x.bio??""}))},[p.data]);
  const input=(k:keyof typeof f,label:string)=><TextInput style={s.input} value={f[k]} onChangeText={v=>setF({...f,[k]:v})} placeholder={label} placeholderTextColor={s.subtitle.color} multiline={k==="introduction"||k==="message"}/>;
  const chooseResume=()=>openImageMediaPicker({title:"Add Resume / CV Image",onPicked:assets=>setResume(assets[0])});
  const submit=()=>{const months=f.experience===""?null:Number(f.experience);if(!jobId||!f.applicant_name.trim()||!f.phone.trim()||months!==null&&(!Number.isInteger(months)||months<0))return Alert.alert("Check application","Enter a name, valid phone number, and whole-number experience.");m.mutate({type:"apply",value:{job_id:jobId,applicant_name:f.applicant_name,phone:f.phone,email:f.email||null,experience_months:months,skills:f.skills.split(",").map(x=>x.trim()).filter(Boolean),introduction:f.introduction||null,message:f.message||null}},{onSuccess:async application=>{r.replace("/business/jobs/applications"as any);if(resume)try{const blob=await(await fetch(resume.uri)).blob();await uploadApplicationResume((application as any).id,resume.fileName||resume.uri.split("/").pop()||"resume.jpg",blob,resume.mimeType||"image/jpeg")}catch(e){console.error("Resume upload failed",e);setTimeout(()=>Alert.alert("Application sent, resume upload failed","Resume upload failed. Please try again."),250);return}setTimeout(()=>Alert.alert("Applied","Your application was sent."),250)},onError:(e:Error)=>{console.error("Application failed",e);Alert.alert("Could not apply",e.message)}})};
  return <ScrollView style={s.root} contentContainerStyle={s.content}><Text style={s.title}>Apply for job</Text><Text style={s.subtitle}>Your contact details are shared only with this job’s employer. Resume upload currently supports JPG, PNG or WebP images up to 5 MB.</Text>{input("applicant_name","Your name")}{input("phone","Phone")}{input("email","Email (optional)")}{input("experience","Experience in months")}{input("skills","Skills (comma separated)")}{input("introduction","Short introduction")}<Button label={resume?"Replace resume/CV image":"Add resume/CV image (optional)"} onPress={chooseResume}/>{resume?<><Image source={{uri:resume.uri}} style={{width:120,height:90,resizeMode:"contain",alignSelf:"center"}}/><Text style={s.meta}>{resume.fileName||"Selected resume image"}</Text><Button label="Remove selected resume" onPress={()=>setResume(null)}/></>:null}{input("message","Additional message")}<Button kind label={m.isPending?"Submitting…":"Submit application"} onPress={submit}/></ScrollView>
}