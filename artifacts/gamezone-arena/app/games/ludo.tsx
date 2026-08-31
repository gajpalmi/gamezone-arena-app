import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Vibration,
} from "react-native";
import { useUser } from "@clerk/expo";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";

/* =========================================================
   GAMEZONE ARENA
   HUMAN MULTIPLAYER LUDO
   NO COMPUTER / NO AI

   SOUND SYSTEM
   ---------------------------------------------------------
   1. No sound on app load
   2. No click sound
   3. Dice rolling = continuous rolling sound
   4. Dice result = result sound
   5. Every token step = immediate step sound
   6. Capture = capture sound
   7. Star = star sound
   8. EVERY TOKEN entering HOME = winning sound
   9. 3 consecutive sixes = immediate next player
   10. Two opponent tokens on same cell = BLOCK
   11. One opponent token = can be captured
   ========================================================= */

type Player = "red" | "green" | "yellow" | "blue";
type PlayerCount = 2 | 3 | 4;

type Token = {
  player: Player;
  id: number;
  progress: number;
};

const ALL_PLAYERS: Player[] = [
  "red",
  "green",
  "yellow",
  "blue",
];

const PLAYER_SETS: Record<PlayerCount, Player[]> = {
  2: ["red", "yellow"],
  3: ["red", "green", "yellow"],
  4: ["red", "green", "yellow", "blue"],
};

const COLORS = {
  red: {
    main: "#EF3340",
    light: "#FFDDE1",
    dark: "#B91C28",
  },
  green: {
    main: "#18B85A",
    light: "#DDF8E8",
    dark: "#07823D",
  },
  yellow: {
    main: "#F5C518",
    light: "#FFF4C4",
    dark: "#B48600",
  },
  blue: {
    main: "#1687DC",
    light: "#DCEFFF",
    dark: "#075B9D",
  },
} as const;

/* =========================================================
   52 CELL MAIN PATH
   ========================================================= */

const PATH: [number, number][] = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
  [6, 0],
];

/* =========================================================
   START INDEX
   ========================================================= */

const START_INDEX: Record<Player, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/* =========================================================
   SAFE + STAR
   ========================================================= */

const SAFE_INDEXES = [
  0,
  8,
  13,
  21,
  26,
  34,
  39,
  47,
];

const STAR_INDEXES = [
  8,
  21,
  34,
  47,
];

/* =========================================================
   YARD POSITIONS
   ========================================================= */

const YARD_POSITIONS: Record<Player, [number, number][]> = {
  red: [
    [2, 2],
    [2, 4],
    [4, 2],
    [4, 4],
  ],

  green: [
    [2, 10],
    [2, 12],
    [4, 10],
    [4, 12],
  ],

  yellow: [
    [10, 10],
    [10, 12],
    [12, 10],
    [12, 12],
  ],

  blue: [
    [10, 2],
    [10, 4],
    [12, 2],
    [12, 4],
  ],
};

/* =========================================================
   FINISH LANES
   ========================================================= */

const FINISH_LANES: Record<Player, [number, number][]> = {
  red: [
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],

  green: [
    [0, 7],
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],

  yellow: [
    [7, 14],
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],

  blue: [
    [14, 7],
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
};

/* =========================================================
   SOUND URLS

   NOTE:
   These are remote sounds.

   STEP SOUND is separate from MOVE/SPECIAL sounds.
   It is restarted immediately for EVERY token step.
   ========================================================= */

const SOUND_URLS = {
  diceRoll:
    "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg",

  diceResult:
    "https://actions.google.com/sounds/v1/cartoon/pop.ogg",

  step:
    "https://actions.google.com/sounds/v1/cartoon/pop.ogg",

  capture:
    "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg",

  star:
    "https://actions.google.com/sounds/v1/cartoon/woodpecker_pecking.ogg",

  win:
    "https://actions.google.com/sounds/v1/cartoon/tada_fanfare_a.ogg",
} as const;

/* =========================================================
   CREATE TOKENS
   ========================================================= */

function createTokens(): Token[] {
  return ALL_PLAYERS.flatMap((player) =>
    Array.from(
      { length: 4 },
      (_, id) => ({
        player,
        id,
        progress: -1,
      }),
    ),
  );
}

/* =========================================================
   GLOBAL INDEX
   ========================================================= */

function getGlobalIndex(
  token: Token,
): number | null {
  if (
    token.progress < 0 ||
    token.progress > 50
  ) {
    return null;
  }

  return (
    (START_INDEX[token.player] +
      token.progress) %
    52
  );
}

/* =========================================================
   PATH POSITION
   ========================================================= */

function getPathPosition(
  player: Player,
  progress: number,
): [number, number] | null {
  if (
    progress < 0 ||
    progress > 50
  ) {
    return null;
  }

  const index =
    (START_INDEX[player] +
      progress) %
    52;

  return PATH[index];
}

/* =========================================================
   TOKEN POSITION
   ========================================================= */

function getTokenPosition(
  token: Token,
): [number, number] {
  if (token.progress === -1) {
    return YARD_POSITIONS[
      token.player
    ][token.id];
  }

  if (
    token.progress >= 0 &&
    token.progress <= 50
  ) {
    return getPathPosition(
      token.player,
      token.progress,
    )!;
  }

  if (
    token.progress >= 51 &&
    token.progress <= 56
  ) {
    return FINISH_LANES[
      token.player
    ][token.progress - 51];
  }

  return [7, 7];
}

/* =========================================================
   WAIT
   ========================================================= */

function wait(ms: number) {
  return new Promise<void>(
    (resolve) =>
      setTimeout(resolve, ms),
  );
}

/* =========================================================
   DICE PIPS
   ========================================================= */

function DicePips({
  value,
  size,
}: {
  value: number;
  size: number;
}) {
  const pip = Math.max(
    5,
    size * 0.13,
  );

  const positions: Record<
    number,
    Array<[number, number]>
  > = {
    1: [[50, 50]],

    2: [
      [25, 25],
      [75, 75],
    ],

    3: [
      [25, 25],
      [50, 50],
      [75, 75],
    ],

    4: [
      [25, 25],
      [75, 25],
      [25, 75],
      [75, 75],
    ],

    5: [
      [25, 25],
      [75, 25],
      [50, 50],
      [25, 75],
      [75, 75],
    ],

    6: [
      [25, 20],
      [75, 20],
      [25, 50],
      [75, 50],
      [25, 80],
      [75, 80],
    ],
  };

  return (
    <View
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
      }}
    >
      {positions[value].map(
        ([left, top], index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              width: pip,
              height: pip,
              borderRadius:
                pip / 2,
              backgroundColor:
                "#111827",
              left: `${left}%`,
              top: `${top}%`,
              transform: [
                {
                  translateX:
                    -pip / 2,
                },
                {
                  translateY:
                    -pip / 2,
                },
              ],
            }}
          />
        ),
      )}
    </View>
  );
}

/* =========================================================
   DICE COMPONENT
   ========================================================= */

