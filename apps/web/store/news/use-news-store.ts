import { create } from 'zustand'

export type NewsItemData = {
  id: string;
  time: string;
  date: string;
  timestamp: number;
  title: string;
  source: string;
  tags: string[];
  body: string | null;
  articleUrl: string | null;
  upvotes: number;
  downvotes: number;
  viewerVote: 'up' | 'down' | null;
}

interface NewsStore {
  selectedNews: NewsItemData | null;
  setSelectedNews: (news: NewsItemData | null) => void;
}

export const useNewsStore = create<NewsStore>((set) => ({
  selectedNews: null,
  setSelectedNews: (news) => set({ selectedNews: news }),
}))
