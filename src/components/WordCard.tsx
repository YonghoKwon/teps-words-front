import { useState, useEffect, useRef } from 'react';
import { Word } from '../types/Word.ts';
import { generateExampleSentence, fetchAvailableModels, OpenAIModel } from '../services/OpenaiService';
import '../styles/WordCard.css';

interface WordCardProps {
  word: Word | null;
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

export const WordCard = ({ word, onNextWord }: WordCardProps) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showEnglish, setShowEnglish] = useState(true);
  const [exampleSentence, setExampleSentence] = useState<ExampleSentence | null>(null);
  const [loadingExample, setLoadingExample] = useState(false);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [models, setModels] = useState<OpenAIModel[]>(DEFAULT_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);

  // 현재 요청 상태를 추적하는 ref
  const isExampleFetchingRef = useRef(false);
  // 현재 보여지는 단어 추적
  const currentWordRef = useRef('');
  // 컴포넌트가 마운트 됐는지 추적
  const isMountedRef = useRef(false);

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

  const handleNextWord = () => {
    setShowAnswer(false);
    setShowEnglish(Math.random() < 0.5); // 50% 확률로 영어/한글 선택
    onNextWord();
  };

  // 예문 다시 가져오기
  const handleRefreshExample = () => {
    currentWordRef.current = ''; // 단어 ref 초기화로 API 호출 유도
    fetchExampleSentence();
  };

  return (
    <div className={`word-card ${!showAnswer ? 'clickable' : ''}`}>
      {/* 설정 영역 (맨 위) */}
      <div className="settings-area">
        <div className="setting-options">
          <label className="setting-option">
            <input
              type="checkbox"
              checked={showExamples}
              onChange={(e) => setShowExamples(e.target.checked)}
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
      </div>

      {/* 액션 영역 (설정 아래) */}
      <div className="action-area">
        {!showAnswer ? (
          <p
            className="hint clickable-hint"
            onClick={(e) => {
              e.stopPropagation(); // 카드 전체 클릭 이벤트 방지
              setShowAnswer(true); // 힌트 클릭 시 답 표시
            }}
          >
            (클릭하여 답 확인)
          </p>
        ) : (
          <button
            className="next-word-button"
            onClick={(e) => {
              e.stopPropagation();
              handleNextWord();
            }}
          >
            다음 단어
          </button>
        )}
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="word-content">
        {!showAnswer ? (
          <div className="word-question">
            {showEnglish ? currentWord.word : currentWord.meaning}
            <div className="part-of-speech">{showEnglish && currentWord.partOfSpeech}</div>
          </div>
        ) : (
          <>
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
      </div>
    </div>
  );
};