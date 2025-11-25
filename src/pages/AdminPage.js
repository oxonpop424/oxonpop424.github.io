// src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import {
    createQuestion,
    updateSettings,
    deleteQuestionById,
    updateQuestion,
} from '../api';
import SelectField from '../components/SelectField';

function AdminPage({
    questions,
    setQuestions,
    settings,
    setSettings,
}) {
    // 폼 상태
    const [type, setType] = useState('mc');
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [answerIndex, setAnswerIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [difficulty, setDifficulty] = useState('중');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);

    // 리스트 필터
    const [listDifficultyFilter, setListDifficultyFilter] =
        useState('all');
    const [listTypeFilter, setListTypeFilter] =
        useState('all');

    // 설정 상태
    const [timerEnabled, setTimerEnabled] = useState(
        !!settings.timerEnabled
    );
    const [timerMinutes, setTimerMinutes] = useState(
        settings.timerSeconds
            ? Math.round(settings.timerSeconds / 60)
            : 10
    );
    const [gradingMode, setGradingMode] = useState(
        settings.gradingMode || 'batch'
    );
    const [showCorrectOnWrong, setShowCorrectOnWrong] = useState(
        settings.showCorrectOnWrong !== undefined
            ? !!settings.showCorrectOnWrong
            : true
    );
    const [settingsSaving, setSettingsSaving] = useState(false);

    const [infoMessage, setInfoMessage] = useState('');

    useEffect(() => {
        if (!infoMessage) return;
        const id = setTimeout(() => setInfoMessage(''), 3000);
        return () => clearTimeout(id);
    }, [infoMessage]);

    const resetForm = () => {
        setType('mc');
        setQuestionText('');
        setOptions(['', '']);
        setAnswerIndex(0);
        setAnswer('');
        setDifficulty('중');
        setError('');
        setEditingId(null);
    };

    const handleOptionChange = (index, value) => {
        setOptions((prev) => {
            const copy = [...prev];
            copy[index] = value;
            return copy;
        });
    };

    const handleAddOption = () =>
        setOptions((prev) => [...prev, '']);

    const handleRemoveOption = (index) => {
        setOptions((prev) => prev.filter((_, i) => i !== index));
        if (answerIndex >= options.length - 1)
            setAnswerIndex(0);
    };

    // 문제 저장 (추가/수정)
    const handleSubmitQuestion = async (e) => {
        e.preventDefault();
        setError('');

        if (!questionText.trim()) {
            setError('문제를 입력해주세요.');
            return;
        }

        let payload;

        if (type === 'mc') {
            const cleaned = options
                .map((o) => o.trim())
                .filter(Boolean);
            if (cleaned.length < 2) {
                setError('객관식은 최소 2개의 보기가 필요합니다.');
                return;
            }
            payload = {
                type: 'mc',
                question: questionText.trim(),
                options: cleaned,
                answerIndex,
                difficulty,
            };
        } else {
            if (!answer.trim()) {
                setError('정답을 입력해주세요.');
                return;
            }
            payload = {
                type: 'sa',
                question: questionText.trim(),
                answer: answer.trim(),
                difficulty,
            };
        }

        try {
            setSaving(true);

            if (editingId) {
                const ok = window.confirm('이 문제를 수정할까요?');
                if (!ok) {
                    setSaving(false);
                    return;
                }

                const updatePayload = { id: editingId, ...payload };
                await updateQuestion(updatePayload);

                setQuestions(
                    questions.map((q) =>
                        q.id === editingId ? { ...q, ...payload } : q
                    )
                );

                setInfoMessage('문제가 수정되었습니다.');
                resetForm();
            } else {
                const ok = window.confirm('새 문제를 추가할까요?');
                if (!ok) {
                    setSaving(false);
                    return;
                }

                const res = await createQuestion(payload);
                const newQuestion = { id: res.id, ...payload };
                setQuestions([...questions, newQuestion]);
                setInfoMessage('문제가 추가되었습니다.');
                resetForm();
            }
        } catch (err) {
            console.error(err);
            setError('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (q) => {
        setEditingId(q.id);
        setType(q.type);
        setQuestionText(q.question);
        setDifficulty(q.difficulty || '중');

        if (q.type === 'mc') {
            setOptions(q.options || []);
            setAnswerIndex(q.answerIndex || 0);
            setAnswer('');
        } else {
            setOptions(['', '']);
            setAnswerIndex(0);
            setAnswer(q.answer || '');
        }
        setError('');
        setInfoMessage('편집 모드: 선택한 문제를 수정 중입니다.');
    };

    const handleDeleteClick = async (id) => {
        const ok = window.confirm('정말 이 문제를 삭제할까요?');
        if (!ok) return;

        try {
            await deleteQuestionById(id);
            setQuestions(questions.filter((q) => q.id !== id));
            if (editingId === id) {
                resetForm();
            }
            setInfoMessage('문제가 삭제되었습니다.');
        } catch (err) {
            console.error(err);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    // 설정 저장
    const handleSaveSettings = async () => {
        const ok = window.confirm('설정을 저장할까요?');
        if (!ok) return;

        try {
            setSettingsSaving(true);
            const seconds = Number(timerMinutes) * 60;

            const body = {
                timerEnabled,
                timerSeconds: seconds,
                gradingMode,
                showCorrectOnWrong,
            };

            await updateSettings(body);
            setSettings({ ...settings, ...body });
            setInfoMessage('설정이 저장되었습니다.');
        } catch (err) {
            console.error(err);
            alert('설정 저장 중 오류가 발생했습니다.');
        } finally {
            setSettingsSaving(false);
        }
    };

    const filteredQuestions = questions.filter((q) => {
        const diff = q.difficulty || '중';
        const typeMatch =
            listTypeFilter === 'all' || q.type === listTypeFilter;
        const diffMatch =
            listDifficultyFilter === 'all' ||
            diff === listDifficultyFilter;
        return typeMatch && diffMatch;
    });

    const filteredCount = filteredQuestions.length;

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col space-y-5 text-[15px] md:text-base">
            {/* 상단 헤더 카드 (로고는 App에서) */}
            <header className="overflow-hidden rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800">
                <div className="relative flex items-center justify-between gap-2">
                    <div className="space-y-1">
                        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            관리자 페이지
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            문제 관리 및 시험 전체 설정을 변경할 수 있습니다.
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-[1.4fr,0.9fr]">
                {/* 문제 관리 섹션 */}
                <section className="rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-50">
                            문제 관리
                        </h2>

                        {editingId && (
                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-500/60 dark:bg-amber-900/30 dark:text-amber-200">
                                편집 모드 · 수정 후 &quot;문제 수정&quot; 버튼을 눌러주세요
                            </span>
                        )}
                    </div>

                    {infoMessage && (
                        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 shadow-sm dark:border-emerald-500/60 dark:bg-emerald-900/30 dark:text-emerald-100">
                            {infoMessage}
                        </div>
                    )}

                    {/* 입력 폼 */}
                    <form
                        onSubmit={handleSubmitQuestion}
                        className="space-y-3 text-sm"
                    >
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    유형
                                </label>
                                <SelectField
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="mc">객관식</option>
                                    <option value="sa">주관식</option>
                                </SelectField>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    난이도
                                </label>
                                <SelectField
                                    value={difficulty}
                                    onChange={(e) =>
                                        setDifficulty(e.target.value)
                                    }
                                >
                                    <option value="상">상</option>
                                    <option value="중">중</option>
                                    <option value="하">하</option>
                                </SelectField>
                            </div>

                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                문제
                            </label>
                            <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                                rows={3}
                                value={questionText}
                                onChange={(e) =>
                                    setQuestionText(e.target.value)
                                }
                            />
                        </div>

                        {type === 'mc' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    보기 + 정답
                                </label>
                                <div className="space-y-1">
                                    {options.map((opt, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 text-xs md:text-sm"
                                        >
                                            <input
                                                type="radio"
                                                name="correctOption"
                                                className="h-4 w-4"
                                                checked={answerIndex === i}
                                                onChange={() =>
                                                    setAnswerIndex(i)
                                                }
                                            />
                                            <input
                                                type="text"
                                                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                                                placeholder={`보기 ${i + 1}`}
                                                value={opt}
                                                onChange={(e) =>
                                                    handleOptionChange(
                                                        i,
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            {options.length > 2 && (
                                                <button
                                                    type="button"
                                                    className="rounded-full border border-slate-300 px-2 py-1 text-[11px] text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                                    onClick={() =>
                                                        handleRemoveOption(i)
                                                    }
                                                >
                                                    삭제
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="mt-1 rounded-full border border-dashed border-slate-400 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                    onClick={handleAddOption}
                                >
                                    + 보기 추가
                                </button>
                            </div>
                        )}

                        {type === 'sa' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    정답 (주관식)
                                </label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                                    value={answer}
                                    onChange={(e) =>
                                        setAnswer(e.target.value)
                                    }
                                />
                            </div>
                        )}

                        {error && (
                            <p className="text-xs text-red-500">{error}</p>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
                            >
                                {saving
                                    ? '저장 중...'
                                    : editingId
                                        ? '문제 수정'
                                        : '문제 추가'}
                            </button>
                            <button
                                type="button"
                                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                                onClick={resetForm}
                            >
                                초기화
                            </button>
                        </div>
                    </form>

                    {/* 문제 목록 구분선 */}
                    <div className="mt-4 h-px w-full bg-slate-200 dark:bg-slate-800" />
                    {/* 상단 타이틀 + 필터 */}
                    <div className="mt-3 grid gap-3 md:grid-cols-2 md:items-center">
                        {/* 제목 영역 */}
                        <h3 className="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-50">
                            문제 목록{' '}
                            <span className="text-xs md:text-sm font-normal text-slate-500 dark:text-slate-400">
                                (현재 필터 기준 {filteredCount}개)
                            </span>
                        </h3>

                        {/* 필터 영역 */}
                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                            <div className="w-full">
                                <SelectField
                                    className="w-full text-sm md:text-base"
                                    value={listTypeFilter}
                                    onChange={(e) => setListTypeFilter(e.target.value)}
                                >
                                    <option value="all">전체 유형</option>
                                    <option value="mc">객관식</option>
                                    <option value="sa">주관식</option>
                                </SelectField>
                            </div>

                            <div className="w-full">
                                <SelectField
                                    className="w-full text-sm md:text-base"
                                    value={listDifficultyFilter}
                                    onChange={(e) =>
                                        setListDifficultyFilter(e.target.value)
                                    }
                                >
                                    <option value="all">전체 난이도</option>
                                    <option value="상">상</option>
                                    <option value="중">중</option>
                                    <option value="하">하</option>
                                </SelectField>
                            </div>
                        </div>
                    </div>



                    {/* 문제 목록 리스트 */}
                    <div className="mt-2 max-h-60 space-y-2 overflow-y-auto text-sm">
                        {filteredQuestions.map((q) => (
                            <div
                                key={q.id}
                                className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800"
                            >
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] sm:text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                                        <span className="font-semibold">
                                            {q.type === 'mc' ? '객관식' : '주관식'}
                                        </span>
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                        <span>난이도 {q.difficulty || '중'}</span>
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] sm:text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                                            onClick={() => handleEditClick(q)}
                                        >
                                            편집
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-full border border-red-300 px-2 py-0.5 text-[11px] sm:text-xs text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/30"
                                            onClick={() => handleDeleteClick(q.id)}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                                <p className="line-clamp-2 text-sm text-slate-800 dark:text-slate-100">
                                    {q.question}
                                </p>
                            </div>
                        ))}

                        {filteredQuestions.length === 0 && (
                            <p className="text-sm text-slate-400 dark:text-slate-500">
                                현재 필터 조건에 해당하는 문제가 없습니다.
                            </p>
                        )}
                    </div>


                </section>

                {/* 시험 설정 섹션 */}
                <section className="h-fit rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800">
                    <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-50">
                        시험 설정
                    </h2>

                    <div className="space-y-4 text-sm">
                        {/* 타이머 */}
                        <div className="space-y-3 border-b border-slate-200 pb-4 dark:border-slate-700">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        id="timerEnabled"
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={timerEnabled}
                                        onChange={(e) =>
                                            setTimerEnabled(e.target.checked)
                                        }
                                    />
                                    <label
                                        htmlFor="timerEnabled"
                                        className="text-sm text-slate-700 dark:text-slate-100"
                                    >
                                        타이머 사용
                                    </label>
                                </div>
                                {timerEnabled && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        현재 설정: {timerMinutes}분
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    시간 (분)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                                    value={timerMinutes}
                                    onChange={(e) =>
                                        setTimerMinutes(e.target.value)
                                    }
                                    disabled={!timerEnabled}
                                />
                            </div>
                        </div>

                        {/* 채점 모드 */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                채점 모드
                            </h3>

                            <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                                <label className="flex cursor-pointer items-start gap-2 text-xs">
                                    <input
                                        type="radio"
                                        name="gradingMode"
                                        className="mt-[2px]"
                                        value="immediate"
                                        checked={gradingMode === 'immediate'}
                                        onChange={(e) =>
                                            setGradingMode(e.target.value)
                                        }
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                            한 문제씩 바로 채점 모드
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            각 문제를 풀고 바로 정답을 확인하며 다음 문항으로
                                            넘어갑니다.
                                        </p>
                                    </div>
                                </label>

                                <label className="flex cursor-pointer items-start gap-2 text-xs">
                                    <input
                                        type="radio"
                                        name="gradingMode"
                                        className="mt-[2px]"
                                        value="batch"
                                        checked={gradingMode === 'batch'}
                                        onChange={(e) =>
                                            setGradingMode(e.target.value)
                                        }
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                            전체 채점 모드
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            모든 문제를 다 풀고 나서 한 번에 정답 확인 및 결과
                                            화면을 보여줍니다.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* 정답 표시 옵션 */}
                            <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                                    정답 표시 옵션
                                </h4>
                                <label className="flex cursor-pointer items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={showCorrectOnWrong}
                                        onChange={(e) =>
                                            setShowCorrectOnWrong(
                                                e.target.checked
                                            )
                                        }
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-100">
                                        틀린 문제의 정답을 보여주기
                                    </span>
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    체크 해제 시 수험자는 오답 여부만 확인하고, 정답 텍스트는
                                    볼 수 없습니다.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={settingsSaving}
                            className="mt-2 w-full rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
                        >
                            {settingsSaving
                                ? '설정 저장 중...'
                                : '설정 저장'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default AdminPage;
