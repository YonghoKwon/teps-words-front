import { useEffect, useRef, useState } from 'react';
import { Word } from '../types/Word.ts';
import { addBookmark, addWrongAnswer, fetchWordProgress, removeBookmark } from '../services/WordProgressService';
import '../styles/WordCard.css';

interface WordCardProps {
  word: Word | null;
  wordType: 'concepts' | 'regular';
  promptMode: 'english' | 'meaning';
  onNextWord: () => void;
}

const defaultWord: Word = {
  seq: 0,
  word: 'example',
  meaning: '예시, 보기',
  partOfSpeech: 'n.',
};

let sessionQuizTotalCache = 0;
let sessionQuizCorrectCache = 0;

try {
  const t = Number(sessionStorage.getItem('quiz_total') || '0');
  const c = Number(sessionStorage.getItem('quiz_correct') || '0');
  if (Number.isFinite(t)) sessionQuizTotalCache = t;
  if (Number.isFinite(c)) sessionQuizCorrectCache = c;
} catch (_) {
  // ignore
}

export const WordCard = ({ word, wordType, promptMode, onNextWord }: WordCardProps) => {
  const currentWord = word || defaultWord;

  const [showAnswer, setShowAnswer] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [showChoiceQuiz, setShowChoiceQuiz] = useState(false);
  const [quizChoices, setQuizChoices] = useState<string[]>([]);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizTarget, setQuizTarget] = useState<'meaning' | 'word'>('meaning');
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  const [sessionQuizTotal, setSessionQuizTotal] = useState(0);
  const [sessionQuizCorrect, setSessionQuizCorrect] = useState(0);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastWrongKeyRef = useRef<string>('');
  const lastWrongTimeRef = useRef<number>(0);
  const quizAutoNextTimerRef = useRef<number | null>(null);
  const quizCountdownIntervalRef = useRef<number | null>(null);
  const [gestureHint, setGestureHint] = useState<string | null>(null);

  useEffect(() => {
    setSessionQuizTotal(sessionQuizTotalCache);
    setSessionQuizCorrect(sessionQuizCorrectCache);

    return () => {
      if (quizAutoNextTimerRef.current !== null) {
        window.clearTimeout(quizAutoNextTimerRef.current);
        quizAutoNextTimerRef.current = null;
      }
      if (quizCountdownIntervalRef.current !== null) {
        window.clearInterval(quizCountdownIntervalRef.current);
        quizCountdownIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    loadProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord.word, currentWord.meaning, currentWord.partOfSpeech, currentWord.seq, wordType]);

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

  const handleNextWord = () => {
    if (quizAutoNextTimerRef.current !== null) {
      window.clearTimeout(quizAutoNextTimerRef.current);
      quizAutoNextTimerRef.current = null;
    }
    if (quizCountdownIntervalRef.current !== null) {
      window.clearInterval(quizCountdownIntervalRef.current);
      quizCountdownIntervalRef.current = null;
    }

    setAutoNextCountdown(null);
    setShowAnswer(false);
    setShowChoiceQuiz(false);
    setQuizChoices([]);
    setQuizSelected(null);
    setQuizResult(null);
    onNextWord();
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
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const diffX = endX - touchStartXRef.current;
    const diffY = endY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (Math.abs(diffX) < 50) return;

    if (diffX > 0) {
      if (!showAnswer) {
        setShowAnswer(true);
        showGestureHint('정답 표시');
      }
    } else {
      handleNextWord();
      showGestureHint('다음 단어');
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

  const handleMarkWrong = async (silent = false) => {
    if (!currentWord || currentWord.seq === 0) return;

    const key = `${wordType}:${currentWord.seq}:${currentWord.word}:${currentWord.partOfSpeech}:${currentWord.meaning}`;
    const now = Date.now();
    if (lastWrongKeyRef.current === key && now - lastWrongTimeRef.current < 1500) {
      if (!silent) showGestureHint('잠시 후 다시 시도');
      return;
    }

    try {
      const wrong = await addWrongAnswer(currentWord, wordType);
      setWrongCount(wrong.wrongCount ?? wrongCount + 1);
      lastWrongKeyRef.current = key;
      lastWrongTimeRef.current = now;
      setProgressError(null);
      if (!silent) showGestureHint('오답 저장');
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : '오답 저장 중 오류가 발생했습니다.');
    }
  };

  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  const buildChoiceQuiz = async () => {
    if (!currentWord || currentWord.seq === 0) return;

    setShowChoiceQuiz(true);
    setQuizLoading(true);
    setQuizResult(null);
    setQuizSelected(null);

    try {
      const startSeq = Math.max(1, currentWord.seq - 250);
      const endSeq = currentWord.seq + 250;
      const response = await fetch(`/api/words/range?startSeq=${startSeq}&endSeq=${endSeq}`);
      if (!response.ok) throw new Error('퀴즈 선택지를 불러오지 못했습니다.');

      const words: Word[] = await response.json();
      const samePos = words.filter((w) => w.partOfSpeech === currentWord.partOfSpeech);

      if (promptMode === 'english') {
        // 영단어 먼저 모드의 영단어 퀴즈 -> 보기는 뜻
        const distractors = samePos
          .filter((w) => w.meaning !== currentWord.meaning)
          .map((w) => w.meaning)
          .filter((v, i, self) => self.indexOf(v) === i)
          .slice(0, 40);

        const picked = shuffle(distractors).slice(0, 2);
        if (picked.length < 2) throw new Error('유사 보기 생성에 실패했어요. 다시 눌러주세요.');

        setQuizTarget('meaning');
        setQuizChoices(shuffle([currentWord.meaning, ...picked]));
      } else {
        // 뜻 먼저 모드의 뜻 퀴즈 -> 보기는 영단어
        const distractors = samePos
          .filter((w) => w.word !== currentWord.word)
          .map((w) => w.word)
          .filter((v, i, self) => self.indexOf(v) === i)
          .slice(0, 40);

        const picked = shuffle(distractors).slice(0, 2);
        if (picked.length < 2) throw new Error('유사 보기 생성에 실패했어요. 다시 눌러주세요.');

        setQuizTarget('word');
        setQuizChoices(shuffle([currentWord.word, ...picked]));
      }
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : '유사 보기 퀴즈 생성 중 오류가 발생했습니다.');
      setShowChoiceQuiz(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handlePickChoice = async (choice: string) => {
    if (quizSelected !== null) return;

    setQuizSelected(choice);
    const correctAnswer = quizTarget === 'meaning' ? currentWord.meaning : currentWord.word;
    const isCorrect = choice === correctAnswer;
    setQuizResult(isCorrect ? 'correct' : 'wrong');

    const nextTotal = sessionQuizTotal + 1;
    const nextCorrect = sessionQuizCorrect + (isCorrect ? 1 : 0);
    setSessionQuizTotal(nextTotal);
    setSessionQuizCorrect(nextCorrect);
    sessionQuizTotalCache = nextTotal;
    sessionQuizCorrectCache = nextCorrect;

    try {
      sessionStorage.setItem('quiz_total', String(nextTotal));
      sessionStorage.setItem('quiz_correct', String(nextCorrect));
    } catch (_) {
      // ignore
    }

    if (!isCorrect) {
      await handleMarkWrong(true);
    }

    if (quizAutoNextTimerRef.current !== null) {
      window.clearTimeout(quizAutoNextTimerRef.current);
    }
    if (quizCountdownIntervalRef.current !== null) {
      window.clearInterval(quizCountdownIntervalRef.current);
    }

    setAutoNextCountdown(3);
    quizCountdownIntervalRef.current = window.setInterval(() => {
      setAutoNextCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (quizCountdownIntervalRef.current !== null) {
            window.clearInterval(quizCountdownIntervalRef.current);
            quizCountdownIntervalRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    quizAutoNextTimerRef.current = window.setTimeout(() => {
      handleNextWord();
    }, 3000);
  };

  return (
    <div
      className={`word-card ${!showAnswer ? 'clickable' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="action-area">
        {!showAnswer ? (
          <p
            className="hint clickable-hint"
            onClick={(e) => {
              e.stopPropagation();
              setShowAnswer(true);
            }}
          >
            (확인)
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

      <div className="progress-actions">
        <button className={`bookmark-button ${bookmarked ? 'active' : ''}`} onClick={handleToggleBookmark}>
          {bookmarked ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
        </button>
        <button className="wrong-button" onClick={() => handleMarkWrong(false)}>오답 +1</button>
      </div>

      <div className="progress-status">
        {progressLoading ? '진행 상태 불러오는 중...' : `오답 ${wrongCount}회`}
      </div>
      <div className="quiz-accuracy-status">
        퀴즈 정답률(세션): {sessionQuizTotal > 0 ? `${Math.round((sessionQuizCorrect / sessionQuizTotal) * 100)}% (${sessionQuizCorrect}/${sessionQuizTotal})` : '아직 없음'}
      </div>
      {progressError && <div className="progress-error">{progressError}</div>}

      <div className="word-content">
        {!showAnswer ? (
          <div className="word-question">
            {promptMode === 'english' ? currentWord.word : currentWord.meaning}
            <div className="part-of-speech">{promptMode === 'english' && currentWord.partOfSpeech}</div>
          </div>
        ) : (
          <>
            <div className="word-answer">
              <div className="english-word">{currentWord.word} <span className="part-of-speech">{currentWord.partOfSpeech}</span></div>
              {!showChoiceQuiz && <div className="korean-meaning">{currentWord.meaning}</div>}
            </div>

          </>
        )}

        {showChoiceQuiz && (
          <div className="meaning-quiz-box">
            <div className="meaning-quiz-title">
              {quizTarget === 'meaning' ? '뜻 맞히기 퀴즈 (1개 정답)' : '영단어 맞히기 퀴즈 (1개 정답)'}
            </div>
            <div className="meaning-quiz-options">
              {quizLoading && <div className="meaning-quiz-loading">퀴즈 보기 생성 중...</div>}
              {!quizLoading && quizChoices.map((choice, idx) => (
                <button
                  key={`${choice}-${idx}`}
                  className={`meaning-choice ${quizSelected === choice ? 'selected' : ''}`}
                  onClick={() => handlePickChoice(choice)}
                  disabled={quizSelected !== null}
                >
                  {idx + 1}. {choice}
                </button>
              ))}
            </div>
            {quizResult && (
              <>
                <div className={`meaning-quiz-result ${quizResult}`}>
                  {quizResult === 'correct' ? '정답입니다! 🎉' : `오답입니다. 정답: ${quizTarget === 'meaning' ? currentWord.meaning : currentWord.word}`}
                </div>
                {autoNextCountdown !== null && (
                  <div className="auto-next-countdown">{autoNextCountdown}초 후 다음 단어로 이동</div>
                )}
              </>
            )}
          </div>
        )}

        <div className="swipe-guide">
          ← 왼쪽 스와이프: 다음 단어 · 오른쪽 스와이프: 정답 보기 →
        </div>

        <div className="mobile-fixed-cta-wrap inline-cta-wrap">
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
          <button
            className="mobile-fixed-quiz-btn"
            onClick={async (e) => {
              e.stopPropagation();
              await buildChoiceQuiz();
            }}
            disabled={quizLoading}
          >
            {quizLoading ? '생성 중...' : (promptMode === 'english' ? '영단어 퀴즈' : '뜻 퀴즈')}
          </button>
        </div>
      </div>

      {gestureHint && <div className="gesture-toast">{gestureHint}</div>}


    </div>
  );
};
