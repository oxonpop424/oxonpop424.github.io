// src/App.js
import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import GosiPage from './pages/GosiPage';
import QuizPage from './pages/QuizPage';
import AdminPage from './pages/AdminPage';
import MeditLogo from './assets/logo.svg';
import { fetchAll } from './api';

function App() {
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({});
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // 다크 모드 상태
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAll();
        setQuestions(data.questions || []);
        setSettings(data.settings || {});
        setGroups(data.groups || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  if (loading) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-100">
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        {/* 상단 공통 헤더 */}
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 gap-3">
            <div className="flex flex-col">
              <a
                href="/"
                className="flex h-5 items-center gap-2"
              >
                <img
                  src={MeditLogo}
                  alt="Medit 메인 로고"
                  className="h-3 w-auto object-contain"
                />
                <span className="text-[16px] font-semibold">
                  문제은행
                </span>
              </a>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Made by{' '}
                <span className="font-semibold">
                  Oksu Kwak
                </span>
              </span>
            </div>

            {/* 가운데 네비게이션 */}
            <nav className="hidden sm:flex items-center gap-2 text-xs sm:text-sm">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  [
                    'rounded-full px-3 py-1',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  ].join(' ')
                }
              >
                고시 모드
              </NavLink>
              <NavLink
                to="/quiz"
                className={({ isActive }) =>
                  [
                    'rounded-full px-3 py-1',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  ].join(' ')
                }
              >
                퀴즈 모드
              </NavLink>
            </nav>

            {/* 모바일에서 간단히 링크 묶기 */}
            <div className="flex items-center gap-2 sm:hidden text-[11px]">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  [
                    'rounded-full px-2 py-1',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  ].join(' ')
                }
              >
                고시
              </NavLink>
              <NavLink
                to="/quiz"
                className={({ isActive }) =>
                  [
                    'rounded-full px-2 py-1',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  ].join(' ')
                }
              >
                퀴즈
              </NavLink>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </header>

        {/* 메인 영역 */}
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Routes>
            <Route
              path="/"
              element={
                <GosiPage
                  questions={questions}
                  settings={settings}
                  groups={groups}
                />
              }
            />
            <Route
              path="/quiz"
              element={
                <QuizPage
                  questions={questions}
                  settings={settings}
                  groups={groups}
                />
              }
            />
            <Route
              path="/admin"
              element={
                <AdminPage
                  questions={questions}
                  setQuestions={setQuestions}
                  settings={settings}
                  setSettings={setSettings}
                  groups={groups}
                  setGroups={setGroups}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
