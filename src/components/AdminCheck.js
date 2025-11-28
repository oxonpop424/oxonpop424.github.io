import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// ------------------------------------------------------------------
// [주의] 이 설정 코드는 '미리보기'가 작동하도록 하기 위해 여기에 포함시켰습니다.
// 실제 프로젝트에 붙여넣을 때는 아래 설정 코드를 지우고,
// import { auth } from './firebase'; 를 사용하세요.
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: 'AIzaSyB1GLZKZOPeph1nFz55TBRK-yFL0Ts_H2U',
  authDomain: 'q-bank-auth.firebaseapp.com',
  projectId: 'q-bank-auth',
  storageBucket: 'q-bank-auth.firebasestorage.app',
  messagingSenderId: '621777589974',
  appId: '1:621777589974:web:05d6b42f7933a70c6a5b77',
  measurementId: 'G-KKJ5KLM18W' 
};

// 이미 초기화된 앱이 있는지 확인 후 초기화
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // 중복 초기화 방지 등 예외 처리 (이미 초기화된 경우 기존 앱 사용 등)
  // 여기서는 간단히 무시하거나 window 객체 등을 통해 확인할 수 있음
}
const auth = getAuth(app);
// ------------------------------------------------------------------


const AdminCheck = () => {
  const [status, setStatus] = useState('확인 전');
  const [claims, setClaims] = useState(null);
  const [user, setUser] = useState(null);

  // Auth 상태 감지 (로그인 여부 확인용)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setStatus('로그인되지 않음');
        setClaims(null);
      } else {
        setStatus('로그인됨 (권한 확인 버튼을 눌러주세요)');
      }
    });
    return () => unsubscribe();
  }, []);

  const checkAdminStatus = async () => {
    if (!user) {
      setStatus('로그인 정보가 없습니다. 먼저 로그인해주세요.');
      return;
    }

    try {
      setStatus('토큰 갱신 중...');
      // true 옵션: 토큰 강제 갱신 (서버에서 방금 권한을 줬다면 갱신 필수)
      const idTokenResult = await user.getIdTokenResult(true);
      
      console.log('전체 Claims:', idTokenResult.claims);
      setClaims(idTokenResult.claims);

      if (idTokenResult.claims.isAdmin) {
        setStatus('✅ 당신은 관리자(Admin) 입니다.');
      } else {
        setStatus('❌ 관리자 권한이 없습니다 (isAdmin claim 없음).');
      }
    } catch (error) {
      console.error(error);
      setStatus('에러 발생: ' + error.message);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-gray-50 my-4 shadow-sm">
      <h3 className="font-bold text-xl mb-3 text-gray-800">관리자 권한 디버깅</h3>
      <p className="mb-4 text-sm text-gray-600">
        1. Node.js 스크립트로 권한 부여 완료<br/>
        2. 웹사이트 로그인 완료<br/>
        3. 아래 버튼 클릭하여 권한 확인
      </p>
      
      <div className="mb-4">
         <span className={`inline-block px-2 py-1 text-sm font-semibold rounded ${user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
           현재 로그인 상태: {user ? user.email : '로그아웃'}
         </span>
      </div>

      <button
        onClick={checkAdminStatus}
        disabled={!user}
        className={`px-4 py-2 rounded text-white font-medium transition shadow-sm
          ${user 
            ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
            : 'bg-gray-400 cursor-not-allowed'}`}
      >
        내 권한 확인하기 (토큰 강제 갱신)
      </button>

      <div className="mt-6 p-4 bg-white rounded border">
        <p className="font-semibold mb-2">상태 메시지:</p>
        <p className={`font-medium ${status.includes('✅') ? 'text-green-600' : status.includes('❌') ? 'text-red-600' : 'text-gray-700'}`}>
          {status}
        </p>
        
        {claims && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-1">토큰 상세 정보 (Claims):</p>
            <div className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto max-h-60">
              <pre>{JSON.stringify(claims, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCheck;