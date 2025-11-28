import { auth } from './firebase';

// -----------------------------------------------------------------------
// [중요] Google Apps Script 배포 후 받은 "웹 앱 URL"로 교체하세요.
// 끝이 /exec 로 끝나야 합니다.
// -----------------------------------------------------------------------
export const API_BASE_URL =
  'https://script.google.com/macros/s/AKfycbxBhe5sfSHEuLeN-wHidWEGOBgqmrivi8FN0EQWmDrHGLGDfsrdSGErWEK8ddWkOhAh/exec';

// ===============================
// 공통 헬퍼
// ===============================

// 현재 로그인한 사용자의 Firebase ID 토큰 가져오기
async function getIdToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('로그인 정보가 없습니다.');
  }
  // true 로 강제로 새 토큰 발급 (권한 갱신 반영)
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
    throw new Error('Invalid JSON response: ' + text);
  }
}

// 🔐 관리자 전용 POST 헬퍼
//  - body 에 idToken 포함
//  - URL query 에는 action만 포함 (idToken은 너무 길어서 URL에서 제외)
async function adminPost(action, payload) {
  const idToken = await getIdToken();
  const body = { ...payload, idToken };

  // [수정됨] idToken을 URL 파라미터에서 제거하고 action만 남김
  const url = `${API_BASE_URL}?action=${encodeURIComponent(action)}`;

  const res = await fetchJson(url, {
    method: 'POST',
    // Apps Script는 POST 요청을 받으려면 redirect='follow'가 필요할 수 있음(기본값)이나
    // text/plain 으로 보내야 CORS 프리플라이트를 피하는 경우가 많음.
    // 여기서는 기존 방식대로 보냅니다.
    body: JSON.stringify(body),
  });

  console.log(`adminPost(${action}) response:`, res);

  // ⚠ 서버에서 status: 'error' 오면 에러 던지기
  if (!res || res.status !== 'ok') {
    // 디버깅을 위해 메시지 상세 출력
    const msg = (res && res.message) ? res.message : '서버 오류';
    throw new Error(msg);
  }

  return res;
}

// ===============================
// 초기 데이터 로드 (public)
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
    // no-cors 모드는 응답 내용을 읽을 수 없음 (성공 여부만 확인 가능)
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
// ===============================

// 조회는 public GET (API_BASE_URL에 action 쿼리만 붙임)
export async function fetchSubmissions() {
  return fetchJson(`${API_BASE_URL}?action=getSubmissions`);
}

// 삭제는 adminPost 사용
export async function deleteSubmission(id) {
  return adminPost('deleteSubmission', { id });
}