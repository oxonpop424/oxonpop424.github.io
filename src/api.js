// src/api.js
import { auth } from './firebase';

export const API_BASE_URL =
  'https://script.google.com/macros/s/AKfycbzfQkZwwtfwGAPiyofR5MP3Bar3aFcl6IUcoT5iDsTB9JDCnxXf7rQWC-4ItcR1NrRf/exec';

// ===============================
// 공통 헬퍼
// ===============================

// 현재 로그인한 사용자의 Firebase ID 토큰 가져오기
async function getIdToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('로그인 정보가 없습니다.');
  }
  return user.getIdToken(true);
}

// 공통 JSON fetch 헬퍼
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error('JSON parse error, raw text:', text);
    throw new Error('Invalid JSON response');
  }
}

// 🔐 관리자 전용 POST 헬퍼 (preflight 안 나게 headers 제거)
async function adminPost(action, payload) {
  const idToken = await getIdToken();
  const body = { ...payload, idToken };

  return fetchJson(`${API_BASE_URL}?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ===============================
// 초기 데이터 로드 (public)
// 백엔드에서 { questions, settings, groups } 형태로 내려온다고 가정
// ===============================
export async function fetchAll() {
  return fetchJson(API_BASE_URL);
}

// ===============================
// 문제/설정 (관리자 전용)
// ===============================

export async function createQuestion(question) {
  return adminPost('addQuestion', question);
}

export async function updateQuestion(question) {
  return adminPost('updateQuestion', question);
}

export async function deleteQuestionById(id) {
  return adminPost('deleteQuestion', { id });
}

export async function updateSettings(settings) {
  return adminPost('updateSettings', settings);
}

// ===============================
// 문제 은행 그룹 (관리자 전용)
// ===============================
export async function createGroup(group) {
  return adminPost('addGroup', group);
}

export async function updateGroup(group) {
  return adminPost('updateGroup', group);
}

export async function deleteGroup(id) {
  return adminPost('deleteGroup', { id });
}

// ===============================
// 고시 모드 정답 제출 (public)
// ===============================
export async function submitAnswers(payload) {
  try {
    await fetch(`${API_BASE_URL}?action=addSubmission`, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return { status: 'ok' };
  } catch (e) {
    console.error('정답 제출 요청 실패', e);
    throw e;
  }
}

// ===============================
// 제출된 정답 관리
//   → 문제/그룹과 같은 방식(GET, public)으로 변경
// ===============================
// 문제 목록처럼: 조회는 public GET
export async function fetchSubmissions() {
  // questions, groups처럼 GET + action 으로만 호출
  return fetchJson(`${API_BASE_URL}?action=getSubmissions`);
}

// 문제 삭제와 동일: adminPost 사용 (idToken + isAdminRequest_)
export async function deleteSubmission(id) {
  return adminPost('deleteSubmission', { id });
}
