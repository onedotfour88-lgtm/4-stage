import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbsramkkihinbbwfvdhv.supabase.co';
// Vercel 환경 변수가 없으면 클라이언트 anon 키를 fallback으로 사용하도록 처리
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_argHqiur6aAESLaa3meh7g_O6DZp_cZ';

export default async function handler(req, res) {
  // 보안 헤더 및 JSON 응답 강제
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 1. Authorization 헤더 확인
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: '로그인이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];
  
  // Supabase 클라이언트 생성 및 유저 검증
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized', message: '유효하지 않은 토큰입니다.' });
  }

  const userId = user.id;
  const { method } = req;

  try {
    // [GET] 내 메모 목록 조회
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('memos')
        .select('id, title, body')
        .eq('owner_id', userId);

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // [POST] 새 메모 작성
    if (method === 'POST') {
      const { title, body } = req.body || {};
      if (!title || !body) {
        return res.status(400).json({ error: 'Bad Request', message: '제목과 내용을 입력해주세요.' });
      }

      const { data, error } = await supabase
        .from('memos')
        .insert([{ title, body, owner_id: userId }])
        .select('id, title, body')
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    // [DELETE] 메모 삭제
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'ID가 필요합니다.' });
      }

      const { error } = await supabase
        .from('memos')
        .delete()
        .eq('id', id)
        .eq('owner_id', userId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}