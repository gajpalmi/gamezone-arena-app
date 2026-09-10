import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ListingMapProps } from "./ListingMap.native";

export default function ListingMap(props: ListingMapProps) {
  const [latitude,setLatitude]=useState(String(props.marker?.latitude??props.region.latitude));
  const [longitude,setLongitude]=useState(String(props.marker?.longitude??props.region.longitude));
  const [error,setError]=useState("");
  useEffect(()=>{if(props.visible){setLatitude(String(props.marker?.latitude??props.region.latitude));setLongitude(String(props.marker?.longitude??props.region.longitude));setError("");}},[props.visible,props.marker?.latitude,props.marker?.longitude,props.region.latitude,props.region.longitude]);
  const apply=()=>{const lat=Number(latitude),lon=Number(longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -90||lat>90||lon< -180||lon>180){setError("Enter valid latitude and longitude.");return;}setError("");void props.onMapPress(lat,lon);};
  return <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}><View style={s.container}>
    <Text style={s.icon}>🗺️</Text><Text style={s.title}>{props.title}</Text><Text style={s.body}>Use current location, or enter map coordinates.</Text>
    <View style={s.coordinates}><TextInput style={s.input} value={latitude} onChangeText={setLatitude} keyboardType="numeric" placeholder="Latitude"/><TextInput style={s.input} value={longitude} onChangeText={setLongitude} keyboardType="numeric" placeholder="Longitude"/><Pressable onPress={apply} style={s.apply}><Text style={s.primaryText}>APPLY</Text></Pressable></View>
    {error?<Text style={s.error}>{error}</Text>:null}<Text style={s.location}>{props.selectedLocation||"No location selected."}</Text>{props.mapLoading?<ActivityIndicator/>:null}
    <Pressable disabled={props.locationLoading} onPress={()=>void props.onCurrentLocation()} style={s.primary}>{props.locationLoading?<ActivityIndicator color="#fff"/>:<Text style={s.primaryText}>USE CURRENT LOCATION</Text>}</Pressable>
    <View style={s.row}><Pressable onPress={props.onClose} style={s.secondary}><Text style={s.secondaryText}>CLOSE</Text></Pressable><Pressable disabled={!props.marker} onPress={props.onConfirm} style={[s.primary,s.flex,!props.marker&&s.disabled]}><Text style={s.primaryText}>USE LOCATION</Text></Pressable></View>
  </View></Modal>;
}
const s=StyleSheet.create({container:{flex:1,alignItems:"center",justifyContent:"center",padding:28,backgroundColor:"#f8fafc",gap:14},icon:{fontSize:54},title:{fontSize:20,fontWeight:"800",color:"#111827"},body:{color:"#64748b"},coordinates:{width:"100%",maxWidth:420,flexDirection:"row",gap:8},input:{flex:1,minHeight:44,borderWidth:1,borderColor:"#cbd5e1",borderRadius:8,paddingHorizontal:10,backgroundColor:"#fff"},apply:{minHeight:44,borderRadius:8,backgroundColor:"#0f766e",justifyContent:"center",paddingHorizontal:12},primary:{width:"100%",maxWidth:420,minHeight:48,borderRadius:12,backgroundColor:"#2563eb",alignItems:"center",justifyContent:"center",padding:10},primaryText:{color:"#fff",fontWeight:"800"},row:{width:"100%",maxWidth:420,flexDirection:"row",gap:10},secondary:{flex:1,minHeight:48,borderRadius:12,backgroundColor:"#e2e8f0",alignItems:"center",justifyContent:"center"},secondaryText:{fontWeight:"800"},flex:{flex:1},disabled:{opacity:.5},error:{color:"#b91c1c"},location:{maxWidth:480,color:"#111827",fontWeight:"600",textAlign:"center"}});