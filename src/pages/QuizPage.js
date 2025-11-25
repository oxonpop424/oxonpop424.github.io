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

function QuizPage({ questions, settings }) {
    // step: setup(시험 설정) | quiz(문제 풀이) | result(결과 보기)
    const [step, setStep] = useState('setup');

    const [difficulty, setDifficulty] = useState('all'); // all / 상 / 중 / 하
    const [count, setCount] = useState('10'); // 5 / 10 / 20 / all

    const [quizQuestions, setQuizQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [resultMap, setResultMap] = useState({}); // { [id]: { correct: boolean } }

    const [remainingSeconds, setRemainingSeconds] = useState(null);
    const [timerRunning, setTimerRunning] = useState(false);

    // 즉시 채점 모드용
    const [currentIndex, setCurrentIndex] = useState(0);
    const [immediateFeedback, setImmediateFeedback] = useState(null); // { isCorrect, correctText }

    // 전체채점 모드 상태
    const [batchPhase, setBatchPhase] = useState('answering'); // 'answering' | 'answers'

    const timerEnabled = settings?.timerEnabled;
    const totalSeconds = settings?.timerSeconds || 0;

    const rawGradingMode = settings?.gradingMode;
    const gradingMode =
        rawGradingMode === 'immediate' ? 'immediate' : 'batch';

    const showCorrectOnWrong = !!settings?.showCorrectOnWrong;

    const filteredQuestions =
        difficulty === 'all'
            ? questions
            : questions.filter(
                (q) => (q.difficulty || '중') === difficulty
            );

    const totalAvailable = filteredQuestions.length;

    // ------------------------------
    // 공통 유틸
    // ------------------------------
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
        timerEnabled && totalSeconds > 0 && remainingSeconds != null
            ? Math.max(0, (remainingSeconds / totalSeconds) * 100)
            : 0;

    // ------------------------------
    // 시험 시작 (설정 -> 문제 준비)
    // ------------------------------
    const handleStart = () => {
        if (filteredQuestions.length === 0) {
            alert('해당 난이도의 문제가 없습니다.');
            return;
        }

        const c = count === 'all' ? 'all' : Number(count);
        const shuffled = shuffle(filteredQuestions);
        const picked =
            c === 'all' || c >= shuffled.length
                ? shuffled
                : shuffled.slice(0, c);

        const prepared = picked.map((q) => {
            if (q.type === 'mc') {
                const optionObjects = q.options.map((text, i) => ({
                    text,
                    isCorrect: i === q.answerIndex,
                }));
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
        setBatchPhase('answering');
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
    // 전체 채점 (두 모드 공용)
    // ------------------------------
    const gradeAll = () => {
        if (!quizQuestions.length) return;

        let correct = 0;
        const newResult = {};

        quizQuestions.forEach((q) => {
            const userAnswer = answers[q.id];

            if (userAnswer == null || userAnswer === '') {
                return; // 미응답은 오답으로 간주 (newResult 없는 상태)
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
                const user = String(userAnswer)
                    .trim()
                    .toLowerCase();
                const right = String(q.answer)
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

            alert('시간 종료!');
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
    }, [timerRunning, remainingSeconds]);

    // ------------------------------
    // 전체 채점 모드: 정답 확인 / 결과 보기
    // ------------------------------
    const handleBatchCheckAnswers = () => {
        gradeAll();
        setBatchPhase('answers');
    };

    const handleBatchShowSummary = () => {
        gradeAll();
        setTimerRunning(false);
        setStep('result');
    };

    // ------------------------------
    // 즉시 채점 모드: 현재 문제 정답 확인 / 다음 / 결과 보기
    // ------------------------------
    const currentQuestion =
        gradingMode === 'immediate'
            ? quizQuestions[currentIndex]
            : null;

    const isLastQuestion =
        gradingMode === 'immediate' &&
        currentIndex === quizQuestions.length - 1;

    const handleCheckCurrent = () => {
        const q = currentQuestion;
        if (!q) return;

        const userAnswer = answers[q.id];

        if (userAnswer == null || userAnswer === '') {
            alert('먼저 답을 선택/입력해주세요.');
            return;
        }

        let isCorrect = false;
        let correctText = '';

        if (q.type === 'mc') {
            const userIndex = Number(userAnswer);
            const correctIndex = q.shuffledOptions.findIndex(
                (o) => o.isCorrect
            );
            isCorrect = userIndex === correctIndex;
            correctText =
                q.shuffledOptions[correctIndex]?.text || '';
        } else {
            const user = String(userAnswer)
                .trim()
                .toLowerCase();
            const right = String(q.answer)
                .trim()
                .toLowerCase();
            isCorrect = user === right;
            correctText = q.answer;
        }

        setImmediateFeedback({
            isCorrect,
            correctText,
        });

        gradeAll(); // 누적 점수 업데이트
    };

    const handleNextQuestion = () => {
        if (currentIndex < quizQuestions.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            setImmediateFeedback(null);
        } else {
            // 마지막 문제 → 결과 보기
            gradeAll();
            setTimerRunning(false);
            setImmediateFeedback(null);
            setStep('result');
        }
    };

    // ------------------------------
    // 결과 페이지 공통 UI
    // ------------------------------
    // 결과 페이지 공통 UI
    const renderSummary = () => {
        if (!score || !quizQuestions.length) return null;

        const correctRate = Math.round(
            (score.correct / score.total) * 100
        );

        return (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 text-base shadow-md dark:border-slate-700 dark:bg-slate-900/90">
                {/* 상단 요약 영역 */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            결과 요약
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            정답 수와 각 문항별 정답/오답 상태를 확인하세요.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-4 py-1.5 text-sm font-semibold text-white shadow-md">
                            정답 {score.correct} / {score.total}
                        </div>
                        <div className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                            정답률 {correctRate}%
                        </div>
                    </div>
                </div>

                {/* 문항별 정답 여부 영역 */}
                <div className="mt-2">
                    <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        문항별 정답 여부
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                        {quizQuestions.map((q, idx) => {
                            const r = resultMap[q.id];
                            const isCorrect = r?.correct === true;
                            const label = isCorrect ? '정답' : '오답';

                            const boxClass = isCorrect
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-900/30 dark:text-emerald-200'
                                : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/60 dark:bg-red-900/30 dark:text-red-200';

                            return (
                                <div
                                    key={q.id}
                                    className={`flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs md:text-sm ${boxClass}`}
                                >
                                    <span className="font-medium">
                                        {idx + 1}번
                                    </span>
                                    <span>{label}</span>
                                </div>
                            );
                        })}
                    </div>
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
        setBatchPhase('answering');
        setCurrentIndex(0);
        setRemainingSeconds(null);
        setTimerRunning(false);
    };

    // ------------------------------
    // 렌더링
    // ------------------------------

    // 1) 시험 설정 페이지
    if (step === 'setup') {
        return (
            <div className="mx-auto w-full max-w-5xl text-[15px] md:text-base">
                <div className="relative w-full overflow-hidden rounded-2xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-100 dark:bg-slate-900/90 dark:ring-slate-800">
                    {/* 상단 그래디언트 바 */}
                    <div className="relative space-y-5">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            시험 설정
                        </h2>

                        <div className="space-y-4 text-sm">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    난이도
                                </label>
                                <SelectField
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                >
                                    <option value="all">전체</option>
                                    <option value="상">상</option>
                                    <option value="중">중</option>
                                    <option value="하">하</option>
                                </SelectField>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    선택한 난이도의 문제만 출제됩니다. (현재{' '}
                                    {totalAvailable}문제)
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        문제 수
                                    </label>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        이 난이도에서 총 {totalAvailable}문제
                                    </span>
                                </div>
                                <SelectField
                                    value={count}
                                    onChange={(e) => setCount(e.target.value)}
                                >
                                    <option value="5">5문제</option>
                                    <option value="10">10문제</option>
                                    <option value="20">20문제</option>
                                    <option value="all">전체</option>
                                </SelectField>
                            </div>

                            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <div>
                                    채점 모드:{' '}
                                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                                        {gradingMode === 'immediate'
                                            ? '한 문제씩 바로 채점'
                                            : '전체 채점'}
                                    </span>
                                </div>
                                <div>
                                    틀린 문제 정답 표시:{' '}
                                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                                        {showCorrectOnWrong ? '표시함' : '표시 안 함'}
                                    </span>
                                </div>
                                {timerEnabled && totalSeconds > 0 && (
                                    <div>
                                        시간 제한:{' '}
                                        <span className="font-semibold">
                                            {Math.round(totalSeconds / 60)}분
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={handleStart}
                                className="w-full rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
                            >
                                문제풀기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2) 문제 풀이 / 결과 페이지 공통 상단 타이머 + 상태
    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col space-y-4 px-4 text-[15px] md:text-base">
            {/* 타이머 & 상태 바 */}
            <div className="flex flex-col gap-2 rounded-2xl bg-white/90 p-4 shadow-md ring-1 ring-slate-100 dark:bg-slate-900/90 dark:ring-slate-800">
                <div className="flex items-center justify-between text-sm">
                    <div className="font-medium text-slate-700 dark:text-slate-200">
                        {step === 'quiz' ? '문제 풀이 중' : '결과 확인 중'}
                    </div>
                    {timerEnabled && totalSeconds > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {remainingSeconds != null
                                    ? formatTime(remainingSeconds)
                                    : formatTime(totalSeconds)}
                            </span>
                        </div>
                    )}
                </div>

                {timerEnabled && totalSeconds > 0 && (
                    <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                            className="h-2.5 rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] transition-[width]"
                            style={{ width: `${timeProgress}%` }}
                        />
                    </div>
                )}

                {quizQuestions.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>
                            총 {quizQuestions.length}문제 · 답변 완료 {answeredCount}개
                        </span>
                        {score && (
                            <span className="font-semibold text-sky-600 dark:text-sky-400">
                                정답 {score.correct} / {score.total}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* 2-1) 퀴즈 화면 */}
            {step === 'quiz' && (
                <section className="rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800">
                    {/* 전체 채점 모드 */}
                    {quizQuestions.length > 0 && gradingMode === 'batch' && (
                        <>
                            <div className="space-y-4">
                                {quizQuestions.map((q, idx) => {
                                    const result = resultMap[q.id];
                                    const isCorrect = result?.correct;
                                    const hasResult = result !== undefined;

                                    const borderClass =
                                        batchPhase !== 'answering'
                                            ? hasResult
                                                ? isCorrect
                                                    ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-900/30'
                                                    : 'border-red-300 bg-red-50 dark:border-red-500/60 dark:bg-red-900/30'
                                                : 'border-red-300 bg-red-50 dark:border-red-500/60 dark:bg-red-900/30'
                                            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800';

                                    return (
                                        <div
                                            key={q.id}
                                            className={`rounded-xl border p-3.5 text-sm shadow-sm ${borderClass}`}
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <h3 className="text-base font-medium text-slate-800 dark:text-slate-50">
                                                    {idx + 1}. {q.question}
                                                </h3>
                                                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                                    난이도 {q.difficulty || '중'}
                                                </span>
                                            </div>

                                            {q.type === 'mc' && (
                                                <div className="space-y-1">
                                                    {q.shuffledOptions.map((opt, i) => (
                                                        <label
                                                            key={i}
                                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        >
                                                            <input
                                                                type="radio"
                                                                className="h-4 w-4"
                                                                name={`q_${q.id}`}
                                                                value={i}
                                                                checked={
                                                                    String(answers[q.id]) ===
                                                                    String(i)
                                                                }
                                                                onChange={(e) =>
                                                                    handleChangeAnswer(
                                                                        q.id,
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-slate-800 dark:text-slate-100">
                                                                {i + 1}. {opt.text}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {q.type === 'sa' && (
                                                <input
                                                    type="text"
                                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                                                    placeholder="정답을 입력하세요"
                                                    value={answers[q.id] || ''}
                                                    onChange={(e) =>
                                                        handleChangeAnswer(
                                                            q.id,
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            )}

                                            {batchPhase !== 'answering' &&
                                                showCorrectOnWrong && (
                                                    <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">
                                                        정답:{' '}
                                                        <span className="font-semibold">
                                                            {q.type === 'mc'
                                                                ? q.shuffledOptions.find(
                                                                    (o) => o.isCorrect
                                                                )?.text
                                                                : q.answer}
                                                        </span>
                                                    </p>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleBatchCheckAnswers}
                                    className="rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
                                >
                                    정답 확인
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBatchShowSummary}
                                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                                >
                                    결과 보기
                                </button>
                            </div>
                        </>
                    )}

                    {/* 한 문제씩 즉시 채점 모드 */}
                    {quizQuestions.length > 0 && gradingMode === 'immediate' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                    {currentIndex + 1} / {quizQuestions.length}번 문제
                                </span>
                                {score && (
                                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                                        정답 {score.correct} / {score.total}
                                    </span>
                                )}
                            </div>

                            {currentQuestion && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <h3 className="text-base font-medium text-slate-800 dark:text-slate-50">
                                            {currentIndex + 1}. {currentQuestion.question}
                                        </h3>
                                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                            난이도 {currentQuestion.difficulty || '중'}
                                        </span>
                                    </div>

                                    {currentQuestion.type === 'mc' && (
                                        <div className="space-y-1">
                                            {currentQuestion.shuffledOptions.map((opt, i) => (
                                                <label
                                                    key={i}
                                                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
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
                                                        {i + 1}. {opt.text}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {currentQuestion.type === 'sa' && (
                                        <input
                                            type="text"
                                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                                            placeholder="정답을 입력하세요"
                                            value={answers[currentQuestion.id] || ''}
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
                                            className={`mt-3 rounded-md px-3 py-2 text-xs ${immediateFeedback.isCorrect
                                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-900/30 dark:text-emerald-200'
                                                : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/60 dark:bg-red-900/30 dark:text-red-200'
                                                }`}
                                        >
                                            <p className="font-semibold">
                                                {immediateFeedback.isCorrect
                                                    ? '정답입니다!'
                                                    : '오답입니다.'}
                                            </p>
                                            {!immediateFeedback.isCorrect &&
                                                showCorrectOnWrong && (
                                                    <p className="mt-1">
                                                        정답:{' '}
                                                        <span className="font-semibold">
                                                            {immediateFeedback.correctText}
                                                        </span>
                                                    </p>
                                                )}
                                        </div>
                                    )}

                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCheckCurrent}
                                            className="rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-3.5 py-2 text-xs font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
                                        >
                                            정답 확인
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNextQuestion}
                                            className="rounded-full border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                                        >
                                            {isLastQuestion ? '결과 보기' : '다음 문제'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* 3) 결과 페이지 */}
            {step === 'result' && (
                <section className="space-y-3 text-[15px] md:text-base">
                    {renderSummary()}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleGoToSetup}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            다시 문제풀기
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}

export default QuizPage;
