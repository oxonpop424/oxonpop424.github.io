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

function AdminPage({ questions, setQuestions, groups, setGroups }) {
  const [tab, setTab] = useState('q'); // q(uestions), g(roups), s(tats)

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
  }); // id present = edit mode

  // --- Stats State ---
  const [subs, setSubs] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [viewSubId, setViewSubId] = useState(null); // Toggle detail view

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
      if (editingId) {
        await updateQuestion({ id: editingId, ...payload });
        setQuestions(
          questions.map(q =>
            q.id === editingId ? { ...q, ...payload, id: editingId } : q,
          ),
        );
      } else {
        const res = await createQuestion(payload);
        setQuestions([...questions, { ...payload, id: res.id }]);
      }
      resetQForm();
      alert('저장 완료');
    } catch (e) {
      console.error(e);
      alert('에러 발생');
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
        q.optionsEn || (q.options ? new Array(q.options.length).fill('') : ['', '']),
      answerEn: q.answerEn || '',
      explanationEn: q.explanationEn || '',
    });
    window.scrollTo(0, 0);
  };

  const handleDeleteQ = async id => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await deleteQuestionById(id);
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || !window.confirm(`${selectedIds.length}개 삭제?`))
      return;
    for (const id of selectedIds) await deleteQuestionById(id);
    setQuestions(questions.filter(q => !selectedIds.includes(q.id)));
    setSelectedIds([]);
  };

  // === Handlers: Groups ===
  const handleSaveGroup = async () => {
    if (!gForm.name) return;
    try {
      if (gForm.id) {
        await updateGroup({
          id: gForm.id,
          name: gForm.name,
          questionCount: gForm.count,
        });
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
    } catch (e) {
      alert('그룹 저장 실패');
    }
  };

  const handleDeleteGroup = async id => {
    if (!window.confirm('그룹을 삭제하시겠습니까?? 문제도 함께 정리해야 합니다.')) return;
    try {
      await deleteGroup(id);
      setGroups(groups.filter(g => g.id !== id));
    } catch (e) {
      alert('삭제 실패 (문제가 포함된 그룹일 수 있습니다.)');
    }
  };

  // === Handlers: Stats ===
  useEffect(() => {
    if (tab === 's') {
      setSubLoading(true);
      fetchSubmissions().then(d => {
        setSubs(d.submissions || []);
        setSubLoading(false);
      });
    }
  }, [tab]);

  const handleDeleteSub = async id => {
    if (!window.confirm('기록을 삭제하시겠습니까?')) return;
    await deleteSubmission(id);
    setSubs(subs.filter(s => s.id !== id));
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
      <div className="pt-2">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          관리자 페이지
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
          문제, 그룹, 제출 기록을 한 곳에서 관리합니다.
        </p>
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm md:text-base dark:text-white"
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm md:text-base dark:text-white"
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm md:text-base dark:text-white min-h-[150px]"
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm md:text-base dark:text-white min-h-[150px]"
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
                          placeholder={`Option ${i + 1} (EN)`}
                        />
                      </div>
                      <button
                        onClick={() => {
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
                        className="text-sm md:text-base text-red-400 font-bold px-2 self-center"
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
                    className="text-sm md:text-base text-indigo-500 font-bold mt-1"
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
                    />
                  </div>
                  <div>
                    <Label>Answer (EN)</Label>
                    <Input
                      value={qForm.answerEn}
                      onChange={e =>
                        setQForm({ ...qForm, answerEn: e.target.value })
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm md:text-base dark:text-white min-h-[150px]"
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm md:text-base dark:text-white min-h-[150px]"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveQ}
                className={`w-full font-bold py-3 md:py-3.5 rounded-xl shadow-md text-sm md:text-base ${
                  editingId
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
                  className="ml-auto bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-sm md:text-base font-bold border border-red-100"
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
                    onChange={() => {
                      setSelectedIds(prev =>
                        prev.includes(q.id)
                          ? prev.filter(i => i !== q.id)
                          : [...prev, q.id],
                      );
                    }}
                    className="mt-1.5"
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
                      className="text-red-400 hover:text-red-600"
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
                />
              </div>
              <button
                onClick={handleSaveGroup}
                className={`w-full md:w-auto px-5 py-3 md:py-3.5 rounded-xl font-bold mb-[1px] shadow-md text-sm md:text-base text-white ${
                  gForm.id
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-indigo-600 hover:bg-indigo-700'
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
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center"
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
                    className="text-sm md:text-base bg-red-50 text-red-500 px-3 py-1.5 rounded-full hover:bg-red-100"
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
            <p className="text-center py-10 text-slate-400 text-sm md:text-base">
              로딩 중...
            </p>
          ) : !subs.length ? (
            <p className="text-center py-10 text-slate-400 text-sm md:text-base">
              제출 기록이 없습니다.
            </p>
          ) : (
            subs.map(s => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700"
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
                    className="text-sm md:text-base text-red-500 border border-red-100 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100"
                  >
                    삭제
                  </button>
                </div>

                {/* Detail Toggle */}
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
