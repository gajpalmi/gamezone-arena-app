import React,{useEffect,useState}from"react";
import{ActivityIndicator,FlatList,Pressable,StyleSheet,Text,TextInput,View}from"react-native";
import{useRouter}from"expo-router";
import colors from"@/constants/colors";
import{CategoryPicker}from"@/components/CategoryPicker";
import{Feather}from"@/components/Feather";
import{useOfferingBasketCount,useOfferingCategories,useOfferings}from"@/hooks/useOfferings";
import{useSupabaseAuth}from"@/hooks/useBusiness";
import type{OfferingFilters}from"@/lib/offerings";

type BrowseDraft={query:string;kind:"product"|"service";category?:string;city:string;area:string;minPrice:string;maxPrice:string};
const initialFilters:BrowseDraft={query:"",kind:"product",city:"",area:"",minPrice:"",maxPrice:""};
export default function Offerings(){
  const auth=useSupabaseAuth();const router=useRouter();
   const[draft,setDraft]=useState<BrowseDraft>(initialFilters);
   const[submitted,setSubmitted]=useState<OfferingFilters>({kind:"product"});
  const categories=useOfferingCategories(draft.kind);
  const selected=categories.data?.find(item=>!item.parent_id&&item.name===draft.category);
  const listings=useOfferings(submitted);
  const basket=useOfferingBasketCount(auth.ready);
  useEffect(()=>{if(categories.error)console.error("Offering category loading failed",categories.error)},[categories.error]);
   const chooseKind=(kind:"product"|"service")=>setDraft(current=>({...current,kind,category:undefined}));
   const apply=()=>{
     const minPrice=draft.minPrice.trim()?Number(draft.minPrice):undefined;
     const maxPrice=draft.maxPrice.trim()?Number(draft.maxPrice):undefined;
     setSubmitted({
       kind:draft.kind,
       query:draft.query.trim()||undefined,
       category:draft.category,
       city:draft.city.trim()||undefined,
       area:draft.area.trim()||undefined,
       minPrice:Number.isFinite(minPrice)?minPrice:undefined,
       maxPrice:Number.isFinite(maxPrice)?maxPrice:undefined,
     });
   };
   const reset=()=>{setDraft(initialFilters);setSubmitted({kind:"product"});};
  return <View style={s.root}><View style={s.header}><Text style={s.title}>Products & Services</Text><Pressable accessibilityLabel="Open my basket" style={s.basket} onPress={()=>router.push("/business/offering/basket" as any)}><Feather name="shopping-bag" size={21} color={colors.light.primary}/><Text style={s.basketLabel}>MY BASKET</Text>{(basket.data??0)>0?<View style={s.badge}><Text style={s.badgeText}>{basket.data!>99?"99+":basket.data}</Text></View>:null}</Pressable></View>
     <View style={s.row}><TextInput style={s.input} value={draft.query} onChangeText={query=>setDraft(current=>({...current,query}))} onSubmitEditing={apply} returnKeyType="search" placeholder="Search name or description" placeholderTextColor={colors.light.mutedForeground}/>{(["product","service"]as const).map(kind=><Pressable key={kind} style={[s.pill,draft.kind===kind&&s.active]} onPress={()=>chooseKind(kind)}><Text style={s.text}>{kind}</Text></Pressable>)}</View>
     <View style={s.filterRow}><TextInput style={s.filterInput} value={draft.city} onChangeText={city=>setDraft(current=>({...current,city}))} placeholder="City" placeholderTextColor={colors.light.mutedForeground}/><TextInput style={s.filterInput} value={draft.area} onChangeText={area=>setDraft(current=>({...current,area}))} placeholder="Area / locality" placeholderTextColor={colors.light.mutedForeground}/></View>
     <View style={s.filterRow}><TextInput style={s.filterInput} value={draft.minPrice} onChangeText={minPrice=>setDraft(current=>({...current,minPrice}))} keyboardType="numeric" placeholder="Min price" placeholderTextColor={colors.light.mutedForeground}/><TextInput style={s.filterInput} value={draft.maxPrice} onChangeText={maxPrice=>setDraft(current=>({...current,maxPrice}))} keyboardType="numeric" placeholder="Max price" placeholderTextColor={colors.light.mutedForeground}/></View>
     <CategoryPicker categories={(categories.data??[]).filter(item=>!item.parent_id)} selectedId={selected?.id} onChoose={item=>setDraft(current=>({...current,category:item.name}))} loading={categories.isLoading} error={categories.error} onRetry={()=>void categories.refetch()}/>
     <View style={s.applyRow}><Pressable style={[s.searchButton,s.applyButton]} onPress={apply}><Text style={s.buttonText}>APPLY FILTERS</Text></Pressable><Pressable style={s.resetButton} onPress={reset}><Text style={s.resetText}>RESET</Text></Pressable></View>
    {listings.isLoading?<ActivityIndicator color={colors.light.primary}/>:listings.error?<View><Text style={s.error}>Unable to load listings. Please try again.</Text><Pressable style={s.searchButton} onPress={()=>void listings.refetch()}><Text style={s.buttonText}>Retry Search</Text></Pressable></View>:<FlatList data={listings.data??[]} keyExtractor={item=>item.id} contentContainerStyle={s.list} ListEmptyComponent={<Text style={s.empty}>No approved listings match these filters.</Text>} renderItem={({item})=><Pressable testID="open-offering" style={s.card} onPress={()=>router.push(`/business/offering/${item.id}` as any)}><View style={s.cardTop}><Text style={s.name}>{item.name}</Text><Text style={s.intent}>{item.kind==="service"?"SERVICE":item.listing_intent==="buy"?"WANT TO BUY":"FOR SALE"}</Text></View><Text style={s.meta}>{item.kind.toUpperCase()} · {item.category}{item.subcategory?` / ${item.subcategory}`:""} · {item.city}</Text><Text style={s.meta}>{item.price==null?"Contact for price":`₹${item.price} ${item.price_unit}`}</Text>{item.kind==="product"&&item.listing_intent==="sell"?<Text style={s.openBuy}>OPEN PRODUCT TO BUY →</Text>:item.kind==="product"?<Text style={s.openBuy}>OPEN TO CONTACT BUYER →</Text>:null}</Pressable>}/>}
  </View>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.light.background,padding:20,gap:12},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},title:{color:colors.light.foreground,fontSize:23,fontWeight:"900",flex:1},basket:{minWidth:92,height:50,paddingHorizontal:10,borderRadius:14,backgroundColor:colors.light.card,borderWidth:1,borderColor:colors.light.primary,alignItems:"center",justifyContent:"center"},basketLabel:{color:colors.light.primary,fontSize:9,fontWeight:"900",marginTop:2},badge:{position:"absolute",right:-5,top:-5,minWidth:21,height:21,borderRadius:11,backgroundColor:colors.light.destructive,alignItems:"center",justifyContent:"center",paddingHorizontal:4},badgeText:{color:"#fff",fontSize:10,fontWeight:"900"},row:{flexDirection:"row",gap:8},filterRow:{flexDirection:"row",gap:8},input:{flex:1,minWidth:0,backgroundColor:colors.light.card,color:colors.light.foreground,borderRadius:10,padding:12},filterInput:{flex:1,minWidth:0,backgroundColor:colors.light.card,color:colors.light.foreground,borderRadius:10,padding:12,borderWidth:1,borderColor:colors.light.border},pill:{padding:10,backgroundColor:colors.light.card,borderRadius:10},active:{backgroundColor:colors.light.primary},text:{color:colors.light.foreground,fontSize:11,fontWeight:"700"},applyRow:{flexDirection:"row",gap:8},searchButton:{backgroundColor:colors.light.primary,borderRadius:10,padding:13,alignItems:"center"},applyButton:{flex:1,minWidth:0},resetButton:{borderWidth:1,borderColor:colors.light.primary,borderRadius:10,paddingHorizontal:16,justifyContent:"center"},resetText:{color:colors.light.primary,fontWeight:"900"},buttonText:{color:colors.light.primaryForeground,fontWeight:"900"},list:{gap:10,paddingTop:4},card:{backgroundColor:colors.light.card,borderRadius:14,borderWidth:1,borderColor:colors.light.border,padding:15},cardTop:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:8},name:{color:colors.light.foreground,fontWeight:"800",fontSize:16,flex:1},intent:{color:colors.light.primary,fontSize:10,fontWeight:"900",borderWidth:1,borderColor:colors.light.primary,borderRadius:8,paddingHorizontal:8,paddingVertical:4},meta:{color:colors.light.mutedForeground,fontSize:12,marginTop:5},openBuy:{color:colors.light.primary,fontSize:11,fontWeight:"900",marginTop:12},empty:{color:colors.light.mutedForeground,textAlign:"center",marginTop:50},error:{color:colors.light.destructive,textAlign:"center",marginVertical:12}});