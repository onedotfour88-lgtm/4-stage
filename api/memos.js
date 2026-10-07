import { verifyLogin } from '../src/verify-login.mjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // 1. 세션 / 사용자 검증 (비인증 시 401/403 JSON 반환)
  const authResult = await verifyLogin(req);
  if (!authResult || !authResult.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '인증되지 않은 요청입니다.'
    });
  }

  const userId = authResult.user.id;
  const token = authResult.token;

  // Supabase 클라이언트 생성 (authenticated 역할 세션 토큰 전달)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const { method } = req;

  try {
    // ----------------------------------------------------
    // GET: 내 메모만 조회 (응답 형태 [{id, title, body}, ...])
    // ----------------------------------------------------
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('memos')
        .select('id, title, body')
        .eq('owner_id', userId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    }

    // ----------------------------------------------------
    // POST: 본인 ID로 새 메모 작성 (URL/본문의 owner_id 무시)
    // ----------------------------------------------------
    if (method === 'POST') {
      const { title, body } = req.body || {};
      
      const { data, error } = await supabase
        .from('memos')
        .insert([{ title, body, owner_id: userId }])
        .select('id, title, body')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(201).json(data);
    }

    // ----------------------------------------------------
    // PUT: 내 메모만 수정 (수정 본문 응답 형태 {title, body})
    // ----------------------------------------------------
    if (method === 'PUT') {
      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'MISSING_ID', message: '메모 ID가 필요합니다.' });
      }

      // 기존 행 소유자가 본인인지 검증
      const { data: existing, error: fetchError } = await supabase
        .from('memos')
        .select('owner_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !existing || existing.owner_id !== userId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: '권한이 없습니다.' });
      }

      const { title, body } = req.body || {};

      const { data, error } = await supabase
        .from('memos')
        .update({ title, body, owner_id: userId })
        .eq('id', id)
        .eq('owner_id', userId)
        .select('title, body')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json(data);
    }

    // ----------------------------------------------------
    // DELETE: 내 메모만 삭제
    // ----------------------------------------------------
    if (method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'MISSING_ID', message: '메모 ID가 필요합니다.' });
      }

      // 기존 행 소유자가 본인인지 검증
      const { data: existing, error: fetchError } = await supabase
        .from('memos')
        .select('owner_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !existing || existing.owner_id !== userId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: '권한이 없습니다.' });
      }

      const { error } = await supabase
        .from('memos')
        .delete()
        .eq('id', id)
        .eq('owner_id', userId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({ success: true, message: '삭제되었습니다.' });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
  }
}