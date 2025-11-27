// src/pages/GosiPage.js
import React, { useEffect, useState } from 'react';
import { submitAnswers } from '../api';

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
    setupTitle: '실전 모의고사',
    setupDesc: '문제를 풀고 점수를 기록합니다.',
    nameLabel: '이름',
    emailLabel: '이메일',
    groupLabel: '카테고리',
    selectPlace: '선택해주세요',
    startExam: '시험 시작',
    submit: '답안 제출',
    retry: '재시험',
    resultTitle: '시험 결과',
    score: '점수',
    correct: '정답',
    wrong: '오답',
    total: '전체',
    myAns: '내 답',
    correctAns: '정답',
    explanation: '해설',
    alert: {
      name: '이름을 입력하세요.',
      email: '이메일을 입력하세요.',
      group: '그룹을 선택하세요.',
      noQ: '문제가 없습니다.',
    },
  },
  en: {
    setupTitle: 'Mock Exam',
    setupDesc: 'Solve the questions and record your score.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    groupLabel: 'Category',
    selectPlace: 'Select...',
    startExam: 'Start Exam',
    submit: 'Submit',
    retry: 'Retry',
    resultTitle: 'Results',
    score: 'Score',
    correct: 'Correct',
    wrong: 'Wrong',
    total: 'Total',
    myAns: 'Your Answer',
    correctAns: 'Correct Answer',
    explanation: 'Explanation',
    alert: {
      name: 'Enter name.',
      email: 'Enter email.',
      group: 'Select group.',
      noQ: 'No questions.',
    },
  },
};

// --- Helpers ---
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

