import React,{useEffect,useState}from"react";
import{ActivityIndicator,FlatList,Pressable,StyleSheet,Text,TextInput,View}from"react-native";
import{useRouter}from"expo-router";
import colors from"@/constants/colors";
import{CategoryPicker}from"@/components/CategoryPicker";
import{useOfferingCategories,useOfferings}from"@/hooks/useOfferings";
import{useSupabaseAuth}from"@/hooks/useBusiness";

type Filters={query:string;kind:"product"|"service";category?:string};
export default function Offerings(){
  useSupabaseAuth();const router=useRouter();
  const[draft,setDraft]=useState<Filters>({query:"",kind:"product"});
  const[submitted,setSubmitted]=useState<Filters>({query:"",kind:"product"});
  const categories=useOfferingCategories(draft.kind);
  const selected=categories.data?.find(item=>!item.parent_id&&item.name===draft.category);
  const listings=useOfferings(submitted);
  useEffect(()=>{if(categories.error)console.error("Offering category loading failed",categories.error)},[categories.error]);
  const chooseKind=(kind:"product"|"service")=>setDraft(current=>({...current,kind,category:undefined}));
  const apply=()=>setSubmitted({...draft});
  return <View style={s.root}><Text style={s.title}>Products & Services</Text>
    <View style={s.row}><TextInput style={s.input} value={draft.query} onChangeText={query=>setDraft({...draft,query})} onSubmitEditing={apply} returnKeyType="search" placeholder="Search name or description" placeholderTextColor={colors.light.mutedForeground}/>{(["product","service"]as const).map(kind=><Pressable key={kind} style={[s.pill,draft.kind===kind&&s.active]} onPress={()=>chooseKind(kind)}><Text style={s.text}>{kind}</Text></Pressable>)}</View>
    <CategoryPicker categories={(categories.data??[]).filter(item=>!item.parent_id)} selectedId={selected?.id} onChoose={item=>setDraft({...draft,category:item.name})} loading={categories.isLoading} error={categories.error} onRetry={()=>void categories.refetch()}/>
    <Pressable style={s.searchButton} onPress={apply}><Text style={s.buttonText}>Search / Apply Filters</Text></Pressable>
    {listings.isLoading?<ActivityIndicator color={colors.light.primary}/>:listings.error?<View><Text style={s.error}>Unable to load listings. Please try again.</Text><Pressable style={s.searchButton} onPress={()=>void listings.refetch()}><Text style={s.buttonText}>Retry Search</Text></Pressable></View>:<FlatList data={listings.data??[]} keyExtractor={item=>item.id} contentContainerStyle={s.list} ListEmptyComponent={<Text style={s.empty}>No approved listings match these filters.</Text>} renderItem={({item})=><Pressable testID="open-offering" style={s.card} onPress={()=>router.push(`/business/offering/${item.id}` as any)}><Text style={s.name}>{item.name}</Text><Text style={s.meta}>{item.kind.toUpperCase()} · {item.category}{item.subcategory?` / ${item.subcategory}`:""} · {item.city}</Text><Text style={s.meta}>{item.price==null?"Contact for price":`${item.price} ${item.price_unit}`}</Text></Pressable>}/>}
  </View>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.light.background,padding:20,gap:12},title:{color:colors.light.foreground,fontSize:25,fontWeight:"900"},row:{flexDirection:"row",gap:8},input:{flex:1,backgroundColor:colors.light.card,color:colors.light.foreground,borderRadius:10,padding:12},pill:{padding:10,backgroundColor:colors.light.card,borderRadius:10},active:{backgroundColor:colors.light.primary},text:{color:colors.light.foreground,fontSize:11,fontWeight:"700"},searchButton:{backgroundColor:colors.light.primary,borderRadius:10,padding:13,alignItems:"center"},buttonText:{color:colors.light.primaryForeground,fontWeight:"900"},list:{gap:10,paddingTop:4},card:{backgroundColor:colors.light.card,borderRadius:14,borderWidth:1,borderColor:colors.light.border,padding:15},name:{color:colors.light.foreground,fontWeight:"800",fontSize:16},meta:{color:colors.light.mutedForeground,fontSize:12,marginTop:5},empty:{color:colors.light.mutedForeground,textAlign:"center",marginTop:50},error:{color:colors.light.destructive,textAlign:"center",marginVertical:12}});