function Dice({
  value,
  size = 42,
  onPress,
  disabled = false,
  active = false,
  color,
  rolling = false,
}: {
  value: number | null;
  size?: number;
  onPress?: () => void;
  disabled?: boolean;
  active?: boolean;
  color?: string;
  rolling?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={[
        styles.diceTouch,
        {
          opacity:
            disabled && !active
              ? 0.38
              : 1,
        },
      ]}
    >
      <View
        style={[
          styles.blueBolt,
          {
            width:
              size + 14,
            height:
              size + 14,
            borderRadius:
              (size + 14) *
              0.28,
            borderColor:
              active
                ? color ||
                  "#2ED8FF"
                : "#176B9E",
            shadowColor:
              color ||
              "#19D9FF",
            shadowOpacity:
              active
                ? 0.9
                : 0.2,
          },
        ]}
      >
        <View
          style={[
            styles.dice,
            {
              width: size,
              height: size,
              borderRadius:
                Math.max(
                  8,
                  size * 0.22,
                ),
            },
          ]}
        >
          {value === null ? (
            <Text
              style={{
                color: "#111827",
                fontSize:
                  size * 0.28,
                fontWeight:
                  "900",
              }}
            >
              ?
            </Text>
          ) : (
            <DicePips
              value={value}
              size={size}
            />
          )}

          {rolling && (
            <View
              pointerEvents="none"
              style={
                styles.diceRollingOverlay
              }
            >
              <Text
                style={[
                  styles.diceRollingText,
                  {
                    fontSize:
                      size * 0.22,
                  },
                ]}
              >
                •••
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/* =========================================================
   MAIN LUDO
   ========================================================= */

export default function Ludo() {
  const { width } =
    useWindowDimensions();

  const { user, isLoaded } =
    useUser();

  const boardSize = Math.min(
    width - 20,
    480,
  );

  const cell =
    boardSize / 15;

  /* =======================================================
     STATE
     ======================================================= */

  const [
    tokens,
    setTokens,
  ] = useState<Token[]>(
    createTokens(),
  );

  const [
    player,
    setPlayer,
  ] = useState<Player>("red");

  const [
    playerCount,
    setPlayerCount,
  ] = useState<PlayerCount>(2);

  const [
    soundOn,
    setSoundOn,
  ] = useState(true);

  const [
    diceValues,
    setDiceValues,
  ] = useState<
    Record<Player, number | null>
  >({
    red: null,
    green: null,
    yellow: null,
    blue: null,
  });

  const [
    rolled,
    setRolled,
  ] = useState(false);

  const [
    diceRolling,
    setDiceRolling,
  ] = useState(false);

  const [
    movingToken,
    setMovingToken,
  ] = useState<string | null>(
    null,
  );

  const [
    finishOrder,
    setFinishOrder,
  ] = useState<Player[]>([]);

  const [
    sixCount,
    setSixCount,
  ] = useState(0);

  /*
   * IMPORTANT:
   * Keep the latest values in refs too.
   * This prevents the 3-six rule from
   * using stale React state.
   */

  const playerRef =
    useRef<Player>(player);

  const tokensRef =
    useRef<Token[]>(tokens);

  const finishOrderRef =
    useRef<Player[]>(finishOrder);

  const sixCountRef =
    useRef<number>(sixCount);

  const soundOnRef =
    useRef<boolean>(soundOn);

  const diceRollingRef =
    useRef<boolean>(diceRolling);

  const rolledRef =
    useRef<boolean>(rolled);

  useEffect(() => {
    playerRef.current =
      player;
  }, [player]);

  useEffect(() => {
    tokensRef.current =
      tokens;
  }, [tokens]);

  useEffect(() => {
    finishOrderRef.current =
      finishOrder;
  }, [finishOrder]);

  useEffect(() => {
    sixCountRef.current =
      sixCount;
  }, [sixCount]);

  useEffect(() => {
    soundOnRef.current =
      soundOn;
  }, [soundOn]);

  useEffect(() => {
    diceRollingRef.current =
      diceRolling;
  }, [diceRolling]);

  useEffect(() => {
    rolledRef.current =
      rolled;
  }, [rolled]);

  /* =======================================================
     AUDIO PLAYERS
     ======================================================= */

  const diceRollAudio =
    useAudioPlayer(
      SOUND_URLS.diceRoll,
      {
        downloadFirst: true,
      },
    );

  const diceResultAudio =
    useAudioPlayer(
      SOUND_URLS.diceResult,
      {
        downloadFirst: true,
      },
    );

  const stepAudio =
    useAudioPlayer(
      SOUND_URLS.step,
      {
        downloadFirst: true,
      },
    );

  const captureAudio =
    useAudioPlayer(
      SOUND_URLS.capture,
      {
        downloadFirst: true,
      },
    );

  const starAudio =
    useAudioPlayer(
      SOUND_URLS.star,
      {
        downloadFirst: true,
      },
    );

  const winAudio =
    useAudioPlayer(
      SOUND_URLS.win,
      {
        downloadFirst: true,
      },
    );

  const soundTimeouts =
    useRef<
      ReturnType<
        typeof setTimeout
      >[]
    >([]);

  /* =======================================================
     AUDIO MODE
     NO SOUND IS PLAYED HERE
     ======================================================= */

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode:
        "mixWithOthers",
    }).catch(() => {});

    return () => {
      soundTimeouts.current.forEach(
        (timer) =>
          clearTimeout(timer),
      );

      try {
        diceRollAudio.pause();
      } catch {}

      try {
        diceResultAudio.pause();
      } catch {}

      try {
        stepAudio.pause();
      } catch {}

      try {
        captureAudio.pause();
      } catch {}

      try {
        starAudio.pause();
      } catch {}

      try {
        winAudio.pause();
      } catch {}
    };
  }, []);

  /* =======================================================
     STOP AUDIO
     ======================================================= */

  function stopAudio(
    audioPlayer: any,
  ) {
    try {
      audioPlayer?.pause();
    } catch {}
  }

  /* =======================================================
     PLAY 1 SECOND SPECIAL SOUND

     The sound starts immediately.
     No long await before play().
     ======================================================= */

  function playOneSecondSound(
    audioPlayer: any,
  ) {
    if (
      !soundOnRef.current ||
      !audioPlayer
    ) {
      return;
    }

    try {
      audioPlayer.pause();

      void audioPlayer
        .seekTo(0)
        .catch(() => {});

      audioPlayer.play();

      const timer =
        setTimeout(() => {
          try {
            audioPlayer.pause();
          } catch {}
        }, 1000);

      soundTimeouts.current.push(
        timer,
      );
    } catch {}
  }

  /* =======================================================
     STEP SOUND

     VERY IMPORTANT:
     This function is called immediately
     AFTER EVERY SINGLE CELL STEP.

     Example for 3:
     step 1 -> sound
     step 2 -> sound
     step 3 -> sound
     ======================================================= */

  function playStepSound() {
    if (
      !soundOnRef.current ||
      !stepAudio
    ) {
      return;
    }

    try {
      stepAudio.pause();

      /*
       * Start immediately.
       * We do NOT await seekTo().
       */
      void stepAudio
        .seekTo(0)
        .catch(() => {});

      stepAudio.play();

      try {
        Vibration.vibrate(12);
      } catch {}
    } catch {}
  }

  /* =======================================================
     DICE ROLLING SOUND
     ======================================================= */

  function startDiceRollingSound() {
    if (
      !soundOnRef.current
    ) {
      return;
    }

    try {
      diceRollAudio.pause();

      void diceRollAudio
        .seekTo(0)
        .catch(() => {});

      diceRollAudio.play();
    } catch {}
  }

  /* =======================================================
     STOP DICE ROLLING SOUND
     ======================================================= */

  function stopDiceRollingSound() {
    try {
      diceRollAudio.pause();
    } catch {}
  }

  /* =======================================================
     DICE RESULT
     ======================================================= */

  function playDiceResultSound() {
    if (
      !soundOnRef.current
    ) {
      return;
    }

    playOneSecondSound(
      diceResultAudio,
    );

    try {
      Vibration.vibrate(45);
    } catch {}
  }

  /* =======================================================
     CAPTURE
     ======================================================= */

  function playCaptureSound() {
    if (
      !soundOnRef.current
    ) {
      return;
    }

    playOneSecondSound(
      captureAudio,
    );

    try {
      Vibration.vibrate([
        0,
        70,
      ]);
    } catch {}
  }

  /* =======================================================
     STAR
     ======================================================= */

  function playStarSound() {
    if (
      !soundOnRef.current
    ) {
      return;
    }

    playOneSecondSound(
      starAudio,
    );
  }

  /* =======================================================
     WIN / HOME SOUND

     Every token entering home gets
     this sound separately.

     Token 1 -> sound
     Token 2 -> sound
     Token 3 -> sound
     Token 4 -> sound
     ======================================================= */

  function playWinSound() {
    if (
      !soundOnRef.current
    ) {
      return;
    }

    playOneSecondSound(
      winAudio,
    );

    try {
      Vibration.vibrate([
        0,
        50,
        40,
        70,
      ]);
    } catch {}
  }

  /* =======================================================
     STOP ALL
     ======================================================= */

  function stopAllSounds() {
    stopAudio(diceRollAudio);
    stopAudio(diceResultAudio);
    stopAudio(stepAudio);
    stopAudio(captureAudio);
    stopAudio(starAudio);
    stopAudio(winAudio);

    soundTimeouts.current.forEach(
      (timer) =>
        clearTimeout(timer),
    );

    soundTimeouts.current = [];
  }

  /* =======================================================
     ACTIVE PLAYERS
     ======================================================= */

  const activePlayers =
    PLAYER_SETS[playerCount];

  const currentDice =
    diceValues[player];

  const currentTokens =
    useMemo(
      () =>
        tokens.filter(
          (token) =>
            token.player ===
            player,
        ),
      [tokens, player],
    );

  /* =======================================================
     GAME FINISHED
     ======================================================= */

  const gameFinished =
    finishOrder.length >=
    Math.max(
      1,
      activePlayers.length - 1,
    );

  /* =======================================================
     PLAYER NAME
     ======================================================= */

  const realName =
    isLoaded &&
    user?.firstName?.trim()
      ? user.firstName.trim()
      : "";

  /* =======================================================
     PLAYER FINISHED
     ======================================================= */

  function isPlayerFinished(
    p: Player,
    list: Token[],
  ) {
    const playerTokens =
      list.filter(
        (token) =>
          token.player === p,
      );

    return (
      playerTokens.length ===
        4 &&
      playerTokens.every(
        (token) =>
          token.progress ===
          57,
      )
    );
  }

  /* =======================================================
     NEXT PLAYER
     ======================================================= */

  function getNextPlayer(
    from: Player,
    list: Token[],
    order: Player[],
  ): Player {
    const active =
      PLAYER_SETS[playerCount];

    const start =
      active.indexOf(from);

    if (start === -1) {
      return active[0];
    }

    for (
      let step = 1;
      step <= active.length;
      step++
    ) {
      const next =
        active[
          (start + step) %
            active.length
        ];

      if (
        !order.includes(next) &&
        !isPlayerFinished(
          next,
          list,
        )
      ) {
        return next;
      }
    }

    return from;
  }

  /* =======================================================
     CHANGE PLAYER

     This is used for normal turn change.
     ======================================================= */

  function changePlayer(
    from: Player,
    list: Token[],
    order: Player[],
  ) {
    const next =
      getNextPlayer(
        from,
        list,
        order,
      );

    playerRef.current =
      next;

    sixCountRef.current =
      0;

    rolledRef.current =
      false;

    setPlayer(next);
    setRolled(false);
    setSixCount(0);

    setDiceValues(
      (old) => ({
        ...old,
        [from]: null,
        [next]: null,
      }),
    );
  }

  /* =======================================================
     FORCE NEXT PLAYER

     Specifically used by 3 SIXES.

     It does NOT wait.
     It immediately gives turn
     to the next player.
     ======================================================= */

  function forceNextPlayerAfterThreeSixes(
    from: Player,
    list: Token[],
    order: Player[],
  ) {
    const next =
      getNextPlayer(
        from,
        list,
        order,
      );

    stopDiceRollingSound();

    playerRef.current =
      next;

    sixCountRef.current =
      0;

    rolledRef.current =
      false;

    diceRollingRef.current =
      false;

    setDiceRolling(false);
    setRolled(false);
    setSixCount(0);

    setDiceValues(
      (old) => ({
        ...old,
        [from]: null,
        [next]: null,
      }),
    );

    /*
     * IMPORTANT:
     * No wait here.
     * The next player gets the turn immediately.
     */
    setPlayer(next);
  }

  /* =======================================================
     CAN MOVE
     ======================================================= */

  function canMove(
    token: Token,
    value: number,
  ) {
    if (
      token.progress ===
      57
    ) {
      return false;
    }

    if (
      token.progress ===
      -1
    ) {
      return value === 6;
    }

    return (
      token.progress +
        value <=
      57
    );
  }

  /* =======================================================
     BLOCK + CAPTURE

     RULE:

     0 opponent tokens
       -> normal

     1 opponent token
       -> CAPTURE it

     2 or more opponent tokens
       -> BLOCK
       -> NO capture

     IMPORTANT:
     The block stays until one opponent
     token leaves.

     Example:
     Opponent A + Opponent B
       = BLOCK

     Opponent A leaves
     Opponent B remains
       = only one token

     Next enemy landing
       = B can be captured
     ======================================================= */

  function captureAtPosition(
    movingPlayer: Player,
    movedToken: Token,
    list: Token[],
  ) {
    const globalIndex =
      getGlobalIndex(
        movedToken,
      );

    if (
      globalIndex === null
    ) {
      return {
        list,
        captured: false,
        blocked: false,
      };
    }

    const safe =
      SAFE_INDEXES.includes(
        globalIndex,
      );

    if (safe) {
      return {
        list,
        captured: false,
        blocked: false,
      };
    }

    const opponents =
      list.filter(
        (token) =>
          token.player !==
            movingPlayer &&
          activePlayers.includes(
            token.player,
          ) &&
          token.progress >= 0 &&
          token.progress <= 50 &&
          getGlobalIndex(token) ===
            globalIndex,
      );

    /* No opponent */
    if (
      opponents.length === 0
    ) {
      return {
        list,
        captured: false,
        blocked: false,
      };
    }

    /*
     * TWO OR MORE OPPONENTS
     *
     * BLOCK.
     *
     * Nobody gets cut.
     */
    if (
      opponents.length >= 2
    ) {
      return {
        list,
        captured: false,
        blocked: true,
      };
    }

    /*
     * EXACTLY ONE OPPONENT
     *
     * Capture.
     */
    const tokenToCapture =
      opponents[0];

    const newList =
      list.map((token) => {
        if (
          token.player ===
            tokenToCapture.player &&
          token.id ===
            tokenToCapture.id
        ) {
          return {
            ...token,
            progress: -1,
          };
        }

        return token;
      });

    return {
      list: newList,
      captured: true,
      blocked: false,
    };
  }

  /* =======================================================
     STAR CHECK
     ======================================================= */

  function isStarPosition(
    token: Token,
  ) {
    const index =
      getGlobalIndex(token);

    if (index === null) {
      return false;
    }

    return STAR_INDEXES.includes(
      index,
    );
  }

  /* =======================================================
     ROLL DICE

     IMPORTANT 3-SIX FIX:
     sixCountRef is used so rapid consecutive
     rolls cannot use stale React state.

     On third six:
       - dice is cleared
       - rolling stops
       - six counter resets
       - current turn ends
       - next player gets turn immediately
     ======================================================= */

  async function rollDice(
    p: Player,
  ) {
    if (
      p !==
        playerRef.current ||
      rolledRef.current ||
      diceRollingRef.current ||
      movingToken !== null ||
      gameFinished
    ) {
      return;
    }

    diceRollingRef.current =
      true;

    rolledRef.current =
      false;

    setDiceRolling(true);
    setRolled(false);

    /* START ROLL SOUND */
    startDiceRollingSound();

    /* VISUAL DICE ROLL */
    for (
      let i = 0;
      i < 7;
      i++
    ) {
      const randomVisual =
        Math.floor(
          Math.random() * 6,
        ) + 1;

      setDiceValues(
        (old) => ({
          ...old,
          [p]: randomVisual,
        }),
      );

      await wait(85);
    }

    /* STOP ROLLING SOUND */
    stopDiceRollingSound();

    /* FINAL NUMBER */
    const value =
      Math.floor(
        Math.random() * 6,
      ) + 1;

    setDiceValues(
      (old) => ({
        ...old,
        [p]: value,
      }),
    );

    diceRollingRef.current =
      false;

    setDiceRolling(false);

    /* DICE RESULT SOUND */
    playDiceResultSound();

    /*
     * USE REF
     * instead of stale sixCount state.
     */
    const oldSixCount =
      sixCountRef.current;

    const nextSixCount =
      value === 6
        ? oldSixCount + 1
        : 0;

    sixCountRef.current =
      nextSixCount;

    /* =====================================================
       THREE SIXES
       ===================================================== */

    if (
      value === 6 &&
      nextSixCount >= 3
    ) {
      /*
       * Immediately end turn.
       *
       * It does not matter whether:
       * - token was still in yard
       * - token came out
       * - token was moving
       * - previous six was used
       *
       * Third consecutive six always
       * gives turn to next player.
       */

      forceNextPlayerAfterThreeSixes(
        p,
        tokensRef.current,
        finishOrderRef.current,
      );

      return;
    }

    setSixCount(
      nextSixCount,
    );

    setRolled(true);

    rolledRef.current =
      true;

    /*
     * Check legal move using
     * current tokens directly.
     */
    const playerTokensNow =
      tokensRef.current.filter(
        (token) =>
          token.player === p,
      );

    const possible =
      playerTokensNow.some(
        (token) =>
          canMove(
            token,
            value,
          ),
      );

    /* =====================================================
       NO LEGAL MOVE
       ===================================================== */

    if (!possible) {
      setTimeout(() => {
        /*
         * Ignore timeout if another
         * turn has already started.
         */
        if (
          playerRef.current !== p
        ) {
          return;
        }

        setRolled(false);
        rolledRef.current =
          false;

        setDiceValues(
          (old) => ({
            ...old,
            [p]: null,
          }),
        );

        /*
         * A normal 6 gives another
         * chance only when there is
         * a legal move.
         *
         * If no legal move, pass turn.
         */
        if (value === 6) {
          setSixCount(0);
          sixCountRef.current =
            0;

          changePlayer(
            p,
            tokensRef.current,
            finishOrderRef.current,
          );

          return;
        }

        changePlayer(
          p,
          tokensRef.current,
          finishOrderRef.current,
        );
      }, 750);
    }
  }

  /* =======================================================
     MOVE TOKEN

     EVERY STEP:
       1. update position
       2. immediately play step sound
       3. wait 180ms
       4. next step

     So 3 steps = 3 sounds.
     ======================================================= */

  async function moveToken(
    tokenId: number,
  ) {
    if (
      !rolled ||
      currentDice === null ||
      movingToken !== null ||
      diceRolling ||
      gameFinished
    ) {
      return;
    }

    const selected =
      tokensRef.current.find(
        (token) =>
          token.player ===
            playerRef.current &&
          token.id === tokenId,
      );

    if (!selected) {
      return;
    }

    const value =
      currentDice;

    if (
      !canMove(
        selected,
        value,
      )
    ) {
      return;
    }

    const movingPlayer =
      playerRef.current;

    setMovingToken(
      `${movingPlayer}-${tokenId}`,
    );

    let working = [
      ...tokensRef.current,
    ];

    /* =====================================================
       YARD -> START
       ===================================================== */

    if (
      selected.progress ===
      -1
    ) {
      working =
        working.map(
          (token) =>
            token.player ===
                movingPlayer &&
              token.id === tokenId
              ? {
                  ...token,
                  progress: 0,
                }
              : token,
        );

      /*
       * IMMEDIATE STEP SOUND
       */
      playStepSound();

      const moved =
        working.find(
          (token) =>
            token.player ===
              movingPlayer &&
            token.id === tokenId,
        );

      if (moved) {
        /*
         * STAR
         */
        if (
          isStarPosition(
            moved,
          )
        ) {
          playStarSound();
        }

        /*
         * CAPTURE / BLOCK
         */
        const result =
          captureAtPosition(
            movingPlayer,
            moved,
            working,
          );

        working =
          result.list;

        /*
         * CAPTURE SOUND
         */
        if (
          result.captured
        ) {
          playCaptureSound();

          tokensRef.current =
            working;

          setTokens([
            ...working,
          ]);

          setMovingToken(
            null,
          );

          setRolled(false);
          rolledRef.current =
            false;

          setDiceValues(
            (old) => ({
              ...old,
              [movingPlayer]:
                null,
            }),
          );

          setSixCount(0);
          sixCountRef.current =
            0;

          return;
        }
      }

      tokensRef.current =
        working;

      setTokens([
        ...working,
      ]);

      await wait(180);

      setMovingToken(null);

      setRolled(false);
      rolledRef.current =
        false;

      setDiceValues(
        (old) => ({
          ...old,
          [movingPlayer]:
            null,
        }),
      );

      if (value === 6) {
        setSixCount(0);
        sixCountRef.current =
          0;

        return;
      }

      changePlayer(
        movingPlayer,
        working,
        finishOrderRef.current,
      );

      return;
    }

    /* =====================================================
       NORMAL STEP-BY-STEP MOVEMENT
       ===================================================== */

    const start =
      selected.progress;

    for (
      let step = 1;
      step <= value;
      step++
    ) {
      const progress =
        start + step;

      if (
        progress > 57
      ) {
        break;
      }

      working =
        working.map(
          (token) =>
            token.player ===
                movingPlayer &&
              token.id === tokenId
              ? {
                  ...token,
                  progress,
                }
              : token,
        );

      /*
       * UPDATE POSITION FIRST
       */
      tokensRef.current =
        working;

      setTokens([
        ...working,
      ]);

      /*
       * THEN IMMEDIATELY PLAY
       * THE STEP SOUND.
       *
       * This is the important
       * khat-khat-khat behavior.
       */
      playStepSound();

      /*
       * STAR SOUND
       * when passing/landing on star
       */
      const movingNow =
        working.find(
          (token) =>
            token.player ===
              movingPlayer &&
            token.id === tokenId,
        );

      if (
        movingNow &&
        isStarPosition(
          movingNow,
        )
      ) {
        playStarSound();
      }

      /*
       * Small delay before next cell.
       */
      if (
        step < value
      ) {
        await wait(180);
      }
    }

    /* =====================================================
       FINAL TOKEN
       ===================================================== */

    const finalToken =
      working.find(
        (token) =>
          token.player ===
            movingPlayer &&
          token.id === tokenId,
      );

    if (!finalToken) {
      setMovingToken(null);
      return;
    }

    const finalProgress =
      finalToken.progress;

    let captured = false;

    /* =====================================================
       FINAL STAR
       ===================================================== */

    if (
      isStarPosition(
        finalToken,
      )
    ) {
      playStarSound();
    }

    /* =====================================================
       CAPTURE / BLOCK
       ===================================================== */

    if (
      finalProgress >= 0 &&
      finalProgress <= 50
    ) {
      const result =
        captureAtPosition(
          movingPlayer,
          finalToken,
          working,
        );

      working =
        result.list;

      captured =
        result.captured;

      /*
       * CAPTURE SOUND ONLY
       * if exactly one opponent
       * was captured.
       *
       * If 2 opponents are there:
       * BLOCK = no capture sound.
       */
      if (captured) {
        playCaptureSound();
      }
    }

    tokensRef.current =
      working;

    setTokens([
      ...working,
    ]);

    /* =====================================================
       TOKEN ENTERED HOME

       VERY IMPORTANT:
       Every token reaching progress 57
       gets winning sound.

       It does NOT wait for all 4.
       ===================================================== */

    const reachedHome =
      finalProgress === 57;

    if (reachedHome) {
      playWinSound();
    }

    /* =====================================================
       CHECK PLAYER FINISHED
       ===================================================== */

    const playerTokens =
      working.filter(
        (token) =>
          token.player ===
          movingPlayer,
      );

    const finished =
      playerTokens.length === 4 &&
      playerTokens.every(
        (token) =>
          token.progress ===
          57,
      );

    if (finished) {
      const oldOrder =
        finishOrderRef.current;

      const newOrder =
        oldOrder.includes(
          movingPlayer,
        )
          ? oldOrder
          : [
              ...oldOrder,
              movingPlayer,
            ];

      finishOrderRef.current =
        newOrder;

      setFinishOrder(
        newOrder,
      );

      setMovingToken(
        null,
      );

      setRolled(false);
      rolledRef.current =
        false;

      setSixCount(0);
      sixCountRef.current =
        0;

      setDiceValues(
        (old) => ({
          ...old,
          [movingPlayer]:
            null,
        }),
      );

      /*
       * NOTE:
       * The HOME sound was already
       * played above for this token.
       *
       * No extra duplicate winning
       * sound is played here.
       */

      if (
        newOrder.length <
        Math.max(
          1,
          activePlayers.length -
            1,
        )
      ) {
        const next =
          getNextPlayer(
            movingPlayer,
            working,
            newOrder,
          );

        playerRef.current =
          next;

        setTimeout(() => {
          setPlayer(next);
        }, 250);
      }

      return;
    }

    setMovingToken(null);

    /* =====================================================
       HOME EXTRA TURN
       ===================================================== */

    if (
      finalProgress === 57
    ) {
      setRolled(false);
      rolledRef.current =
        false;

      setDiceValues(
        (old) => ({
          ...old,
          [movingPlayer]:
            null,
        }),
      );

      setSixCount(0);
      sixCountRef.current =
        0;

      /*
       * Same player gets another turn.
       */
      return;
    }

    /* =====================================================
       CAPTURE EXTRA TURN
       ===================================================== */

    if (captured) {
      setRolled(false);
      rolledRef.current =
        false;

      setDiceValues(
        (old) => ({
          ...old,
          [movingPlayer]:
            null,
        }),
      );

      setSixCount(0);
      sixCountRef.current =
        0;

      /*
       * Same player continues.
       */
      return;
    }

    /* =====================================================
       SIX EXTRA TURN
       ===================================================== */

    if (
      value === 6
    ) {
      setRolled(false);
      rolledRef.current =
        false;

      setDiceValues(
        (old) => ({
          ...old,
          [movingPlayer]:
            null,
        }),
      );

      /*
       * IMPORTANT:
       * sixCount is NOT reset here.
       *
       * So:
       * 6 -> 6 -> 6
       *
       * is correctly counted.
       */
      return;
    }

    /* =====================================================
       NORMAL TURN
       ===================================================== */

    changePlayer(
      movingPlayer,
      working,
      finishOrderRef.current,
    );
  }

  /* =======================================================
     RESET
     ======================================================= */

  function resetGame() {
    stopAllSounds();

    const first =
      PLAYER_SETS[
        playerCount
      ][0];

    const freshTokens =
      createTokens();

    tokensRef.current =
      freshTokens;

    playerRef.current =
      first;

    finishOrderRef.current =
      [];

    sixCountRef.current =
      0;

    rolledRef.current =
      false;

    diceRollingRef.current =
      false;

    setTokens(
      freshTokens,
    );

    setPlayer(first);

    setDiceValues({
      red: null,
      green: null,
      yellow: null,
      blue: null,
    });

    setRolled(false);
    setDiceRolling(false);
    setMovingToken(null);
    setFinishOrder([]);
    setSixCount(0);
  }

  /* =======================================================
     PLAYER COUNT
     ======================================================= */

  function changePlayerCount(
    count: PlayerCount,
  ) {
    stopAllSounds();

    const first =
      PLAYER_SETS[count][0];

    const freshTokens =
      createTokens();

    tokensRef.current =
      freshTokens;

    playerRef.current =
      first;

    finishOrderRef.current =
      [];

    sixCountRef.current =
      0;

    rolledRef.current =
      false;

    diceRollingRef.current =
      false;

    setPlayerCount(
      count,
    );

    setPlayer(first);

    setTokens(
      freshTokens,
    );

    setDiceValues({
      red: null,
      green: null,
      yellow: null,
      blue: null,
    });

    setRolled(false);
    setDiceRolling(false);
    setMovingToken(null);
    setFinishOrder([]);
    setSixCount(0);
  }

  /* =======================================================
     SOUND TOGGLE
     ======================================================= */

  function toggleSound() {
    setSoundOn(
      (value) => {
        const next =
          !value;

        soundOnRef.current =
          next;

        if (!next) {
          stopAllSounds();
        }

        return next;
      },
    );
  }

  /* =======================================================
     DRAW CELL
     ======================================================= */

  function drawCell(
    row: number,
    col: number,
  ) {
    let background =
      "#FFFFFF";

    const pathIndex =
      PATH.findIndex(
        ([r, c]) =>
          r === row &&
          c === col,
      );

    if (
      row <= 5 &&
      col <= 5
    ) {
      background =
        COLORS.red.light;
    }

    if (
      row <= 5 &&
      col >= 9
    ) {
      background =
        COLORS.green.light;
    }

    if (
      row >= 9 &&
      col <= 5
    ) {
      background =
        COLORS.blue.light;
    }

    if (
      row >= 9 &&
      col >= 9
    ) {
      background =
        COLORS.yellow.light;
    }

    if (pathIndex >= 0) {
      background =
        "#FFFFFF";
    }

    if (
      row === 7 &&
      col >= 0 &&
      col <= 5
    ) {
      background =
        COLORS.red.light;
    }

    if (
      col === 7 &&
      row >= 0 &&
      row <= 5
    ) {
      background =
        COLORS.green.light;
    }

    if (
      row === 7 &&
      col >= 9 &&
      col <= 14
    ) {
      background =
        COLORS.yellow.light;
    }

    if (
      col === 7 &&
      row >= 9 &&
      row <= 14
    ) {
      background =
        COLORS.blue.light;
    }

    if (
      row >= 6 &&
      row <= 8 &&
      col >= 6 &&
      col <= 8
    ) {
      background =
        "#FFFFFF";
    }

    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.cell,
          {
            width: cell,
            height: cell,
            left:
              col * cell,
            top:
              row * cell,
            backgroundColor:
              background,
          },
        ]}
      />
    );
  }

  /* =======================================================
     HOME
     ======================================================= */

  function drawHome(
    p: Player,
  ) {
    const color =
      COLORS[p];

    const position =
      p === "red"
        ? {
            left: 0,
            top: 0,
          }
        : p === "green"
          ? {
              right: 0,
              top: 0,
            }
          : p === "blue"
            ? {
                left: 0,
                bottom: 0,
              }
            : {
                right: 0,
                bottom: 0,
              };

    return (
      <View
        key={`home-${p}`}
        pointerEvents="none"
        style={[
          styles.home,
          position,
          {
            width:
              cell * 6,
            height:
              cell * 6,
            backgroundColor:
              color.light,
            borderColor:
              color.main,
          },
        ]}
      >
        <View
          style={[
            styles.homeInner,
            {
              borderColor:
                color.main,
              width:
                cell * 4.25,
              height:
                cell * 4.25,
            },
          ]}
        />

        <Text
          style={[
            styles.homeLabel,
            {
              color:
                color.dark,
            },
          ]}
        >
          {p.toUpperCase()}
        </Text>
      </View>
    );
  }

  /* =======================================================
     OUTSIDE DICE
     ======================================================= */

  function outsideDice(
    p: Player,
  ) {
    const active =
      player === p;

    const isActivePlayer =
      activePlayers.includes(
        p,
      );

    const diceCanRoll =
      active &&
      isActivePlayer &&
      !rolled &&
      !diceRolling &&
      movingToken === null &&
      !gameFinished;

    return (
      <View
        key={`outside-dice-${p}`}
        style={[
          styles.outsideDiceItem,
          {
            opacity:
              isActivePlayer
                ? 1
                : 0.35,
          },
        ]}
      >
        <View
          style={[
            styles.dicePlayerDot,
            {
              backgroundColor:
                COLORS[p].main,
            },
          ]}
        />

        <Dice
          value={
            diceValues[p]
          }
          size={Math.max(
            34,
            cell * 1.05,
          )}
          onPress={() =>
            rollDice(p)
          }
          disabled={
            !diceCanRoll
          }
          active={active}
          color={
            COLORS[p].main
          }
          rolling={
            active &&
            diceRolling
          }
        />
      </View>
    );
  }

  /* =======================================================
     STARS
     ======================================================= */

  function drawStars() {
    return STAR_INDEXES.map(
      (index) => {
        const [
          row,
          col,
        ] = PATH[index];

        const color =
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
              {
                width: cell,
                height: cell,
                left:
                  col * cell,
                top:
                  row * cell,
              },
            ]}
          >
            <Text
              style={[
                styles.star,
                {
                  color,
                  fontSize:
                    cell * 0.62,
                },
              ]}
            >
              ★
            </Text>
          </View>
        );
      },
    );
  }

  /* =======================================================
     CENTER
     ======================================================= */

  function drawCenter() {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.center,
          {
            width:
              cell * 3,
            height:
              cell * 3,
            left:
              cell * 6,
            top:
              cell * 6,
          },
        ]}
      >
        <View
          style={[
            styles.centerPart,
            {
              backgroundColor:
                COLORS.red.main,
              left: 0,
              top: 0,
            },
          ]}
        />

        <View
          style={[
            styles.centerPart,
            {
              backgroundColor:
                COLORS.green.main,
              right: 0,
              top: 0,
            },
          ]}
        />

        <View
          style={[
            styles.centerPart,
            {
              backgroundColor:
                COLORS.blue.main,
              left: 0,
              bottom: 0,
            },
          ]}
        />

        <View
          style={[
            styles.centerPart,
            {
              backgroundColor:
                COLORS.yellow.main,
              right: 0,
              bottom: 0,
            },
          ]}
        />

        <View
          style={
            styles.centerCircle
          }
        >
          <Text
            style={
              styles.centerText
            }
          >
            LUDO
          </Text>
        </View>
      </View>
    );
  }

  /* =======================================================
     TOKEN
     ======================================================= */

  function drawToken(
    token: Token,
  ) {
    if (
      !activePlayers.includes(
        token.player,
      )
    ) {
      return null;
    }

    const [
      row,
      col,
    ] =
      getTokenPosition(token);

    const color =
      COLORS[token.player];

    const tokenSize =
      Math.max(
        cell * 0.72,
        22,
      );

    const globalIndex =
      getGlobalIndex(token);

    let offsetX = 0;
    let offsetY = 0;

    if (
      globalIndex !== null
    ) {
      const stack =
        tokens.filter(
          (t) =>
            activePlayers.includes(
              t.player,
            ) &&
            getGlobalIndex(t) ===
              globalIndex,
        );

      const stackIndex =
        stack.findIndex(
          (t) =>
            t.player ===
              token.player &&
            t.id === token.id,
        );

      const offsets = [
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18],
      ];

      [
        offsetX,
        offsetY,
      ] =
        offsets[
          Math.max(
            0,
            stackIndex,
          ) % 4
        ];
    } else if (
      token.progress ===
      -1
    ) {
      const offsets = [
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ];

      [
        offsetX,
        offsetY,
      ] =
        offsets[token.id];
    }

    const left =
      col * cell +
      cell / 2 -
      tokenSize / 2 +
      offsetX * cell;

    const top =
      row * cell +
      cell / 2 -
      tokenSize / 2 +
      offsetY * cell;

    const selectable =
      rolled &&
      currentDice !== null &&
      movingToken === null &&
      !diceRolling &&
      token.player ===
        player &&
      canMove(
        token,
        currentDice,
      );

    return (
      <Pressable
        key={`${token.player}-${token.id}`}
        onPress={() =>
          moveToken(
            token.id,
          )
        }
        disabled={!selectable}
        style={[
          styles.pawn,
          {
            width:
              tokenSize,
            height:
              tokenSize,
            left,
            top,
            zIndex:
              selectable
                ? 500
                : 200,
          },
        ]}
      >
        {selectable && (
          <View
            style={[
              styles.pawnGlow,
              {
                width:
                  tokenSize *
                  1.2,
                height:
                  tokenSize *
                  1.2,
                borderRadius:
                  tokenSize *
                  0.6,
                borderColor:
                  color.main,
              },
            ]}
          />
        )}

        <View
          style={[
            styles.pawnBody,
            {
              width:
                tokenSize *
                0.72,
              height:
                tokenSize *
                0.72,
              borderRadius:
                tokenSize *
                0.36,
              backgroundColor:
                color.main,
              borderColor:
                color.dark,
            },
          ]}
        >
          <View
            style={[
              styles.pawnShine,
              {
                width:
                  tokenSize *
                  0.18,
                height:
                  tokenSize *
                  0.18,
                borderRadius:
                  tokenSize *
                  0.09,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.pawnBase,
            {
              width:
                tokenSize *
                0.82,
              height:
                tokenSize *
                0.28,
              borderRadius:
                tokenSize *
                0.14,
              backgroundColor:
                color.dark,
              borderColor:
                color.main,
            },
          ]}
        />
      </Pressable>
    );
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}

        <View
          style={styles.header}
        >
          <View>
            <Text
              style={
                styles.brand
              }
            >
              GAMEZONE ARENA
            </Text>

            <Text
              style={
                styles.title
              }
            >
              LUDO
            </Text>

            <Text
              style={
                styles.humanOnly
              }
            >
              HUMAN MULTIPLAYER • NO COMPUTER
            </Text>
          </View>

          <View
            style={
              styles.headerButtons
            }
          >
            <Pressable
              onPress={
                toggleSound
              }
              style={
                styles.soundButton
              }
            >
              <Text
                style={
                  styles.soundIcon
                }
              >
                {soundOn
                  ? "🔊"
                  : "🔇"}
              </Text>

              <Text
                style={
                  styles.soundText
                }
              >
                {soundOn
                  ? "ON"
                  : "OFF"}
              </Text>
            </Pressable>

            <Pressable
              onPress={
                resetGame
              }
              style={
                styles.reset
              }
            >
              <Text
                style={
                  styles.resetText
                }
              >
                RESET
              </Text>
            </Pressable>
          </View>
        </View>

        {/* PLAYER COUNT */}

        <View
          style={
            styles.playerCountBox
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            HUMAN PLAYERS
          </Text>

          <View
            style={
              styles.playerCountRow
            }
          >
            {[2, 3, 4].map(
              (count) => {
                const selected =
                  playerCount ===
                  count;

                return (
                  <Pressable
                    key={count}
                    onPress={() =>
                      changePlayerCount(
                        count as PlayerCount,
                      )
                    }
                    style={[
                      styles.playerCountButton,
                      {
                        backgroundColor:
                          selected
                            ? "#18B85A"
                            : "#11182B",
                        borderColor:
                          selected
                            ? "#18B85A"
                            : "#293A5C",
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.playerCountNumber
                      }
                    >
                      {count}
                    </Text>

                    <Text
                      style={
                        styles.playerCountText
                      }
                    >
                      PLAYERS
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>

          <Text
            style={
              styles.statusText
            }
          >
            {playerCount === 2
              ? "🔴 RED  VS  🟡 YELLOW"
              : playerCount === 3
                ? "🔴 RED  •  🟢 GREEN  •  🟡 YELLOW"
                : "🔴 RED  •  🟢 GREEN  •  🟡 YELLOW  •  🔵 BLUE"}
          </Text>
        </View>

        {/* BOARD */}

        <View
          style={[
            styles.boardStage,
            {
              width:
                boardSize + 30,
            },
          ]}
        >
          {/* TOP DICE */}

          <View
            style={[
              styles.diceOutsideRow,
              {
                width:
                  boardSize,
              },
            ]}
          >
            {outsideDice(
              "red",
            )}

            {outsideDice(
              "green",
            )}
          </View>

          {/* BOARD */}

          <View
            style={[
              styles.boardOuter,
              {
                width:
                  boardSize + 14,
              },
            ]}
          >
            <View
              style={[
                styles.board,
                {
                  width:
                    boardSize,
                  height:
                    boardSize,
                },
              ]}
            >
              {/* CELLS */}

              {Array.from({
                length: 15,
              }).flatMap(
                (_, row) =>
                  Array.from({
                    length: 15,
                  }).map(
                    (_, col) =>
                      drawCell(
                        row,
                        col,
                      ),
                  ),
              )}

              {/* HOMES */}

              {drawHome("red")}
              {drawHome("green")}
              {drawHome("blue")}
              {drawHome("yellow")}

              {/* STARS */}

              {drawStars()}

              {/* CENTER */}

              {drawCenter()}

              {/* TOKENS */}

              {tokens.map(
                drawToken,
              )}
            </View>
          </View>

          {/* BOTTOM DICE */}

          <View
            style={[
              styles.diceOutsideRow,
              {
                width:
                  boardSize,
              },
            ]}
          >
            {outsideDice(
              "blue",
            )}

            {outsideDice(
              "yellow",
            )}
          </View>
        </View>

        {/* RANKING */}

        {finishOrder.length >
          0 && (
          <View
            style={
              styles.ranking
            }
          >
            <Text
              style={
                styles.rankingTitle
              }
            >
              WINNER RANKING
            </Text>

            {finishOrder.map(
              (p, index) => (
                <View
                  key={p}
                  style={
                    styles.rankRow
                  }
                >
                  <View
                    style={[
                      styles.rankNumber,
                      {
                        backgroundColor:
                          COLORS[p]
                            .main,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.rankNumberText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.rankInfo
                    }
                  >
                    <Text
                      style={[
                        styles.rankName,
                        {
                          color:
                            COLORS[p]
                              .main,
                        },
                      ]}
                    >
                      {p ===
                        "red" &&
                      realName
                        ? realName
                        : p.toUpperCase()}
                    </Text>

                    <Text
                      style={
                        styles.rankSub
                      }
                    >
                      {p.toUpperCase()} • ALL 4 TOKENS HOME
                    </Text>
                  </View>
                </View>
              ),
            )}
          </View>
        )}

        {/* GAME COMPLETE */}

        {gameFinished && (
          <View
            style={
              styles.gameOver
            }
          >
            <Text
              style={
                styles.gameOverTitle
              }
            >
              GAME COMPLETE
            </Text>

            <Text
              style={
                styles.gameOverText
              }
            >
              Human player ranking complete.
            </Text>

            <Pressable
              onPress={
                resetGame
              }
              style={
                styles.playAgain
              }
            >
              <Text
                style={
                  styles.playAgainText
                }
              >
                PLAY AGAIN
              </Text>
            </Pressable>
          </View>
        )}

        {/* FOOTER */}

        <View
          style={
            styles.footer
          }
        >
          <Text
            style={
              styles.footerText
            }
          >
            GAMEZONE ARENA • LUDO
          </Text>

          <Text
            style={
              styles.footerSub
            }
          >
            2–4 HUMAN PLAYERS • NO AI
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        "#050A17",
    },

    content: {
      paddingHorizontal: 10,
      paddingTop: 12,
      paddingBottom: 45,
    },

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 10,
    },

    headerButtons: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
    },

    brand: {
      color: "#43DDF8",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 2,
    },

    title: {
      color: "#FFFFFF",
      fontSize: 34,
      fontWeight: "900",
    },

    humanOnly: {
      color: "#18B85A",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 2,
    },

    soundButton: {
      height: 38,
      minWidth: 58,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor:
        "#18B85A",
      backgroundColor:
        "#111C34",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 4,
    },

    soundIcon: {
      fontSize: 16,
    },

    soundText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "900",
    },

    reset: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor:
        "#111C34",
      borderWidth: 1.5,
      borderColor:
        "#2E4168",
    },

    resetText: {
      color: "#54DCF7",
      fontSize: 11,
      fontWeight: "900",
    },

    playerCountBox: {
      backgroundColor:
        "#0D1427",
      borderWidth: 1,
      borderColor:
        "#293A5C",
      borderRadius: 15,
      padding: 9,
      marginBottom: 12,
    },

    sectionTitle: {
      color: "#8FA1C2",
      fontSize: 8,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 7,
    },

    playerCountRow: {
      flexDirection:
        "row",
      gap: 7,
    },

    playerCountButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: 11,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    playerCountNumber: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "900",
    },

    playerCountText: {
      color: "#FFFFFF",
      fontSize: 7,
      fontWeight: "900",
    },

    statusText: {
      color: "#8FA1C2",
      fontSize: 8,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 7,
    },

    /* BOARD STAGE */

    boardStage: {
      alignSelf:
        "center",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    diceOutsideRow: {
      height: 72,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 12,
    },

    outsideDiceItem: {
      width: 78,
      height: 68,
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
    },

    dicePlayerDot: {
      position:
        "absolute",
      top: 2,
      width: 7,
      height: 7,
      borderRadius: 4,
      zIndex: 10,
    },

    /* BOARD */

    boardOuter: {
      alignSelf:
        "center",
      padding: 7,
      borderRadius: 24,
      backgroundColor:
        "#0D1427",
      borderWidth: 2,
      borderColor:
        "#334263",
    },

    board: {
      position:
        "relative",
      backgroundColor:
        "#FFFFFF",
      overflow:
        "hidden",
    },

    cell: {
      position:
        "absolute",
      borderWidth: 0.5,
      borderColor:
        "#AEB5C0",
    },

    /* HOMES */

    home: {
      position:
        "absolute",
      borderWidth: 5,
      alignItems:
        "center",
      justifyContent:
        "center",
      zIndex: 20,
    },

    homeLabel: {
      position:
        "absolute",
      bottom: 4,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },

    homeInner: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 4,
      borderRadius: 18,
    },

    /* STARS */

    starBox: {
      position:
        "absolute",
      alignItems:
        "center",
      justifyContent:
        "center",
      zIndex: 80,
    },

    star: {
      fontWeight:
        "900",
      textAlign:
        "center",
    },

    /* CENTER */

    center: {
      position:
        "absolute",
      overflow:
        "hidden",
      zIndex: 90,
      borderWidth: 2,
      borderColor:
        "#182238",
    },

    centerPart: {
      position:
        "absolute",
      width: "50%",
      height: "50%",
    },

    centerCircle: {
      position:
        "absolute",
      width: "50%",
      height: "50%",
      left: "25%",
      top: "25%",
      borderRadius: 100,
      backgroundColor:
        "#111827",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    centerText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
    },

    /* DICE */

    blueBolt: {
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 2,
      backgroundColor:
        "rgba(8,24,48,0.92)",
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      elevation: 8,
    },

    diceTouch: {
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    dice: {
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1.5,
      borderColor:
        "#D7DCE5",
      elevation: 8,
      shadowColor:
        "#000000",
      shadowOpacity: 0.35,
      shadowRadius: 4,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      overflow:
        "hidden",
    },

    diceRollingOverlay: {
      position:
        "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor:
        "rgba(255,255,255,0.55)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    diceRollingText: {
      color: "#111827",
      fontWeight: "900",
      letterSpacing: 2,
    },

    /* PAWN */

    pawn: {
      position:
        "absolute",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    pawnBody: {
      position:
        "absolute",
      top: "4%",
      borderWidth: 2,
      alignItems:
        "center",
      justifyContent:
        "flex-start",
      elevation: 8,
      shadowColor:
        "#000000",
      shadowOpacity: 0.35,
      shadowRadius: 3,
      shadowOffset: {
        width: 0,
        height: 2,
      },
    },

    pawnShine: {
      backgroundColor:
        "#FFFFFF",
      opacity: 0.75,
      position:
        "absolute",
      left: "20%",
      top: "15%",
    },

    pawnBase: {
      position:
        "absolute",
      bottom: "4%",
      borderWidth: 2,
    },

    pawnGlow: {
      position:
        "absolute",
      borderWidth: 2,
      opacity: 0.85,
    },

    /* RANKING */

    ranking: {
      marginTop: 14,
      backgroundColor:
        "#11182B",
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        "#344365",
      padding: 14,
    },

    rankingTitle: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 8,
    },

    rankRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        "#0A1122",
      borderRadius: 13,
      padding: 9,
      marginTop: 6,
    },

    rankNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    rankNumberText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
    },

    rankInfo: {
      flex: 1,
      marginLeft: 9,
    },

    rankName: {
      fontSize: 14,
      fontWeight: "900",
    },

    rankSub: {
      color: "#78839F",
      fontSize: 8,
      marginTop: 2,
    },

    /* GAME OVER */

    gameOver: {
      marginTop: 14,
      padding: 20,
      borderRadius: 20,
      backgroundColor:
        "#11182B",
      borderWidth: 2,
      borderColor:
        "#F5C518",
      alignItems:
        "center",
    },

    gameOverTitle: {
      color: "#F5C518",
      fontSize: 21,
      fontWeight: "900",
    },

    gameOverText: {
      color: "#AAB5CB",
      marginTop: 5,
      textAlign:
        "center",
    },

    playAgain: {
      marginTop: 13,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 13,
      backgroundColor:
        "#F5C518",
    },

    playAgainText: {
      color: "#111827",
      fontWeight: "900",
    },

    /* FOOTER */

    footer: {
      marginTop: 18,
      alignItems:
        "center",
    },

    footerText: {
      color: "#43DDF8",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
    },

    footerSub: {
      color: "#52617D",
      fontSize: 7,
      fontWeight: "800",
      marginTop: 3,
    },
  });