// src/pages/GosiPage.js
import React, { useEffect, useState } from 'react';
import SelectField from '../components/SelectField';
import { submitAnswers } from '../api';

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 텍스트 리소스
const TEXT = {
    ko: {
        title: '고시 모드',
        name: '이름',
        email: '이메일',
        group: '문제 은행 그룹',
        selectPlaceholder: '선택해주세요',
        startExam: '시험 시작',
        submitAnswers: '정답 제출',
        retry: '다시 시험 보기',
        totalQuestions: (total, answered) =>
            `총 ${total}문제 · 답변 완료 ${answered}개`,
        resultTitle: '결과 요약',
        resultDesc: '정답 수와 각 문항별 정답/오답 상태를 확인하세요.',
        correctLabel: '정답',
        wrongLabel: '오답',
        myAnswer: '내 답',
        noAnswer: '(미응답)',
        explanation: '해설',
        correctRateLabel: (rate) => `정답률 ${rate}%`,
        alerts: {
            name: '이름을 입력해주세요.',
            email: '이메일을 입력해주세요.',
            group: '문제 은행 그룹을 선택해주세요.',
            noGroupInfo: '선택한 문제 은행 그룹 정보를 찾을 수 없습니다.',
            noQuestions: '선택한 그룹에 등록된 문제가 없습니다.',
            timeOver: '시간 종료!',
        },
        unitQuestion: '문항'
    },
    en: {
        title: 'Exam Mode',
        name: 'Name',
        email: 'Email',
        group: 'Question Bank Group',
        selectPlaceholder: 'Please select',
        startExam: 'Start Exam',
        submitAnswers: 'Submit Answers',
        retry: 'Take exam again',
        totalQuestions: (total, answered) =>
            `Total ${total} questions · Answered ${answered}`,
        resultTitle: 'Summary',
        resultDesc: 'Check which questions were correct or wrong.',
        correctLabel: 'Correct',
        wrongLabel: 'Wrong',
        myAnswer: 'Your answer',
        noAnswer: '(No answer)',
        explanation: 'Explanation',
        correctRateLabel: (rate) => `Accuracy ${rate}%`,
        alerts: {
            name: 'Please enter your name.',
            email: 'Please enter your email.',
            group: 'Please select a question bank group.',
            noGroupInfo: 'Cannot find the selected group info.',
            noQuestions: 'No questions in the selected group.',
            timeOver: 'Time is up!',
        },
        unitQuestion: 'questions'
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

function GosiPage({ questions, settings, groups = [], language = 'ko' }) {
    const t = TEXT[language] || TEXT.ko;

    // step: setup(시험 설정) | quiz(문제 풀이) | result(결과 보기)
    const [step, setStep] = useState('setup');

    // 사용자 정보
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const [quizQuestions, setQuizQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [resultMap, setResultMap] = useState({}); // { [id]: { correct: boolean } }

    const [remainingSeconds, setRemainingSeconds] = useState(null);
    const [timerRunning, setTimerRunning] = useState(false);

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

    // ------------------------------
    // 시험 시작 (설정 -> 문제 준비)
    // ------------------------------
    const handleStart = () => {
        if (!userName.trim()) {
            alert(t.alerts.name);
            return;
        }
        if (!userEmail.trim()) {
            alert(t.alerts.email);
            return;
        }
        if (!selectedGroupId) {
            alert(t.alerts.group);
            return;
        }

        const selectedGroup = groups.find(
            (g) => String(g.id) === String(selectedGroupId)
        );
        if (!selectedGroup) {
            alert(t.alerts.noGroupInfo);
            return;
        }

        const groupQuestions = questions.filter(
            (q) => String(q.groupId) === String(selectedGroupId)
        );

        if (groupQuestions.length === 0) {
            alert(t.alerts.noQuestions);
            return;
        }

        const limit =
            Number(selectedGroup.questionCount) || groupQuestions.length;

        const shuffled = shuffle(groupQuestions);
        const picked = shuffled.slice(
            0,
            Math.min(limit, shuffled.length)
        );

        const prepared = picked.map((q) => {
            if (q.type === 'mc') {
                // 보기 인덱스 기반으로 섞기
                const optionObjects = (q.options || []).map((_, i) => ({
                    index: i,
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
    // 전체 채점
    // ------------------------------
    const gradeAll = () => {
        if (!quizQuestions.length) return;

        let correct = 0;
        const newResult = {};

        quizQuestions.forEach((q) => {
            const userAnswer = answers[q.id];

            if (userAnswer == null || userAnswer === '') {
                return; // 미응답은 오답 (newResult 없음)
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
    // 정답 제출 (저장)
    // ------------------------------
    const handleGosiSubmit = async () => {
        const summary = gradeAll();
        if (!summary) return;

        setTimerRunning(false);
        setStep('result');

        const selectedGroup = groups.find(
            (g) => String(g.id) === String(selectedGroupId)
        );

        const details = quizQuestions.map((q) => {
            const rawUser = answers[q.id];

            // 기본값
            let userAnswerText = '';
            let correctAnswerText = '';

            if (q.type === 'mc') {
                // ✅ 객관식 → 항상 한글 보기 기준으로 저장
                const userIndex =
                    rawUser != null ? Number(rawUser) : null;
                const userOpt =
                    userIndex != null ? q.shuffledOptions[userIndex] : null;
                const userOptionIdx = userOpt ? userOpt.index : null;

                const koOptions = q.options || [];

                // 사용자 답(보기 텍스트, 한글)
                userAnswerText =
                    userOptionIdx != null
                        ? koOptions[userOptionIdx] || ''
                        : '';

                // 정답(한글)
                correctAnswerText = koOptions[q.answerIndex] || '';
            } else {
                // ✅ 주관식 → 언어에 따라 정답 텍스트 분기

                // 사용자가 입력한 건 그대로
                userAnswerText =
                    rawUser != null ? String(rawUser) : '';

                if (language === 'en') {
                    // 영어 모드로 시험 본 경우
                    correctAnswerText =
                        (q.answerEn && String(q.answerEn)) ||
                        (q.answer && String(q.answer)) ||
                        '';
                } else {
                    // 한국어 모드로 시험 본 경우
                    correctAnswerText =
                        (q.answer && String(q.answer)) ||
                        (q.answerEn && String(q.answerEn)) ||
                        '';
                }
            }

            const isCorrect =
                summary.newResult[q.id]?.correct === true;

            return {
                questionId: q.id,
                // ✅ 문제 텍스트는 어드민에서 한글 위주로 보고 싶어 하셔서 한글 question 사용
                questionText: q.question || '',
                userAnswer: userAnswerText,
                correctAnswer: correctAnswerText,
                isCorrect,
            };
        });

        const rate =
            summary.total > 0
                ? (summary.correct / summary.total) * 100
                : 0;

        try {
            await submitAnswers({
                userName,
                userEmail,
                groupId: selectedGroupId,
                groupName: selectedGroup?.name || '',
                scoreCorrect: summary.correct,
                scoreTotal: summary.total,
                scoreRate: rate,
                // 🔥 여기 details가 그대로 submissions 시트에 들어감
                details,
            });
        } catch (e) {
            console.error('정답 제출 전송 실패', e);
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
                            {t.correctLabel} {score.correct} / {score.total}
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
                                        {idx + 1}. {getQuestionText(q, language)}
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
        setRemainingSeconds(null);
        setTimerRunning(false);
    };

    // ------------------------------
    // 렌더링
    // ------------------------------

    // 1) 시험 설정 페이지
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
                            {/* 이름 */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {t.name}
                                </label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                                    value={userName}
                                    onChange={(e) =>
                                        setUserName(e.target.value)
                                    }
                                />
                            </div>

                            {/* 이메일 */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {t.email}
                                </label>
                                <input
                                    type="email"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                                    value={userEmail}
                                    onChange={(e) =>
                                        setUserEmail(e.target.value)
                                    }
                                />
                            </div>

                            {/* 문제 은행 그룹 */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {t.group}
                                </label>
                                <SelectField
                                    value={selectedGroupId}
                                    onChange={(e) =>
                                        setSelectedGroupId(e.target.value)
                                    }
                                >
                                    <option value="">
                                        {t.selectPlaceholder}
                                    </option>
                                    {sortedGroups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} ({g.questionCount} {t.unitQuestion})
                                        </option>
                                    ))}
                                </SelectField>
                            </div>
                        </div>

                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={handleStart}
                                className="w-full rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
                            >
                                {t.startExam}
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
                                        {t.totalQuestions(
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

            {/* 문제 풀이 화면 */}
            {step === 'quiz' && (
                <section className="rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800">
                    {quizQuestions.length > 0 && (
                        <>
                            <div className="space-y-4">
                                {quizQuestions.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800"
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <h3 className="text-base font-medium text-slate-800 dark:text-slate-50">
                                                {idx + 1}.{' '}
                                                {getQuestionText(q, language)}
                                            </h3>
                                            {q.groupName && (
                                                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                                    {q.groupName}
                                                </span>
                                            )}
                                        </div>

                                        {q.type === 'mc' && (
                                            <div className="space-y-1">
                                                {q.shuffledOptions.map((opt, i) => (
                                                    <label
                                                        key={i}
                                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-base hover:bg-slate-100 dark:hover:bg-slate-700"
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
                                                            {i + 1}.{' '}
                                                            {getOptionText(
                                                                q,
                                                                opt.index,
                                                                language
                                                            )}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {q.type === 'sa' && (
                                            <input
                                                type="text"
                                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                                                placeholder={
                                                    language === 'en'
                                                        ? 'Enter your answer'
                                                        : '정답을 입력하세요'
                                                }
                                                value={answers[q.id] || ''}
                                                onChange={(e) =>
                                                    handleChangeAnswer(
                                                        q.id,
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleGosiSubmit}
                                    className="rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
                                >
                                    {t.submitAnswers}
                                </button>
                            </div>
                        </>
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

export default GosiPage;
