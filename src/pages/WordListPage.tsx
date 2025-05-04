// src/pages/WordListPage.tsx
import { useState, useEffect } from 'react';
import { Word } from '../types/Word.ts';
import '../styles/WordList.css';

// 기본 단어 목록 상수 정의
// 기본 범위 설정
const RANGE_SIZE = 20;

export const WordListPage = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 현재 표시 중인 범위 (API 요청 값)
  const [currentRange, setCurrentRange] = useState({
    startSeq: 1,
    endSeq: RANGE_SIZE
  });
  // 다음 버튼 활성화 여부
  const [hasNext, setHasNext] = useState(true);
  // 직접 지정 모드 여부
  const [customRangeMode, setCustomRangeMode] = useState(false);
  // 사용자 입력값
  const [customStartSeq, setCustomStartSeq] = useState("");
  const [customEndSeq, setCustomEndSeq] = useState("");

  // API 호출 함수
  const fetchWords = async (start: number, end: number) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/words/range?startSeq=${start}&endSeq=${end}`;

      console.log(`단어 목록 가져오기 요청 시작 (범위: ${start}-${end})`);
      const response = await fetch(url);
      console.log('API 응답 상태:', response.status);

      if (!response.ok) {
        throw new Error('서버에서 단어 목록을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('단어 목록 가져오기 성공, 데이터 수:', data.length);

      // 단어가 있는지 확인
      if (data.length === 0) {
        setHasNext(false);
        setError('해당 범위에 단어가 없습니다.');
        return [];
      }

      // 마지막 단어의 seq를 확인하여 더 불러올 단어가 있는지 판단
      // API에서 요청한 범위를 모두 채우지 못했다면 다음 단어가 없다고 판단
      if (data.length > 0 && data[data.length - 1].seq < end) {
        setHasNext(false);
      } else {
        setHasNext(true);
      }

      return data;
    } catch (err) {
      console.error('Error fetching words:', err);
      setError(
        err instanceof Error
          ? err.message
          : '알 수 없는 오류가 발생했습니다.'
      );
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 기본 범위 모드에서 단어 목록 로드 (범위 변경 시 마다 호출)
  const loadRangeWords = async (start: number, end: number) => {
    const newWords = await fetchWords(start, end);

    if (newWords.length > 0) {
      // 새로운 단어 목록으로 갱신
      setWords(newWords);
      // 현재 범위 업데이트
      setCurrentRange({ startSeq: start, endSeq: end });
    } else if (newWords.length === 0 && !error) {
      setError('해당 범위에 단어가 없습니다.');
      setWords([]);
    }
  };

  // 초기 데이터 로드 (1~20)
  const loadInitialData = async () => {
    await loadRangeWords(1, RANGE_SIZE);
  };

  // 다음 페이지 로드
  const loadNextPage = async () => {
    if (loading || !hasNext) return;

    const { endSeq } = currentRange;
    const nextStartSeq = endSeq + 1;
    const nextEndSeq = nextStartSeq + RANGE_SIZE - 1;

    await loadRangeWords(nextStartSeq, nextEndSeq);
  };

  // 이전 페이지 로드
  const loadPrevPage = async () => {
    if (loading || currentRange.startSeq <= 1) return;

    const prevStartSeq = Math.max(1, currentRange.startSeq - RANGE_SIZE);
    const prevEndSeq = prevStartSeq + RANGE_SIZE - 1;

    await loadRangeWords(prevStartSeq, prevEndSeq);
  };

  // 사용자 지정 범위 검색
  const handleCustomRangeSearch = async () => {
    // 입력값 유효성 검사
    const start = parseInt(customStartSeq);
    const end = parseInt(customEndSeq);

    if (isNaN(start) || isNaN(end)) {
      setError('유효한 숫자를 입력해주세요.');
      return;
    }

    if (start > end) {
      setError('시작 번호는 종료 번호보다 작아야 합니다.');
      return;
    }

    if (end - start > 100) {
      setError('한 번에 최대 100개까지만 조회할 수 있습니다.');
      return;
    }

    // 직접 지정 범위의 단어 로드
    await loadRangeWords(start, end);
  };

  // 모드 전환 시 처리
  useEffect(() => {
    // 에러 메시지 초기화
    setError(null);

    if (!customRangeMode) {
      // 기본 범위 모드로 전환 시 첫 페이지 로드
      loadInitialData();
    } else {
      // 직접 지정 모드로 전환 시 필드 초기화
      setCustomStartSeq("");
      setCustomEndSeq("");
      setWords([]);
    }
  }, [customRangeMode]);

  // 초기 로드
  useEffect(() => {
    loadInitialData();
  }, []);

  // 디버깅용 - 상태 변경 확인
  useEffect(() => {
    console.log("현재 단어 수:", words.length);
    console.log("현재 범위:", currentRange);
  }, [words, currentRange]);

  return (
    <div className="word-list-container">
      <h1>TEPS 단어 목록</h1>

      <div className="range-controls">
        <div className="range-toggle">
          <button
            className={`range-button ${!customRangeMode ? 'active' : ''}`}
            onClick={() => setCustomRangeMode(false)}
          >
            기본 범위
          </button>
          <button
            className={`range-button ${customRangeMode ? 'active' : ''}`}
            onClick={() => setCustomRangeMode(true)}
          >
            직접 지정
          </button>
        </div>

        {customRangeMode ? (
          <div className="custom-range-form">
            <div className="input-group">
              <label htmlFor="startSeq">시작 번호:</label>
              <input
                type="number"
                id="startSeq"
                value={customStartSeq}
                onChange={(e) => setCustomStartSeq(e.target.value)}
                min="1"
              />
            </div>
            <div className="input-group">
              <label htmlFor="endSeq">종료 번호:</label>
              <input
                type="number"
                id="endSeq"
                value={customEndSeq}
                onChange={(e) => setCustomEndSeq(e.target.value)}
                min="1"
              />
            </div>
            <button
              className="search-button"
              onClick={handleCustomRangeSearch}
              disabled={loading}
            >
              검색
            </button>
          </div>
        ) : (
          <div className="pagination-controls">
            <button
              className="page-button"
              onClick={loadPrevPage}
              disabled={loading || currentRange.startSeq <= 1}
            >
              이전 ({Math.max(1, currentRange.startSeq - RANGE_SIZE)}~{currentRange.startSeq - 1})
            </button>

            <span className="current-range">
              {currentRange.startSeq}~{currentRange.endSeq}
            </span>

            <button
              className="page-button"
              onClick={loadNextPage}
              disabled={loading || !hasNext}
            >
              다음 ({currentRange.endSeq + 1}~{currentRange.endSeq + RANGE_SIZE})
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">단어를 불러오는 중...</div>
      ) : (
        <div className="word-stats">
          현재 표시 단어: {words.length}개
          {words.length > 0 && ` (seq: ${words[0].seq} ~ ${words[words.length-1].seq})`}
        </div>
      )}

      <div className="word-list">
        {words.length > 0 ? (
          words.map((word, index) => (
            <div key={`${word.seq}-${index}`} className="word-item">
              <div className="word-number">{word.seq}</div>
              <div className="word-content">
                <div className="word-english">
                  {word.word} <span className="word-part">{word.partOfSpeech}</span>
                </div>
                <div className="word-meaning">{word.meaning}</div>
              </div>
            </div>
          ))
        ) : (
          !loading && <div className="no-words">표시할 단어가 없습니다.</div>
        )}
      </div>
    </div>
  );
};