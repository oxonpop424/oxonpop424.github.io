// src/App.js
import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import GosiPage from './pages/GosiPage';
import QuizPage from './pages/QuizPage';
import AdminPage from './pages/AdminPage';
import MeditLogo from './assets/logo.svg';
import { fetchAll } from './api';

// --- Icons ---
const Icons = {
  Exam: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  Quiz: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  Admin: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  Moon: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  ),
  Sun: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
};

const UI_TEXT = {
  ko: {
    appTitle: 'Q-Bank',
    gosi: '시험',
    quiz: '퀴즈',
    admin: '관리',
    loading: '로딩 중...',
    themeLight: '라이트',
    themeDark: '다크',
    madeBy: 'Made by',
  },
  en: {
    appTitle: 'Q-Bank',
    gosi: 'Exam',
    quiz: 'Quiz',
    admin: 'Admin',
    loading: 'Loading...',
    themeLight: 'Light',
    themeDark: 'Dark',
    madeBy: 'Made by',
  },
};

function App() {
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({});
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState(() =>
    window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  );
  const [language, setLanguage] = useState(() =>
    window.localStorage.getItem('language') === 'en' ? 'en' : 'ko'
  );
  const t = UI_TEXT[language] || UI_TEXT.ko;

  // 진행률 상태 (0 ~ 1)
  const [progress, setProgress] = useState(0);

  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('language', language);
  }, [language]);

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

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  const toggleLanguage = () => setLanguage(prev => (prev === 'ko' ? 'en' : 'ko'));

  if (loading)
    return (
      <div
        className={`min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a] text-slate-500 font-medium ${theme}`}
      >
        {t.loading}
      </div>
    );

  // 레이아웃 래퍼 클래스: 관리자 페이지는 상단 정렬, 나머지는 가운데 정렬
  const contentWrapperClass =
    'max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-8 flex flex-col ' +
    (isAdminPage
      ? 'justify-start min-h-[calc(100vh-56px-64px)] md:min-h-[calc(100vh-64px)]'
      : 'justify-center min-h-[calc(100vh-56px-64px)] md:min-h-[calc(100vh-64px)]');

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 dark:bg-[#0f172a] dark:text-slate-100 transition-colors duration-300 font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between relative">
            {/* 왼쪽 로고 */}
            <div className="flex items-center gap-2 relative z-10">
              <img src={MeditLogo} alt="Logo" className="h-5 md:h-6 w-auto" />
              <span className="text-lg md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                {t.appTitle}
              </span>
            </div>

            {/* 데스크탑 중앙 네비 */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full absolute left-1/2 -translate-x-1/2">
              {[
                { to: '/', label: t.gosi },
                { to: '/quiz', label: t.quiz },
              ].map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-5 py-1.5 rounded-full text-sm md:text-base font-medium transition-all ${
                      isActive
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* 오른쪽 언어/테마 토글 */}
            <div className="flex items-center gap-2 relative z-10">
              <button
                onClick={toggleLanguage}
                className="text-sm md:text-base font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md"
              >
                {language === 'ko' ? 'KO' : 'EN'}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
              >
                {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
              </button>
            </div>
          </div>

          {/* 헤더 하단 진행 바 */}
          <div className="w-full h-[3px] bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
            />
          </div>
        </header>

        {/* Content + Footer Wrapper */}
        <div className={contentWrapperClass}>
          {/* Content */}
          <main className="mb-4 md:mb-6">
            <Routes>
              <Route
                path="/"
                element={
                  <GosiPage
                    questions={questions}
                    settings={settings}
                    groups={groups}
                    language={language}
                    onProgressChange={setProgress}
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
                    language={language}
                    onProgressChange={setProgress}
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

          {/* Footer - Made by Oksu Kwak */}
          <footer className="text-center text-[11px] md:text-xs text-slate-400 flex justify-center items-center gap-1">
            <span>{t.madeBy}</span>
            <span className="font-semibold whitespace-nowrap">Oksu Kwak</span>
          </footer>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#1e293b] border-t border-slate-100 dark:border-slate-800 px-4 flex justify-center gap-8 items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
              }`
            }
          >
            <Icons.Exam />
            <span className="text-[11px] font-medium">{t.gosi}</span>
          </NavLink>
          <NavLink
            to="/quiz"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
              }`
            }
          >
            <Icons.Quiz />
            <span className="text-[11px] font-medium">{t.quiz}</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}

export default App;
