import { useState, useEffect, useRef } from 'react';
import { Word } from '../types/Word.ts';
import { generateExampleSentence, fetchAvailableModels, OpenAIModel } from '../services/OpenaiService';
import { addBookmark, addWrongAnswer, fetchWordProgress, removeBookmark } from '../services/WordProgressService';
import '../styles/WordCard.css';

interface WordCardProps {
  word: Word | null;
  wordType: 'concepts' | 'regular';
  onNextWord: () => void;
}

interface ExampleSentence {
  sentence: string;
  translation: string;
}

// 기본 단어 정보
const defaultWord: Word = {
  seq: 0,
  word: "example",
  meaning: "예시, 보기",
  partOfSpeech: "n.",
};

// 기본 모델 목록
const DEFAULT_MODELS = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
];

// 모델 목록 캐싱을 위한 변수
let cachedModels: OpenAIModel[] | null = null;
let isModelsFetching = false;

// 자동 변경 설정을 저장하기 위한 전역 변수
let isAutoChangeEnabled = false;
let autoChangeInterval = 5; // 초 단위 기본값

// 예문 보기 설정을 저장하기 위한 전역 변수 추가
let isShowExamplesEnabled = false;
let lastSelectedModel = 'gpt-3.5-turbo';
let swipeSensitivity: 'low' | 'medium' | 'high' = 'medium';

