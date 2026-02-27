import { Word } from '../types/Word';

export interface WordProgress {
  bookmarked: boolean;
  wrongCount: number;
}

interface WordPayload {
  wordType: 'concepts' | 'regular';
  seq: number;
  word: string;
  partOfSpeech: string;
  meaning: string;
}

function toPayload(word: Word, wordType: 'concepts' | 'regular'): WordPayload {
  return {
    wordType,
    seq: word.seq,
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    meaning: word.meaning,
  };
}

export async function fetchWordProgress(word: Word, wordType: 'concepts' | 'regular'): Promise<WordProgress> {
  const params = new URLSearchParams({
    wordType,
    seq: String(word.seq),
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    meaning: word.meaning,
  });

  const response = await fetch(`/api/words/progress?${params.toString()}`);
  if (!response.ok) {
    throw new Error('단어 진행 상태를 불러오지 못했습니다.');
  }
  return response.json();
}

export async function addBookmark(word: Word, wordType: 'concepts' | 'regular') {
  const response = await fetch('/api/words/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(word, wordType)),
  });

  if (!response.ok) {
    throw new Error('즐겨찾기 저장에 실패했습니다.');
  }
}

export async function removeBookmark(word: Word, wordType: 'concepts' | 'regular') {
  const params = new URLSearchParams({
    wordType,
    seq: String(word.seq),
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    meaning: word.meaning,
  });

  const response = await fetch(`/api/words/bookmarks?${params.toString()}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 204) {
    throw new Error('즐겨찾기 해제에 실패했습니다.');
  }
}

export async function addWrongAnswer(word: Word, wordType: 'concepts' | 'regular') {
  const response = await fetch('/api/words/wrongs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(word, wordType)),
  });

  if (!response.ok) {
    throw new Error('오답 저장에 실패했습니다.');
  }

  return response.json();
}
