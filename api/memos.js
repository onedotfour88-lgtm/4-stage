import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbsramkkihinbbwfvdhv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_argHqiur6aAESLaa3meh7g_O6DZp_cZ';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: '로그인이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Supabase 자체 인증으로 토큰 검증
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized', message: '유효하지 않은 토큰입니다.' });
    }

    const userId = user.id;
    const { method } = req;

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('memos')
        .select('id, title, body')
        .eq('owner_id', userId);

      if (error) throw error;
      return res.status(200).json(data || []);
    }

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

    if (method === 'PUT') {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch (e) {}
      }
      const { id, title, body } = bodyData || {};

      const { data: existing } = await supabase
        .from('memos')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== userId) {
        return res.status(403).json({ error: 'Forbidden', message: '권한이 없습니다.' });
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

    if (method === 'DELETE') {
      const { id } = req.query;
      const { data: existing } = await supabase
        .from('memos')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!existing || existing.owner_id !== userId) {
        return res.status(403).json({ error: 'Forbidden', message: '권한이 없습니다.' });
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