function GosiPage({
  questions,
  settings, // 사용 안 해도 props 형태는 유지
  groups = [],
  language = 'ko',
  onProgressChange,
}) {
  const t = TEXT[language];

  const [step, setStep] = useState('setup');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [resultMap, setResultMap] = useState({});

  const handleStart = () => {
    if (!userName.trim()) return alert(t.alert.name);
    if (!userEmail.trim()) return alert(t.alert.email);
    if (!selectedGroupId) return alert(t.alert.group);

    const groupQs = questions.filter(
      q => String(q.groupId) === String(selectedGroupId),
    );
    if (!groupQs.length) return alert(t.alert.noQ);

    const targetGroup = groups.find(
      g => String(g.id) === String(selectedGroupId),
    );
    const limit = targetGroup?.questionCount || groupQs.length;

    const shuffled = shuffle(groupQs)
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

    setQuizQuestions(shuffled);
    setAnswers({});
    setScore(null);
    setResultMap({});
    setStep('quiz');
  };

  const gradeAll = () => {
    let correct = 0;
    const newResult = {};

    quizQuestions.forEach(q => {
      const userAns = answers[q.id];
      let isCorrect = false;

      if (userAns !== undefined && userAns !== '') {
        if (q.type === 'mc') {
          const selOpt = q.shuffledOptions[Number(userAns)];
          if (selOpt?.isCorrect) isCorrect = true;
        } else {
          const ansTxt = getSaAns(q, language).trim().toLowerCase();
          if (String(userAns).trim().toLowerCase() === ansTxt) isCorrect = true;
        }
      }

      if (isCorrect) correct++;
      newResult[q.id] = { correct: isCorrect };
    });

    const summary = { correct, total: quizQuestions.length };
    setScore(summary);
    setResultMap(newResult);
    return { summary, newResult };
  };

  const handleSubmit = async () => {
    const { summary, newResult } = gradeAll();
    setStep('result');

    const details = quizQuestions.map(q => {
      const isCorrect = newResult[q.id]?.correct;
      let uAnsText = '';
      let cAnsText = '';

      if (q.type === 'mc') {
        const uIdx = answers[q.id];
        const uOpt =
          uIdx !== undefined ? q.shuffledOptions[Number(uIdx)] : null;
        uAnsText = uOpt ? getOpt(q, uOpt.index, language) : '';
        cAnsText = getOpt(q, q.answerIndex, language);
      } else {
        uAnsText = answers[q.id] || '';
        cAnsText = getSaAns(q, language);
      }

      return {
        questionId: q.id,
        questionText: getQ(q, language),
        userAnswer: uAnsText,
        correctAnswer: cAnsText,
        isCorrect,
      };
    });

    const groupName =
      groups.find(g => String(g.id) === String(selectedGroupId))?.name || '';

    await submitAnswers({
      userName,
      userEmail,
      groupId: selectedGroupId,
      groupName,
      scoreCorrect: summary.correct,
      scoreTotal: summary.total,
      scoreRate: (summary.correct / summary.total) * 100,
      details,
    });
  };

  // 고시: 전체 스크롤 진행도
  useEffect(() => {
    if (step !== 'quiz') {
      onProgressChange?.(0);
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } =
        document.documentElement;
      const total = scrollHeight - clientHeight;
      const ratio = total <= 0 ? 0 : scrollTop / total;
      onProgressChange?.(ratio);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [step, onProgressChange, quizQuestions.length]);

  // --- Render ---

  // SETUP
  if (step === 'setup') {
    return (
      <div className="flex flex-col items-center justify-start md:justify-center md:min-h-[calc(100vh-160px)] p-6 md:p-8 text-center">
        <div className="w-full max-w-sm md:max-w-md">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 md:mb-3">
            {t.setupTitle}
          </h1>
          <p className="text-slate-500 text-sm md:text-base mb-8">
            {t.setupDesc}
          </p>

          <div className="w-full space-y-4 text-left">
            {/* 이름 */}
            <div className="bg-white dark:bg-slate-800 border-none rounded-2xl px-5 py-4 md:py-5 shadow-lg shadow-slate-100 dark:shadow-none">
              <label className="block text-sm md:text-base font-semibold text-slate-500 mb-1">
                {t.nameLabel}
              </label>
              <input
                type="text"
                placeholder={t.nameLabel}
                value={userName}
                onChange={e => setUserName(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white text-sm md:text-base"
              />
            </div>

            {/* 이메일 */}
            <div className="bg-white dark:bg-slate-800 border-none rounded-2xl px-5 py-4 md:py-5 shadow-lg shadow-slate-100 dark:shadow-none">
              <label className="block text-sm md:text-base font-semibold text-slate-500 mb-1">
                {t.emailLabel}
              </label>
              <input
                type="email"
                placeholder={t.emailLabel}
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white text-sm md:text-base"
              />
            </div>

            {/* 시험 과목 */}
            <div className="bg-white dark:bg-slate-800 border-none rounded-2xl px-5 py-4 md:py-5 shadow-lg shadow-slate-100 dark:shadow-none">
              <label className="block text-sm md:text-base font-semibold text-slate-500 mb-1">
                {t.groupLabel}
              </label>
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white text-sm md:text-base"
              >
                <option value="">{t.selectPlace}</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.questionCount}Q)
                  </option>
                ))}
              </select>
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={handleStart}
              className="w-full bg-indigo-600 text-white font-bold py-4 md:py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all mt-2 text-base md:text-lg"
            >
              {t.startExam}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QUIZ
  if (step === 'quiz') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6">
          {quizQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-700"
            >
              <div className="flex justify-between text-[11px] md:text-sm font-bold text-slate-400 mb-4 uppercase">
                <span>
                  Question {idx + 1} / {quizQuestions.length}
                </span>
              </div>

              <h3 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 leading-relaxed">
                {getQ(q, language)}
              </h3>

              {q.type === 'mc' ? (
                <div className="space-y-3">
                  {q.shuffledOptions.map((opt, i) => {
                    const checked =
                      String(answers[q.id]) === String(i);

                    return (
                      <label
                        key={i}
                        className={`
                          flex items-start gap-3 p-4 md:p-4.5 rounded-xl cursor-pointer border transition-all
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
                          className="sr-only"
                          onChange={e =>
                            setAnswers(prev => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
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

                        <span className="text-slate-700 dark:text-slate-300 text-sm md:text-base">
                          {getOpt(q, opt.index, language)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-base md:text-lg text-slate-900 dark:text-white"
                  placeholder="Answer..."
                  value={answers[q.id] || ''}
                  onChange={e =>
                    setAnswers(prev => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* 마지막 문제 아래 제출 버튼 */}
        <div className="mt-8 mb-4 pb-8">
          <button
            onClick={handleSubmit}
            className="w-full max-w-3xl mx-auto block bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3.5 md:py-4 rounded-xl shadow-lg text-base md:text-lg"
          >
            {t.submit}
          </button>
        </div>
      </div>
    );
  }

  // RESULT
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 text-center mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 dark:text-white">
          {t.resultTitle}
        </h2>
        <div className="text-4xl md:text-5xl font-black text-indigo-600 my-4">
          {Math.round((score.correct / score.total) * 100)}
          <span className="text-lg md:text-2xl">점</span>
        </div>
        <p className="text-slate-500 text-sm md:text-base">
          {t.correct} {score.correct} / {t.total} {score.total}
        </p>
      </div>

      <div className="space-y-4 mb-20">
        {quizQuestions.map((q, idx) => {
          const isCorrect = resultMap[q.id]?.correct;
          const uAns = answers[q.id];

          return (
            <div
              key={q.id}
              className={`rounded-2xl p-5 md:p-6 border text-sm md:text-base ${
                isCorrect
                  ? 'bg-white border-slate-100 dark:bg-slate-800'
                  : 'bg-red-50 border-red-100 dark:bg-red-900/10'
              }`}
            >
              <div className="flex justify-between mb-2">
                <span
                  className={`text-sm md:text-base font-bold px-2 py-0.5 rounded ${
                    isCorrect
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isCorrect ? t.correct : t.wrong}
                </span>
              </div>
              <p className="font-medium text-slate-800 dark:text-white mb-3">
                {idx + 1}. {getQ(q, language)}
              </p>
              <div className="text-sm md:text-base space-y-1">
                {!isCorrect && (
                  <div className="text-red-500 line-through">
                    {t.myAns}:{' '}
                    {q.type === 'mc' && uAns !== undefined
                      ? getOpt(
                          q,
                          q.shuffledOptions[Number(uAns)].index,
                          language,
                        )
                      : uAns || '-'}
                  </div>
                )}
                <div className="text-indigo-600 font-medium">
                  {t.correctAns}:{' '}
                  {q.type === 'mc'
                    ? getOpt(q, q.answerIndex, language)
                    : getSaAns(q, language)}
                </div>
                {getExp(q, language) && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 text-slate-500 text-sm md:text-base">
                    {t.explanation}: {getExp(q, language)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mb-10">
        <button
          onClick={() => setStep('setup')}
          className="px-6 md:px-8 py-2.5 md:py-3 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 text-sm md:text-base"
        >
          {t.retry}
        </button>
      </div>
    </div>
  );
}

export default GosiPage;
