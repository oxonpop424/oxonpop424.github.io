// src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import {
  createQuestion,
  deleteQuestionById,
  updateQuestion,
  createGroup,
  updateGroup,
  deleteGroup,
  fetchSubmissions,
  deleteSubmission,
} from '../api';
import SelectField from '../components/SelectField';

// 공통 스타일 유틸
const CARD_CLASS =
  'rounded-2xl bg-white/95 p-5 shadow-lg ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800';
const SECTION_TITLE_CLASS =
  'mb-4 text-sm md:text-base font-semibold text-slate-900 dark:text-slate-50';
const LABEL_CLASS =
  'text-sm font-medium text-slate-700 dark:text-slate-300';
const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm md:text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50';
const SMALL_TEXT_MUTED =
  'text-base text-slate-500 dark:text-slate-400';

function AdminPage({
  questions,
  setQuestions,
  groups = [],
  setGroups,
}) {
  // ----------- 문제 폼 상태 ----------- //
  const [type, setType] = useState('mc');

  // 한글
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [answerIndex, setAnswerIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  // 영어
  const [questionTextEn, setQuestionTextEn] = useState('');
  const [optionsEn, setOptionsEn] = useState(['', '']);
  const [answerEn, setAnswerEn] = useState('');
  const [explanationEn, setExplanationEn] = useState('');

  const [questionGroupId, setQuestionGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  // 리스트 필터/페이지네이션
  const [listTypeFilter, setListTypeFilter] = useState('all');
  const [listGroupFilter, setListGroupFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ✅ 문제 체크 삭제 상태
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);

  // 그룹 관리
  const [groupName, setGroupName] = useState('');
  const [groupQuestionCount, setGroupQuestionCount] = useState('10');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupSaving, setGroupSaving] = useState(false);

  // 제출된 정답
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (!infoMessage) return;
    const id = setTimeout(() => setInfoMessage(''), 3000);
    return () => clearTimeout(id);
  }, [infoMessage]);

  // 제출된 정답 로드
  useEffect(() => {
    const load = async () => {
      try {
        setSubmissionsLoading(true);
        const data = await fetchSubmissions();
        setSubmissions(data.submissions || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSubmissionsLoading(false);
      }
    };
    load();
  }, []);

  // ------------------- 공용 유틸 ------------------- //
  const resetForm = () => {
    setType('mc');
    setQuestionText('');
    setQuestionTextEn('');
    setOptions(['', '']);
    setOptionsEn(['', '']);
    setAnswerIndex(0);
    setAnswer('');
    setAnswerEn('');
    setQuestionGroupId('');
    setExplanation('');
    setExplanationEn('');
    setError('');
    setEditingId(null);
  };

  // 한글 보기
  const handleOptionChange = (index, value) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // 영어 보기
  const handleOptionEnChange = (index, value) => {
    setOptionsEn((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, '']);
    setOptionsEn((prev) => [...prev, '']);
  };

  const handleRemoveOption = (index) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setOptionsEn((prev) => prev.filter((_, i) => i !== index));
    setAnswerIndex((prev) => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  // ----------- 문제 저장 (추가/수정) ----------- //
  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    setError('');

    if (!questionText.trim()) {
      setError('문제를 입력해주세요. (한국어)');
      return;
    }
    if (!questionGroupId) {
      setError('문제 은행 그룹을 선택해주세요.');
      return;
    }

    const group = groups.find((g) => String(g.id) === String(questionGroupId));
    let payload;

    if (type === 'mc') {
      const cleanedOptions = options.map((o) => o.trim());
      const nonEmptyCount = cleanedOptions.filter(Boolean).length;
      if (nonEmptyCount < 2) {
        setError('객관식은 최소 2개의 보기가 필요합니다. (한국어)');
        return;
      }
      const cleanedOptionsEn = optionsEn.map((o) => o.trim());

      payload = {
        type: 'mc',
        // 한국어
        question: questionText.trim(),
        options: cleanedOptions,
        answerIndex,
        explanation: explanation.trim(),
        // 영어
        questionEn: questionTextEn.trim(),
        optionsEn: cleanedOptionsEn,
        answerEn: answerEn.trim(), // 필요 시 사용, 없어도 무방
        explanationEn: explanationEn.trim(),
        // 그룹
        groupId: questionGroupId,
        groupName: group?.name || '',
      };
    } else {
      if (!answer.trim()) {
        setError('정답을 입력해주세요. (한국어)');
        return;
      }
      payload = {
        type: 'sa',
        // 한국어
        question: questionText.trim(),
        answer: answer.trim(),
        explanation: explanation.trim(),
        // 영어
        questionEn: questionTextEn.trim(),
        answerEn: answerEn.trim(),
        explanationEn: explanationEn.trim(),
        // 그룹
        groupId: questionGroupId,
        groupName: group?.name || '',
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

    // 한국어
    setQuestionText(q.question || '');
    setExplanation(q.explanation || '');
    setQuestionGroupId(q.groupId || '');
    if (q.type === 'mc') {
      const koOptions = q.options || [];
      const enOptions =
        q.optionsEn && q.optionsEn.length
          ? q.optionsEn
          : new Array(koOptions.length).fill('');
      setOptions(koOptions);
      setOptionsEn(enOptions);
      setAnswerIndex(q.answerIndex ?? 0);
      setAnswer('');
      setAnswerEn(q.answerEn || '');
    } else {
      setOptions(['', '']);
      setOptionsEn(['', '']);
      setAnswer(q.answer || '');
      setAnswerEn(q.answerEn || '');
      setAnswerIndex(0);
    }

    // 영어
    setQuestionTextEn(q.questionEn || '');
    setExplanationEn(q.explanationEn || '');

    setError('');
    setInfoMessage('수정 모드: 선택한 문제를 수정 중입니다.');
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
      setSelectedQuestionIds((prev) => prev.filter((x) => x !== id));
      setInfoMessage('문제가 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // ✅ 문제 체크박스 토글
  const toggleSelectQuestion = (id) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  // ----------- 그룹 관리 ----------- //
  const resetGroupForm = () => {
    setGroupName('');
    setGroupQuestionCount('10');
    setEditingGroupId(null);
  };

  const handleSubmitGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('그룹 이름을 입력해주세요.');
      return;
    }
    const count = Number(groupQuestionCount) || 0;
    if (count <= 0) {
      alert('출제 문제 수는 1 이상이어야 합니다.');
      return;
    }

    try {
      setGroupSaving(true);
      if (editingGroupId) {
        const res = await updateGroup({
          id: editingGroupId,
          name: groupName.trim(),
          questionCount: count,
        });
        const updated = res.group || {
          id: editingGroupId,
          name: groupName.trim(),
          questionCount: count,
        };
        setGroups &&
          setGroups(
            groups.map((g) =>
              g.id === editingGroupId ? updated : g
            )
          );
      } else {
        const res = await createGroup({
          name: groupName.trim(),
          questionCount: count,
        });
        const newGroup = res.group || {
          id: res.id,
          name: groupName.trim(),
          questionCount: count,
        };
        setGroups && setGroups([...(groups || []), newGroup]);
      }
      resetGroupForm();
      setInfoMessage('그룹 설정이 저장되었습니다.');
    } catch (e) {
      console.error(e);
      alert('그룹 저장 중 오류가 발생했습니다.');
    } finally {
      setGroupSaving(false);
    }
  };

  const handleEditGroup = (g) => {
    setEditingGroupId(g.id);
    setGroupName(g.name);
    setGroupQuestionCount(String(g.questionCount || 10));
  };

  const handleDeleteGroupClick = async (id) => {
    const ok = window.confirm(
      '이 그룹을 삭제하려면, 먼저 이 그룹에 속한 문제를 모두 삭제하거나 다른 그룹으로 옮겨야 합니다.\n삭제를 계속할까요?'
    );
    if (!ok) return;

    try {
      const res = await deleteGroup(id);

      if (res.status === 'error') {
        if (res.code === 'GROUP_HAS_QUESTIONS') {
          alert(
            '이 그룹에 속한 문제가 있어서 삭제할 수 없습니다.\n문제 목록에서 해당 그룹 문제를 먼저 정리해주세요.'
          );
        } else {
          alert(
            '그룹 삭제 중 오류가 발생했습니다.\n' +
              (res.message || '알 수 없는 오류')
          );
        }
        return;
      }

      setGroups && setGroups(groups.filter((g) => g.id !== id));
    } catch (e) {
      console.error(e);
      alert('그룹 삭제 중 오류가 발생했습니다.');
    }
  };

  // ----------- 제출된 정답 관리 ----------- //
  const handleDeleteSubmissionClick = async (id) => {
    const ok = window.confirm('이 정답 기록을 삭제할까요?');
    if (!ok) return;
    try {
      await deleteSubmission(id);
      setSubmissions(submissions.filter((s) => s.id !== id));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

//   const handleExportCsv = () => {
//     if (!submissions.length) {
//       alert('내보낼 데이터가 없습니다.');
//       return;
//     }
//     const header = [
//       'id',
//       'timestamp',
//       'userName',
//       'userEmail',
//       'groupName',
//       'scoreCorrect',
//       'scoreTotal',
//       'scoreRate',
//     ];
//     const lines = [
//       header.join(','),
//       ...submissions.map((s) =>
//         [
//           s.id,
//           s.timestamp,
//           `"${s.userName || ''}"`,
//           `"${s.userEmail || ''}"`,
//           `"${s.groupName || ''}"`,
//           s.scoreCorrect,
//           s.scoreTotal,
//           s.scoreRate,
//         ].join(',')
//       ),
//     ];
//     const blob = new Blob([lines.join('\n')], {
//       type: 'text/csv;charset=utf-8;',
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'submissions.csv';
//     a.click();
//     URL.revokeObjectURL(url);
//   };

  // ----------- 문제 목록 필터/페이지네이션 ----------- //
  const sortedGroups = [...(groups || [])].sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );

  const filteredQuestions = questions.filter((q) => {
    const typeMatch =
      listTypeFilter === 'all' || q.type === listTypeFilter;
    const groupMatch =
      listGroupFilter === 'all' ||
      String(q.groupId) === String(listGroupFilter);
    return typeMatch && groupMatch;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQuestions.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedQuestions = filteredQuestions.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const filteredCount = filteredQuestions.length;

  const allFilteredSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((q) =>
      selectedQuestionIds.includes(q.id)
    );

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedQuestionIds((prev) =>
        prev.filter(
          (id) => !filteredQuestions.some((q) => q.id === id)
        )
      );
    } else {
      const idsToAdd = filteredQuestions.map((q) => q.id);
      setSelectedQuestionIds((prev) =>
        Array.from(new Set([...prev, ...idsToAdd]))
      );
    }
  };

  // ✅ 선택한 문제 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedQuestionIds.length === 0) {
      alert('삭제할 문제를 선택해주세요.');
      return;
    }
    const ok = window.confirm(
      `선택한 ${selectedQuestionIds.length}개의 문제를 삭제할까요?`
    );
    if (!ok) return;

    try {
      for (const id of selectedQuestionIds) {
        await deleteQuestionById(id);
      }

      setQuestions(
        questions.filter(
          (q) => !selectedQuestionIds.includes(q.id)
        )
      );

      if (editingId && selectedQuestionIds.includes(editingId)) {
        resetForm();
      }

      setSelectedQuestionIds([]);
      setInfoMessage('선택한 문제가 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      alert('선택 삭제 중 오류가 발생했습니다.');
    }
  };

  // ----------- 렌더 ----------- //
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col space-y-6 text-[15px] md:text-base">
      {/* 상단 헤더 */}
      <header className="overflow-hidden rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 dark:bg-slate-900/95 dark:ring-slate-800">
        <div className="relative flex items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              관리자 페이지
            </h1>
            <p className={SMALL_TEXT_MUTED}>
              문제 은행 그룹, 문제 등록, 문제 목록, 제출된 정답을
              관리합니다.
            </p>
          </div>
        </div>
      </header>

      {/* 메시지 */}
      {infoMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm dark:border-emerald-500/60 dark:bg-emerald-900/30 dark:text-emerald-100">
          {infoMessage}
        </div>
      )}

      {/* 카드 1: 문제 은행 그룹 관리 */}
      <section className={CARD_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>문제 은행 그룹</h2>

        {/* 그룹 폼 */}
        <form
          onSubmit={handleSubmitGroup}
          className="space-y-3 text-sm"
        >
          <div className="space-y-1">
            <label className={LABEL_CLASS}>그룹 이름</label>
            <input
              type="text"
              className={INPUT_CLASS}
              value={groupName}
              onChange={(e) =>
                setGroupName(e.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASS}>출제 문제 수</label>
            <input
              type="number"
              min={1}
              className={INPUT_CLASS}
              value={groupQuestionCount}
              onChange={(e) =>
                setGroupQuestionCount(e.target.value)
              }
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={groupSaving}
              className="rounded-full bg-gradient-to-r from-[#0575E6] to-[#00F260] px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0575E6]"
            >
              {editingGroupId ? '그룹 수정' : '그룹 추가'}
            </button>
            <button
              type="button"
              onClick={resetGroupForm}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              초기화
            </button>
          </div>
        </form>

        {/* 그룹 리스트 */}
        <div className="mt-5 h-px w-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 space-y-2 text-sm md:text-base">
          {sortedGroups.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="text-base text-slate-800 dark:text-slate-100">
                <span className="font-semibold">
                  {g.name}
                </span>{' '}
                <span className={SMALL_TEXT_MUTED}>
                  ({g.questionCount}문항 출제)
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleEditGroup(g)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="rounded-full border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/30"
                  onClick={() =>
                    handleDeleteGroupClick(g.id)
                  }
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {!sortedGroups.length && (
            <p className={SMALL_TEXT_MUTED}>
              아직 등록된 그룹이 없습니다.
            </p>
          )}
        </div>
      </section>

      {/* 카드 2: 문제 등록 / 수정 */}
      <section className={CARD_CLASS}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className={SECTION_TITLE_CLASS}>
            문제 등록 / 수정
          </h2>
          {editingId && (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/60 dark:bg-amber-900/30 dark:text-amber-200">
              수정 모드 · 수정 후 "문제 수정" 버튼을 눌러주세요
            </span>
          )}
        </div>

        <form
          onSubmit={handleSubmitQuestion}
          className="space-y-3 text-sm md:text-base"
        >
          {/* 그룹 / 유형 */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className={LABEL_CLASS}>
                문제 은행 그룹
              </label>
              <SelectField
                value={questionGroupId}
                onChange={(e) =>
                  setQuestionGroupId(e.target.value)
                }
              >
                <option value="">그룹 선택</option>
                {sortedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.questionCount}문항)
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <label className={LABEL_CLASS}>유형</label>
              <SelectField
                value={type}
                onChange={(e) =>
                  setType(e.target.value)
                }
              >
                <option value="mc">객관식</option>
                <option value="sa">주관식</option>
              </SelectField>
            </div>
          </div>

          {/* 문제 (한/영) */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className={LABEL_CLASS}>
                문제 (한국어)
              </label>
              <textarea
                className={INPUT_CLASS}
                rows={3}
                value={questionText}
                onChange={(e) =>
                  setQuestionText(e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLASS}>
                문제 (English)
              </label>
              <textarea
                className={INPUT_CLASS}
                rows={3}
                value={questionTextEn}
                onChange={(e) =>
                  setQuestionTextEn(e.target.value)
                }
                placeholder="Optional"
              />
            </div>
          </div>

          {/* 객관식 보기 / 주관식 정답 */}
          {type === 'mc' && (
            <div className="space-y-1">
              <label className={LABEL_CLASS}>
                보기 + 정답 (한/영)
              </label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div
                    key={i}
                    className="space-y-1 rounded-md bg-slate-50 p-2 dark:bg-slate-800/70"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="correctOption"
                        className="h-4 w-4"
                        checked={answerIndex === i}
                        onChange={() =>
                          setAnswerIndex(i)
                        }
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        보기 {i + 1}
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <input
                        type="text"
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm md:text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                        placeholder={`보기 ${i + 1} (한국어)`}
                        value={opt}
                        onChange={(e) =>
                          handleOptionChange(
                            i,
                            e.target.value
                          )
                        }
                      />
                      <input
                        type="text"
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm md:text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0575E6] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                        placeholder={`Option ${i + 1} (English)`}
                        value={optionsEn[i] || ''}
                        onChange={(e) =>
                          handleOptionEnChange(
                            i,
                            e.target.value
                          )
                        }
                      />
                    </div>
                    {options.length > 2 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                          onClick={() =>
                            handleRemoveOption(i)
                          }
                        >
                          보기 삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-1 rounded-full border border-dashed border-slate-400 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={handleAddOption}
              >
                + 보기 추가
              </button>
            </div>
          )}

          {type === 'sa' && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className={LABEL_CLASS}>
                  정답 (주관식, 한국어)
                </label>
                <input
                  type="text"
                  className={INPUT_CLASS}
                  value={answer}
                  onChange={(e) =>
                    setAnswer(e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className={LABEL_CLASS}>
                  정답 (주관식, English)
                </label>
                <input
                  type="text"
                  className={INPUT_CLASS}
                  value={answerEn}
                  onChange={(e) =>
                    setAnswerEn(e.target.value)
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {/* 해설 (한/영) */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className={LABEL_CLASS}>
                해설 (한국어, 선택)
              </label>
              <textarea
                rows={2}
                className={INPUT_CLASS}
                placeholder="문제에 대한 해설을 입력하세요."
                value={explanation}
                onChange={(e) =>
                  setExplanation(e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLASS}>
                해설 (English, 선택)
              </label>
              <textarea
                rows={2}
                className={INPUT_CLASS}
                placeholder="Optional explanation in English"
                value={explanationEn}
                onChange={(e) =>
                  setExplanationEn(e.target.value)
                }
              />
            </div>
          </div>

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
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={resetForm}
            >
              초기화
            </button>
          </div>
        </form>
      </section>

      {/* 카드 3: 문제 목록 */}
      <section className={CARD_CLASS}>
        <div className="mb-3 space-y-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className={SECTION_TITLE_CLASS}>
              문제 목록{' '}
              <span className="text-base md:text-base font-normal text-slate-500 dark:text-slate-400">
                (현재 필터 기준 {filteredCount}개)
              </span>
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
              <label className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allFilteredSelected}
                  onChange={handleToggleSelectAll}
                />
                <span>현재 목록 전체 선택</span>
              </label>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded-full border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                선택 삭제
              </button>
            </div>
          </div>

          {/* 필터 */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className={LABEL_CLASS}>
                문제 은행 그룹
              </label>

              <SelectField
                value={listGroupFilter}
                onChange={(e) =>
                  setListGroupFilter(e.target.value)
                }
              >
                <option value="all">전체 그룹</option>
                {sortedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <label className={LABEL_CLASS}>유형</label>

              <SelectField
                value={listTypeFilter}
                onChange={(e) =>
                  setListTypeFilter(e.target.value)
                }
              >
                <option value="all">전체 유형</option>
                <option value="mc">객관식</option>
                <option value="sa">주관식</option>
              </SelectField>
            </div>
          </div>
        </div>

        {/* 문제 목록 리스트 */}
        <div className="mt-2 space-y-2 overflow-y-auto text-sm md:text-base">
          {pagedQuestions.map((q) => (
            <div
              key={q.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedQuestionIds.includes(
                      q.id
                    )}
                    onChange={() =>
                      toggleSelectQuestion(q.id)
                    }
                  />
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                    {q.groupName && (
                      <>
                        <span>{q.groupName}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      </>
                    )}
                    <span>
                      {q.type === 'mc' ? '객관식' : '주관식'}
                    </span>
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => handleEditClick(q)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/30"
                    onClick={() =>
                      handleDeleteClick(q.id)
                    }
                  >
                    삭제
                  </button>
                </div>
              </div>
              <p className="line-clamp-2 text-base text-slate-800 dark:text-slate-100">
                {q.question}
              </p>
            </div>
          ))}

          {filteredQuestions.length === 0 && (
            <p className="text-base text-slate-400 dark:text-slate-500">
              현재 필터 조건에 해당하는 문제가 없습니다.
            </p>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              className="rounded-full border border-slate-300 px-3 py-1 text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
            >
              이전
            </button>
            <span className="text-slate-600 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((p) =>
                  Math.min(totalPages, p + 1)
                )
              }
              className="rounded-full border border-slate-300 px-3 py-1 text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
            >
              다음
            </button>
          </div>
        )}
      </section>

      {/* 카드 4: 제출된 정답 관리 */}
      <section className={CARD_CLASS}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className={SECTION_TITLE_CLASS}>
            제출된 정답 관리 (고시 모드)
          </h2>
          {/* <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            CSV 내보내기
          </button> */}
        </div>

        {submissionsLoading ? (
          <p className={SMALL_TEXT_MUTED}>로딩 중...</p>
        ) : (
          <div className="space-y-2 text-sm md:text-base">
            {submissions.map((s) => {
              const isOpen =
                selectedSubmission &&
                selectedSubmission.id === s.id;

              return (
                <div
                  key={s.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800"
                >
                  {/* 상단 요약 영역 */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {s.userName}{' '}
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          ({s.userEmail})
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {s.groupName} · {s.scoreCorrect}/{s.scoreTotal} (
                        {Math.round(s.scoreRate)}%)
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={() =>
                          setSelectedSubmission((prev) =>
                            prev && prev.id === s.id
                              ? null
                              : s
                          )
                        }
                      >
                        {isOpen ? '닫기' : '보기'}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/30"
                        onClick={() =>
                          handleDeleteSubmissionClick(s.id)
                        }
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* ▼ 상세 영역 (토글) */}
                  {isOpen && (
                    <div className="mt-3">
                      {Array.isArray(s.details) ? (
                        <div className="space-y-2">
                          {s.details.map((d, idx) => {
                            const isCorrect =
                              d.isCorrect === true;

                            const containerBase =
                              'rounded-md border px-2 py-2 text-sm md:text-base dark:border-slate-700';
                            const containerVariant = isCorrect
                              ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-500/60'
                              : 'border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-500/60';

                            const badgeClass = isCorrect
                              ? 'bg-emerald-600/90 text-white'
                              : 'bg-red-600/90 text-white';

                            return (
                              <div
                                key={d.questionId || idx}
                                className={`${containerBase} ${containerVariant}`}
                              >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <div className="font-medium text-slate-800 dark:text-slate-100">
                                    {idx + 1}. {d.questionText}
                                  </div>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm ${badgeClass}`}
                                  >
                                    {isCorrect
                                      ? '정답'
                                      : '오답'}
                                  </span>
                                </div>

                                <div className="space-y-0.5 text-sm md:text-base text-slate-700 dark:text-slate-200">
                                  <div>
                                    <span className="font-semibold">
                                      내 답:
                                    </span>{' '}
                                    {d.userAnswer || (
                                      <span className="text-slate-400">
                                        (미응답)
                                      </span>
                                    )}
                                  </div>

                                  {!isCorrect && (
                                    <div>
                                      <span className="font-semibold">
                                        정답:
                                      </span>{' '}
                                      {d.correctAnswer}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          상세 정답 정보가 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!submissions.length && (
              <p className={SMALL_TEXT_MUTED}>
                아직 제출된 정답이 없습니다.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminPage;
