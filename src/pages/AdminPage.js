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

// --- Alert 메시지 통일 ---
const ALERT = {
  SAVE_SUCCESS: '저장이 완료되었습니다.',
  DELETE_SUCCESS: '삭제가 완료되었습니다.',
  GROUP_SAVE_ERROR: '저장에 실패했습니다.',
  GROUP_DELETE_ERROR: '삭제 실패 (문제가 포함된 그룹일 수 있습니다.)',
  LOAD_SUB_ERROR: '제출 기록을 불러오는 중 오류가 발생했습니다.',
  ADMIN_ONLY: '관리자만 사용할 수 있습니다.',
};

// --- UI Components ---
const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2.5 text-sm md:text-base font-semibold rounded-xl transition-all ${
      active
        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`}
  >
    {children}
  </button>
);

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={
      'w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm md:text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 ' +
      className
    }
  />
);

const Label = ({ children }) => (
  <label className="block text-sm md:text-base font-bold text-slate-500 mb-1 ml-1 uppercase tracking-wide">
    {children}
  </label>
);

const Card = ({ children, title, action, editing = false }) => (
  <div
    className={`bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-sm border ${
      editing
        ? 'border-amber-300 ring-1 ring-amber-200 dark:border-amber-400 dark:ring-amber-500/40'
        : 'border-slate-100 dark:border-slate-700'
    }`}
  >
    {(title || action) && (
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-white">
            {title}
          </h3>
          {editing && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-sm font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              수정 모드
            </span>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

// 🔥 isAdmin을 받아서 readOnly 모드 제어
function AdminPage({
  questions,
  setQuestions,
  groups,
  setGroups,
  isAdmin,
  showLoader,
  hideLoader,
}) {
  const [tab, setTab] = useState('q'); // q(uestions), g(roups), s(tats)

  // isAdmin이 null/undefined일 땐 "아직 모름" 상태이므로, 그때는 읽기 전용으로 처리
  const readOnly = !isAdmin; // true면 수정/삭제 금지

  // 🔒 관리자 아닐 때: 알림 후 로그인 페이지로 리디렉션
  useEffect(() => {
    if (isAdmin === null || isAdmin === undefined) return;

    if (isAdmin === false) {
      alert('권한이 없습니다.');
      window.location.href = '/#/login';
    }
  }, [isAdmin]);

  // --- Questions State ---
  const [qForm, setQForm] = useState({
    type: 'mc',
    groupId: '',
    question: '',
    options: ['', ''],
    answerIndex: 0,
    answer: '',
    explanation: '',
    questionEn: '',
    optionsEn: ['', ''],
    answerEn: '',
    explanationEn: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ group: 'all', type: 'all' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // --- Groups State ---
  const [gForm, setGForm] = useState({
    name: '',
    count: 10,
    id: null,
  });

  // --- Stats State ---
  const [subs, setSubs] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [viewSubId, setViewSubId] = useState(null);

  // === Handlers: Question ===
  const resetQForm = () => {
    setQForm({
      type: 'mc',
      groupId: '',
      question: '',
      options: ['', ''],
      answerIndex: 0,
      answer: '',
      explanation: '',
      questionEn: '',
      optionsEn: ['', ''],
      answerEn: '',
      explanationEn: '',
    });
    setEditingId(null);
  };

  const handleSaveQ = async () => {
    if (readOnly) {
      alert(ALERT.ADMIN_ONLY);
      return;
    }

    if (!qForm.question || !qForm.groupId) return alert('필수 항목 누락');
    if (qForm.type === 'mc' && qForm.options.filter(o => o.trim()).length < 2)
      return alert('보기 최소 2개');
    if (qForm.type === 'sa' && !qForm.answer) return alert('정답 입력 필수');

    const payload = {
      ...qForm,
      groupName:
        groups.find(g => String(g.id) === String(qForm.groupId))?.name || '',
    };

    try {
      showLoader?.();
      if (editingId) {
        const res = await updateQuestion({ id: editingId, ...payload });
        console.log('updateQuestion response:', res);

        if (!res || res.status !== 'ok') {
          alert(
            `문제 수정 실패\n\n서버 메시지: ${
              res && res.message ? res.message : '알 수 없는 오류'
            }`,
          );
          return;
        }

        setQuestions(
          questions.map(q =>
            q.id === editingId ? { ...q, ...payload, id: editingId } : q,
          ),
        );
      } else {
        const res = await createQuestion(payload);
        console.log('createQuestion response:', res);

        if (!res || res.status !== 'ok') {
          alert(
            `문제 등록 실패\n\n서버 메시지: ${
              res && res.message ? res.message : '알 수 없는 오류'
            }`,
          );
          return;
        }

        setQuestions([...questions, { ...payload, id: res.id }]);
      }

      resetQForm();
      alert(ALERT.SAVE_SUCCESS);
    } catch (e) {
      console.error(e);
      alert('에러가 발생했습니다. 다시 시도해주세요.');
    } finally {
      hideLoader?.();
    }
  };

  const handleEditQ = q => {
    setEditingId(q.id);
    setQForm({
      type: q.type,
      groupId: q.groupId,
      question: q.question,
      options: q.options || ['', ''],
      answerIndex: q.answerIndex ?? 0,
      answer: q.answer || '',
      explanation: q.explanation || '',
      questionEn: q.questionEn || '',
      optionsEn:
        q.optionsEn ||
        (q.options ? new Array(q.options.length).fill('') : ['', '']),
      answerEn: q.answerEn || '',
      explanationEn: q.explanationEn || '',
    });
    window.scrollTo(0, 0);
  };

  const handleDeleteQ = async id => {
    if (readOnly) {
      alert(ALERT.ADMIN_ONLY);
      return;
    }
    if (!window.confirm('삭제하시겠습니까?')) return;

    try {
      showLoader?.();
      const res = await deleteQuestionById(id);
      console.log('deleteQuestion response:', res);

      if (!res || res.status !== 'ok') {
        alert(
          `삭제에 실패했습니다.\n\n서버 메시지: ${
            res && res.message ? res.message : '알 수 없는 오류'
          }`,
        );
        return;
      }

      setQuestions(questions.filter(q => q.id !== id));
      alert(ALERT.DELETE_SUCCESS);
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      hideLoader?.();
    }
  };

  const handleBulkDelete = async () => {
    if (readOnly) {
      alert(ALERT.ADMIN_ONLY);
      return;
    }
    if (!selectedIds.length || !window.confirm(`${selectedIds.length}개 삭제?`))
      return;

    try {
      showLoader?.();

      const failedIds = [];

      for (const id of selectedIds) {
        const res = await deleteQuestionById(id);
        console.log('deleteQuestion (bulk) response:', id, res);
        if (!res || res.status !== 'ok') {
          failedIds.push({ id, res });
        }
      }

      if (failedIds.length) {
        const first = failedIds[0];
        alert(
          `일부 문제 삭제에 실패했습니다.\n\n예: ${first.id} → ${
            first.res && first.res.message
              ? first.res.message
              : '알 수 없는 오류'
          }`,
        );
      }

      const successIds = selectedIds.filter(
        id => !failedIds.some(f => f.id === id),
      );
      if (successIds.length) {
        setQuestions(questions.filter(q => !successIds.includes(q.id)));
        alert(ALERT.DELETE_SUCCESS);
      }

      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      hideLoader?.();
    }
  };

  // === Handlers: Groups ===
  const handleSaveGroup = async () => {
    if (readOnly) {
      alert(ALERT.ADMIN_ONLY);
      return;
    }
    if (!gForm.name) return;

    try {
      showLoader?.();
      if (gForm.id) {
        const res = await updateGroup({
          id: gForm.id,
          name: gForm.name,
          questionCount: gForm.count,
        });
        console.log('updateGroup response:', res);

        if (!res || res.status !== 'ok') {
          alert(
            `그룹 수정 실패\n\n서버 메시지: ${
              res && res.message ? res.message : '알 수 없는 오류'
            }`,
          );
          return;
        }

        setGroups(
          groups.map(g =>
            g.id === gForm.id
              ? { ...g, name: gForm.name, questionCount: gForm.count }
              : g,
          ),
        );
      } else {
        const res = await createGroup({
          name: gForm.name,
          questionCount: gForm.count,
        });
        console.log('createGroup response:', res);

        if (!res || res.status !== 'ok') {
          alert(
            `그룹 생성 실패\n\n서버 메시지: ${
              res && res.message ? res.message : '알 수 없는 오류'
            }`,
          );
          return;
        }

        setGroups([
          ...groups,
          res.group || {
            id: res.id,
            name: gForm.name,
            questionCount: gForm.count,
          },
        ]);
      }

      setGForm({ name: '', count: 10, id: null });
      alert(ALERT.SAVE_SUCCESS);
    } catch (e) {
      console.error(e);
      alert(ALERT.GROUP_SAVE_ERROR);
    } finally {
      hideLoader?.();
    }
  };

  const handleDeleteGroup = async id => {
    if (readOnly) {
      alert(ALERT.ADMIN_ONLY);
      return;
    }
    if (!window.confirm('그룹을 삭제하시겠습니까?? 문제도 함께 정리해야 합니다.'))
      return;

    try {
      showLoader?.();
      const res = await deleteGroup(id);
      console.log('deleteGroup response:', res);

      if (!res || res.status !== 'ok') {
        if (res && res.code === 'GROUP_HAS_QUESTIONS') {
          alert(
            '이 그룹에 속한 문제가 있어 삭제할 수 없습니다.\n먼저 해당 그룹의 문제를 모두 삭제해 주세요.',
          );
        } else {
          alert(
            `그룹 삭제 실패\n\n서버 메시지: ${
              res && res.message ? res.message : '알 수 없는 오류'
            }`,
          );
        }
        return;
      }

      setGroups(groups.filter(g => g.id !== id));
      alert(ALERT.DELETE_SUCCESS);
    } catch (e) {
      console.error(e);
      alert(ALERT.GROUP_DELETE_ERROR);
    } finally {
      hideLoader?.();
    }
  };

  // === Handlers: Stats ===
  useEffect(() => {
    // 비관리자는 아예 요청 보내지 않음
    if (tab !== 's' || readOnly) return;

    let cancelled = false;

    const run = async () => {
      setSubLoading(true);
      showLoader?.();
      try {
        const d = await fetchSubmissions();
        console.log('getSubmissions response:', d);
        if (!cancelled) {
          if (Array.isArray(d.submissions)) {
            setSubs(d.submissions);
          } else {
            setSubs([]);
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          alert(ALERT.LOAD_SUB_ERROR);
        }
      } finally {
        if (!cancelled) setSubLoading(false);
        hideLoader?.();
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // showLoader, hideLoader는 변경되지 않는다고 가정하고 ESLint 무시
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, readOnly]);

  const handleDeleteSub = async id => {
    if (readOnly) {
      alert(ALERT.ADMIN_ONLY);
      return;
    }
    if (!window.confirm('기록을 삭제하시겠습니까?')) return;

    try {
      showLoader?.();

      const res = await deleteSubmission(id);
      console.log('deleteSubmission response:', res);

      if (!res || res.status !== 'ok') {
        const msg = res && res.message ? res.message : '알 수 없는 오류';
        alert(`삭제에 실패했습니다.\n\n서버 메시지: ${msg}`);
        return;
      }

      const d = await fetchSubmissions();
      if (Array.isArray(d.submissions)) {
        setSubs(d.submissions);
      } else {
        setSubs([]);
      }

      alert(ALERT.DELETE_SUCCESS);
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      hideLoader?.();
    }
  };

  // --- Filter & Pagination ---
  const filteredQs = questions.filter(
    q =>
      (filters.group === 'all' ||
        String(q.groupId) === String(filters.group)) &&
      (filters.type === 'all' || q.type === filters.type),
  );
  const pagedQs = filteredQs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const maxPage = Math.ceil(filteredQs.length / PAGE_SIZE) || 1;

  // --- Render ---
  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-6 text-[13px] md:text-[15px]">
      {/* Page Header */}
      <div className="pt-2 space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          관리자 페이지
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
          문제, 그룹, 제출 기록을 한 곳에서 관리합니다.
        </p>

        {readOnly && (
          <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs md:text-sm px-3 py-2 rounded-xl dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-100">
            현재 계정은 <span className="font-semibold">관리자 권한이 없어</span>{' '}
            읽기 전용으로만 볼 수 있습니다. 수정/삭제/등록은 isAdmin이 부여된
            계정으로 로그인 후 이용하세요.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex gap-1">
          <TabBtn active={tab === 'q'} onClick={() => setTab('q')}>
            문제 관리
          </TabBtn>
          <TabBtn active={tab === 'g'} onClick={() => setTab('g')}>
            그룹 관리
          </TabBtn>
          <TabBtn active={tab === 's'} onClick={() => setTab('s')}>
            제출 기록
          </TabBtn>
        </div>
      </div>

      {/* === Tab: Questions === */}
      {tab === 'q' && (
        <div className="space-y-6">
          {/* Form */}
          <Card
            title={editingId ? '문제 수정' : '새 문제 등록'}
            editing={!!editingId}
            action={
              editingId && (
                <button
                  onClick={resetQForm}
                  className="text-sm md:text-base text-red-500 hover:text-red-600"
                >
                  취소
                </button>
              )
            }
          >
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Label>그룹</Label>
                  <select
                    value={qForm.groupId}
                    onChange={e =>
                      setQForm({ ...qForm, groupId: e.target.value })
                    }
                    disabled={readOnly}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm md:text-base dark:text-white ${
                      readOnly ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">그룹 선택</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Label>유형</Label>
                  <select
                    value={qForm.type}
                    onChange={e =>
                      setQForm({ ...qForm, type: e.target.value })
                    }
                    disabled={readOnly}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm md:text-base dark:text-white ${
                      readOnly ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="mc">객관식</option>
                    <option value="sa">주관식</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>문제 (KO)</Label>
                  <textarea
                    rows={3}
                    value={qForm.question}
                    onChange={e =>
                      setQForm({ ...qForm, question: e.target.value })
                    }
                    disabled={readOnly}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm md:text-base dark:text-white min-h-[150px] ${
                      readOnly ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <div>
                  <Label>Question (EN)</Label>
                  <textarea
                    rows={3}
                    value={qForm.questionEn}
                    onChange={e =>
                      setQForm({ ...qForm, questionEn: e.target.value })
                    }
                    disabled={readOnly}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm md:text-base dark:text-white min-h-[150px] ${
                      readOnly ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              {qForm.type === 'mc' && (
                <div className="space-y-2">
                  <Label>보기 설정 (체크 = 정답)</Label>
                  {qForm.options.map((opt, i) => (
                    <div key={i} className="flex flex-col md:flex-row gap-2">
                      <div className="flex items-center gap-2 md:w-28">
                        <input
                          type="radio"
                          checked={qForm.answerIndex === i}
                          onChange={() =>
                            setQForm({ ...qForm, answerIndex: i })
                          }
                          disabled={readOnly}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm md:text-base text-slate-500">
                          보기 {i + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <Input
                          value={opt}
                          onChange={e => {
                            const n = [...qForm.options];
                            n[i] = e.target.value;
                            setQForm({ ...qForm, options: n });
                          }}
                          disabled={readOnly}
                          className={
                            readOnly ? 'opacity-60 cursor-not-allowed' : ''
                          }
                          placeholder={`보기 ${i + 1} (KO)`}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          value={qForm.optionsEn[i] || ''}
                          onChange={e => {
                            const n = [...qForm.optionsEn];
                            n[i] = e.target.value;
                            setQForm({ ...qForm, optionsEn: n });
                          }}
                          disabled={readOnly}
                          className={
                            readOnly ? 'opacity-60 cursor-not-allowed' : ''
                          }
                          placeholder={`Option ${i + 1} (EN)`}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (readOnly) return;
                          setQForm({
                            ...qForm,
                            options: qForm.options.filter(
                              (_, idx) => idx !== i,
                            ),
                            optionsEn: qForm.optionsEn.filter(
                              (_, idx) => idx !== i,
                            ),
                          });
                        }}
                        disabled={readOnly}
                        className={`text-sm md:text-base text-red-400 font-bold px-2 self-center ${
                          readOnly ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setQForm({
                        ...qForm,
                        options: [...qForm.options, ''],
                        optionsEn: [...qForm.optionsEn, ''],
                      })
                    }
                    disabled={readOnly}
                    className={`text-sm md:text-base text-indigo-500 font-bold mt-1 ${
                      readOnly ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    + 보기 추가
                  </button>
                </div>
              )}

              {qForm.type === 'sa' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>정답 (KO)</Label>
                    <Input
                      value={qForm.answer}
                      onChange={e =>
                        setQForm({ ...qForm, answer: e.target.value })
                      }
                      disabled={readOnly}
                      className={
                        readOnly ? 'opacity-60 cursor-not-allowed' : ''
                      }
                    />
                  </div>
                  <div>
                    <Label>Answer (EN)</Label>
                    <Input
                      value={qForm.answerEn}
                      onChange={e =>
                        setQForm({ ...qForm, answerEn: e.target.value })
                      }
                      disabled={readOnly}
                      className={
                        readOnly ? 'opacity-60 cursor-not-allowed' : ''
                      }
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>해설 (KO)</Label>
                  <textarea
                    rows={2}
                    value={qForm.explanation}
                    onChange={e =>
                      setQForm({
                        ...qForm,
                        explanation: e.target.value,
                      })
                    }
                    disabled={readOnly}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm md:text-base dark:text-white min-h-[150px] ${
                      readOnly ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <div>
                  <Label>Explanation (EN)</Label>
                  <textarea
                    rows={2}
                    value={qForm.explanationEn}
                    onChange={e =>
                      setQForm({
                        ...qForm,
                        explanationEn: e.target.value,
                      })
                    }
                    disabled={readOnly}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm md:text-base dark:text-white min-h-[150px] ${
                      readOnly ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <button
                onClick={handleSaveQ}
                disabled={readOnly}
                className={`w-full font-bold py-3 md:py-3.5 rounded-xl shadow-md text-sm md:text-base ${
                  editingId
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } ${
                  readOnly
                    ? 'opacity-50 cursor-not-allowed hover:bg-indigo-600'
                    : ''
                }`}
              >
                {editingId ? '수정 저장' : '문제 등록'}
              </button>
            </div>
          </Card>

          {/* List */}
          <Card title={`문제 목록 (${filteredQs.length})`}>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={filters.group}
                onChange={e => {
                  setFilters({ ...filters, group: e.target.value });
                  setPage(1);
                }}
                className="bg-slate-100 dark:bg-slate-900 border-none rounded-full px-3 py-1.5 text-sm md:text-base text-slate-700 dark:text-slate-200"
              >
                <option value="all">전체 그룹</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.type}
                onChange={e => {
                  setFilters({ ...filters, type: e.target.value });
                  setPage(1);
                }}
                className="bg-slate-100 dark:bg-slate-900 border-none rounded-full px-3 py-1.5 text-sm md:text-base text-slate-700 dark:text-slate-200"
              >
                <option value="all">전체 유형</option>
                <option value="mc">객관식</option>
                <option value="sa">주관식</option>
              </select>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={readOnly}
                  className={`ml-auto bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-sm md:text-base font-bold border border-red-100 ${
                    readOnly ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  선택 삭제 ({selectedIds.length})
                </button>
              )}
            </div>

            {/* List items */}
            <div className="space-y-2">
              {pagedQs.map(q => (
                <div
                  key={q.id}
                  className="p-3 md:p-3.5 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-start gap-3 bg-slate-50/60 dark:bg-slate-900/60"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    disabled={readOnly}
                    onChange={() => {
                      setSelectedIds(prev =>
                        prev.includes(q.id)
                          ? prev.filter(i => i !== q.id)
                          : [...prev, q.id],
                      );
                    }}
                    className={`mt-1.5 ${
                      readOnly ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] md:text-[11px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">
                        {q.groupName}
                      </span>
                      <span className="text-[10px] md:text-[11px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                        {q.type === 'mc' ? '객관식' : '주관식'}
                      </span>
                    </div>
                    <p className="text-sm md:text-base text-slate-800 dark:text-slate-200 line-clamp-2">
                      {q.question}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 text-sm md:text-base ml-2">
                    <button
                      onClick={() => handleEditQ(q)}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteQ(q.id)}
                      disabled={readOnly}
                      className={`text-red-400 hover:text-red-600 ${
                        readOnly ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {!pagedQs.length && (
                <p className="text-sm md:text-base text-slate-400 text-center py-4">
                  등록된 문제가 없습니다.
                </p>
              )}
            </div>

            {/* Pagination */}
            {filteredQs.length > 0 && (
              <div className="flex justify-center items-center gap-2 mt-4 text-sm md:text-base">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="py-1 text-slate-500">
                  {page} / {maxPage}
                </span>
                <button
                  disabled={page === maxPage}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* === Tab: Groups === */}
      {tab === 'g' && (
        <div className="space-y-6">
          <Card
            title={gForm.id ? '그룹 수정' : '그룹 추가'}
            editing={!!gForm.id}
            action={
              gForm.id && (
                <button
                  onClick={() => setGForm({ name: '', count: 10, id: null })}
                  className="text-sm md:text-base text-red-500 hover:text-red-600"
                >
                  취소
                </button>
              )
            }
          >
            <div className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Label>그룹명</Label>
                <Input
                  value={gForm.name}
                  onChange={e =>
                    setGForm({ ...gForm, name: e.target.value })
                  }
                  disabled={readOnly}
                  className={readOnly ? 'opacity-60 cursor-not-allowed' : ''}
                />
              </div>
              <div className="w-full md:w-28">
                <Label>문항 수</Label>
                <Input
                  type="number"
                  value={gForm.count}
                  onChange={e =>
                    setGForm({ ...gForm, count: e.target.value })
                  }
                  disabled={readOnly}
                  className={readOnly ? 'opacity-60 cursor-not-allowed' : ''}
                />
              </div>
              <button
                onClick={handleSaveGroup}
                disabled={readOnly}
                className={`w-full md:w-auto px-5 py-3 md:py-3.5 rounded-xl font-bold mb-[1px] shadow-md text-sm md:text-base text-white ${
                  gForm.id
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } ${
                  readOnly
                    ? 'opacity-50 cursor-not-allowed hover:bg-indigo-600'
                    : ''
                }`}
              >
                저장
              </button>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map(g => (
              <div
                key={g.id}
                className="bg_WHITE dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
                    {g.name}
                  </h4>
                  <span className="text-sm md:text-base text-slate-500">
                    {g.questionCount}문항 출제 설정
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setGForm({
                        name: g.name,
                        count: g.questionCount,
                        id: g.id,
                      })
                    }
                    className="text-sm md:text-base bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(g.id)}
                    disabled={readOnly}
                    className={`text-sm md:text-base bg-red-50 text-red-500 px-3 py-1.5 rounded-full hover:bg-red-100 ${
                      readOnly ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
            {!groups.length && (
              <p className="text-sm md:text-base text-slate-400 text-center py-6 col-span-full">
                등록된 그룹이 없습니다.
              </p>
            )}
          </div>
        </div>
      )}

      {/* === Tab: Stats === */}
      {tab === 's' && (
        <div className="space-y-4">
          {subLoading ? (
            null
          ) : !subs.length ? (
            <p className="text-center py-10 text-slate-400 text-sm md:text-base">
              제출 기록이 없습니다.
            </p>
          ) : (
            subs.map(s => (
              <div
                key={s.id}
                className="bg_WHITE dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
                      {s.userName}{' '}
                      <span className="text-sm md:text-base font-normal text-slate-500">
                        ({s.userEmail})
                      </span>
                    </div>
                    <div className="text-sm md:text-base text-slate-500 mt-1">
                      {s.groupName} ·{' '}
                      {new Date(s.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600 text-sm md:text-base whitespace-nowrap">
                      {Math.round(s.scoreRate)}점
                    </div>
                    <div className="text-sm md:text-base text-slate-400">
                      {s.scoreCorrect}/{s.scoreTotal}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() =>
                      setViewSubId(viewSubId === s.id ? null : s.id)
                    }
                    className="text-sm md:text-base text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    상세 보기
                  </button>
                  <button
                    onClick={() => handleDeleteSub(s.id)}
                    disabled={readOnly}
                    className={`text-sm md:text-base text-red-500 border border-red-100 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 ${
                      readOnly ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    삭제
                  </button>
                </div>

                {viewSubId === s.id && s.details && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    {s.details.map((d, i) => (
                      <div
                        key={i}
                        className={`text-sm md:text-base p-2.5 rounded-xl ${
                          d.isCorrect ? 'bg-green-50/70' : 'bg-red-50/70'
                        }`}
                      >
                        <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200 gap-2">
                          <span className="flex-1">
                            Q. {d.questionText}
                          </span>
                          <span
                            className={
                              d.isCorrect ? 'text-green-600' : 'text-red-500'
                            }
                          >
                            {d.isCorrect ? 'O' : 'X'}
                          </span>
                        </div>
                        <div className="text-sm md:text-base text-slate-600 mt-1">
                          내 답: {d.userAnswer || '(공란)'} / 정답:{' '}
                          {d.correctAnswer}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