export const WordCard = ({ word, wordType, onNextWord }: WordCardProps) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showEnglish, setShowEnglish] = useState(true);
  const [exampleSentence, setExampleSentence] = useState<ExampleSentence | null>(null);
  const [loadingExample, setLoadingExample] = useState(false);
  const [exampleError, setExampleError] = useState<string | null>(null);
  // 전역 변수에서 초기화
  const [showExamples, setShowExamples] = useState(isShowExamplesEnabled);
  const [selectedModel, setSelectedModel] = useState(lastSelectedModel);
  const [models, setModels] = useState<OpenAIModel[]>(DEFAULT_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [swipeLevel, setSwipeLevel] = useState<'low' | 'medium' | 'high'>(swipeSensitivity);

  // 자동 변경 관련 상태 추가 - 전역 변수에서 초기화
  const [autoChangeEnabled, setAutoChangeEnabled] = useState(isAutoChangeEnabled);
  const [changeInterval, setChangeInterval] = useState(autoChangeInterval);
  const timerRef = useRef<number | null>(null);

  // 현재 요청 상태를 추적하는 ref
  const isExampleFetchingRef = useRef(false);
  // 현재 보여지는 단어 추적
  const currentWordRef = useRef('');
  // 컴포넌트가 마운트 됐는지 추적
  const isMountedRef = useRef(false);
  // 스와이프 제스처용 ref/state
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [gestureHint, setGestureHint] = useState<string | null>(null);

  // 서버에서 단어를 불러오지 못했을 때 기본 단어 사용
  const currentWord = word || defaultWord;

  // 모델 정보 가져오기 - 첫 마운트시에만 실행
  useEffect(() => {
    // 컴포넌트가 이미 마운트되었거나, 모델 정보를 가져오는 중이면 중복 호출 방지
    if (isMountedRef.current || isModelsFetching) {
      return;
    }

    isMountedRef.current = true;

    const loadModels = async () => {
      // 이미 캐시된 모델이 있으면 사용
      if (cachedModels) {
        setModels(cachedModels);
        return;
      }

      setLoadingModels(true);
      isModelsFetching = true;

      try {
        const availableModels = await fetchAvailableModels();
        if (availableModels.length > 0) {
          // 결과 캐싱 및 상태 업데이트
          cachedModels = availableModels;
          setModels(availableModels);
        }
      } catch (error) {
        console.error('모델 목록 가져오기 실패:', error);
        // 오류 시 기본 모델 유지
      } finally {
        setLoadingModels(false);
        isModelsFetching = false;
      }
    };

    loadModels();

    // 컴포넌트 언마운트 시 마운트 상태 초기화
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 자동 변경 설정이 변경될 때 전역 변수에 저장
  useEffect(() => {
    isAutoChangeEnabled = autoChangeEnabled;
    autoChangeInterval = changeInterval;
  }, [autoChangeEnabled, changeInterval]);

  // 예문 보기 설정이 변경될 때 전역 변수에 저장
  useEffect(() => {
    isShowExamplesEnabled = showExamples;
  }, [showExamples]);

  // 선택된 모델이 변경될 때 전역 변수에 저장
  useEffect(() => {
    lastSelectedModel = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    swipeSensitivity = swipeLevel;
  }, [swipeLevel]);

  // 자동 변경 모드일 때는 항상 답변이 보이는 상태 유지
  useEffect(() => {
    if (autoChangeEnabled) {
      setShowAnswer(true);
    }
  }, [autoChangeEnabled]);

  // 자동 단어 변경 타이머 설정
  useEffect(() => {
    // 타이머 초기화 함수
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    // 자동 변경 기능이 활성화되어 있으면 타이머 설정
    if (autoChangeEnabled) {
      clearTimer(); // 기존 타이머 초기화
      timerRef.current = window.setTimeout(() => {
        handleNextWord();
      }, changeInterval * 1000);

      console.log(`자동 단어 변경 타이머 설정: ${changeInterval}초`);
    } else {
      clearTimer();
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      clearTimer();
    };
  }, [autoChangeEnabled, changeInterval, currentWord.word]); // 단어가 변경될 때마다 타이머 재설정

  // 예문 가져오기
  const fetchExampleSentence = async () => {
    // 예문 표시 설정이 꺼져 있으면 가져오지 않음
    if (!showExamples) return;

    // 이미 해당 단어에 대한 요청 진행 중이면 리턴
    if (isExampleFetchingRef.current ||
      !currentWord ||
      !showAnswer ||
      currentWordRef.current === currentWord.word) return;

    isExampleFetchingRef.current = true;
    currentWordRef.current = currentWord.word;

    setLoadingExample(true);
    setExampleError(null);

    console.log(`예문 가져오기 시작: ${currentWord.word} (모델: ${selectedModel})`);

    try {
      const result = await generateExampleSentence(
        currentWord.word,
        currentWord.partOfSpeech,
        selectedModel // 선택된 모델 전달
      );

      // 비동기 응답이 돌아왔을 때 컴포넌트가 여전히 마운트되어 있고
      // 여전히 같은 단어를 보여주고 있는지 확인
      if (currentWordRef.current === currentWord.word) {
        setExampleSentence(result);
        console.log(`예문 가져오기 성공: ${currentWord.word}`);
      }
    } catch (error) {
      if (currentWordRef.current === currentWord.word) {
        setExampleError('예문을 생성하는 중 오류가 발생했습니다.');
        console.error('예문 생성 오류:', error);
      }
    } finally {
      isExampleFetchingRef.current = false;
      setLoadingExample(false);
    }
  };

  // 답변이 표시될 때 예문 가져오기
  useEffect(() => {
    if (showAnswer && showExamples) {
      // 단어가 바뀌었거나 새로운 답변이 표시될 때만 예문 가져오기
      if (currentWordRef.current !== currentWord.word) {
        fetchExampleSentence();
      }
    } else {
      // 답변이 숨겨질 때 예문 초기화
      setExampleSentence(null);
      setExampleError(null);
      // 다음 단어를 위해 currentWordRef 초기화
      if (!showAnswer) {
        currentWordRef.current = '';
      }
    }

    // 컴포넌트 언마운트 시 ref 초기화
    return () => {
      isExampleFetchingRef.current = false;
    };
  }, [showAnswer, showExamples, selectedModel, currentWord.word]);

  useEffect(() => {
    loadProgress();
  }, [currentWord.word, currentWord.meaning, currentWord.partOfSpeech, currentWord.seq, wordType]);

  const handleNextWord = () => {
    // 일반 모드에서는 답 표시 상태 초기화
    if (!autoChangeEnabled) {
      setShowAnswer(false);
      setShowEnglish(Math.random() < 0.5); // 50% 확률로 영어/한글 선택
    }
    // 자동 변경 모드에서는 항상 답변이 보이는 상태 유지

    // 예문 초기화
    setExampleSentence(null);
    currentWordRef.current = '';

    onNextWord();
  };

  // 예문 다시 가져오기
  const handleRefreshExample = () => {
    currentWordRef.current = ''; // 단어 ref 초기화로 API 호출 유도
    fetchExampleSentence();
  };

  // 시간 간격 변경 핸들러
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setChangeInterval(value);
    }
  };

  // 자동 변경 토글 핸들러
  const handleAutoChangeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    setAutoChangeEnabled(isEnabled);

    // 자동 변경이 활성화되면 항상 답변이 보이는 상태로 설정
    if (isEnabled) {
      setShowAnswer(true);
    }
  };

  // 예문 보기 토글 핸들러
  const handleShowExamplesToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    setShowExamples(isEnabled);

    // 예문 보기가 활성화되면 현재 단어의 예문 가져오기
    if (isEnabled && showAnswer && currentWordRef.current !== currentWord.word) {
      currentWordRef.current = '';  // 강제로 예문 가져오기 유도
      fetchExampleSentence();
    }
  };

  const showGestureHint = (message: string) => {
    setGestureHint(message);
    window.setTimeout(() => setGestureHint(null), 1200);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
    touchStartYRef.current = e.changedTouches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (autoChangeEnabled || touchStartXRef.current === null || touchStartYRef.current === null) return;

    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const diffX = endX - touchStartXRef.current;
    const diffY = endY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    const threshold = swipeLevel === 'high' ? 30 : swipeLevel === 'low' ? 70 : 50;

    // 세로 스크롤 제스처와 충돌 방지
    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (Math.abs(diffX) < threshold) return;

    if (diffX > 0) {
      // 오른쪽 스와이프: 정답 보기
      if (!showAnswer) {
        setShowAnswer(true);
        showGestureHint('정답 표시');
      }
    } else {
      // 왼쪽 스와이프: 다음 단어
      handleNextWord();
      showGestureHint('다음 단어');
    }
  };

  const loadProgress = async () => {
    if (!currentWord || currentWord.seq === 0) return;

    setProgressLoading(true);
    setProgressError(null);
    try {
      const progress = await fetchWordProgress(currentWord, wordType);
      setBookmarked(progress.bookmarked);
      setWrongCount(progress.wrongCount);
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : '진행 상태를 불러오지 못했습니다.');
    } finally {
      setProgressLoading(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentWord || currentWord.seq === 0) return;
    try {
      if (bookmarked) {
        await removeBookmark(currentWord, wordType);
        setBookmarked(false);
        showGestureHint('즐겨찾기 해제');
      } else {
        await addBookmark(currentWord, wordType);
        setBookmarked(true);
        showGestureHint('즐겨찾기 저장');
      }
      setProgressError(null);
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : '즐겨찾기 처리 중 오류가 발생했습니다.');
    }
  };

  const handleMarkWrong = async () => {
    if (!currentWord || currentWord.seq === 0) return;
    try {
      const wrong = await addWrongAnswer(currentWord, wordType);
      setWrongCount(wrong.wrongCount ?? wrongCount + 1);
      setProgressError(null);
      showGestureHint('오답 저장');
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : '오답 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div
      className={`word-card ${!showAnswer && !autoChangeEnabled ? 'clickable' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 설정 영역 (맨 위) */}
      <div className="settings-area">
        <div className="setting-options">
          {/* 첫 번째 줄: 자동 변경 옵션 */}
          <div className="setting-row">
            <label className="setting-option">
              <input
                type="checkbox"
                checked={autoChangeEnabled}
                onChange={handleAutoChangeToggle}
              />
              <span>자동 변경</span>
            </label>

            {autoChangeEnabled && (
              <div className="interval-selector">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={changeInterval}
                  onChange={handleIntervalChange}
                  style={{ width: '40px' }}
                />
                <span>초</span>
              </div>
            )}
          </div>

          {/* 두 번째 줄: 예문 보기 옵션 */}
          <div className="setting-row">
            <label className="setting-option">
              <input
                type="checkbox"
                checked={showExamples}
                onChange={handleShowExamplesToggle}
              />
              <span>예문 보기</span>
            </label>

            <div className="model-selector">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!showExamples || loadingModels}
              >
                {loadingModels ? (
                  <option>모델 로딩 중...</option>
                ) : (
                  models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-option">
              <span>스와이프 감도</span>
            </label>
            <div className="model-selector">
              <select
                value={swipeLevel}
                onChange={(e) => setSwipeLevel(e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="high">민감</option>
                <option value="medium">보통</option>
                <option value="low">둔감</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 액션 영역 (설정 아래) */}
      <div className="action-area">
        {!showAnswer && !autoChangeEnabled ? (
          <p
            className="hint clickable-hint"
            onClick={(e) => {
              e.stopPropagation(); // 카드 전체 클릭 이벤트 방지
              setShowAnswer(true); // 힌트 클릭 시 답 표시
            }}
          >
            (확인)
          </p>
        ) : (
          !autoChangeEnabled && (
            <button
              className="next-word-button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextWord();
              }}
            >
              다음 단어
            </button>
          )
        )}
      </div>

      <div className="progress-actions">
        <button className={`bookmark-button ${bookmarked ? 'active' : ''}`} onClick={handleToggleBookmark}>
          {bookmarked ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
        <button className="wrong-button" onClick={handleMarkWrong}>오답 +1</button>
      </div>

      <div className="progress-status">
        {progressLoading ? '진행 상태 불러오는 중...' : `오답 ${wrongCount}회`}
      </div>
      {progressError && <div className="progress-error">{progressError}</div>}

      {/* 메인 콘텐츠 영역 */}
      <div className="word-content">
        {!showAnswer && !autoChangeEnabled ? (
          <div className="word-question">
            {showEnglish ? currentWord.word : currentWord.meaning}
            <div className="part-of-speech">{showEnglish && currentWord.partOfSpeech}</div>
          </div>
        ) : (
          <>
            {/* 자동 변경 모드와 일반 모드에서 동일한 답변 형태 표시 */}
            <div className="word-answer">
              <div className="english-word">{currentWord.word} <span className="part-of-speech">{currentWord.partOfSpeech}</span></div>
              <div className="korean-meaning">{currentWord.meaning}</div>
            </div>

            {showExamples && (
              <div className="example-container">
                <div className="example-header">
                  <h3>예문</h3>
                  {!loadingExample && (
                    <button
                      className="refresh-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshExample();
                      }}
                      title="새 예문 생성"
                    >
                      ↻
                    </button>
                  )}
                </div>

                {loadingExample && <div className="example-loading">예문을 생성하는 중...</div>}
                {exampleError && <div className="example-error">{exampleError}</div>}
                {exampleSentence && (
                  <div className="example-content">
                    <div className="example-sentence">{exampleSentence.sentence}</div>
                    <div className="example-translation">{exampleSentence.translation}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!autoChangeEnabled && (
          <div className="swipe-guide">
            ← 왼쪽 스와이프: 다음 단어 · 오른쪽 스와이프: 정답 보기 →
          </div>
        )}
      </div>

      {gestureHint && <div className="gesture-toast">{gestureHint}</div>}

      {!autoChangeEnabled && (
        <button
          className="mobile-fixed-cta"
          onClick={(e) => {
            e.stopPropagation();
            if (!showAnswer) {
              setShowAnswer(true);
            } else {
              handleNextWord();
            }
          }}
        >
          {showAnswer ? '다음 단어' : '정답 보기'}
        </button>
      )}
    </div>
  );
};