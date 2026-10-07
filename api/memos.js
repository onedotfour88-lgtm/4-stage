import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbsramkkihinbbwfvdhv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_argHqiur6aAESLaa3meh7g_O6DZp_cZ';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 토큰 검증 - 없으면 401 JSON
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

  if (method === 'GET') {
    let query = supabase.from('memos').select('id, title, body').eq('owner_id', userId);
    
    if (id) {
      query = query.eq('id', id);
      const { data, error } = await query.maybeSingle();
      if (error || !data) {
        return res.status(404).json({ error: 'Not Found', message: '메모를 찾을 수 없습니다.' });
      }
      return res.status(200).json(data);
    }

    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json(data || []);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}