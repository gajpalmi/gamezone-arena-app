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

export function createQuickQuizRound(count = 5, excludedIds: Iterable<string> = []): QuizQuestion[] {
  const excluded = new Set(excludedIds);
  const available = quickQuizQuestions.filter((question) => !excluded.has(question.id));
  const shuffled = [...(available.length >= count ? available : quickQuizQuestions)];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function shuffledNumberOptions(correct: number): { options: string[]; correctIndex: number } {
  const candidates = new Set([correct, correct + 1, correct - 1, correct + 2, Math.max(0, correct - 2), correct + 10]);
  const values = [...candidates].slice(0, 4);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return { options: values.map(String), correctIndex: values.indexOf(correct) };
}

export function createEndlessQuizQuestion(excludedIds: ReadonlySet<string>): QuizQuestion {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const kind = Math.floor(Math.random() * 6);
    const a = 2 + Math.floor(Math.random() * 98);
    const b = 2 + Math.floor(Math.random() * 48);
    let id: string;
    let question: string;
    let correct: number;
    let category: string;

    if (kind === 0) {
      id = `add-${a}-${b}`; question = `What is ${a} + ${b}?`; correct = a + b; category = 'Math';
    } else if (kind === 1) {
      const larger = a + b;
      id = `subtract-${larger}-${b}`; question = `What is ${larger} − ${b}?`; correct = a; category = 'Math';
    } else if (kind === 2) {
      const left = 2 + (a % 18);
      const right = 2 + (b % 11);
      id = `multiply-${left}-${right}`; question = `What is ${left} × ${right}?`; correct = left * right; category = 'Math';
    } else if (kind === 3) {
      const divisor = 2 + (b % 10);
      const quotient = 2 + (a % 24);
      id = `divide-${divisor * quotient}-${divisor}`; question = `What is ${divisor * quotient} ÷ ${divisor}?`; correct = quotient; category = 'Logic';
    } else if (kind === 4) {
      const base = (2 + (a % 19)) * 10;
      const percent = [10, 20, 25, 50][b % 4];
      id = `percent-${percent}-${base}`; question = `What is ${percent}% of ${base}?`; correct = (percent * base) / 100; category = 'Math';
    } else {
      const step = 2 + (b % 9);
      const start = 1 + (a % 30);
      id = `sequence-${start}-${step}`;
      question = `What comes next: ${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, ?`;
      correct = start + step * 4;
      category = 'Logic';
    }

    if (!excludedIds.has(id)) {
      const answer = shuffledNumberOptions(correct);
      return { id, question, options: answer.options, correctIndex: answer.correctIndex, category };
    }
  }
  const fallback = Date.now();
  const answer = shuffledNumberOptions(fallback + 7);
  return {
    id: `fallback-${fallback}`,
    question: `What is ${fallback} + 7?`,
    options: answer.options,
    correctIndex: answer.correctIndex,
    category: 'Math',
  };
}

export function getQuickQuizReward(score: number, totalQuestions = quickQuizQuestions.length): QuizReward {
  const accuracy = totalQuestions > 0 ? score / totalQuestions : 0;
  return {
    xp: 30 + score * 18 + (accuracy === 1 ? 30 : 0),
    coins: 15 + score * 8 + (accuracy >= 0.8 ? 15 : 0),
  };
}