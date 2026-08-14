import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';

type QuizOptionProps = {
  label: string;
  index: number;
  selected: boolean;
  correct: boolean;
  incorrect: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function QuizOption({
  label,
  index,
  selected,
  correct,
  incorrect,
  disabled,
  onPress,
}: QuizOptionProps) {
  const stateStyle = correct
    ? styles.correct
    : incorrect
      ? styles.incorrect
      : selected
        ? styles.selected
        : undefined;
  const icon = correct ? 'check' : incorrect ? 'x' : undefined;

  return (
    <Pressable
      testID={`quiz-option-${index}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.option, stateStyle, pressed && styles.pressed]}
    >
      <View style={[styles.letter, stateStyle]}>
        {icon ? (
          <Feather name={icon} size={15} color={correct ? colors.light.primaryForeground : colors.light.destructiveForeground} />
        ) : (
          <Text style={styles.letterText}>{String.fromCharCode(65 + index)}</Text>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
      {correct ? <Text style={styles.status}>CORRECT</Text> : null}
      {incorrect ? <Text style={[styles.status, styles.statusIncorrect]}>MISS</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  selected: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primary + '14',
  },
  correct: {
    borderColor: '#7CF2B2',
    backgroundColor: '#7CF2B2' + '16',
  },
  incorrect: {
    borderColor: colors.light.destructive,
    backgroundColor: colors.light.destructive + '16',
  },
  letter: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.light.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: colors.light.secondaryForeground,
    fontSize: 13,
    fontWeight: '800',
  },
  label: {
    flex: 1,
    color: colors.light.foreground,
    fontSize: 14,
    fontWeight: '700',
  },
  status: {
    color: '#7CF2B2',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statusIncorrect: {
    color: colors.light.destructive,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});