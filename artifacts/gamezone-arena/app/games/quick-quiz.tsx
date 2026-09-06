import { Feather } from '@/components/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { QuizOption } from '@/components/QuizOption';
import { Screen } from '@/components/Screen';
import { quickQuizQuestions, type QuizReward } from '@/constants/quiz';
import colors from '@/constants/colors';
import { useAppSession } from '@/context/AppSessionContext';
import { usePreferences } from '@/context/PreferencesContext';

type QuizPhase = 'playing' | 'feedback' | 'complete';

export default function QuickQuizScreen() {
  const router = useRouter();
  const { progress, recordQuizResult } = useAppSession();
  const { canUseGameHaptics } = usePreferences();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [phase, setPhase] = useState<QuizPhase>('playing');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [reward, setReward] = useState<QuizReward | null>(null);
  const recordedResult = useRef(false);

  const question = quickQuizQuestions[questionIndex];

  useEffect(() => {
    if (phase !== 'playing') return;
    if (secondsLeft === 0) {
      submitAnswer(null);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (phase !== 'feedback') return;
    const advance = setTimeout(() => {
      if (questionIndex === quickQuizQuestions.length - 1) {
        setPhase('complete');
      } else {
        setQuestionIndex((value) => value + 1);
        setSelectedIndex(null);
        setSecondsLeft(15);
        setPhase('playing');
      }
    }, 900);
    return () => clearTimeout(advance);
  }, [phase, questionIndex]);

  useEffect(() => {
    if (phase === 'complete' && !recordedResult.current) {
      recordedResult.current = true;
      setReward(recordQuizResult(score, quickQuizQuestions.length));
    }
  }, [phase, recordQuizResult, score]);

  function submitAnswer(optionIndex: number | null) {
    if (phase !== 'playing') return;
    setSelectedIndex(optionIndex);
    if (optionIndex === question.correctIndex) {
      setScore((value) => value + 1);
      if (canUseGameHaptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      if (canUseGameHaptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setPhase('feedback');
  }

  function restartQuiz() {
    setQuestionIndex(0);
    setScore(0);
    setSecondsLeft(15);
    setSelectedIndex(null);
    setReward(null);
    recordedResult.current = false;
    setPhase('playing');
  }

  if (phase === 'complete') {
    return (
      <Screen scroll={false} contentStyle={styles.resultScreen}>
        <View style={styles.resultTop}>
          <Pressable testID="quiz-back-games" onPress={() => router.replace('/(tabs)/games')} style={styles.backButton}>
            <Feather name="arrow-left" size={18} color={colors.light.foreground} />
          </Pressable>
          <Text style={styles.topLabel}>QUIZ COMPLETE</Text>
          <View style={styles.backButtonSpacer} />
        </View>
        <View style={styles.resultContent}>
          <View style={styles.resultIcon}><Feather name="award" size={32} color={colors.light.primary} /></View>
          <Text style={styles.resultEyebrow}>RUN COMPLETE</Text>
          <Text style={styles.resultTitle}>{score >= 4 ? 'Excellent run.' : score >= 3 ? 'Solid showing.' : 'Keep sharpening.'}</Text>
          <Text style={styles.resultCopy}>You finished the Quick Quiz with a {score}/{quickQuizQuestions.length} score.</Text>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>FINAL SCORE</Text>
            <Text style={styles.scoreValue}>{score}<Text style={styles.scoreTotal}>/{quickQuizQuestions.length}</Text></Text>
            <View style={styles.scoreLine}><View style={[styles.scoreFill, { width: `${(score / quickQuizQuestions.length) * 100}%` }]} /></View>
          </View>
          <View style={styles.rewardRow}>
            <Reward icon="zap" value={`+${reward?.xp ?? 0}`} label="XP EARNED" color={colors.light.primary} />
            <Reward icon="circle" value={`+${reward?.coins ?? 0}`} label="VIRTUAL COINS" color={colors.light.accent} />
          </View>
          <Text style={styles.legal}>Coins are virtual only and have no monetary value.</Text>
        </View>
        <View style={styles.resultActions}>
          <Pressable testID="quiz-play-again" onPress={restartQuiz} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Feather name="rotate-ccw" size={17} color={colors.light.primaryForeground} />
            <Text style={styles.primaryText}>Play again</Text>
          </Pressable>
          <Pressable testID="quiz-back-games-secondary" onPress={() => router.replace('/(tabs)/games')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Back to Games</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const progressPercent = ((questionIndex + 1) / quickQuizQuestions.length) * 100;
  const timerPercent = (secondsLeft / 15) * 100;

  return (
    <Screen contentStyle={styles.gameScreen}>
      <View style={styles.gameHeader}>
        <Pressable testID="quiz-exit" onPress={() => router.replace('/(tabs)/games')} style={styles.backButton}>
          <Feather name="arrow-left" size={18} color={colors.light.foreground} />
        </Pressable>
        <View style={styles.gameHeaderCopy}><Text style={styles.eyebrow}>QUICK QUIZ</Text><Text style={styles.headerTitle}>Think fast</Text></View>
        <View style={styles.scorePill}><Feather name="zap" size={13} color={colors.light.primary} /><Text style={styles.scorePillText}>{score}</Text></View>
      </View>
      <View style={styles.progressMeta}><Text style={styles.questionCount}>QUESTION {questionIndex + 1} OF {quickQuizQuestions.length}</Text><Text style={styles.category}>{question.category.toUpperCase()}</Text></View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progressPercent}%` }]} /></View>
      <View style={styles.timerRow}><View style={styles.timerLabel}><Feather name="clock" size={15} color={secondsLeft <= 5 ? colors.light.destructive : colors.light.primary} /><Text style={[styles.timerText, secondsLeft <= 5 && styles.timerDanger]}>{secondsLeft}s</Text></View><View style={styles.timerTrack}><View style={[styles.timerFill, { width: `${timerPercent}%` }, secondsLeft <= 5 && styles.timerDangerFill]} /></View></View>
      <View style={styles.questionCard}>
        <Text style={styles.questionEyebrow}>CHALLENGE {String(questionIndex + 1).padStart(2, '0')}</Text>
        <Text style={styles.question}>{question.question}</Text>
      </View>
      <View style={styles.options}>
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = phase === 'feedback' && index === question.correctIndex;
          const isIncorrect = phase === 'feedback' && isSelected && !isCorrect;
          return (
            <QuizOption
              key={option}
              label={option}
              index={index}
              selected={isSelected}
              correct={isCorrect}
              incorrect={isIncorrect}
              disabled={phase !== 'playing'}
              onPress={() => submitAnswer(index)}
            />
          );
        })}
      </View>
      <View style={styles.feedbackSpace}>
        {phase === 'feedback' ? <Text style={[styles.feedback, selectedIndex === question.correctIndex ? styles.feedbackCorrect : styles.feedbackIncorrect]}>{selectedIndex === question.correctIndex ? 'Correct. Keep the streak alive.' : selectedIndex === null ? `Time's up. The answer was ${question.options[question.correctIndex]}.` : `Not this time. The answer was ${question.options[question.correctIndex]}.`}</Text> : <Text style={styles.helper}>Choose the best answer before the clock runs out.</Text>}
      </View>
      <View style={styles.legalBlock}><Text style={styles.legal}>Skill-based play only · virtual rewards</Text></View>
    </Screen>
  );
}

function Reward({ icon, value, label, color }: { icon: keyof typeof Feather.glyphMap; value: string; label: string; color: string }) {
  return <View style={styles.reward}><Feather name={icon} size={16} color={color} /><Text style={[styles.rewardValue, { color }]}>{value}</Text><Text style={styles.rewardLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  gameScreen: { gap: 18, paddingBottom: 36 },
  gameHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gameHeaderCopy: { flex: 1 },
  eyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  headerTitle: { color: colors.light.foreground, fontSize: 24, fontWeight: '900', marginTop: 3 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center' },
  backButtonSpacer: { width: 42 },
  scorePill: { minWidth: 58, height: 36, borderRadius: 13, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  scorePillText: { color: colors.light.foreground, fontSize: 14, fontWeight: '900' },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionCount: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  category: { color: colors.light.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.light.muted, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.light.primary },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 45 },
  timerText: { color: colors.light.primary, fontSize: 13, fontWeight: '900' },
  timerDanger: { color: colors.light.destructive },
  timerTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.light.muted, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2, backgroundColor: colors.light.primary },
  timerDangerFill: { backgroundColor: colors.light.destructive },
  questionCard: { minHeight: 170, borderRadius: 24, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, padding: 22, justifyContent: 'center' },
  questionEyebrow: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  question: { color: colors.light.foreground, fontSize: 24, lineHeight: 31, fontWeight: '900', marginTop: 12 },
  options: { gap: 10 },
  feedbackSpace: { minHeight: 32, justifyContent: 'center' },
  helper: { color: colors.light.mutedForeground, fontSize: 11, textAlign: 'center' },
  feedback: { fontSize: 12, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  feedbackCorrect: { color: '#7CF2B2' },
  feedbackIncorrect: { color: colors.light.destructive },
  legalBlock: { alignItems: 'center', marginTop: 'auto' },
  legal: { color: colors.light.mutedForeground, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  resultScreen: { flex: 1, paddingBottom: 28 },
  resultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLabel: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  resultContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultIcon: { width: 76, height: 76, borderRadius: 28, backgroundColor: colors.light.primary + '18', borderWidth: 1, borderColor: colors.light.primary + '60', alignItems: 'center', justifyContent: 'center' },
  resultEyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 24 },
  resultTitle: { color: colors.light.foreground, fontSize: 32, fontWeight: '900', marginTop: 10, textAlign: 'center' },
  resultCopy: { color: colors.light.mutedForeground, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, maxWidth: 300 },
  scoreCard: { width: '100%', marginTop: 24, borderRadius: 22, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, padding: 18, alignItems: 'center' },
  scoreLabel: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  scoreValue: { color: colors.light.foreground, fontSize: 52, lineHeight: 60, fontWeight: '900', marginTop: 4 },
  scoreTotal: { color: colors.light.mutedForeground, fontSize: 24 },
  scoreLine: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.light.muted, overflow: 'hidden', marginTop: 10 },
  scoreFill: { height: '100%', backgroundColor: colors.light.primary, borderRadius: 3 },
  rewardRow: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 12 },
  reward: { flex: 1, minHeight: 82, borderRadius: 18, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center' },
  rewardValue: { fontSize: 21, fontWeight: '900', marginTop: 5 },
  rewardLabel: { color: colors.light.mutedForeground, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  resultActions: { gap: 10 },
  primaryButton: { minHeight: 54, borderRadius: 17, backgroundColor: colors.light.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: colors.light.primaryForeground, fontSize: 15, fontWeight: '900' },
  secondaryButton: { minHeight: 50, borderRadius: 16, backgroundColor: colors.light.secondary, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.light.secondaryForeground, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});