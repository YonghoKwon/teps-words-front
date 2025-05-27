export interface CategoryWord {
  seq: number;
  des_seq: number;
  description: string;
  english: string;
  meaning: string;
  note: string | null;
}

export async function fetchRandomWordByCategory(categoryId: number): Promise<CategoryWord> {
  const url = `/api/v1/categories/${categoryId}/random-word`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch word from category: ${response.statusText}`);
    }

    const data: CategoryWord = await response.json();
    console.log("Fetched random word by category:", data);
    return data;
  } catch (error) {
    console.error("Error fetching random word by category:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}
