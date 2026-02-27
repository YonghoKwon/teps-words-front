import { SegmentedControl } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const value = location.pathname === '/words' ? 'words' : 'random';

  return (
    <SegmentedControl
      fullWidth
      radius="xl"
      size="md"
      value={value}
      onChange={(next) => navigate(next === 'words' ? '/words' : '/')}
      data={[
        { label: '랜덤 단어', value: 'random' },
        { label: '단어 목록', value: 'words' },
      ]}
    />
  );
};
