// src/pages/QuizPage.js
import React, { useEffect, useState } from 'react';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TEXT = {
  ko: {
    title: '스피드 퀴즈',
    desc: '랜덤 문제로 가볍게 연습해보세요.',
    group: '카테고리',
    count: '문제 수',
    countDesc: '랜덤 출제',
    start: '시작하기',
    next: '다음 문제',
    check: '정답 확인',
    result: '결과 보기',
    correct: '정답입니다!',
    wrong: '틀렸습니다.',
    myAns: '내 답',
    correctAns: '정답',
    exp: '해설',
    score: '최종 점수',
    retry: '다시 하기',
  },
  en: {
    title: 'Speed Quiz',
    desc: 'Practice with random questions.',
    group: 'Category',
    count: 'Questions',
    countDesc: 'Random',
    start: 'Start',
    next: 'Next',
    check: 'Check',
    result: 'Results',
    correct: 'Correct!',
    wrong: 'Wrong.',
    myAns: 'Your Answer',
    correctAns: 'Correct Answer',
    exp: 'Explanation',
    score: 'Final Score',
    retry: 'Retry',
  },
};

const getQ = (q, lang) =>
  lang === 'en' && q.questionEn ? q.questionEn : q.question;

const getOpt = (q, idx, lang) => {
  if (q.type !== 'mc') return '';
  const list =
    lang === 'en' && q.optionsEn?.length ? q.optionsEn : q.options;
  return list[idx] || '';
};

const getSaAns = (q, lang) =>
  lang === 'en' && q.answerEn ? q.answerEn : q.answer || '';

const getExp = (q, lang) =>
  lang === 'en' && q.explanationEn ? q.explanationEn : q.explanation || '';

