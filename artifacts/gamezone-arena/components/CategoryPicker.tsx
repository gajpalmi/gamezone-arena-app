import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@/components/Feather";
import colors from "@/constants/colors";

export type CategoryOption = { id: string; name: string };

export function CategoryPicker({
  label = "Category",
  categories,
  selectedId,
  onChoose,
  loading = false,
  error,
  onRetry,
}: {
  label?: string;
  categories: CategoryOption[];
  selectedId?: string | null;
  onChoose: (category: CategoryOption) => void;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(selectedId ?? null);
  const selected = categories.find(category => category.id === selectedId);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? categories.filter(category => category.name.toLowerCase().includes(query)) : categories;
  }, [categories, search]);

  useEffect(() => {
    if (open) {
      setPendingId(selectedId ?? null);
      setSearch("");
    }
  }, [open, selectedId]);

  const choose = () => {
    const category = categories.find(item => item.id === pendingId);
    if (!category) return;
    onChoose(category);
    setOpen(false);
  };

  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable style={styles.trigger} onPress={() => setOpen(true)} accessibilityLabel={`Select ${label}`}>
      <Text style={selected ? styles.selectedText : styles.placeholder}>{selected ? `${selected.name} ✓` : "Select Category"}</Text>
      <Feather name="chevron-down" size={18} color={colors.light.mutedForeground}/>
    </Pressable>
    {selected ? <Pressable onPress={() => setOpen(true)}><Text style={styles.change}>Change Category</Text></Pressable> : null}
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}><Text style={styles.title}>Select Category</Text><Pressable onPress={() => setOpen(false)} accessibilityLabel="Close category picker"><Feather name="x" size={22} color={colors.light.foreground}/></Pressable></View>
          <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Search categories" placeholderTextColor={colors.light.mutedForeground} autoCorrect={false}/>
          {loading ? <View style={styles.message}><ActivityIndicator color={colors.light.primary}/><Text style={styles.muted}>Loading categories…</Text></View>
            : error ? <View style={styles.message}><Text style={styles.error}>Unable to load categories. Please try again.</Text>{onRetry ? <Pressable style={styles.retry} onPress={onRetry}><Text style={styles.buttonText}>Retry</Text></Pressable> : null}</View>
            : categories.length === 0 ? <View style={styles.message}><Text style={styles.muted}>No categories available</Text></View>
            : <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">{filtered.length ? filtered.map(category => <Pressable key={category.id} style={[styles.option,pendingId===category.id&&styles.optionSelected]} onPress={() => setPendingId(category.id)}><Text style={styles.optionText}>{category.name}</Text>{pendingId===category.id?<Feather name="check" size={18} color={colors.light.primary}/>:null}</Pressable>) : <Text style={styles.muted}>No matching categories</Text>}</ScrollView>}
          <Pressable style={[styles.choose,!pendingId&&styles.disabled]} disabled={!pendingId} onPress={choose}><Text style={styles.buttonText}>Choose</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  field:{gap:7},label:{color:colors.light.foreground,fontWeight:"800"},trigger:{minHeight:50,borderRadius:12,borderWidth:1,borderColor:colors.light.border,backgroundColor:colors.light.card,paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},selectedText:{color:colors.light.foreground,fontWeight:"700"},placeholder:{color:colors.light.mutedForeground},change:{color:colors.light.primary,fontWeight:"700"},backdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.65)",justifyContent:"flex-end"},sheet:{maxHeight:"82%",backgroundColor:colors.light.background,borderTopLeftRadius:22,borderTopRightRadius:22,padding:18,gap:12},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},title:{fontSize:21,fontWeight:"900",color:colors.light.foreground},search:{backgroundColor:colors.light.card,color:colors.light.foreground,borderWidth:1,borderColor:colors.light.border,borderRadius:12,padding:13},list:{maxHeight:430},option:{padding:14,borderBottomWidth:1,borderBottomColor:colors.light.border,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},optionSelected:{backgroundColor:colors.light.card},optionText:{color:colors.light.foreground,fontSize:15},choose:{backgroundColor:colors.light.primary,borderRadius:12,padding:14,alignItems:"center"},retry:{backgroundColor:colors.light.primary,borderRadius:10,paddingHorizontal:20,paddingVertical:10},buttonText:{color:colors.light.primaryForeground,fontWeight:"900"},disabled:{opacity:.45},message:{padding:28,alignItems:"center",gap:12},muted:{color:colors.light.mutedForeground,textAlign:"center"},error:{color:colors.light.destructive,textAlign:"center"},
});