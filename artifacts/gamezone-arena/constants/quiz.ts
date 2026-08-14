export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
};

export type QuizReward = {
  xp: number;
  coins: number;
};

export const quickQuizQuestions: QuizQuestion[] = [
  {
    id: 'quiz-1',
    question: 'Which planet has the shortest day in our solar system?',
    options: ['Mars', 'Jupiter', 'Mercury', 'Venus'],
    correctIndex: 1,
    category: 'Science',
  },
  {
    id: 'quiz-2',
    question: 'What is the only mammal capable of true flight?',
    options: ['Flying squirrel', 'Albatross', 'Bat', 'Sugar glider'],
    correctIndex: 2,
    category: 'Nature',
  },
  {
    id: 'quiz-3',
    question: 'In chess, which piece can only move diagonally?',
    options: ['Bishop', 'Knight', 'Rook', 'Queen'],
    correctIndex: 0,
    category: 'Games',
  },
  {
    id: 'quiz-4',
    question: 'How many sides does a dodecagon have?',
    options: ['8', '10', '12', '14'],
    correctIndex: 2,
    category: 'Logic',
  },
  {
    id: 'quiz-5',
    question: 'Which gas do plants absorb from the atmosphere?',
    options: ['Oxygen', 'Nitrogen', 'Hydrogen', 'Carbon dioxide'],
    correctIndex: 3,
    category: 'Science',
  },
];

export function getQuickQuizReward(score: number, totalQuestions = quickQuizQuestions.length): QuizReward {
  const accuracy = totalQuestions > 0 ? score / totalQuestions : 0;
  return {
    xp: 30 + score * 18 + (accuracy === 1 ? 30 : 0),
    coins: 15 + score * 8 + (accuracy >= 0.8 ? 15 : 0),
  };
}