function QuizPage({
  questions,
  settings, // 사용 안 해도 props 형태 유지
  groups = [],
  language = 'ko',
  onProgressChange,
}) {
  const t = TEXT[language];

  const [step, setStep] = useState('setup');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [qCount, setQCount] = useState(10);

  const [quizList, setQuizList] = useState([]);
  const [currIdx, setCurrIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);

  const [feedback, setFeedback] = useState(null); // { isCorrect, correctText, explanation }

  const handleStart = () => {
    if (!selectedGroupId) return alert('Select Group');
    const gQs = questions.filter(
      q => String(q.groupId) === String(selectedGroupId),
    );
    if (!gQs.length) return alert('No Questions');

    const limit = Math.min(qCount, gQs.length);
    const prepped = shuffle(gQs)
      .slice(0, limit)
      .map(q => {
        if (q.type === 'mc') {
          const opts = q.options.map((_, i) => ({
            index: i,
            isCorrect: i === q.answerIndex,
          }));
          return { ...q, shuffledOptions: shuffle(opts) };
        }
        return q;
      });

    setQuizList(prepped);
    setCurrIdx(0);
    setAnswers({});
    setScore(0);
    setFeedback(null);
    setStep('quiz');
  };

  const gradeOne = (q, userVal) => {
    let isCorrect = false;
    let correctText = '';

    if (q.type === 'mc') {
      const uIdx = Number(userVal);
      const cIdx = q.shuffledOptions.findIndex(o => o.isCorrect);
      isCorrect = uIdx === cIdx;
      correctText = getOpt(q, q.answerIndex, language);
    } else {
      const ans = getSaAns(q, language);
      if (
        String(userVal).trim().toLowerCase() ===
        String(ans).trim().toLowerCase()
      )
        isCorrect = true;
      correctText = ans;
    }
    return { isCorrect, correctText };
  };

  const handleCheck = () => {
    const q = quizList[currIdx];
    const userVal = answers[q.id];
    if (userVal === undefined || userVal === '') return alert('Answer first');

    const { isCorrect, correctText } = gradeOne(q, userVal);
    setFeedback({ isCorrect, correctText, explanation: getExp(q, language) });
    if (isCorrect) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currIdx < quizList.length - 1) {
      setCurrIdx(i => i + 1);
      setFeedback(null);
    } else {
      setStep('result');
    }
  };

  // 퀴즈: 현재 문제 기준 진행도
  useEffect(() => {
    if (step === 'quiz' && quizList.length > 0) {
      const ratio = (currIdx + 1) / quizList.length;
      onProgressChange?.(ratio);
    } else {
      onProgressChange?.(0);
    }
  }, [step, currIdx, quizList.length, onProgressChange]);

  // --- Render ---

  // SETUP
  if (step === 'setup') {
    return (
      <div className="flex flex-col items-center justify-start md:justify-center md:min-h-[calc(100vh-160px)] p-6 md:p-8 text-center">
        <div className="w-full max-w-sm md:max-w-md">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 md:mb-3">
            {t.title}
          </h1>
          <p className="text-slate-500 text-sm md:text-base mb-8">
            {t.desc}
          </p>

          <div className="w-full space-y-4 text-left">
            {/* 주제 선택 */}
            <div className="bg-white dark:bg-slate-800 border-none rounded-2xl px-5 py-4 md:py-5 shadow-lg shadow-slate-100 dark:shadow-none">
              <label className="block text-sm md:text-base font-semibold text-slate-500 mb-1">
                {t.group}
              </label>
              <select
                value={selectedGroupId}
                onChange={e => {
                  setSelectedGroupId(e.target.value);
                  const g = groups.find(
                    gg => String(gg.id) === String(e.target.value),
                  );
                  if (g) setQCount(g.questionCount);
                }}
                className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white text-sm md:text-base"
              >
                <option value="">{t.group}...</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.questionCount}Q)
                  </option>
                ))}
              </select>
            </div>

            {/* 문제 수 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl px-5 py-4 md:py-5 shadow-lg shadow-slate-100 dark:shadow-none">
              <label className="block text-sm md:text-base font-semibold text-slate-500 mb-1">
                {t.count}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base text-slate-400">
                  {t.countDesc}
                </span>
                <input
                  type="number"
                  min="1"
                  value={qCount}
                  onChange={e => setQCount(e.target.value)}
                  className="ml-auto w-20 bg-transparent text-right font-bold text-slate-900 dark:text-white border-none focus:ring-0 p-0 text-sm md:text-base"
                />
              </div>
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={handleStart}
              className="w-full bg-indigo-600 text-white font-bold py-4 md:py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all mt-2 text-base md:text-lg"
            >
              {t.start}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QUIZ
  if (step === 'quiz') {
    const q = quizList[currIdx];

    return (
      <div className="max-w-3xl mx-auto flex flex-col min-h-[calc(100vh-140px)] justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
          {/* 문제 번호 + Score */}
          <div className="flex justify-between text-[11px] md:text-sm font-bold text-slate-400 mb-4 uppercase">
            <span>
              Question {currIdx + 1} / {quizList.length}
            </span>
            <span>Score {score}</span>
          </div>

          <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white mb-6 leading-relaxed">
            {getQ(q, language)}
          </h2>

          <div className="space-y-3 mb-20">
            {q.type === 'mc' ? (
              q.shuffledOptions.map((opt, i) => {
                const checked =
                  String(answers[q.id]) === String(i);

                return (
                  <label
                    key={i}
                    className={`
                      flex items-start gap-3 p-4 rounded-xl cursor-pointer border transition-all
                      ${
                        checked
                          ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30'
                          : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={i}
                      disabled={!!feedback}
                      className="sr-only"
                      checked={checked}
                      onChange={e =>
                        setAnswers({
                          ...answers,
                          [q.id]: e.target.value,
                        })
                      }
                    />

                    <div
                      className={`
                        mt-1 w-4 aspect-square rounded-full border flex items-center justify-center flex-shrink-0
                        ${
                          checked
                            ? 'border-indigo-600'
                            : 'border-slate-300'
                        }
                      `}
                    >
                      {checked && (
                        <div className="w-2 aspect-square rounded-full bg-indigo-600" />
                      )}
                    </div>

                    <span className="text-slate-700 dark:text-slate-200 text-sm md:text-base">
                      {getOpt(q, opt.index, language)}
                    </span>
                  </label>
                );
              })
            ) : (
              <input
                type="text"
                disabled={!!feedback}
                value={answers[q.id] || ''}
                onChange={e =>
                  setAnswers({ ...answers, [q.id]: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 text-base md:text-lg text-slate-900 dark:text-white"
                placeholder="Answer..."
              />
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`absolute inset-x-0 bottom-0 p-6 rounded-b-3xl border-t animate-in slide-in-from-bottom-5 ${
                feedback.isCorrect
                  ? 'bg-green-50 border-green-100 dark:bg-slate-800 dark:border-green-900'
                  : 'bg-red-50 border-red-100 dark:bg-slate-800 dark:border-red-900'
              }`}
            >
              <p
                className={`font-bold text-lg mb-1 ${
                  feedback.isCorrect ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {feedback.isCorrect ? t.correct : t.wrong}
              </p>
              {!feedback.isCorrect && (
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-2">
                  {t.correctAns}:{' '}
                  <span className="font-bold">
                    {feedback.correctText}
                  </span>
                </p>
              )}
              {feedback.explanation && (
                <p className="text-sm md:text-base text-slate-500 bg-white/50 dark:bg-black/20 p-2 rounded">
                  {t.exp}: {feedback.explanation}
                </p>
              )}
              <button
                onClick={handleNext}
                className="w-full mt-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold text-sm md:text-base"
              >
                {currIdx === quizList.length - 1 ? t.result : t.next}
              </button>
            </div>
          )}

          {!feedback && (
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-800 dark:via-slate-800">
              <button
                onClick={handleCheck}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 text-sm md:text-base"
              >
                {t.check}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RESULT
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[calc(100vh-160px)] text-center p-6 md:p-8">
      <div className="text-5xl md:text-6xl font-black text-indigo-600 mb-2">
        {score}{' '}
        <span className="text-2xl md:text-3xl text-slate-400">/ {quizList.length}</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8">
        {t.score}
      </h2>
      <button
        onClick={() => setStep('setup')}
        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 md:px-10 py-3 md:py-3.5 rounded-full font-bold text-sm md:text-base"
      >
        {t.retry}
      </button>
    </div>
  );
}

export default QuizPage;
