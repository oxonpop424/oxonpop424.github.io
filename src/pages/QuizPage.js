// src/pages/QuizPage.js
import React, { useEffect, useState } from 'react';
import SelectField from '../components/SelectField';

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
    title: '퀴즈 모드',
    group: '문제 은행 그룹',
    selectPlaceholder: '선택해주세요',
    questionCount: '출제 문제 수',
    questionCountDesc:
      '선택한 그룹에서 지정한 개수만큼 랜덤으로 문제가 출제됩니다.',
    startQuiz: '퀴즈 시작',
    headerSolving: '퀴즈 모드 · 문제 풀이 중',
    headerResult: '퀴즈 모드 · 결과 확인',
    totalAndAnswered: (total, answered) =>
      `총 ${total}문제 · 답변 완료 ${answered}개`,
    resultTitle: '결과 요약 (퀴즈 모드)',
    resultDesc:
      '간단한 퀴즈 결과입니다. 정답/오답과 해설을 확인하세요.',
    correctLabel: '정답',
    wrongLabel: '오답',
    myAnswer: '내 답',
    noAnswer: '(미응답)',
    explanation: '해설',
    correctRateLabel: (rate) => `정답률 ${rate}%`,
    checkAnswer: '정답 확인',
    nextQuestion: '다음 문제',
    showResult: '결과 보기',
    retry: '다시 퀴즈 풀기',
    currentQuestionIndex: (idx, total) =>
      `${idx} / ${total}번 문제`,
    feedbackCorrect: '정답입니다!',
    feedbackWrong: '오답입니다.',
    alerts: {
      group: '문제 은행 그룹을 선택해주세요.',
      noQuestions: '선택한 그룹에 등록된 문제가 없습니다.',
      answerFirst:
        '먼저 답을 선택/입력해주세요.',
      timeOver: '시간 종료!',
    },
    uniQuestion: '문항'
  },
  en: {
    title: 'Quiz Mode',
    group: 'Question Bank Group',
    selectPlaceholder: 'Please select',
    questionCount: 'Number of questions',
    questionCountDesc:
      'A random set of questions from the selected group will be used.',
    startQuiz: 'Start Quiz',
    headerSolving: 'Quiz Mode · In progress',
    headerResult: 'Quiz Mode · Result',
    totalAndAnswered: (total, answered) =>
      `Total ${total} questions · Answered ${answered}`,
    resultTitle: 'Summary (Quiz Mode)',
    resultDesc:
      'Check your quiz results, correct/incorrect answers and explanations.',
    correctLabel: 'Correct',
    wrongLabel: 'Wrong',
    myAnswer: 'Your answer',
    noAnswer: '(No answer)',
    explanation: 'Explanation',
    correctRateLabel: (rate) => `Accuracy ${rate}%`,
    checkAnswer: 'Check answer',
    nextQuestion: 'Next question',
    showResult: 'See result',
    retry: 'Take quiz again',
    currentQuestionIndex: (idx, total) =>
      `${idx} / ${total} questions`,
    feedbackCorrect: 'Correct!',
    feedbackWrong: 'Incorrect.',
    alerts: {
      group: 'Please select a question bank group.',
      noQuestions:
        'There are no questions in the selected group.',
      answerFirst:
        'Please choose or type an answer first.',
      timeOver: 'Time is up!',
    },
    uniQuestion: 'questions'
  },
};

// 한/영 공통 헬퍼
function getQuestionText(q, language) {
  if (language === 'en' && q.questionEn) return q.questionEn;
  return q.question || '';
}

function getOptionText(q, originalIndex, language) {
  if (q.type !== 'mc') return '';
  const ko = (q.options || [])[originalIndex] || '';
  const en = (q.optionsEn || [])[originalIndex] || '';
  if (language === 'en' && en) return en;
  return ko;
}

function getExplanationText(q, language) {
  if (language === 'en' && q.explanationEn) {
    return q.explanationEn;
  }
  return q.explanation || '';
}

function getSaAnswerForGrading(q, language) {
  if (language === 'en' && q.answerEn) {
    return q.answerEn;
  }
  return q.answer || '';
}

