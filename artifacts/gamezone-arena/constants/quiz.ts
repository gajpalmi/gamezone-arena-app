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
  {
    id: 'quiz-6',
    question: 'What is the capital city of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctIndex: 2,
    category: 'Geography',
  },
  {
    id: 'quiz-7',
    question: 'Which is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correctIndex: 3,
    category: 'Geography',
  },
  {
    id: 'quiz-8',
    question: 'How many players are on the field for one football team?',
    options: ['9', '10', '11', '12'],
    correctIndex: 2,
    category: 'Sports',
  },
  {
    id: 'quiz-9',
    question: 'Which instrument is used to measure temperature?',
    options: ['Barometer', 'Thermometer', 'Speedometer', 'Altimeter'],
    correctIndex: 1,
    category: 'Science',
  },
  {
    id: 'quiz-10',
    question: 'What is 15 multiplied by 6?',
    options: ['80', '85', '90', '95'],
    correctIndex: 2,
    category: 'Math',
  },
  {
    id: 'quiz-11',
    question: 'Which Indian festival is known as the festival of lights?',
    options: ['Holi', 'Diwali', 'Onam', 'Baisakhi'],
    correctIndex: 1,
    category: 'Culture',
  },
  {
    id: 'quiz-12',
    question: 'Which part of a plant usually absorbs water from soil?',
    options: ['Flower', 'Leaf', 'Root', 'Fruit'],
    correctIndex: 2,
    category: 'Nature',
  },
  {
    id: 'quiz-13',
    question: 'How many minutes are there in two hours?',
    options: ['100', '110', '120', '140'],
    correctIndex: 2,
    category: 'Logic',
  },
  {
    id: 'quiz-14',
    question: 'Which metal is liquid at room temperature?',
    options: ['Iron', 'Mercury', 'Copper', 'Aluminium'],
    correctIndex: 1,
    category: 'Science',
  },
  {
    id: 'quiz-15',
    question: 'Who wrote the Indian national anthem?',
    options: ['Rabindranath Tagore', 'Bankim Chandra Chatterjee', 'Sarojini Naidu', 'Subhas Chandra Bose'],
    correctIndex: 0,
    category: 'India',
  },
  {
    id: 'quiz-16',
    question: 'Which shape has exactly three sides?',
    options: ['Square', 'Circle', 'Triangle', 'Pentagon'],
    correctIndex: 2,
    category: 'Logic',
  },
  {
    id: 'quiz-17',
    question: 'Which organ pumps blood around the human body?',
    options: ['Lungs', 'Heart', 'Liver', 'Kidney'],
    correctIndex: 1,
    category: 'Science',
  },
  {
    id: 'quiz-18',
    question: 'What is the square root of 144?',
    options: ['10', '11', '12', '14'],
    correctIndex: 2,
    category: 'Math',
  },
  {
    id: 'quiz-19',
    question: 'Which country is home to the pyramids of Giza?',
    options: ['Greece', 'Mexico', 'Egypt', 'Italy'],
    correctIndex: 2,
    category: 'History',
  },
  {
    id: 'quiz-20',
    question: 'Which colour is made by mixing blue and yellow?',
    options: ['Orange', 'Green', 'Purple', 'Red'],
    correctIndex: 1,
    category: 'Art',
  },
];

export function createQuickQuizRound(count = 5, avoidFirstId?: string): QuizQuestion[] {
  const shuffled = [...quickQuizQuestions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  if (avoidFirstId && shuffled.length > 1 && shuffled[0].id === avoidFirstId) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getQuickQuizReward(score: number, totalQuestions = quickQuizQuestions.length): QuizReward {
  const accuracy = totalQuestions > 0 ? score / totalQuestions : 0;
  return {
    xp: 30 + score * 18 + (accuracy === 1 ? 30 : 0),
    coins: 15 + score * 8 + (accuracy >= 0.8 ? 15 : 0),
  };
}