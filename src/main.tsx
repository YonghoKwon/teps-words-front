import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Strict Mode를 제거하여 개발 모드에서도 이펙트를 한 번만 실행
  <App />
);
