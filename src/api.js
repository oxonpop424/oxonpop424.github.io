// src/api.js
export const API_BASE_URL =
  'https://script.google.com/macros/s/AKfycbyGquHrUYccfzsB-RiGVYwiozB4lPOYul5FcWUzUHUwYnLUekiVIVo-j-mBd7v48Y8F/exec';

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

// 초기 데이터 로드
// 백엔드에서 { questions, settings, groups } 형태로 내려온다고 가정
export async function fetchAll() {
  return fetchJson(API_BASE_URL);
}

// --------- 문제/설정 ---------
// settings는 현재 UI에서 사용하지 않지만, 추후 확장 대비용으로 남겨둔 상태입니다.
export async function createQuestion(question) {
  return fetchJson(`${API_BASE_URL}?action=addQuestion`, {
    method: 'POST',
    body: JSON.stringify(question),
  });
}

export async function updateQuestion(question) {
  return fetchJson(`${API_BASE_URL}?action=updateQuestion`, {
    method: 'POST',
    body: JSON.stringify(question),
  });
}

export async function deleteQuestionById(id) {
  return fetchJson(`${API_BASE_URL}?action=deleteQuestion`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

// (현재는 사용하지 않지만, 남겨 두고 싶다면 유지 / 완전히 제거해도 무방)
export async function updateSettings(settings) {
  return fetchJson(`${API_BASE_URL}?action=updateSettings`, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

// --------- 문제 은행 그룹 ---------
// groups 시트: id, name, questionCount
export async function createGroup(group) {
  return fetchJson(`${API_BASE_URL}?action=addGroup`, {
    method: 'POST',
    body: JSON.stringify(group), // { name, questionCount }
  });
}

export async function updateGroup(group) {
  return fetchJson(`${API_BASE_URL}?action=updateGroup`, {
    method: 'POST',
    body: JSON.stringify(group), // { id, name, questionCount }
  });
}

export async function deleteGroup(id) {
  return fetchJson(`${API_BASE_URL}?action=deleteGroup`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

// --------- 고시 모드 정답 제출 ---------
// submissions 시트에 기록 (CORS 회피용: 응답은 읽지 않고 요청만 보냄)
export async function submitAnswers(payload) {
  try {
    await fetch(`${API_BASE_URL}?action=addSubmission`, {
      method: 'POST',
      mode: 'no-cors', // 👈 CORS 차단 안 나게 opaque 요청으로 보냄
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 응답은 읽을 수 없지만, 요청은 정상 전송됨
    return { status: 'ok' };
  } catch (e) {
    console.error('정답 제출 요청 실패', e);
    throw e;
  }
}

// --------- 제출된 정답 관리 ---------
export async function fetchSubmissions() {
  return fetchJson(`${API_BASE_URL}?action=getSubmissions`);
}

export async function deleteSubmission(id) {
  return fetchJson(`${API_BASE_URL}?action=deleteSubmission`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
