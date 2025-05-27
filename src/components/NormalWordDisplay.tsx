import React from 'react';
import { CategoryWord } from '../services/CategoryWordService';
import '../styles/NormalWordDisplay.css'; // Import NormalWordDisplay CSS

interface NormalWordDisplayProps {
  wordData: CategoryWord | null;
  displayState: 'showingWord' | 'showingMeaning';
  onNext: () => void; // Callback function for the Next button
  loading?: boolean; // Optional loading state
}

const NormalWordDisplay: React.FC<NormalWordDisplayProps> = (props) => {
  const { wordData, displayState, onNext, loading } = props;

  if (loading) {
    return <p className="loading-text">Loading...</p>; // className added
  }

  if (!wordData) {
    // Return null or a minimal message if no word data, to avoid showing an empty box
    // or to let the parent component decide what to show.
    return null;
  }

  return (
    <div className="normal-word-display-container"> {/* className updated */}
      <div className="word-display-area"> {/* className added */}
        {displayState === 'showingWord' && (
          <>
            <h1>{wordData.english}</h1>
          </>
        )}

        {displayState === 'showingMeaning' && (
          <>
            <h1>{wordData.english}</h1>
            <p>{wordData.meaning}</p>
            {wordData.note && <p><em>Note: {wordData.note}</em></p>}
            {wordData.description && <p><em>Description: {wordData.description}</em></p>}
          </>
        )}
      </div>

      <div className="next-button-container"> {/* className added */}
        <button onClick={onNext} className="normal-next-button"> {/* className added */}
          Next
        </button>
      </div>
    </div>
  );
};

export default NormalWordDisplay;
