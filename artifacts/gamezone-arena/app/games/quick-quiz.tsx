import { Feather } from '@/components/Feather';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { QuizOption } from '@/components/QuizOption';
import { Screen } from '@/components/Screen';
import { createEndlessQuizQuestion } from '@/constants/quiz';
import colors from '@/constants/colors';
import { useAppSession } from '@/context/AppSessionContext';
import { usePreferences } from '@/context/PreferencesContext';

type QuizPhase = 'playing' | 'feedback';
const QUESTION_TIME_SECONDS = 50;
const ANSWER_FEEDBACK_MS = 1500;
const BACKGROUND_VOLUME_SCALE = 0.5;

export default function QuickQuizScreen() {
  const router = useRouter();
  const { awardQuizCorrectAnswer } = useAppSession();
  const { canUseGameHaptics, canPlayGameSound, isReady: preferencesReady, preferences } = usePreferences();
  const usedQuestionIds = useRef<Set<string>>(new Set());
  const [question, setQuestion] = useState(() => createEndlessQuizQuestion(new Set()));
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIME_SECONDS);
  const [phase, setPhase] = useState<QuizPhase>('playing');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [screenFocused, setScreenFocused] = useState(false);
  const [appStateStatus, setAppStateStatus] = useState(AppState.currentState);
  const playedNativeSounds = useRef<Set<number>>(new Set());
  const webBackgroundSound = useRef<HTMLAudioElement | null>(null);
  const backgroundSound = useAudioPlayer(require('../../assets/quiz-background.wav'), { keepAudioSessionActive: true });
  const backgroundStatus = useAudioPlayerStatus(backgroundSound);
  const correctSound = useAudioPlayer(require('../../assets/quiz-correct-voice.mp3'), { keepAudioSessionActive: true });
  const incorrectSound = useAudioPlayer(require('../../assets/quiz-wrong-voice.mp3'), { keepAudioSessionActive: true });

  useEffect(() => {
    usedQuestionIds.current.add(question.id);
  }, [question.id]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      if (__DEV__) console.warn('Quiz audio mode could not be prepared.', error);
    });
    if (Platform.OS === 'web') {
      const background = new window.Audio(Asset.fromModule(require('../../assets/quiz-background.wav')).uri);
      background.loop = true;
      webBackgroundSound.current = background;
    }
    return () => {
      webBackgroundSound.current?.pause();
      webBackgroundSound.current = null;
      backgroundSound.pause();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppStateStatus);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const shouldPlay =
      preferencesReady &&
      screenFocused &&
      appStateStatus === 'active' &&
      canPlayGameSound &&
      preferences.musicEnabled;
    const stopBackground = () => {
      if (Platform.OS === 'web') {
        if (webBackgroundSound.current) {
          webBackgroundSound.current.pause();
          webBackgroundSound.current.currentTime = 0;
        }
      } else {
        backgroundSound.pause();
      }
    };
    if (!shouldPlay) {
      stopBackground();
      return stopBackground;
    }

    const volume = preferences.volume * BACKGROUND_VOLUME_SCALE;
    if (Platform.OS === 'web') {
      const background = webBackgroundSound.current;
      if (background) {
        background.loop = true;
        background.volume = volume;
        void background.play().catch((error) => {
          if (__DEV__) console.warn('Quiz background audio was blocked.', error);
        });
      }
    } else if (backgroundStatus.isLoaded && !backgroundSound.playing) {
      backgroundSound.loop = true;
      backgroundSound.volume = volume;
      backgroundSound.muted = false;
      backgroundSound.play();
    }
    return stopBackground;
  }, [
    appStateStatus,
    backgroundStatus.isLoaded,
    canPlayGameSound,
    preferences.musicEnabled,
    preferences.volume,
    preferencesReady,
    screenFocused,
  ]);

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
      const nextQuestion = createEndlessQuizQuestion(usedQuestionIds.current);
      usedQuestionIds.current.add(nextQuestion.id);
      setQuestion(nextQuestion);
      setQuestionNumber((value) => value + 1);
      setSelectedIndex(null);
      setSecondsLeft(QUESTION_TIME_SECONDS);
      setPhase('playing');
    }, ANSWER_FEEDBACK_MS);
    return () => clearTimeout(advance);
  }, [phase]);

  function playAnswerSound(player: AudioPlayer, source: number) {
    if (!canPlayGameSound) return;
    if (Platform.OS === 'web') {
      const sound = new window.Audio(Asset.fromModule(source).uri);
      sound.volume = preferences.volume;
      void sound.play().catch((error) => {
        if (__DEV__) console.warn('Quiz web sound could not play.', error);
      });
      return;
    }
    if (!player.isLoaded) return;
    void (async () => {
      try {
        if (playedNativeSounds.current.has(player.id)) {
          player.pause();
          await player.seekTo(0);
        }
        player.volume = preferences.volume;
        player.muted = false;
        player.play();
        playedNativeSounds.current.add(player.id);
      } catch (error) {
        if (__DEV__) console.warn('Quiz native sound could not play.', error);
      }
    })();
  }

  function submitAnswer(optionIndex: number | null) {
    if (phase !== 'playing') return;
    setSelectedIndex(optionIndex);
    if (optionIndex === question.correctIndex) {
      const nextScore = score + 1;
      setScore(nextScore);
      const earned = awardQuizCorrectAnswer(nextScore);
      setSessionXp((value) => value + earned.xp);
      setSessionCoins((value) => value + earned.coins);
      playAnswerSound(correctSound, require('../../assets/quiz-correct-voice.mp3'));
      if (canUseGameHaptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      playAnswerSound(incorrectSound, require('../../assets/quiz-wrong-voice.mp3'));
      if (canUseGameHaptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setPhase('feedback');
  }

  return (
    <Screen contentStyle={styles.gameScreen}>
      <View style={styles.gameHeader}>
        <Pressable testID="quiz-exit" onPress={() => router.replace('/(tabs)/games')} style={styles.backButton}>
          <Feather name="arrow-left" size={18} color={colors.light.foreground} />
        </Pressable>
        <View style={styles.gameHeaderCopy}><Text style={styles.eyebrow}>ENDLESS QUIZ</Text><Text style={styles.headerTitle}>Play at your pace</Text></View>
        <View style={styles.scorePill}><Feather name="zap" size={13} color={colors.light.primary} /><Text style={styles.scorePillText}>{score}</Text></View>
      </View>
      <View style={styles.progressMeta}><Text style={styles.questionCount}>QUESTION {questionNumber}</Text><Text style={styles.category}>{question.category.toUpperCase()}</Text></View>
      <View style={styles.rewardSummary}>
        <Text style={styles.rewardSummaryText}>+{sessionXp} XP</Text>
        <Text style={styles.rewardSummaryText}>+{sessionCoins} COINS</Text>
      </View>
      <View style={styles.timerRow}>
        <View style={styles.timerLabel}>
          <Feather name="clock" size={15} color={secondsLeft <= 10 ? colors.light.destructive : colors.light.primary} />
          <Text style={[styles.timerText, secondsLeft <= 10 && styles.timerDanger]}>{secondsLeft}s</Text>
        </View>
        <View style={styles.timerTrack}>
          <View style={[styles.timerFill, { width: `${(secondsLeft / QUESTION_TIME_SECONDS) * 100}%` }, secondsLeft <= 10 && styles.timerDangerFill]} />
        </View>
      </View>
      <View style={styles.questionCard}>
        <Text style={styles.questionEyebrow}>NEW CHALLENGE</Text>
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
        {phase === 'feedback' ? <Text style={[styles.feedback, selectedIndex === question.correctIndex ? styles.feedbackCorrect : styles.feedbackIncorrect]}>{selectedIndex === question.correctIndex ? 'Correct. +10 XP and +5 coins.' : selectedIndex === null ? `Time is up. The answer was ${question.options[question.correctIndex]}.` : `Not this time. The answer was ${question.options[question.correctIndex]}.`}</Text> : <Text style={styles.helper}>Choose the best answer within 50 seconds.</Text>}
      </View>
      <View style={styles.legalBlock}><Text style={styles.legal}>Skill-based play only · virtual rewards</Text></View>
    </Screen>
  );
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
  rewardSummary: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  rewardSummaryText: { color: colors.light.accent, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
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