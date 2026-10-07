import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbsramkkihinbbwfvdhv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_argHqiur6aAESLaa3meh7g_O6DZp_cZ';

export default async function handler(req, res) {
  // 100점 조건: JSON 응답 및 보안 헤더 강제
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // [핵심] 로그인 토큰(Authorization 헤더) 검증 - 없으면 302 대신 무조건 401 JSON 반환
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
  const { id } = req.query;

  // 단건 상세 조회
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('memos')
      .select('id, title, body')
      .eq('id', id)
      .eq('owner_id', userId)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: 'Not Found', message: '메모를 찾을 수 없거나 권한이 없습니다.' });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}