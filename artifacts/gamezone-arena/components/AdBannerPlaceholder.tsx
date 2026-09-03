import { StyleSheet, Text, View } from "react-native";

type AdBannerPlaceholderProps = {
  placement: "home" | "games" | "ludo";
};

export function AdBannerPlaceholder({
  placement,
}: AdBannerPlaceholderProps) {
  return (
    <View
      accessibilityLabel={`Reserved advertisement area on ${placement}`}
      style={styles.container}
    >
      <Text style={styles.label}>ADVERTISEMENT</Text>
      <Text style={styles.caption}>Reserved for the production mobile build</Text>
    </View>
  );
}

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
    color: "#687895",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  caption: {
    color: "#465570",
    fontSize: 7,
    marginTop: 3,
  },
});