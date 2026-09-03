import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Vibration,
  Platform,
} from "react-native";
import { useUser } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Crypto from "expo-crypto";
import { AdService } from "@/services/AdService";
import { SubscriptionService } from "@/services/SubscriptionService";
import { supabase as supabaseMaybe } from "@/lib/supabase";

const supabase = supabaseMaybe;

/**
 * GAMEZONE ARENA — LUDO
 * - Offline = real human PASS & PLAY. No computer/bot.
 * - Online = real human multiplayer through Supabase Realtime.
 * - 2 / 3 / 4 players.
 * - Four dice stay OUTSIDE the board.
 * - Clean board: no debug labels, no "COMPUTER", no extra board text.
 * - Sound uses app/games/assets/sounds/.
 * - AdMob banner is included; replace TestIds.BANNER with your real Ad Unit ID
 *   after the native Google Mobile Ads setup/development build is ready.
 */

type Player = "red" | "green" | "yellow" | "blue";
type GameMode = "offline" | "online";
type PlayerCount = 2 | 3 | 4;

type Token = {
  player: Player;
  id: number;
  progress: number; // -1 yard, 0..50 common path, 51..56 home lane, 57 finished
};

type DiceMap = Record<Player, number | null>;

type OnlineSnapshot = {
  tokens: Token[];
  player: Player;
  playerCount: PlayerCount;
  diceValues: DiceMap;
  rolled: boolean;
  movingToken: string | null;
  finishOrder: Player[];
  sixCount: number;
  gameStarted: boolean;
};

type OnlinePlayer = {
  id: string;
  room_id: string;
  user_id: string;
  player_name: string;
  player_color: Player;
  player_number: number;
  is_ready: boolean;
  is_connected: boolean;
  token_positions?: unknown;
};

const COLORS = {
  red: { main: "#EF3340", light: "#FFD9DD", dark: "#B91C28" },
  green: { main: "#16D94A", light: "#D9FFD9", dark: "#079A31" },
  yellow: { main: "#F5D10A", light: "#FFF3B0", dark: "#B68B00" },
  blue: { main: "#19BCEB", light: "#D8F7FF", dark: "#087BA8" },
} as const;

// Player seats are deliberately arranged around the board.
// 2 players = opposite corners (green ↔ blue).
// 3 players = three different corners.
// 4 players = all four corners.
const PLAYER_SETS: Record<PlayerCount, Player[]> = {
  2: ["green", "red"],
  3: ["green", "yellow", "red"],
  4: ["green", "yellow", "blue", "red"],
};

const PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const START_INDEX: Record<Player, number> = {
  yellow: 0,
  blue: 13,
  red: 26,
  green: 39,
};

const SAFE_INDEXES = [0, 8, 13, 21, 26, 34, 39, 47];
const STAR_INDEXES = [8, 21, 34, 47];

const YARD_POSITIONS: Record<Player, [number, number][]> = {
  yellow: [[2, 2], [2, 4], [4, 2], [4, 4]],
  blue: [[2, 10], [2, 12], [4, 10], [4, 12]],
  green: [[10, 2], [10, 4], [12, 2], [12, 4]],
  red: [[10, 10], [10, 12], [12, 10], [12, 12]],
};

