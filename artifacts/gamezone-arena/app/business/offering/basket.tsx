import React from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@/components/Feather";
import colors from "@/constants/colors";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useOfferingBasket, useOfferingBasketAction } from "@/hooks/useOfferings";

export default function BuyerBasket() {
  const auth = useSupabaseAuth();
  const router = useRouter();
  const basket = useOfferingBasket(auth.ready);
  const action = useOfferingBasketAction();

  return <View style={styles.root}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.light.foreground}/></Pressable>
      <Text style={styles.title}>My Basket</Text>
      <Feather name="shopping-bag" size={22} color={colors.light.primary}/>
    </View>
    <Text style={styles.subtitle}>Only you can see the products in this basket.</Text>
    {!auth.isLoaded || (auth.isSignedIn && !auth.ready) || basket.isLoading ? <ActivityIndicator color={colors.light.primary}/> : !auth.isSignedIn ? <View style={styles.empty}><Text style={styles.emptyTitle}>Sign in to view your basket</Text><Text style={styles.subtitle}>Your private basket is available after sign in.</Text></View> : <FlatList
      data={basket.data ?? []}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<View style={styles.empty}><Feather name="shopping-bag" size={42} color={colors.light.mutedForeground}/><Text style={styles.emptyTitle}>Your basket is empty</Text><Text style={styles.subtitle}>Open a FOR SALE product and tap Buy / Add to Basket.</Text></View>}
      renderItem={({ item }) => {
        const product = item.business_offerings;
        return <View style={styles.card}>
          <Text style={styles.intent}>PURCHASE REQUEST</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.meta}>{product.category}{product.subcategory ? ` · ${product.subcategory}` : ""}</Text>
          <Text style={styles.price}>{product.price == null ? "Contact seller for price" : `₹${product.price} ${product.price_unit}`}</Text>
          <Text style={styles.meta}>Added {new Date(item.created_at).toLocaleDateString()}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={() => router.push(`/business/offering/${product.id}` as never)}><Text style={styles.primaryText}>VIEW PRODUCT</Text></Pressable>
            <Pressable style={styles.secondary} disabled={action.isPending} onPress={() => Alert.alert("Remove from basket", "Cancel this purchase request?", [
              { text: "Keep" },
              { text: "Remove", style: "destructive", onPress: () => action.mutate({ type: "cancel", id: item.id }) },
            ])}><Text style={styles.removeText}>REMOVE</Text></Pressable>
          </View>
        </View>;
      }}
    />}
  </View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.light.background,padding:20},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:8},
  title:{color:colors.light.foreground,fontSize:23,fontWeight:"900"},
  subtitle:{color:colors.light.mutedForeground,lineHeight:20},
  list:{gap:12,paddingTop:18,paddingBottom:40},
  card:{backgroundColor:colors.light.card,borderColor:colors.light.border,borderWidth:1,borderRadius:14,padding:15},
  intent:{color:colors.light.primary,fontSize:11,fontWeight:"900",marginBottom:5},
  name:{color:colors.light.foreground,fontSize:18,fontWeight:"900"},
  meta:{color:colors.light.mutedForeground,fontSize:12,marginTop:5},
  price:{color:colors.light.foreground,fontWeight:"800",marginTop:8},
  actions:{flexDirection:"row",gap:8,marginTop:14},
  primary:{flex:1,backgroundColor:colors.light.primary,padding:12,borderRadius:10,alignItems:"center"},
  primaryText:{color:colors.light.primaryForeground,fontSize:11,fontWeight:"900"},
  secondary:{padding:12,borderRadius:10,borderWidth:1,borderColor:colors.light.destructive},
  removeText:{color:colors.light.destructive,fontSize:11,fontWeight:"900"},
  empty:{alignItems:"center",paddingTop:80,gap:10},
  emptyTitle:{color:colors.light.foreground,fontSize:18,fontWeight:"900"},
});