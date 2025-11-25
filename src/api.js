// src/api.js
export const API_BASE_URL =
  'https://script.google.com/macros/s/AKfycby2FwFJdlc2OgogT0hsIdakCnIl7xrUn4G-2a7Kq6SQpkhALUylJBny3gc1lW9aBN2-/exec';

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

export async function fetchAll() {
  return fetchJson(API_BASE_URL); // GET { questions, settings }
}

export async function createQuestion(question) {
  return fetchJson(`${API_BASE_URL}?action=addQuestion`, {
    method: 'POST',
    // ❌ Content-Type 제거 (preflight 방지)
    body: JSON.stringify(question),
  });
}

export async function updateSettings(settings) {
  return fetchJson(`${API_BASE_URL}?action=updateSettings`, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function deleteQuestionById(id) {
  return fetchJson(`${API_BASE_URL}?action=deleteQuestion`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export async function updateQuestion(question) {
  return fetchJson(`${API_BASE_URL}?action=updateQuestion`, {
    method: 'POST',
    body: JSON.stringify(question),
  });
}
