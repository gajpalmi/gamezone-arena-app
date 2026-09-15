import React from "react";
import { StyleSheet, Text, View } from "react-native";

type AdBannerPlaceholderProps = {
  placement?: string;
};

export function AdBannerPlaceholder(
  _props: AdBannerPlaceholderProps
) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>ADVERTISEMENT</Text>
      <Text style={styles.caption}>
        Ads temporarily unavailable during Android startup testing.
      </Text>
    </View>
  );
}

export default AdBannerPlaceholder;

const styles = StyleSheet.create({
  container: {
    minHeight: 54,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#293A5C",
    backgroundColor: "#0D1427",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7A99",
    marginBottom: 4,
  },
  caption: {
    fontSize: 12,
    color: "#7F8BA3",
    textAlign: "center",
  },
});