function QuizPage({ questions, settings, groups = [], language = 'ko' }) {
  const t = TEXT[language] || TEXT.ko;

  // step: setup(설정) | quiz(문제 풀이) | result(결과 보기)
  const [step, setStep] = useState('setup');

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [questionCount, setQuestionCount] = useState(10);

  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [resultMap, setResultMap] = useState({}); // { [id]: { correct: boolean } }
  const [immediateFeedback, setImmediateFeedback] =
    useState(null); // { isCorrect, correctText, explanation }

  const [remainingSeconds, setRemainingSeconds] =
    useState(null);
  const [timerRunning, setTimerRunning] =
    useState(false);

  const timerEnabled = settings?.timerEnabled;
  const totalSeconds = settings?.timerSeconds || 0;

  const handleChangeAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const formatTime = (sec) => {
    if (sec == null) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const timeProgress =
    timerEnabled &&
    totalSeconds > 0 &&
    remainingSeconds != null
      ? Math.max(0, (remainingSeconds / totalSeconds) * 100)
      : 0;

  const currentQuestion = quizQuestions[currentIndex] || null;
  const isLastQuestion =
    currentIndex === quizQuestions.length - 1;

  // ------------------------------
  // 시작 설정
  // ------------------------------
  const handleStart = () => {
    if (!selectedGroupId) {
      alert(t.alerts.group);
      return;
    }

    const groupQuestions = questions.filter(
      (q) => String(q.groupId) === String(selectedGroupId)
    );

    if (groupQuestions.length === 0) {
      alert(t.alerts.noQuestions);
      return;
    }

    const limitRaw =
      Number(questionCount) || groupQuestions.length;
    const limit = Math.max(
      1,
      Math.min(limitRaw, groupQuestions.length)
    );

    const shuffled = shuffle(groupQuestions);
    const picked = shuffled.slice(0, limit);

    const prepared = picked.map((q) => {
      if (q.type === 'mc') {
        const optionObjects = (q.options || []).map(
          (_, i) => ({
            index: i,
            isCorrect: i === q.answerIndex,
          })
        );
        const shuffledOptions = shuffle(optionObjects);
        return { ...q, shuffledOptions };
      }
      return { ...q };
    });

    setQuizQuestions(prepared);
    setAnswers({});
    setScore(null);
    setResultMap({});
    setCurrentIndex(0);
    setImmediateFeedback(null);
    setStep('quiz');

    if (timerEnabled && totalSeconds > 0) {
      setRemainingSeconds(totalSeconds);
      setTimerRunning(true);
    } else {
      setRemainingSeconds(null);
      setTimerRunning(false);
    }
  };

  // ------------------------------
  // 전체 채점 (정답/오답 카운트 용)
  // ------------------------------
  const gradeAll = () => {
    if (!quizQuestions.length) return;

    let correct = 0;
    const newResult = {};

    quizQuestions.forEach((q) => {
      const userAnswer = answers[q.id];

      if (userAnswer == null || userAnswer === '') {
        return;
      }

      if (q.type === 'mc') {
        const userIndex = Number(userAnswer);
        const correctIndex = q.shuffledOptions.findIndex(
          (o) => o.isCorrect
        );
        const isCorrect = userIndex === correctIndex;
        if (isCorrect) correct++;
        newResult[q.id] = { correct: isCorrect };
      } else {
        const user = String(userAnswer).trim().toLowerCase();
        const right = String(
          getSaAnswerForGrading(q, language)
        )
          .trim()
          .toLowerCase();
        const isCorrect = user === right;
        if (isCorrect) correct++;
        newResult[q.id] = { correct: isCorrect };
      }
    });

    const summary = {
      correct,
      total: quizQuestions.length,
    };
    setScore(summary);
    setResultMap(newResult);
    return { ...summary, newResult };
  };

  // ------------------------------
  // 타이머
  // ------------------------------
  useEffect(() => {
    if (!timerRunning || remainingSeconds == null) return;
    if (remainingSeconds <= 0) {
      setTimerRunning(false);
      alert(t.alerts.timeOver);
      gradeAll();
      setStep('result');
      return;
    }

    const id = setInterval(() => {
      setRemainingSeconds((sec) =>
        sec != null ? sec - 1 : sec
      );
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, remainingSeconds, language]);

  // ------------------------------
  // 현재 문제 정답 확인
  // ------------------------------
  const handleCheckCurrent = () => {
    const q = currentQuestion;
    if (!q) return;

    const userAnswer = answers[q.id];

    if (userAnswer == null || userAnswer === '') {
      alert(t.alerts.answerFirst);
      return;
    }

    let isCorrect = false;
    let correctText = '';
    let explanation =
      getExplanationText(q, language) || '';

    if (q.type === 'mc') {
      const userIndex = Number(userAnswer);
      const correctIndex = q.shuffledOptions.findIndex(
        (o) => o.isCorrect
      );
      isCorrect = userIndex === correctIndex;
      const correctOpt =
        correctIndex >= 0
          ? q.shuffledOptions[correctIndex]
          : null;
      correctText = correctOpt
        ? getOptionText(q, correctOpt.index, language)
        : '';
    } else {
      const user = String(userAnswer)
        .trim()
        .toLowerCase();
      const right = String(
        getSaAnswerForGrading(q, language)
      )
        .trim()
        .toLowerCase();
      isCorrect = user === right;
      correctText = getSaAnswerForGrading(q, language);
    }

    setImmediateFeedback({
      isCorrect,
      correctText,
      explanation,
    });

    gradeAll(); // 상단 정답 카운트 갱신
  };

  // ------------------------------
  // 다음 문제 / 결과로 이동
  // ------------------------------
  const handleNextQuestion = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((idx) => idx + 1);
      setImmediateFeedback(null);
    } else {
      gradeAll();
      setTimerRunning(false);
      setImmediateFeedback(null);
      setStep('result');
    }
  };

  // ------------------------------
  // 결과 페이지
  // ------------------------------
  const renderSummary = () => {
    if (!score || !quizQuestions.length) return null;

    const correctRate = Math.round(
      (score.correct / score.total) * 100
    );

    return (
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 text-sm md:text-base shadow-md dark:border-slate-700 dark:bg-slate-900/90">
        {/* 상단 요약 */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t.resultTitle}
            </p>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
              {t.resultDesc}
            </p>
          </div>
          <div className="text-right">
            <div className="rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-4 py-1.5 text-sm md:text-base font-semibold text-white shadow-md">
              {t.correctLabel} {score.correct} /{' '}
              {score.total}
            </div>
            <div className="mt-1 text-sm md:text-base text-slate-500 dark:text-slate-400">
              {t.correctRateLabel(correctRate)}
            </div>
          </div>
        </div>

        {/* 문항별 상세 */}
        <div className="mt-3 space-y-3">
          {quizQuestions.map((q, idx) => {
            const r = resultMap[q.id];
            const isCorrect = r?.correct === true;

            const rawUser = answers[q.id];
            let userAnswerText = '';
            let correctAnswerText = '';

            if (q.type === 'mc') {
              const userIndex =
                rawUser != null ? Number(rawUser) : null;
              const userOpt =
                userIndex != null
                  ? q.shuffledOptions[userIndex]
                  : null;
              userAnswerText = userOpt
                ? getOptionText(q, userOpt.index, language)
                : '';

              correctAnswerText = getOptionText(
                q,
                q.answerIndex,
                language
              );
            } else {
              userAnswerText =
                rawUser != null ? String(rawUser) : '';
              correctAnswerText = getSaAnswerForGrading(
                q,
                language
              );
            }

            const containerBase =
              'rounded-xl border p-3.5 text-sm md:text-base shadow-sm';
            const containerVariant = isCorrect
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-900/30'
              : 'border-red-200 bg-red-50 dark:border-red-500/60 dark:bg-red-900/30';

            const badgeClass = isCorrect
              ? 'bg-emerald-600/90 text-white'
              : 'bg-red-600/90 text-white';

            return (
              <div
                key={q.id}
                className={`${containerBase} ${containerVariant}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    {idx + 1}.{' '}
                    {getQuestionText(q, language)}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs md:text-sm ${badgeClass}`}
                  >
                    {isCorrect
                      ? t.correctLabel
                      : t.wrongLabel}
                  </span>
                </div>

                <div className="mt-1 space-y-1.5 text-sm md:text-base text-slate-700 dark:text-slate-200">
                  <p>
                    <span className="font-semibold">
                      {t.myAnswer}:
                    </span>{' '}
                    {userAnswerText || (
                      <span className="text-slate-400">
                        {t.noAnswer}
                      </span>
                    )}
                  </p>

                  {!isCorrect && (
                    <p>
                      <span className="font-semibold">
                        {t.correctLabel}:
                      </span>{' '}
                      {correctAnswerText}
                    </p>
                  )}

                  {q.explanation || q.explanationEn ? (
                    <p className="mt-1 text-sm md:text-base text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">
                        {t.explanation}:
                      </span>{' '}
                      {getExplanationText(q, language)}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleGoToSetup = () => {
    setStep('setup');
    setQuizQuestions([]);
    setAnswers({});
    setScore(null);
    setResultMap({});
    setImmediateFeedback(null);
    setCurrentIndex(0);
    setRemainingSeconds(null);
    setTimerRunning(false);
  };

  // ------------------------------
  // 렌더링
  // ------------------------------

  // 1) 설정 페이지
  if (step === 'setup') {
    const sortedGroups = [...groups].sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );

    return (
      <div className="mx-auto w-full max-w-5xl text-[15px] md:text-base">
        <div className="relative w-full overflow-hidden rounded-2xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-100 dark:bg-slate-900/90 dark:ring-slate-800">
          <div className="relative space-y-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {t.title}
            </h2>

            <div className="space-y-4 text-sm md:text-base">
              {/* 문제 은행 그룹 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t.group}
                </label>
                <SelectField
                  value={selectedGroupId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedGroupId(value);
                    const g = groups.find(
                      (gg) =>
                        String(gg.id) === String(value)
                    );
                    if (g && g.questionCount) {
                      setQuestionCount(g.questionCount);
                    }
                  }}
                >
                  <option value="">
                    {t.selectPlaceholder}
                  </option>
                  {sortedGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.questionCount} {t.uniQuestion})
                    </option>
                  ))}
                </SelectField>
              </div>

              {/* 문제 수 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t.questionCount}
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                  value={questionCount}
                  onChange={(e) =>
                    setQuestionCount(e.target.value)
                  }
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t.questionCountDesc}
                </p>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleStart}
                className="w-full rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
              >
                {t.startQuiz}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2) 문제 풀이 / 결과 페이지
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col space-y-4 text-[15px] md:text-base">
      <header className="overflow-hidden rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800">
        <div className="relative space-y-3 text-sm md:text-base">
          {/* 제목 + 서브텍스트 + 타이머 */}
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {t.title}
              </h1>
              {/* 문제/정답 요약 */}
              {quizQuestions.length > 0 && (
                <div className="flex items-center justify-between text-sm md:text-base text-slate-500 dark:text-slate-400">
                  <span>
                    {t.totalAndAnswered(
                      quizQuestions.length,
                      answeredCount
                    )}
                  </span>
                  {score && (
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {t.correctLabel}{' '}
                      {score.correct} / {score.total}
                    </span>
                  )}
                </div>
              )}
            </div>

            {timerEnabled && totalSeconds > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">
                  {remainingSeconds != null
                    ? formatTime(remainingSeconds)
                    : formatTime(totalSeconds)}
                </span>
              </div>
            )}
          </div>

          {/* 타이머 프로그레스 바 */}
          {timerEnabled && totalSeconds > 0 && (
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] transition-[width]"
                style={{ width: `${timeProgress}%` }}
              />
            </div>
          )}
        </div>
      </header>

      {/* 퀴즈 화면 */}
      {step === 'quiz' && (
        <section className="rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800">
          {quizQuestions.length > 0 && currentQuestion && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {t.currentQuestionIndex(
                    currentIndex + 1,
                    quizQuestions.length
                  )}
                </span>
                {score && (
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    {t.correctLabel}{' '}
                    {score.correct} / {score.total}
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-base font-medium text-slate-800 dark:text-slate-50">
                    {currentIndex + 1}.{' '}
                    {getQuestionText(currentQuestion, language)}
                  </h3>
                  {currentQuestion.groupName && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {currentQuestion.groupName}
                    </span>
                  )}
                </div>

                {currentQuestion.type === 'mc' && (
                  <div className="space-y-1">
                    {currentQuestion.shuffledOptions.map(
                      (opt, i) => (
                        <label
                          key={i}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-base hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <input
                            type="radio"
                            className="h-4 w-4"
                            name={`q_${currentQuestion.id}`}
                            value={i}
                            checked={
                              String(
                                answers[currentQuestion.id]
                              ) === String(i)
                            }
                            onChange={(e) =>
                              handleChangeAnswer(
                                currentQuestion.id,
                                e.target.value
                              )
                            }
                          />
                          <span className="text-slate-800 dark:text-slate-100">
                            {i + 1}.{' '}
                            {getOptionText(
                              currentQuestion,
                              opt.index,
                              language
                            )}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                )}

                {currentQuestion.type === 'sa' && (
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                    placeholder={
                      language === 'en'
                        ? 'Enter your answer'
                        : '정답을 입력하세요'
                    }
                    value={
                      answers[currentQuestion.id] || ''
                    }
                    onChange={(e) =>
                      handleChangeAnswer(
                        currentQuestion.id,
                        e.target.value
                      )
                    }
                  />
                )}

                {immediateFeedback && (
                  <div
                    className={`mt-3 rounded-md px-3 py-2 text-sm ${
                      immediateFeedback.isCorrect
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-900/30 dark:text-emerald-200'
                        : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/60 dark:bg-red-900/30 dark:text-red-200'
                    }`}
                  >
                    <p className="font-semibold">
                      {immediateFeedback.isCorrect
                        ? t.feedbackCorrect
                        : t.feedbackWrong}
                    </p>
                    <p className="mt-1">
                      {t.correctLabel}:{' '}
                      <span className="font-semibold">
                        {immediateFeedback.correctText}
                      </span>
                    </p>
                    {immediateFeedback.explanation && (
                      <p className="mt-1">
                        {t.explanation}:{' '}
                        <span className="text-slate-800 dark:text-slate-100">
                          {immediateFeedback.explanation}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCheckCurrent}
                    className="rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-3.5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
                  >
                    {t.checkAnswer}
                  </button>
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="rounded-full border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {isLastQuestion
                      ? t.showResult
                      : t.nextQuestion}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 결과 페이지 */}
      {step === 'result' && (
        <section className="space-y-3 text-[15px] md:text-base">
          {renderSummary()}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGoToSetup}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {t.retry}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default QuizPage;
