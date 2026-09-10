import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type MapPressEvent, type Region } from "react-native-maps";

export type ListingMapProps = {
  visible: boolean;
  title: string;
  region: Region;
  marker: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  mapLoading: boolean;
  selectedLocation: string;
  onClose: () => void;
  onMapPress: (latitude: number, longitude: number) => void | Promise<void>;
  onCurrentLocation: () => void | Promise<void>;
  onConfirm: () => void;
};

export default function ListingMap(props: ListingMapProps) {
  const press = (event: MapPressEvent) => void props.onMapPress(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude);
  return <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
    <View style={s.container}>
      <View style={s.header}><Pressable onPress={props.onClose} style={s.secondary}><Text style={s.secondaryText}>CLOSE</Text></Pressable><Text style={s.title}>{props.title}</Text></View>
      <View style={s.map}>
        <MapView style={StyleSheet.absoluteFillObject} region={props.region} onPress={press} loadingEnabled>
          {props.marker ? <Marker coordinate={props.marker} title="Selected location" description={props.selectedLocation || "Selected location"}/> : null}
        </MapView>
        {props.mapLoading ? <View style={s.loading}><ActivityIndicator size="large"/><Text>Getting address…</Text></View> : null}
      </View>
      <View style={s.footer}>
        <Text style={s.location}>{props.selectedLocation || "Tap the map or use your current location."}</Text>
        <View style={s.row}>
          <Pressable disabled={props.locationLoading} onPress={() => void props.onCurrentLocation()} style={s.primary}>{props.locationLoading ? <ActivityIndicator color="#fff"/> : <Text style={s.primaryText}>CURRENT LOCATION</Text>}</Pressable>
          <Pressable disabled={!props.marker} onPress={props.onConfirm} style={[s.primary,!props.marker&&s.disabled]}><Text style={s.primaryText}>USE LOCATION</Text></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const s=StyleSheet.create({
  container:{flex:1,backgroundColor:"#fff"},header:{minHeight:72,padding:14,flexDirection:"row",alignItems:"center",gap:16},title:{flex:1,fontSize:18,fontWeight:"800",color:"#111827"},
  map:{flex:1},loading:{...StyleSheet.absoluteFillObject,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(255,255,255,0.6)",gap:8},footer:{padding:16,gap:12},
  location:{color:"#111827",lineHeight:20},row:{flexDirection:"row",gap:10},primary:{flex:1,minHeight:48,borderRadius:12,backgroundColor:"#2563eb",alignItems:"center",justifyContent:"center",padding:8},
  primaryText:{color:"#fff",fontWeight:"800",textAlign:"center"},secondary:{minHeight:42,borderRadius:12,backgroundColor:"#e2e8f0",justifyContent:"center",paddingHorizontal:12},
  secondaryText:{color:"#111827",fontWeight:"800"},disabled:{opacity:.5},
});