// src/App.js
import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import QuizPage from './pages/QuizPage';
import AdminPage from './pages/AdminPage';
import MeditLogo from './assets/logo.svg';
import { fetchAll } from './api';

function App() {
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({});
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
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
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
                Made by <span className="font-semibold">Oksu Kwak</span>
              </span>
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
                <QuizPage
                  questions={questions}
                  settings={settings}
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