const FINISH_LANES: Record<Player, [number, number][]> = {
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  red: [[7, 14], [7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  green: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

const SOUND_FILES = {
  dice: require("./assets/sounds/dice-roll.wav"),
  move: require("./assets/sounds/move.wav"),
  capture: require("./assets/sounds/capture.wav"),
  home: require("./assets/sounds/home.wav"),
  safe: require("./assets/sounds/safe.wav"),
  click: require("./assets/sounds/click.wav"),
  turn: require("./assets/sounds/turn.wav"),
  win: require("./assets/sounds/win.wav"),
  start: require("./assets/sounds/turn.wav"),
} as const;

const SOUND_SETTING_KEY = "@gamezone/ludo/sound-enabled/v1";
const VIBRATION_SETTING_KEY = "@gamezone/ludo/vibration-enabled/v1";

const EMPTY_DICE: DiceMap = {
  red: null,
  green: null,
  yellow: null,
  blue: null,
};

function createTokens(): Token[] {
  return (Object.keys(YARD_POSITIONS) as Player[]).flatMap((player) =>
    Array.from({ length: 4 }, (_, id) => ({ player, id, progress: -1 }))
  );
}

function getGlobalIndex(token: Token): number | null {
  if (token.progress < 0 || token.progress > 50) return null;
  return (START_INDEX[token.player] + token.progress) % 52;
}

function getPathPosition(player: Player, progress: number): [number, number] | null {
  if (progress < 0 || progress > 50) return null;
  return PATH[(START_INDEX[player] + progress) % 52];
}

function getTokenPosition(token: Token): [number, number] {
  if (token.progress === -1) return YARD_POSITIONS[token.player][token.id];
  if (token.progress <= 50) return getPathPosition(token.player, token.progress)!;
  if (token.progress <= 56) return FINISH_LANES[token.player][token.progress - 51];
  return [7, 7];
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function cloneDice(dice: DiceMap): DiceMap {
  return { red: dice.red, green: dice.green, yellow: dice.yellow, blue: dice.blue };
}

function DicePips({ value, size }: { value: number; size: number }) {
  const pip = Math.max(4, size * 0.13);
  const positions: Record<number, Array<[number, number]>> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };
  return (
    <View pointerEvents="none" style={styles.dicePips}>
      {positions[value].map(([left, top], index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            width: pip,
            height: pip,
            borderRadius: pip / 2,
            backgroundColor: "#111827",
            left: `${left}%`,
            top: `${top}%`,
            transform: [{ translateX: -pip / 2 }, { translateY: -pip / 2 }],
          }}
        />
      ))}
    </View>
  );
}

function Dice({
  value,
  size,
  onPress,
  disabled,
  active,
}: {
  value: number | null;
  size: number;
  onPress: () => void;
  disabled: boolean;
  active: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={[styles.diceTouch, { opacity: disabled ? 0.48 : 1 }]}
    >
      <View
        style={[
          styles.diceFrame,
          {
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) * 0.28,
            borderColor: active ? "#2ED8FF" : "#176B9E",
            shadowOpacity: active ? 0.85 : 0.25,
          },
        ]}
      >
        <View
          style={[
            styles.dice,
            { width: size, height: size, borderRadius: Math.max(8, size * 0.22) },
          ]}
        >
          {value === null ? (
            <Text style={{ color: "#111827", fontSize: size * 0.28, fontWeight: "900" }}>?</Text>
          ) : (
            <DicePips value={value} size={size} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function Ludo() {
  const { width } = useWindowDimensions();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const boardSize = Math.min(width - 20, 500);
  const cell = boardSize / 15;

  const [tokens, setTokens] = useState<Token[]>(createTokens);
  const [player, setPlayer] = useState<Player>("green");
  const [myOnlinePlayer, setMyOnlinePlayer] = useState<Player | null>(null);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [gameMode, setGameMode] = useState<GameMode>("offline");
  const [soundOn, setSoundOn] = useState(true);
  const [vibrationOn, setVibrationOn] = useState(true);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceValues, setDiceValues] = useState<DiceMap>(EMPTY_DICE);
  const [rolled, setRolled] = useState(false);
  const [movingToken, setMovingToken] = useState<string | null>(null);
  const [finishOrder, setFinishOrder] = useState<Player[]>([]);
  const [sixCount, setSixCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [onlineConnected, setOnlineConnected] = useState(false);
  const [onlineMessage, setOnlineMessage] = useState("");

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState("");
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumActive, setPremiumActive] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState("");

  const roomChannel = useRef<any>(null);
  const pendingTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const rollGeneration = useRef(0);
  const nativeAudioOptions = { downloadFirst: true };
  const diceAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.dice,
    nativeAudioOptions
  );
  const moveAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.move,
    nativeAudioOptions
  );
  const captureAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.capture,
    nativeAudioOptions
  );
  const homeAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.home,
    nativeAudioOptions
  );
  const safeAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.safe,
    nativeAudioOptions
  );
  const clickAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.click,
    nativeAudioOptions
  );
  const turnAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.turn,
    nativeAudioOptions
  );
  const winAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.win,
    nativeAudioOptions
  );
  const startAudio = useAudioPlayer(
    Platform.OS === "web" ? null : SOUND_FILES.start,
    nativeAudioOptions
  );

  const activePlayers = PLAYER_SETS[playerCount];
  const currentDice = diceValues[player];
  const currentTokens = useMemo(
    () => tokens.filter((token) => token.player === player),
    [tokens, player]
  );

  const gameFinished = finishOrder.length >= Math.max(1, activePlayers.length - 1);
  const realName = isLoaded && user?.firstName?.trim() ? user.firstName.trim() : "Player";
  const canControlCurrentTurn =
    gameMode === "offline" ? true : myOnlinePlayer === player;

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(SOUND_SETTING_KEY),
      AsyncStorage.getItem(VIBRATION_SETTING_KEY),
      SubscriptionService.initialize(),
      SubscriptionService.isPremium(),
      AdService.showBanner("ludo"),
    ])
      .then(([storedSound, storedVibration, , premium]) => {
        if (storedSound !== null) setSoundOn(storedSound === "true");
        if (storedVibration !== null) {
          setVibrationOn(storedVibration === "true");
        }
        setPremiumActive(premium);
      })
      .catch((error) => {
        if (__DEV__) console.warn("Ludo settings could not be loaded.", error);
      });

    void setAudioModeAsync({
      playsInSilentMode: true,
    }).catch((error) => {
      console.warn("Ludo audio mode could not be configured.", error);
    });

    return () => {
      pendingTimers.current.forEach(clearTimeout);
      pendingTimers.current.clear();
      rollGeneration.current += 1;

      if (roomChannel.current && supabase) {
        void supabase.removeChannel(roomChannel.current);
      }
      try { diceAudio.pause(); } catch {}
      try { moveAudio.pause(); } catch {}
      try { captureAudio.pause(); } catch {}
      try { homeAudio.pause(); } catch {}
      try { safeAudio.pause(); } catch {}
      try { clickAudio.pause(); } catch {}
      try { turnAudio.pause(); } catch {}
      try { winAudio.pause(); } catch {}
      try { startAudio.pause(); } catch {}
    };
  }, []);

  function stopAllSounds() {
    [
      diceAudio,
      moveAudio,
      captureAudio,
      homeAudio,
      safeAudio,
      clickAudio,
      turnAudio,
      winAudio,
      startAudio,
    ].forEach((audio) => {
      try {
        audio.pause();
      } catch (error) {
        if (__DEV__) console.warn("A Ludo sound could not be stopped.", error);
      }
    });
  }

  function toggleSound() {
    const next = !soundOn;
    if (!next) stopAllSounds();
    setSoundOn(next);
    void AsyncStorage.setItem(SOUND_SETTING_KEY, String(next)).catch((error) => {
      if (__DEV__) console.warn("Ludo sound setting could not be saved.", error);
    });
  }

  function toggleVibration() {
    const next = !vibrationOn;
    setVibrationOn(next);
    void AsyncStorage.setItem(VIBRATION_SETTING_KEY, String(next)).catch((error) => {
      if (__DEV__) console.warn("Ludo vibration setting could not be saved.", error);
    });
  }

  function playSound(type: keyof typeof SOUND_FILES) {
    if (!soundOn) return;

    const map = {
      dice: diceAudio,
      move: moveAudio,
      capture: captureAudio,
      home: homeAudio,
      safe: safeAudio,
      click: clickAudio,
      turn: turnAudio,
      win: winAudio,
      start: startAudio,
    } as const;

    const audio = map[type];
    try {
      audio.volume = type === "move" ? 0.85 : 1.0;
      void audio
        .seekTo(0)
        .then(() => {
          audio.play();
        })
        .catch((error) => {
          console.warn(`Ludo ${type} sound could not be played.`, error);
        });
    } catch (error) {
      console.warn(`Ludo ${type} sound could not be prepared.`, error);
    }
  }

  // Vibration is intentionally independent from the sound switch.
  // This makes haptics work even when the user has muted game sounds.
  function vibrate(type: keyof typeof SOUND_FILES) {
    if (!vibrationOn) return;
    try {
      switch (type) {
        case "dice": Vibration.vibrate([0, 55]); break;
        case "click": Vibration.vibrate([0, 25]); break;
        case "move": Vibration.vibrate([0, 20]); break;
        case "safe": Vibration.vibrate([0, 55, 30, 55]); break;
        case "capture": Vibration.vibrate([0, 90, 40, 110]); break;
        case "home": Vibration.vibrate([0, 60, 35, 80, 35, 120]); break;
        case "turn": Vibration.vibrate([0, 30, 30, 30]); break;
        case "win": Vibration.vibrate([0, 90, 45, 90, 45, 180]); break;
        case "start": Vibration.vibrate([0, 55]); break;
      }
    } catch (error) {
      console.warn("Ludo vibration could not be played.", error);
    }
  }

  function sound(type: keyof typeof SOUND_FILES) {
    playSound(type);
    vibrate(type);
  }

  function schedule(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      pendingTimers.current.delete(timer);
      callback();
    }, delay);
    pendingTimers.current.add(timer);
  }

  function isPlayerFinished(candidate: Player, list: Token[]) {
    const playerTokens = list.filter((token) => token.player === candidate);
    return (
      playerTokens.length === 4 &&
      playerTokens.every((token) => token.progress === 57)
    );
  }

  function nextPlayer(from: Player, list: Token[], order: Player[]) {
    const active = PLAYER_SETS[playerCount];
    const start = active.indexOf(from);
    if (start < 0) return active[0];
    for (let step = 1; step <= active.length; step++) {
      const next = active[(start + step) % active.length];
      if (!order.includes(next) && !isPlayerFinished(next, list)) return next;
    }
    return from;
  }

  function hasOpponentBlockAt(
    movingPlayer: Player,
    globalIndex: number,
    list: Token[]
  ) {
    return (
      list.filter(
        (other) =>
          other.player !== movingPlayer &&
          activePlayers.includes(other.player) &&
          other.progress >= 0 &&
          other.progress <= 50 &&
          getGlobalIndex(other) === globalIndex
      ).length >= 2
    );
  }

  function canMove(token: Token, value: number, list: Token[]) {
    if (token.progress === 57) return false;
    if (token.progress === -1) {
      return (
        value === 6 &&
        !hasOpponentBlockAt(token.player, START_INDEX[token.player], list)
      );
    }

    const targetProgress = token.progress + value;
    if (targetProgress > 57) return false;

    for (
      let progress = token.progress + 1;
      progress <= Math.min(targetProgress, 50);
      progress++
    ) {
      const globalIndex = (START_INDEX[token.player] + progress) % 52;
      if (hasOpponentBlockAt(token.player, globalIndex, list)) return false;
    }

    return true;
  }

  function captureAtPosition(movingPlayer: Player, movedToken: Token, list: Token[]) {
    const index = getGlobalIndex(movedToken);
    if (index === null || SAFE_INDEXES.includes(index)) {
      if (index !== null && STAR_INDEXES.includes(index)) sound("safe");
      return { list, captured: false };
    }

    const opponents = list.filter(
      (token) =>
        token.player !== movingPlayer &&
        activePlayers.includes(token.player) &&
        token.progress >= 0 &&
        token.progress <= 50 &&
        getGlobalIndex(token) === index
    );

    // A stack of 2 or more opponent tokens is safe.
    if (opponents.length !== 1) return { list, captured: false };

    const newList = list.map((token) =>
      token.player !== movingPlayer &&
      activePlayers.includes(token.player) &&
      token.progress >= 0 &&
      token.progress <= 50 &&
      getGlobalIndex(token) === index
        ? { ...token, progress: -1 }
        : token
    );

    sound("capture");
    return { list: newList, captured: true };
  }

  async function publishOnline(next: Partial<OnlineSnapshot>) {
    if (gameMode !== "online" || !roomId) return;
    if (!supabase) {
      setOnlineMessage("Online Ludo is unavailable until Supabase is configured.");
      return;
    }
    const snapshot: OnlineSnapshot = {
      tokens,
      player,
      playerCount,
      diceValues,
      rolled,
      movingToken,
      finishOrder,
      sixCount,
      gameStarted,
      ...next,
    };

    const { error } = await supabase
      .from("ludo_rooms")
      .update({
        current_turn: snapshot.player,
        dice_value: snapshot.diceValues[snapshot.player],
        winner_player_id: null,
        game_state: snapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (error) {
      console.warn("Ludo room state could not be synchronized.", error);
      setOnlineMessage("Connection issue. Your latest move may not be synchronized.");
    }
  }

  async function recordOnlineMove(
    before: Token,
    after: Token,
    diceValue: number,
    finalTokens: Token[]
  ) {
    if (gameMode !== "online" || !roomId || !supabase || !user?.id) return;

    const me = onlinePlayers.find(
      (onlinePlayer) =>
        onlinePlayer.user_id === user.id &&
        onlinePlayer.player_color === before.player
    );
    if (!me) {
      setOnlineMessage("Your online player record could not be verified.");
      return;
    }

    const tokenPositions = finalTokens
      .filter((token) => token.player === before.player)
      .sort((left, right) => left.id - right.id)
      .map((token) => token.progress);

    const [{ error: playerError }, { error: moveError }] = await Promise.all([
      supabase
        .from("ludo_players")
        .update({ token_positions: tokenPositions, is_connected: true })
        .eq("id", me.id)
        .eq("room_id", roomId),
      supabase.from("ludo_moves").insert({
        room_id: roomId,
        player_id: me.id,
        dice_value: diceValue,
        token_number: before.id,
        from_position: before.progress,
        to_position: after.progress,
        captured_player_id: null,
        captured_token_number: null,
      }),
    ]);

    if (playerError || moveError) {
      console.warn(
        "Ludo move audit could not be synchronized.",
        playerError ?? moveError
      );
      setOnlineMessage("Your move played, but its online audit did not synchronize.");
    }
  }

  function localTurnChange(from: Player, list: Token[], order: Player[]) {
    const next = nextPlayer(from, list, order);
    const newDice = cloneDice(diceValues);
    newDice[from] = null;
    newDice[next] = null;
    setPlayer(next);
    setRolled(false);
    setSixCount(0);
    setDiceValues(newDice);
    sound("turn");
    void publishOnline({
      tokens: list,
      player: next,
      diceValues: newDice,
      rolled: false,
      movingToken: null,
      finishOrder: order,
      sixCount: 0,
    });
  }

  function keepTurnAfterSix() {
    const newDice = cloneDice(diceValues);
    newDice[player] = null;
    setRolled(false);
    setDiceValues(newDice);
    sound("turn");
    void publishOnline({
      diceValues: newDice,
      rolled: false,
      sixCount,
    });
  }

  async function rollDice(p: Player) {
    if (!activePlayers.includes(p)) return;
    if (
      p !== player ||
      rolled ||
      diceRolling ||
      movingToken !== null ||
      gameFinished
    ) return;
    if (!canControlCurrentTurn) return;

    const generation = ++rollGeneration.current;
    setDiceRolling(true);
    if (!gameStarted) sound("start");
    setGameStarted(true);
    sound("dice");

    const value = Math.floor(Math.random() * 6) + 1;
    for (let frame = 0; frame < 7; frame++) {
      if (rollGeneration.current !== generation) return;
      const previewDice = cloneDice(diceValues);
      previewDice[p] = Math.floor(Math.random() * 6) + 1;
      setDiceValues(previewDice);
      await wait(55);
    }
    if (rollGeneration.current !== generation) return;
    setDiceRolling(false);

    const newSixCount = value === 6 ? sixCount + 1 : 0;
    const nextDice = cloneDice(diceValues);
    nextDice[p] = value;

    // Three consecutive sixes: turn is cancelled.
    if (value === 6 && newSixCount >= 3) {
      setDiceValues(nextDice);
      setRolled(false);
      setSixCount(0);
      sound("turn");
      void publishOnline({
        diceValues: nextDice,
        rolled: false,
        sixCount: 0,
        gameStarted: true,
      });
      schedule(() => {
        const next = nextPlayer(p, tokens, finishOrder);
        const cleared = cloneDice(nextDice);
        cleared[p] = null;
        cleared[next] = null;
        setPlayer(next);
        setDiceValues(cleared);
        void publishOnline({
          player: next,
          diceValues: cleared,
          rolled: false,
          sixCount: 0,
        });
      }, 500);
      return;
    }

    const possible = tokens.some(
      (token) => token.player === p && canMove(token, value, tokens)
    );

    setDiceValues(nextDice);
    setSixCount(newSixCount);
    setRolled(true);
    setGameStarted(true);

    void publishOnline({
      diceValues: nextDice,
      sixCount: newSixCount,
      rolled: true,
      gameStarted: true,
    });

    if (!possible) {
      schedule(() => {
        const cleared = cloneDice(nextDice);
        cleared[p] = null;
        setDiceValues(cleared);
        setRolled(false);

        const next = nextPlayer(p, tokens, finishOrder);
        setPlayer(next);
        setSixCount(0);
        void publishOnline({
          player: next,
          diceValues: cleared,
          rolled: false,
          sixCount: 0,
        });
        sound("turn");
      }, 650);
    }
  }

  async function moveToken(tokenId: number) {
    if (!rolled || currentDice === null || movingToken !== null || gameFinished) return;
    if (!canControlCurrentTurn) return;

    const selected = tokens.find(
      (token) => token.player === player && token.id === tokenId
    );
    if (!selected || !canMove(selected, currentDice, tokens)) return;

    const value = currentDice;
    setMovingToken(`${player}-${tokenId}`);

    let working = [...tokens];

    if (selected.progress === -1) {
      working = working.map((token) =>
        token.player === player && token.id === tokenId
          ? { ...token, progress: 0 }
          : token
      );
      setTokens(working);
      sound("click");
      await wait(100);
      sound("move");
    } else {
      for (let step = 1; step <= value; step++) {
        const progress = selected.progress + step;
        if (progress > 57) break;
        working = working.map((token) =>
          token.player === player && token.id === tokenId
            ? { ...token, progress }
            : token
        );
        setTokens(working);
        sound("move");
        await wait(120);
      }
    }

    const moved = working.find(
      (token) => token.player === player && token.id === tokenId
    );
    if (!moved) {
      setMovingToken(null);
      return;
    }

    let captured = false;
    if (moved.progress >= 0 && moved.progress <= 50) {
      const result = captureAtPosition(player, moved, working);
      working = result.list;
      captured = result.captured;
    }

    const finished = isPlayerFinished(player, working);
    const newOrder = finished
      ? (finishOrder.includes(player) ? finishOrder : [...finishOrder, player])
      : finishOrder;

    setTokens(working);
    setFinishOrder(newOrder);
    setMovingToken(null);
    void recordOnlineMove(selected, moved, value, working);

    if (finished) sound("win");
    if (moved.progress === 57) sound("home");

    if (newOrder.length >= Math.max(1, activePlayers.length - 1)) {
      const cleared = cloneDice(diceValues);
      cleared[player] = null;
      setDiceValues(cleared);
      setRolled(false);
      setSixCount(0);
      void publishOnline({
        tokens: working,
        diceValues: cleared,
        rolled: false,
        movingToken: null,
        finishOrder: newOrder,
        sixCount: 0,
      });
      return;
    }

    // Six, capture, or final home gives another turn.
    if (value === 6 || captured || moved.progress === 57) {
      const cleared = cloneDice(diceValues);
      cleared[player] = null;
      setDiceValues(cleared);
      setRolled(false);
      setTokens(working);
      void publishOnline({
        tokens: working,
        diceValues: cleared,
        rolled: false,
        movingToken: null,
        finishOrder: newOrder,
        sixCount,
      });
      sound("turn");
      return;
    }

    const cleared = cloneDice(diceValues);
    cleared[player] = null;
    const next = nextPlayer(player, working, newOrder);
    cleared[next] = null;
    setDiceValues(cleared);
    setRolled(false);
    setSixCount(0);
    setPlayer(next);

    void publishOnline({
      tokens: working,
      player: next,
      diceValues: cleared,
      rolled: false,
      movingToken: null,
      finishOrder: newOrder,
      sixCount: 0,
    });
    sound("turn");
  }

  function resetGame() {
    rollGeneration.current += 1;
    setDiceRolling(false);
    pendingTimers.current.forEach(clearTimeout);
    pendingTimers.current.clear();
    sound("click");
    const fresh = createTokens();
    setTokens(fresh);
    setPlayer(activePlayers[0]);
    setMyOnlinePlayer(gameMode === "offline" ? null : myOnlinePlayer);
    setDiceValues(EMPTY_DICE);
    setRolled(false);
    setMovingToken(null);
    setFinishOrder([]);
    setSixCount(0);
    setGameStarted(false);

    if (roomId && gameMode === "online") {
      void publishOnline({
        tokens: fresh,
        player: activePlayers[0],
        diceValues: EMPTY_DICE,
        rolled: false,
        movingToken: null,
        finishOrder: [],
        sixCount: 0,
        gameStarted: false,
      });
    }
  }

  function changePlayerCount(count: PlayerCount) {
    rollGeneration.current += 1;
    setDiceRolling(false);
    sound("click");
    setPlayerCount(count);
    setTokens(createTokens());
    setPlayer(PLAYER_SETS[count][0]);
    setDiceValues(EMPTY_DICE);
    setRolled(false);
    setMovingToken(null);
    setFinishOrder([]);
    setSixCount(0);
    setGameStarted(false);
  }

  async function disconnectRoom() {
    rollGeneration.current += 1;
    setDiceRolling(false);
    pendingTimers.current.forEach(clearTimeout);
    pendingTimers.current.clear();

    if (supabase && roomId && user?.id) {
      const { error } = await supabase
        .from("ludo_players")
        .update({ is_connected: false })
        .eq("room_id", roomId)
        .eq("user_id", user.id);
      if (error && __DEV__) {
        console.warn("Ludo player connection status could not be updated.", error);
      }
    }

    if (roomChannel.current && supabase) {
      await supabase.removeChannel(roomChannel.current);
      roomChannel.current = null;
    }
    setRoomId(null);
    setRoomCode("");
    setOnlinePlayers([]);
    setMyOnlinePlayer(null);
    setOnlineConnected(false);
    setOnlineMessage("");
  }

  async function subscribeRoom(id: string) {
    if (!supabase) {
      setOnlineMessage("Online Ludo is unavailable until Supabase is configured.");
      return;
    }

    if (roomChannel.current) {
      await supabase.removeChannel(roomChannel.current);
      roomChannel.current = null;
    }

    const channel = supabase
      .channel(`ludo-room-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ludo_rooms", filter: `id=eq.${id}` },
        (payload: any) => {
          const row: any = payload.new;
          if (!row) return;

          if (row.game_state) {
            const state = row.game_state as Partial<OnlineSnapshot>;
            if (Array.isArray(state.tokens)) setTokens(state.tokens);
            if (state.player) setPlayer(state.player);
            if (state.playerCount) setPlayerCount(state.playerCount);
            if (state.diceValues) setDiceValues(state.diceValues);
            if (typeof state.rolled === "boolean") setRolled(state.rolled);
            if (Array.isArray(state.finishOrder)) setFinishOrder(state.finishOrder);
            if (typeof state.sixCount === "number") setSixCount(state.sixCount);
            if (typeof state.gameStarted === "boolean") setGameStarted(state.gameStarted);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ludo_players", filter: `room_id=eq.${id}` },
        async () => {
          const { data } = await supabase
            .from("ludo_players")
            .select("*")
            .eq("room_id", id)
            .order("player_number", { ascending: true });
          if (data) setOnlinePlayers(data as OnlinePlayer[]);
        }
      )
      .subscribe((status: string) => {
        const connected = status === "SUBSCRIBED";
        setOnlineConnected(connected);
        if (connected) {
          setOnlineMessage((message) =>
            message === "Reconnecting..." ? "Connection restored." : message
          );
          void loadRoomPlayers(id);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setOnlineMessage("Reconnecting...");
        }
      });

    roomChannel.current = channel;
  }

  async function loadRoomPlayers(id: string) {
    if (!supabase) {
      setOnlineMessage("Online Ludo is unavailable until Supabase is configured.");
      return [];
    }

    const { data, error } = await supabase
      .from("ludo_players")
      .select("*")
      .eq("room_id", id)
      .order("player_number", { ascending: true });

    if (error) {
      setOnlineMessage(error.message);
      return [];
    }
    const list = (data ?? []) as OnlinePlayer[];
    setOnlinePlayers(list);
    return list;
  }

  function makeRoomCode() {
    return Crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  }

  async function createRoom() {
    if (!supabase) {
      setOnlineMessage("Online Ludo is unavailable until Supabase is configured.");
      return;
    }

    if (!user?.id) {
      setOnlineMessage("Please sign in first.");
      return;
    }

    sound("click");
    const code = makeRoomCode();
    const firstPlayer = PLAYER_SETS[playerCount][0];

    const initialState: OnlineSnapshot = {
      tokens: createTokens(),
      player: firstPlayer,
      playerCount,
      diceValues: EMPTY_DICE,
      rolled: false,
      movingToken: null,
      finishOrder: [],
      sixCount: 0,
      gameStarted: false,
    };

    const { data: room, error } = await supabase
      .from("ludo_rooms")
      .insert({
        room_code: code,
        status: "waiting",
        max_players: playerCount,
        current_turn: firstPlayer,
        dice_value: null,
        winner_player_id: null,
        game_state: initialState,
      })
      .select("*")
      .single();

    if (error || !room) {
      setOnlineMessage(error?.message ?? "Could not create room.");
      return;
    }

    const { data: me, error: playerError } = await supabase
      .from("ludo_players")
      .insert({
        room_id: room.id,
        user_id: user.id,
        player_name: realName,
        player_color: firstPlayer,
        player_number: 1,
        is_ready: true,
        is_connected: true,
        token_positions: [-1, -1, -1, -1],
      })
      .select("*")
      .single();

    if (playerError || !me) {
      setOnlineMessage(playerError?.message ?? "Could not join created room.");
      return;
    }

    setRoomId(room.id);
    setRoomCode(code);
    setMyOnlinePlayer(firstPlayer);
    setPlayer(firstPlayer);
    setTokens(initialState.tokens);
    setDiceValues(initialState.diceValues);
    setRolled(false);
    setFinishOrder([]);
    setSixCount(0);
    setGameStarted(false);
    setOnlineMessage("Room created. Share the code with your friends.");
    await loadRoomPlayers(room.id);
    await subscribeRoom(room.id);
  }

  async function joinRoom() {
    if (!supabase) {
      setOnlineMessage("Online Ludo is unavailable until Supabase is configured.");
      return;
    }

    if (!user?.id) {
      setOnlineMessage("Please sign in first.");
      return;
    }

    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setOnlineMessage("Enter the room code.");
      return;
    }

    sound("click");

    const { data: room, error } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("room_code", code)
      .maybeSingle();

    if (error || !room) {
      setOnlineMessage(error?.message ?? "Room not found.");
      return;
    }

    const list = await loadRoomPlayers(room.id);
    const count = Math.min(4, Math.max(2, Number(room.max_players))) as PlayerCount;
    const active = PLAYER_SETS[count];

    if (list.some((p) => p.user_id === user.id)) {
      const mine = list.find((p) => p.user_id === user.id)!;
      const { error: reconnectError } = await supabase
        .from("ludo_players")
        .update({ is_connected: true })
        .eq("id", mine.id)
        .eq("room_id", room.id);
      if (reconnectError) {
        setOnlineMessage(reconnectError.message);
        return;
      }
      setMyOnlinePlayer(mine.player_color);
      setRoomId(room.id);
      setRoomCode(code);
      setPlayerCount(count);
      setPlayer(mine.player_color);
      await subscribeRoom(room.id);
      setOnlineMessage("Reconnected to your existing player seat.");
      return;
    }

    if (list.length >= count) {
      setOnlineMessage("This room is full.");
      return;
    }

    const used = new Set(list.map((p) => p.player_color));
    const nextColor = active.find((color) => !used.has(color));
    if (!nextColor) {
      setOnlineMessage("No player slot is available.");
      return;
    }

    const { data: me, error: insertError } = await supabase
      .from("ludo_players")
      .insert({
        room_id: room.id,
        user_id: user.id,
        player_name: realName,
        player_color: nextColor,
        player_number: list.length + 1,
        is_ready: true,
        is_connected: true,
        token_positions: [-1, -1, -1, -1],
      })
      .select("*")
      .single();

    if (insertError || !me) {
      setOnlineMessage(insertError?.message ?? "Could not join room.");
      return;
    }

    const newList = [...list, me as OnlinePlayer];
    const state = (room.game_state ?? {}) as Partial<OnlineSnapshot>;
    const joinedState: OnlineSnapshot = {
      tokens: Array.isArray(state.tokens) ? state.tokens : createTokens(),
      player: (state.player as Player) ?? active[0],
      playerCount: count,
      diceValues: (state.diceValues as DiceMap) ?? EMPTY_DICE,
      rolled: Boolean(state.rolled),
      movingToken: null,
      finishOrder: Array.isArray(state.finishOrder) ? state.finishOrder : [],
      sixCount: Number(state.sixCount ?? 0),
      gameStarted: newList.length >= count,
    };

    const { error: roomUpdateError } = await supabase
      .from("ludo_rooms")
      .update({
        status: newList.length >= count ? "playing" : "waiting",
        max_players: count,
        current_turn: joinedState.player,
        game_state: joinedState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id);

    if (roomUpdateError) {
      console.warn("Ludo room could not be updated after joining.", roomUpdateError);
      setOnlineMessage("Joined the room, but the game state could not be synchronized.");
      return;
    }

    setRoomId(room.id);
    setRoomCode(code);
    setMyOnlinePlayer(nextColor);
    setPlayerCount(count);
    setPlayer(joinedState.player);
    setTokens(joinedState.tokens);
    setDiceValues(joinedState.diceValues);
    setRolled(joinedState.rolled);
    setFinishOrder(joinedState.finishOrder);
    setSixCount(joinedState.sixCount);
    setGameStarted(joinedState.gameStarted);
    setOnlineMessage(
      newList.length >= count
        ? "All players joined. Game is ready."
        : "Joined room. Waiting for the remaining players."
    );
    await loadRoomPlayers(room.id);
    await subscribeRoom(room.id);
  }

  function drawCell(row: number, col: number) {
    let background = "#FFFFFF";
    const pathIndex = PATH.findIndex(([r, c]) => r === row && c === col);

    if (row <= 5 && col <= 5) background = COLORS.yellow.light;
    if (row <= 5 && col >= 9) background = COLORS.blue.light;
    if (row >= 9 && col <= 5) background = COLORS.green.light;
    if (row >= 9 && col >= 9) background = COLORS.red.light;
    if (pathIndex >= 0) background = "#FFFFFF";

    if (row === 7 && col <= 5) background = COLORS.yellow.light;
    if (col === 7 && row <= 5) background = COLORS.blue.light;
    if (row === 7 && col >= 9) background = COLORS.red.light;
    if (col === 7 && row >= 9) background = COLORS.green.light;

    if (row >= 6 && row <= 8 && col >= 6 && col <= 8) background = "#FFFFFF";

    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.cell,
          {
            width: cell,
            height: cell,
            left: col * cell,
            top: row * cell,
            backgroundColor: background,
          },
        ]}
      />
    );
  }

  function drawHome(p: Player) {
    const color = COLORS[p];
    const position =
      p === "yellow"
        ? { left: 0, top: 0 }
        : p === "blue"
        ? { right: 0, top: 0 }
        : p === "green"
        ? { left: 0, bottom: 0 }
        : { right: 0, bottom: 0 };

    return (
      <View
        key={`home-${p}`}
        pointerEvents="none"
        style={[
          styles.home,
          position,
          {
            width: cell * 6,
            height: cell * 6,
            backgroundColor: color.main,
          },
        ]}
      >
        <View style={[styles.homeInner, { width: cell * 4.2, height: cell * 4.2 }]}>
          <View style={[styles.yardCircle, { borderColor: color.main }]} />
          <View style={[styles.yardCircle, { borderColor: color.main }]} />
          <View style={[styles.yardCircle, { borderColor: color.main }]} />
          <View style={[styles.yardCircle, { borderColor: color.main }]} />
        </View>
      </View>
    );
  }

  function drawStars() {
    return STAR_INDEXES.map((index) => {
      const [row, col] = PATH[index];
      const starColor =
        index === 8
          ? COLORS.red.main
          : index === 21
          ? COLORS.green.main
          : index === 34
          ? COLORS.yellow.main
          : COLORS.blue.main;

      return (
        <View
          key={`star-${index}`}
          pointerEvents="none"
          style={[
            styles.starBox,
            { width: cell, height: cell, left: col * cell, top: row * cell },
          ]}
        >
          <Text style={[styles.star, { color: starColor, fontSize: cell * 0.58 }]}>★</Text>
        </View>
      );
    });
  }

  function drawCenter() {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.center,
          { width: cell * 3, height: cell * 3, left: cell * 6, top: cell * 6 },
        ]}
      >
        <View style={[styles.centerPart, { backgroundColor: COLORS.yellow.main, left: 0, top: 0 }]} />
        <View style={[styles.centerPart, { backgroundColor: COLORS.blue.main, right: 0, top: 0 }]} />
        <View style={[styles.centerPart, { backgroundColor: COLORS.green.main, left: 0, bottom: 0 }]} />
        <View style={[styles.centerPart, { backgroundColor: COLORS.red.main, right: 0, bottom: 0 }]} />
        <View style={styles.centerCircle} />
      </View>
    );
  }

  function drawToken(token: Token) {
    if (!activePlayers.includes(token.player)) return null;

    const [row, col] = getTokenPosition(token);
    const color = COLORS[token.player];
    const tokenSize = Math.max(cell * 0.78, 22);
    const globalIndex = getGlobalIndex(token);

    let offsetX = 0;
    let offsetY = 0;

    if (globalIndex !== null) {
      const stack = tokens.filter(
        (t) => activePlayers.includes(t.player) && getGlobalIndex(t) === globalIndex
      );
      const stackIndex = stack.findIndex(
        (t) => t.player === token.player && t.id === token.id
      );
      const offsets = [
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18],
      ];
      [offsetX, offsetY] = offsets[Math.max(0, stackIndex) % 4];
    } else if (token.progress === -1) {
      const offsets = [
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ];
      [offsetX, offsetY] = offsets[token.id];
    }

    const left = col * cell + cell / 2 - tokenSize / 2 + offsetX * cell;
    const top = row * cell + cell / 2 - tokenSize / 2 + offsetY * cell;

    const selectable =
      rolled &&
      currentDice !== null &&
      movingToken === null &&
      token.player === player &&
      canMove(token, currentDice, tokens) &&
      canControlCurrentTurn;

    return (
      <Pressable
        key={`${token.player}-${token.id}`}
        onPress={() => void moveToken(token.id)}
        disabled={!selectable}
        style={[
          styles.pawn,
          { width: tokenSize, height: tokenSize, left, top, zIndex: selectable ? 500 : 200 },
        ]}
      >
        {selectable && (
          <View
            style={[
              styles.pawnGlow,
              {
                width: tokenSize * 1.22,
                height: tokenSize * 1.22,
                borderRadius: tokenSize * 0.61,
                borderColor: color.main,
              },
            ]}
          />
        )}
        <View
          style={[
            styles.pawnBody,
            {
              width: tokenSize * 0.72,
              height: tokenSize * 0.72,
              borderRadius: tokenSize * 0.36,
              backgroundColor: color.main,
              borderColor: color.dark,
            },
          ]}
        >
          <View
            style={[
              styles.pawnShine,
              {
                width: tokenSize * 0.18,
                height: tokenSize * 0.18,
                borderRadius: tokenSize * 0.09,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.pawnBase,
            {
              width: tokenSize * 0.82,
              height: tokenSize * 0.28,
              borderRadius: tokenSize * 0.14,
              backgroundColor: color.dark,
              borderColor: color.main,
            },
          ]}
        />
      </Pressable>
    );
  }

  function externalDice(p: Player) {
    if (!activePlayers.includes(p)) return null;

    const active = player === p;
    // First turn is also rollable.
    const enabled = active && !rolled && movingToken === null && !gameFinished && canControlCurrentTurn;
    const diceEnabled = enabled && !diceRolling;

    return (
      <View key={`external-dice-${p}`} style={styles.externalDiceSlot}>
        <View
          style={[
            styles.externalDiceFrame,
            {
              borderColor: COLORS[p].main,
              shadowColor: COLORS[p].main,
              opacity: active ? 1 : 0.72,
            },
          ]}
        >
          <Dice
            value={diceValues[p]}
            size={Math.max(36, Math.min(48, width * 0.105))}
            onPress={() => void rollDice(p)}
            disabled={!diceEnabled}
            active={active}
          />
        </View>
      </View>
    );
  }

  const turnName =
    gameMode === "online"
      ? onlinePlayers.find((p) => p.player_color === player)?.player_name ?? player.toUpperCase()
      : player === "green"
      ? "PLAYER 1"
      : player === "yellow"
      ? "PLAYER 2"
      : player === "blue"
      ? "PLAYER 3"
      : "PLAYER 4";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>GAMEZONE ARENA</Text>
            <Text style={styles.title}>LUDO</Text>
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => {
                vibrate("click");
                toggleSound();
              }}
              style={styles.soundButton}
            >
              <Text style={styles.soundIcon}>{soundOn ? "🔊" : "🔇"}</Text>
              <Text style={styles.soundText}>{soundOn ? "ON" : "OFF"}</Text>
            </Pressable>
            <Pressable onPress={toggleVibration} style={styles.soundButton}>
              <Text style={styles.soundIcon}>{vibrationOn ? "📳" : "🚫"}</Text>
              <Text style={styles.soundText}>{vibrationOn ? "ON" : "OFF"}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void disconnectRoom();
                router.back();
              }}
              style={styles.reset}
            >
              <Text style={styles.resetText}>EXIT</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                sound("click");
                setSettingsOpen(true);
              }}
              style={styles.iconButton}
            >
              <Text style={styles.iconText}>⚙️</Text>
            </Pressable>
            <Pressable onPress={resetGame} style={styles.reset}>
              <Text style={styles.resetText}>RESET</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.playerCountBox}>
          <Text style={styles.sectionTitle}>PLAYERS</Text>
          <View style={styles.playerCountRow}>
            {[2, 3, 4].map((count) => {
              const selected = playerCount === count;
              return (
                <Pressable
                  key={count}
                  onPress={() => changePlayerCount(count as PlayerCount)}
                  disabled={gameMode === "online" && roomId !== null}
                  style={[
                    styles.playerCountButton,
                    {
                      backgroundColor: selected ? "#18B85A" : "#11182B",
                      borderColor: selected ? "#18B85A" : "#293A5C",
                      opacity: gameMode === "online" && roomId !== null ? 0.55 : 1,
                    },
                  ]}
                >
                  <Text style={styles.playerCountNumber}>{count}</Text>
                  <Text style={styles.playerCountText}>PLAYERS</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.statusText}>
            {gameMode === "offline"
              ? "PASS & PLAY • ALL PLAYERS ARE HUMAN"
              : "ONLINE • REAL PLAYERS"}
          </Text>
        </View>

        <View style={styles.modeBox}>
          <Text style={styles.sectionTitle}>GAME MODE</Text>
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => {
                sound("click");
                void disconnectRoom();
                setGameMode("offline");
                setTokens(createTokens());
                setPlayer(PLAYER_SETS[playerCount][0]);
                setDiceValues(EMPTY_DICE);
                setRolled(false);
                setMovingToken(null);
                setFinishOrder([]);
                setSixCount(0);
                setGameStarted(false);
              }}
              style={[
                styles.modeButton,
                { backgroundColor: gameMode === "offline" ? "#18B85A" : "#11182B" },
              ]}
            >
              <Text style={styles.modeText}>OFFLINE</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                sound("click");
                if (!supabase) {
                  setOnlineMessage(
                    "Online Ludo is unavailable until Supabase is configured."
                  );
                  return;
                }
                setGameMode("online");
                setGameStarted(false);
                setOnlineMessage("Create a room or join a friend's room.");
              }}
              style={[
                styles.modeButton,
                { backgroundColor: gameMode === "online" ? "#1687DC" : "#11182B" },
              ]}
            >
              <Text style={styles.modeText}>ONLINE</Text>
            </Pressable>
          </View>
        </View>

        {gameMode === "online" && (
          <View style={styles.onlineBox}>
            <View style={styles.onlineTop}>
              <View>
                <Text style={styles.onlineTitle}>ONLINE LUDO</Text>
                <Text style={styles.onlineSub}>Supabase Realtime room</Text>
              </View>
              <View style={styles.onlineStatus}>
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: onlineConnected ? "#19D96B" : "#F5C518" },
                  ]}
                />
                <Text style={styles.onlineStatusText}>
                  {onlineConnected ? "CONNECTED" : "WAITING"}
                </Text>
              </View>
            </View>

            <View style={styles.roomRow}>
              <View style={styles.roomCodeBox}>
                <Text style={styles.roomLabel}>YOUR ROOM</Text>
                <Text style={styles.roomCode}>{roomCode || "------"}</Text>
              </View>
              <Pressable onPress={() => void createRoom()} style={styles.roomButton}>
                <Text style={styles.roomButtonText}>CREATE</Text>
              </Pressable>
            </View>

            <View style={styles.joinRow}>
              <TextInput
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                placeholder="FRIEND ROOM CODE"
                placeholderTextColor="#6E7E9E"
                style={styles.joinInput}
              />
              <Pressable onPress={() => void joinRoom()} style={styles.joinButton}>
                <Text style={styles.joinButtonText}>JOIN</Text>
              </Pressable>
            </View>

            {onlinePlayers.length > 0 && (
              <View style={styles.roster}>
                {onlinePlayers.map((p) => (
                  <View key={p.id} style={styles.rosterRow}>
                    <View style={[styles.rosterDot, { backgroundColor: COLORS[p.player_color].main }]} />
                    <Text style={styles.rosterName}>{p.player_name}</Text>
                    {p.user_id === user?.id && <Text style={styles.youBadge}>YOU</Text>}
                  </View>
                ))}
              </View>
            )}

            {!!onlineMessage && <Text style={styles.onlineMessage}>{onlineMessage}</Text>}
            {roomId && (
              <Pressable onPress={() => void disconnectRoom()} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>LEAVE ROOM</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.adPlaceholder}>
          <Text style={styles.adPlaceholderText}>ADVERTISEMENT</Text>
        </View>

        <View style={styles.externalDiceRow}>
          {externalDice("yellow")}
          {externalDice("blue")}
        </View>

        <View style={[styles.boardOuter, { width: boardSize + 14 }]}>
          <View style={[styles.board, { width: boardSize, height: boardSize }]}>
            {Array.from({ length: 15 }).flatMap((_, row) =>
              Array.from({ length: 15 }).map((__, col) => drawCell(row, col))
            )}
            {drawHome("yellow")}
            {drawHome("blue")}
            {drawHome("green")}
            {drawHome("red")}
            {drawStars()}
            {drawCenter()}
            {tokens.map(drawToken)}
          </View>
        </View>

        <View style={styles.externalDiceRow}>
          {externalDice("green")}
          {externalDice("red")}
        </View>

        <View style={styles.cleanFooterRow}>
          <Text style={styles.footerPlayer}>{turnName}</Text>
          <View style={[styles.footerDot, { backgroundColor: COLORS[player].main }]} />
        </View>

        <Modal
          visible={premiumOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setPremiumOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.premiumPanel}>
              <Text style={styles.premiumTitle}>GAMEZONE PREMIUM</Text>
              <Text style={styles.premiumSub}>
                Ad-free play • Premium cosmetics • Special themes
              </Text>
              <View style={styles.premiumPrice}>
                <Text style={styles.premiumPriceText}>MONTHLY</Text>
                <Text style={styles.premiumPriceValue}>₹99</Text>
              </View>
              <Pressable
                onPress={async () => {
                  sound("click");
                  const result = await SubscriptionService.purchasePremium();
                  setPremiumMessage(result.message);
                }}
                style={styles.subscribeButton}
              >
                <Text style={styles.subscribeButtonText}>COMING SOON</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const result = await SubscriptionService.restorePurchases();
                  setPremiumMessage(result.message);
                  setPremiumActive(await SubscriptionService.isPremium());
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>RESTORE PURCHASES</Text>
              </Pressable>
              {!!premiumMessage && (
                <Text style={styles.premiumMessage}>{premiumMessage}</Text>
              )}
              <Pressable onPress={() => setPremiumOpen(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>CLOSE</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={notificationOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setNotificationOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setNotificationOpen(false)}>
            <View style={styles.popup} onStartShouldSetResponder={() => true}>
              <Text style={styles.popupTitle}>Notifications</Text>
              <Text style={styles.popupText}>No new notifications.</Text>
              <Pressable style={styles.popupButton} onPress={() => setNotificationOpen(false)}>
                <Text style={styles.popupButtonText}>CLOSE</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={settingsOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setSettingsOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.settingsPanel}>
              <View style={styles.settingsHeader}>
                <Text style={styles.popupTitle}>Settings</Text>
                <Pressable onPress={() => setSettingsOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <TextInput
                value={settingsSearch}
                onChangeText={setSettingsSearch}
                placeholder="Search settings"
                placeholderTextColor="#7787A7"
                style={styles.searchInput}
              />

              {(settingsSearch.trim() === "" ||
                "sound audio".includes(settingsSearch.toLowerCase())) && (
                <Pressable style={styles.settingRow} onPress={toggleSound}>
                  <Text style={styles.settingName}>Sound</Text>
                  <Text style={styles.settingValue}>{soundOn ? "ON" : "OFF"}</Text>
                </Pressable>
              )}

              {(settingsSearch.trim() === "" ||
                "vibration haptics".includes(settingsSearch.toLowerCase())) && (
                <Pressable style={styles.settingRow} onPress={toggleVibration}>
                  <Text style={styles.settingName}>Vibration</Text>
                  <Text style={styles.settingValue}>{vibrationOn ? "ON" : "OFF"}</Text>
                </Pressable>
              )}

              {__DEV__ && settingsSearch.trim() === "" && (
                <View style={styles.soundTestBox}>
                  <Text style={styles.settingName}>Sound test</Text>
                  <View style={styles.soundTestRow}>
                    {(["dice", "move", "capture", "home", "win"] as const).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => sound(type)}
                        style={styles.soundTestButton}
                      >
                        <Text style={styles.soundTestText}>{type.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {(settingsSearch.trim() === "" ||
                "game mode".includes(settingsSearch.toLowerCase())) && (
                <View style={styles.settingRow}>
                  <Text style={styles.settingName}>Game Mode</Text>
                  <Text style={styles.settingValue}>{gameMode.toUpperCase()}</Text>
                </View>
              )}

              {(settingsSearch.trim() === "" ||
                "players".includes(settingsSearch.toLowerCase())) && (
                <View style={styles.settingRow}>
                  <Text style={styles.settingName}>Players</Text>
                  <Text style={styles.settingValue}>{playerCount}</Text>
                </View>
              )}

              <Pressable
                style={styles.settingRow}
                onPress={() => {
                  setSettingsOpen(false);
                  setPremiumOpen(true);
                }}
              >
                <Text style={styles.settingName}>Premium</Text>
                <Text style={styles.settingValue}>
                  {premiumActive ? "ACTIVE" : "OPEN"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050A17" },
  content: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerButtons: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 8,
  },
  brand: { color: "#43DDF8", fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#111C34",
    borderWidth: 1.5,
    borderColor: "#2E4168",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 17 },
  soundButton: {
    height: 38,
    minWidth: 58,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#18B85A",
    backgroundColor: "#111C34",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  soundIcon: { fontSize: 16 },
  soundText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  reset: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#111C34",
    borderWidth: 1.5,
    borderColor: "#2E4168",
  },
  resetText: { color: "#54DCF7", fontSize: 11, fontWeight: "900" },
  adPlaceholder: { marginTop: 10, minHeight: 50, borderRadius: 10, borderWidth: 1, borderColor: "#293A5C", backgroundColor: "#0D1427", alignItems: "center", justifyContent: "center" },
  adPlaceholderText: { color: "#526583", fontSize: 8, fontWeight: "900", letterSpacing: 1 },

  playerCountBox: {
    backgroundColor: "#0D1427",
    borderWidth: 1,
    borderColor: "#293A5C",
    borderRadius: 15,
    padding: 9,
    marginBottom: 9,
  },
  sectionTitle: {
    color: "#8FA1C2",
    fontSize: 8,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 7,
  },
  playerCountRow: { flexDirection: "row", gap: 7 },
  playerCountButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playerCountNumber: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  playerCountText: { color: "#FFFFFF", fontSize: 7, fontWeight: "900" },
  statusText: {
    color: "#8FA1C2",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 7,
  },

  modeBox: {
    backgroundColor: "#0D1427",
    borderWidth: 1,
    borderColor: "#293A5C",
    borderRadius: 15,
    padding: 9,
    marginBottom: 10,
  },
  modeRow: { flexDirection: "row", gap: 7 },
  modeButton: {
    flex: 1,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  modeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },

  onlineBox: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 15,
    backgroundColor: "#0D1427",
    borderWidth: 1.5,
    borderColor: "#1687DC",
  },
  onlineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  onlineTitle: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  onlineSub: { color: "#7787A7", fontSize: 8, marginTop: 2 },
  onlineStatus: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineStatusText: { color: "#43DDF8", fontSize: 8, fontWeight: "900" },

  roomRow: { flexDirection: "row", gap: 7, marginTop: 8 },
  roomCodeBox: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#11182B",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  roomLabel: { color: "#7787A7", fontSize: 6, fontWeight: "900" },
  roomCode: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 1,
  },
  roomButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#1687DC",
    alignItems: "center",
    justifyContent: "center",
  },
  roomButtonText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900" },

  joinRow: { flexDirection: "row", gap: 7, marginTop: 7 },
  joinInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#11182B",
    borderWidth: 1,
    borderColor: "#293A5C",
    color: "#FFFFFF",
    paddingHorizontal: 12,
    fontSize: 10,
    fontWeight: "800",
  },
  joinButton: {
    minWidth: 72,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#18B85A",
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900" },
  roster: { marginTop: 8, gap: 5 },
  rosterRow: {
    minHeight: 30,
    borderRadius: 9,
    backgroundColor: "#11182B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
  },
  rosterDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  rosterName: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", flex: 1 },
  youBadge: { color: "#43DDF8", fontSize: 7, fontWeight: "900" },
  onlineMessage: { color: "#8FA1C2", fontSize: 8, marginTop: 8, textAlign: "center" },

  adBox: {
    minHeight: 52,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#0D1427",
    borderWidth: 1,
    borderColor: "#293A5C",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  externalDiceRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 7,
    marginBottom: 3,
  },
  externalDiceSlot: {
    width: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  externalDiceFrame: {
    padding: 1,
    borderRadius: 17,
    borderWidth: 1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  diceTouch: { alignItems: "center", justifyContent: "center" },
  diceFrame: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    backgroundColor: "rgba(8,24,48,0.78)",
    shadowColor: "#19D9FF",
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  dice: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#D7DCE5",
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dicePips: { position: "absolute", width: "100%", height: "100%" },

  boardOuter: {
    alignSelf: "center",
    padding: 7,
    borderRadius: 24,
    backgroundColor: "#0D1427",
    borderWidth: 2,
    borderColor: "#334263",
  },
  board: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  cell: {
    position: "absolute",
    borderWidth: 0.5,
    borderColor: "#AEB5C0",
  },

  home: {
    position: "absolute",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  homeInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  yardCircle: {
    width: "36%",
    aspectRatio: 1,
    borderWidth: 4,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    margin: "6%",
  },

  starBox: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 80,
  },
  star: { fontWeight: "900", textAlign: "center" },

  center: {
    position: "absolute",
    overflow: "hidden",
    zIndex: 90,
    borderWidth: 1.5,
    borderColor: "#182238",
  },
  centerPart: { position: "absolute", width: "50%", height: "50%" },
  centerCircle: {
    position: "absolute",
    width: "48%",
    height: "48%",
    left: "26%",
    top: "26%",
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#111827",
  },

  pawn: { position: "absolute", alignItems: "center", justifyContent: "center" },
  pawnBody: {
    position: "absolute",
    top: "4%",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "flex-start",
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  pawnShine: {
    backgroundColor: "#FFFFFF",
    opacity: 0.75,
    position: "absolute",
    left: "20%",
    top: "15%",
  },
  pawnBase: { position: "absolute", bottom: "4%", borderWidth: 2 },
  pawnGlow: { position: "absolute", borderWidth: 2, opacity: 0.85 },

  cleanFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    height: 30,
  },
  footerPlayer: { color: "#7E8EAA", fontSize: 8, fontWeight: "800" },
  footerDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 5 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  popup: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#11182B",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#344365",
  },
  popupTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  popupText: { color: "#AAB5CB", marginTop: 10 },
  popupButton: {
    marginTop: 18,
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#18B85A",
  },
  popupButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },

  settingsPanel: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0D1427",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#344365",
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeText: { color: "#FFFFFF", fontSize: 22 },
  searchInput: {
    marginTop: 15,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#293A5C",
    backgroundColor: "#11182B",
    color: "#FFFFFF",
    paddingHorizontal: 14,
  },
  settingRow: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#11182B",
    borderWidth: 1,
    borderColor: "#293A5C",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingName: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  settingValue: { color: "#54DCF7", fontSize: 11, fontWeight: "900" },

  premiumPanel: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0D1427",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#A27B12",
  },
  premiumTitle: { color: "#F5C518", fontSize: 20, fontWeight: "900", textAlign: "center" },
  premiumSub: {
    color: "#AAB5CB",
    fontSize: 10,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 16,
  },
  premiumPrice: {
    marginTop: 15,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#11182B",
    alignItems: "center",
  },
  premiumPriceText: { color: "#7787A7", fontSize: 8, fontWeight: "900" },
  premiumPriceValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 2 },
  premiumMessage: {
    color: "#AFC0DE",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 8,
  },
  subscribeButton: {
    marginTop: 15,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#F5C518",
    alignItems: "center",
    justifyContent: "center",
  },
  subscribeButtonText: { color: "#111827", fontSize: 11, fontWeight: "900" },
  soundTestBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#11182B",
  },
  soundTestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  soundTestButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "#1B2C4D",
  },
  soundTestText: { color: "#43DDF8", fontSize: 7, fontWeight: "900" },
  cancelButton: {
    marginTop: 8,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#11182B",
    borderWidth: 1,
    borderColor: "#293A5C",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
});