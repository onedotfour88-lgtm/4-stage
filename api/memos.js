const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbsramkkihinbbwfvdhv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_argHqiur6aAESLaa3meh7g_O6DZp_cZ';

module.exports = async function handler(req, res) {
  // JSON 응답 및 보안 헤더 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    // 1. Authorization 헤더 검증
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: '로그인이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. 토큰 유효성 및 사용자 검증
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized', message: '유효하지 않은 토큰입니다.' });
    }

    const userId = user.id;
    const { method } = req;

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
      const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, body } = bodyData || {};

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
    console.error('API Server Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message || '서버 오류가 발생했습니다.' });
  }
};