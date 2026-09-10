export const appConfig = {
  name: 'GAMEZONE ARENA',
  tagline: 'Play sharp. Rise fast.',
  legalNotice: 'Virtual coins have no monetary value and cannot be withdrawn.',
  apiBasePath: '/api',
  levels: [
    { level: 1, xp: 0 },
    { level: 2, xp: 100 },
    { level: 3, xp: 250 },
    { level: 4, xp: 450 },
    { level: 5, xp: 700 },
  ],
} as const;

export const LUDO_MATCH_REWARD = {
  xp: 100,
  coins: 50,
} as const;

export const games = [
  {
    id: 'quick-quiz',
    title: 'Quick Quiz',
    category: 'Quiz',
    description: 'Think fast across a rotating mix of topics.',
    difficulty: 'Medium',
    reward: '+120 XP',
    color: '#5DE6FF',
    icon: 'help-circle' as const,
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    category: 'Memory',
    description: 'Flip, focus, and clear the board in fewer moves.',
    difficulty: 'Easy',
    reward: '+90 XP',
    color: '#C66BFF',
    icon: 'layers' as const,
  },
  {
    id: 'reaction-test',
    title: 'Reaction Test',
    category: 'Reaction',
    description: 'Beat the light. Chase a new personal best.',
    difficulty: 'Hard',
    reward: '+150 XP',
    color: '#FFB45E',
    icon: 'zap' as const,
  },
  {
    id: 'math-rush',
    title: 'Math Rush',
    category: 'Math',
    description: 'Stack combos before the clock burns out.',
    difficulty: 'Medium',
    reward: '+130 XP',
    color: '#7CF2B2',
    icon: 'divide-circle' as const,
  },
  {
    id: 'word-challenge',
    title: 'Word Challenge',
    category: 'Puzzle',
    description: 'Build words, spot patterns, and keep your streak alive.',
    difficulty: 'Medium',
    reward: '+110 XP',
    color: '#FF7AB6',
    icon: 'type' as const,
  },
  {
    id: 'ludo',
    title: 'Ludo',
    category: 'Puzzle',
    description: 'Roll the dice, move your tokens, and race to victory.',
    difficulty: 'Medium',
    reward: '+100 XP',
    color: '#FF5A5F',
    icon: 'target' as const,
  },
] as const;

export type Game = (typeof games)[number];