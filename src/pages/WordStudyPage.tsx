import { useState, useEffect } from 'react';
import { WordCard } from '../components/WordCard';
import { Word } from '../types/Word.ts';
import '../styles/WordStudy.css';

// 기본 단어 상수 정의
const DEFAULT_WORD: Word = {
  seq: 0,
  word: "example",
  meaning: "예시, 보기",
  partOfSpeech: "n."
};

// 품사 옵션 정의
const PART_OF_SPEECH_OPTIONS = [
  { value: "all", label: "모든 품사" },
  { value: "a.", label: "형용사(a.)" },
  { value: "n.", label: "명사(n.)" },
  { value: "v.", label: "동사(v.)" },
  { value: "adv.", label: "부사(adv.)" },
  { value: "prep.", label: "전치사(prep.)" },
  { value: "conj.", label: "접속사(conj.)" }
];

export const WordStudyPage = () => {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // 단어 유형 및 품사 필터 상태 추가
  const [wordType, setWordType] = useState<'concepts' | 'regular'>('concepts');
  const [partOfSpeech, setPartOfSpeech] = useState<string>('all');

  // API 호출 함수
  const fetchRandomWord = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('단어 가져오기 요청 시작');

      let endpoint = '/api/words/random';

      // 품사 필터가 있는 경우 경로 파라미터 방식으로 조회
      if (partOfSpeech !== 'all') {
        endpoint = `/api/words/random/partOfSpeech/${partOfSpeech}`;
      }

      // 컨설텝스 단어인 경우 쿼리 파라미터 추가
      if (wordType === 'concepts') {
        endpoint += endpoint.includes('?') ? '&type=concepts' : '?type=concepts';
      }

      console.log('API 요청 경로:', endpoint);
      const response = await fetch(endpoint);
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
      {/* 필터 컨트롤 영역 */}
      <div className="filter-controls">
        <div className="filter-section">
          <div className="word-type-selector">
            <label className="filter-label">단어 유형:</label>
            <div className="radio-buttons">
              <label>
                <input
                  type="radio"
                  name="wordType"
                  checked={wordType === 'concepts'}
                  onChange={() => setWordType('concepts')}
                />
                컨설텝스 단어
              </label>
              <label>
                <input
                  type="radio"
                  name="wordType"
                  checked={wordType === 'regular'}
                  onChange={() => setWordType('regular')}
                />
                일반 단어
              </label>
            </div>
          </div>

          <div className="part-of-speech-selector">
            <label className="filter-label">품사:</label>
            <select
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value)}
            >
              {PART_OF_SPEECH_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="apply-filter-button"
            onClick={fetchRandomWord}
          >
            새 단어 가져오기
          </button>
        </div>
      </div>

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