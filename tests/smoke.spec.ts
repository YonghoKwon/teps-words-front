import { test, expect } from '@playwright/test';

test('word study smoke flow', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('TEPS Words')).toBeVisible();
  await expect(page.getByRole('button', { name: '옵션 보기' })).toBeVisible();

  // Main controls
  await expect(page.getByRole('button', { name: '새 단어 가져오기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '정답 보기' })).toBeVisible();

  // Quiz flow
  const quizBtn = page.getByRole('button', { name: /퀴즈/ });
  await quizBtn.click();

  await expect(page.getByText(/퀴즈/)).toBeVisible();

  const option = page.locator('.meaning-choice').first();
  await option.click();

  await expect(page.getByText(/다음 단어로 이동/)).toBeVisible();
});
