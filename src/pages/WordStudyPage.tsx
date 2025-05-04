import { useState, useEffect } from 'react';
import { WordCard } from '../components/WordCard';
import { Word } from '../types/Word.ts';

// 기본 단어 상수 정의
const DEFAULT_WORD: Word = {
  seq: 0,
  word: "example",
  meaning: "예시, 보기",
  partOfSpeech: "n."
};

export const WordStudyPage = () => {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // API 호출 함수 분리
  const fetchRandomWord = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('단어 가져오기 요청 시작');
      const response = await fetch('/api/words/random');
      console.log('API 응답 상태:', response.status);

      if (!response.ok) {
        throw new Error('서버에서 단어를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('단어 가져오기 성공, 데이터:', data);
      setCurrentWord(data);
    } catch (err) {
      console.error('Error fetching word:', err);
      setError(
        err instanceof Error
          ? err.message
          : '알 수 없는 오류가 발생했습니다.'
      );

      // 에러 발생 시 기본 단어 설정
      setCurrentWord(DEFAULT_WORD);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 첫 로드 시만 단어 가져오기
    if (!hasLoaded) {
      console.log('첫 단어 가져오기 시도');
      fetchRandomWord();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  return (
    <div className="word-study-container">
      <h1>TEPS 단어 학습</h1>

      {loading ? (
        <div className="loading">단어를 불러오는 중...</div>
      ) : (
        <>
          <WordCard
            word={currentWord}
            onNextWord={fetchRandomWord}
          />
          {error && <div className="error-message">{error}</div>}
        </>
      )}
    </div>
  );
};