const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbsramkkihinbbwfvdhv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_argHqiur6aAESLaa3meh7g_O6DZp_cZ';

module.exports = async function handler(req, res) {
  // 보안 헤더 설정 및 JSON 응답 지정
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: '로그인이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 토큰으로 검증된 유저 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized', message: '유효하지 않은 토큰입니다.' });
    }

    const userId = user.id;
    const { method } = req;

    // [GET] 내 메모만 조회 (WHERE owner_id = userId)
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('memos')
        .select('id, title, body')
        .eq('owner_id', userId);

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // [POST] 메모 추가 (외부 owner_id 무시하고 토큰의 userId로 지정)
    if (method === 'POST') {
      const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, body } = bodyData || {};

      if (!title || !body) {
        return res.status(400).json({ error: 'Bad Request', message: '제목과 내용을 입력해 주세요.' });
      }

      const { data, error } = await supabase
        .from('memos')
        .insert([{ title, body, owner_id: userId }])
        .select('id, title, body')
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    // [PUT] 메모 수정 (기존 소유권 및 새 소유권 검증)
    if (method === 'PUT') {
      const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, title, body } = bodyData || {};

      if (!id || !title || !body) {
        return res.status(400).json({ error: 'Bad Request', message: '필수 값이 누락되었습니다.' });
      }

      const { data: existing } = await supabase
        .from('memos')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== userId) {
        return res.status(403).json({ error: 'Forbidden', message: '수정 권한이 없습니다.' });
      }

      const { data, error } = await supabase
        .from('memos')
        .update({ title, body, owner_id: userId })
        .eq('id', id)
        .eq('owner_id', userId)
        .select('id, title, body')
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // [DELETE] 메모 삭제 (본인 행만 허용)
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'ID가 필요합니다.' });
      }

      const { data: existing } = await supabase
        .from('memos')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== userId) {
        return res.status(403).json({ error: 'Forbidden', message: '삭제 권한이 없습니다.' });
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
    // 예외 발생 시에도 HTML 페이지가 아닌 JSON 형식으로 전달하여 파싱 에러 방지
    return res.status(500).json({ error: 'Internal Server Error', message: err.message || '서버 오류가 발생했습니다.' });
  }
};