import { supabase } from './supabaseService.js';

// ERD 변경: naver_reviews는 user_store_id 기반
export const saveReviews = async (userStoreId, reviews) => {
  const records = reviews.map(r => ({
    user_store_id: userStoreId,
    review_content: r.content,
    author_nickname: r.nickname,
    review_date: r.date || null,
    rating: r.rating ?? null
  }));
  const { error } = await supabase.from('naver_reviews').insert(records);
  if (error) throw error;
};

