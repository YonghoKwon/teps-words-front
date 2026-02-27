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

  // 단어 유형 및 품사 필터 상태
  const [wordType, setWordType] = useState<'concepts' | 'regular'>('concepts');
  const [partOfSpeech, setPartOfSpeech] = useState<string>('all');
  const [studyMode, setStudyMode] = useState<'normal' | 'bookmark' | 'wrong'>('normal');
  const [promptMode, setPromptMode] = useState<'english' | 'meaning'>('english');
  const [showFilters, setShowFilters] = useState(false);

  // API 호출 함수
  const fetchRandomWord = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('단어 가져오기 요청 시작');

      if (studyMode === 'bookmark' || studyMode === 'wrong') {
        const endpoint = studyMode === 'bookmark' ? '/api/words/bookmarks' : '/api/words/wrongs';
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(studyMode === 'bookmark' ? '즐겨찾기 단어를 가져오지 못했습니다.' : '오답 단어를 가져오지 못했습니다.');
        }

        const rows = await response.json();
        const filtered = (Array.isArray(rows) ? rows : []).filter((r: any) => {
          const typeOk = !r.wordType || r.wordType === wordType;
          const posOk = partOfSpeech === 'all' || r.partOfSpeech === partOfSpeech;
          return typeOk && posOk;
        });

        if (filtered.length === 0) {
          throw new Error(studyMode === 'bookmark' ? '조건에 맞는 즐겨찾기 단어가 없습니다.' : '조건에 맞는 오답 단어가 없습니다.');
        }

        const sorted = studyMode === 'wrong'
          ? [...filtered].sort((a: any, b: any) => (b.wrongCount ?? 0) - (a.wrongCount ?? 0)).slice(0, 30)
          : filtered;

        const pick = sorted[Math.floor(Math.random() * sorted.length)];
        setCurrentWord({
          seq: pick.seq,
          word: pick.word,
          partOfSpeech: pick.partOfSpeech,
          meaning: pick.meaning,
        });
        return;
      }

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
      <div className="filters-toggle-wrap">
        <button className="filters-toggle-btn" onClick={() => setShowFilters(v => !v)}>
          {showFilters ? '옵션 숨기기' : '옵션 보기'}
        </button>
      </div>

      {/* 필터 컨트롤 영역 */}
      {showFilters && (
        <div className="filter-controls">
          <div className="filter-section">
            <div className="word-type-selector inline-selector-row">
              <label className="filter-label">단어 유형:</label>
              <select value={wordType} onChange={(e) => setWordType(e.target.value as 'concepts' | 'regular')}>
                <option value="concepts">컨설텝스 단어</option>
                <option value="regular">일반 단어</option>
              </select>
            </div>

            <div className="part-of-speech-selector inline-selector-row">
              <label className="filter-label">품사:</label>
              <select value={partOfSpeech} onChange={(e) => setPartOfSpeech(e.target.value)}>
                {PART_OF_SPEECH_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="part-of-speech-selector inline-selector-row">
              <label className="filter-label">모드:</label>
              <select value={studyMode} onChange={(e) => setStudyMode(e.target.value as 'normal' | 'bookmark' | 'wrong')}>
                <option value="normal">일반 단어 보기</option>
                <option value="bookmark">즐겨찾기 단어 보기</option>
                <option value="wrong">오답 단어 보기</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">단어를 불러오는 중...</div>
      ) : (
        <>
          <div className="fetch-row bottom-fetch-row">
            <button className="apply-filter-button" onClick={fetchRandomWord}>
              새 단어 가져오기
            </button>
            <div className="prompt-mode-toggle" role="group" aria-label="문제 표시 방식">
              <button
                type="button"
                className={`prompt-toggle-btn ${promptMode === 'english' ? 'active' : ''}`}
                onClick={() => setPromptMode('english')}
              >
                영단어 먼저
              </button>
              <button
                type="button"
                className={`prompt-toggle-btn ${promptMode === 'meaning' ? 'active' : ''}`}
                onClick={() => setPromptMode('meaning')}
              >
                뜻 먼저
              </button>
            </div>
          </div>

          <WordCard
            word={currentWord}
            wordType={wordType}
            promptMode={promptMode}
            onNextWord={fetchRandomWord}
          />

          {error && (
            <div className="error-message">
              {error}
              <button
                className="apply-filter-button"
                style={{ marginTop: '10px', width: '100%' }}
                onClick={fetchRandomWord}
              >
                다시 시도
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};