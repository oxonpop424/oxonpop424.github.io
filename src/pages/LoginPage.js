// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleEmailLogin = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      let msg = '로그인에 실패했습니다.';
      if (err.code === 'auth/user-not-found') msg = '등록되지 않은 계정입니다.';
      if (err.code === 'auth/wrong-password') msg = '비밀번호가 올바르지 않습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-700">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          관리자 로그인
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          관리자 이메일/비밀번호 계정을 입력해주세요.
        </p>

        {error && (
          <div className="mb-4 text-xs md:text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60"
          >
            {loading ? '로그인 중...' : '이메일로 로그인'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default LoginPage;
