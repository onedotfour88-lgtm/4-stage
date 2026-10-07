import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbsramkkihinbbwfvdhv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_argHqiur6aAESLaa3meh7g_O6DZp_cZ';

export default async function handler(req, res) {
  // 응답 헤더 및 보안 헤더 설정
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

    // 2. Supabase 토큰으로 사용자 검증
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

    // [POST] 메모 작성 (외부 owner_id 무시, 검증된 userId 자동 사용)
    if (method === 'POST') {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch (e) {}
      }

      const { title, body } = bodyData || {};

      if (!title || !body) {
        return res.status(400).json({ error: 'Bad Request', message: '제목과 내용을 모두 입력해주세요.' });
      }

      const { data, error } = await supabase
        .from('memos')
        .insert([{ title, body, owner_id: userId }])
        .select('id, title, body')
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    // [PUT] 메모 수정 (소유권 체크)
    if (method === 'PUT') {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch (e) {}
      }

      const { id, title, body } = bodyData || {};

      if (!id || !title || !body) {
        return res.status(400).json({ error: 'Bad Request', message: '필수 데이터가 누락되었습니다.' });
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

    // [DELETE] 메모 삭제 (소유권 체크)
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
    return res.status(500).json({ error: 'Internal Server Error', message: err.message || '서버 오류가 발생했습니다.' });
  }
}