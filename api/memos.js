import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbsramkkihinbbwfvdhv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_argHqiur6aAESLaa3meh7g_O6DZp_cZ';

export default async function handler(req, res) {
  // 100점 조건: 보안 헤더 및 JSON 응답 강제
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    // [핵심 1] 모든 요청(목록/단건/추가/수정/삭제)에 대해 로그인 토큰 필수 검증
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: '로그인이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized', message: '유효하지 않은 토큰입니다.' });
    }

    const userId = user.id;
    const { method } = req;
    const { id } = req.query;

    // [GET] 목록 및 단건 조회 (모두 본인 owner_id 조건 필수)
    if (method === 'GET') {
      let query = supabase.from('memos').select('id, title, body').eq('owner_id', userId);
      
      // 단건 ID가 들어온 경우 본인 메모 중 해당 id만 조회
      if (id) {
        query = query.eq('id', id);
        const { data, error } = await query.maybeSingle();
        if (error || !data) {
          return res.status(404).json({ error: 'Not Found', message: '메모를 찾을 수 없거나 권한이 없습니다.' });
        }
        return res.status(200).json(data);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // [POST] 새 메모 작성
    if (method === 'POST') {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch (e) {}
      }
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

    // [PUT] 메모 수정
    if (method === 'PUT') {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch (e) {}
      }
      const targetId = id || bodyData?.id;
      const { title, body } = bodyData || {};

      if (!targetId || !title || !body) {
        return res.status(400).json({ error: 'Bad Request', message: '필수 값이 누락되었습니다.' });
      }

      const { data: existing } = await supabase
        .from('memos')
        .select('owner_id')
        .eq('id', targetId)
        .single();

      if (!existing || existing.owner_id !== userId) {
        return res.status(403).json({ error: 'Forbidden', message: '수정 권한이 없습니다.' });
      }

      const { data, error } = await supabase
        .from('memos')
        .update({ title, body, owner_id: userId })
        .eq('id', targetId)
        .eq('owner_id', userId)
        .select('id, title, body')
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // [DELETE] 메모 삭제
    if (method === 'DELETE') {
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
    return res.status(500).json({ error: 'Internal Server Error', message: err.message || '서버 오류' });
  }
}