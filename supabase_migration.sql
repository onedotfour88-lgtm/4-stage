-- =======================================================
-- 1단계: 사용자 A, B의 email로 auth.users에서 ID 조회 및 소유자 지정
-- (아래 'A_EMAIL_HERE', 'B_EMAIL_HERE'에 실제 이메일 주소를 채워 넣으세요)
-- =======================================================
DO $$
DECLARE
    user_a_id uuid;
    user_b_id uuid;
BEGIN
    SELECT id INTO user_a_id FROM auth.users WHERE email = 'A_EMAIL_HERE';
    SELECT id INTO user_b_id FROM auth.users WHERE email = 'B_EMAIL_HERE';

    -- 기존 가상 메모 3개에 A의 owner_id 연결
    UPDATE public.memos
    SET owner_id = user_a_id
    WHERE id IN (1, 2, 3);

    -- B 소유의 시험 메모 1건 준비
    IF NOT EXISTS (SELECT 1 FROM public.memos WHERE owner_id = user_b_id) THEN
        INSERT INTO public.memos (title, body, owner_id)
        VALUES ('B의 시험 메모', '사용자 B의 테스트 메모입니다.', user_b_id);
    END IF;
END $$;


-- =======================================================
-- 2단계: RLS 및 최소 권한 SQL (다음 요청/실행용)
-- =======================================================

-- 1) 기존 권한 회수
REVOKE ALL ON TABLE public.memos FROM PUBLIC, anon, authenticated;

-- 2) authenticated 역할에 SELECT, INSERT, UPDATE, DELETE 만 GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.memos TO authenticated;

-- 3) RLS 활성화
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (중복 생성 에러 방지)
DROP POLICY IF EXISTS "memos_owner_select" ON public.memos;
DROP POLICY IF EXISTS "memos_owner_insert" ON public.memos;
DROP POLICY IF EXISTS "memos_owner_update" ON public.memos;
DROP POLICY IF EXISTS "memos_owner_delete" ON public.memos;

-- 4) auth.uid() = owner_id 정책 등록
CREATE POLICY "memos_owner_select" ON public.memos
    FOR SELECT TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "memos_owner_insert" ON public.memos
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "memos_owner_update" ON public.memos
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "memos_owner_delete" ON public.memos
    FOR DELETE TO authenticated
    USING (auth.uid() = owner_id);

-- 5) 검증용 쿼리
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'memos';

SELECT 
    has_table_privilege('anon', 'public.memos', 'SELECT') AS anon_select,
    has_table_privilege('authenticated', 'public.memos', 'SELECT') AS auth_select,
    has_table_privilege('authenticated', 'public.memos', 'INSERT') AS auth_insert,
    has_table_privilege('authenticated', 'public.memos', 'UPDATE') AS auth_update,
    has_table_privilege('authenticated', 'public.memos', 'DELETE') AS auth_delete;