DROP POLICY IF EXISTS "Authenticated users can read cache_criancas" ON public.cache_criancas;
CREATE POLICY "Authenticated users can read cache_criancas"
  ON public.cache_criancas FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = cache_criancas.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read cache_usuarios" ON public.cache_usuarios;
CREATE POLICY "Authenticated users can read cache_usuarios"
  ON public.cache_usuarios FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = cache_usuarios.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated can read local_turmas" ON public.local_turmas;
CREATE POLICY "Authenticated can read local_turmas"
  ON public.local_turmas FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = local_turmas.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated can read local_criancas" ON public.local_criancas;
CREATE POLICY "Authenticated can read local_criancas"
  ON public.local_criancas FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = local_criancas.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can read solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can read solicitacoes"
  ON public.solicitacoes_sondagem FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      solicitante_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = solicitacoes_sondagem.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can insert own solicitacoes"
  ON public.solicitacoes_sondagem FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      solicitante_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Users can manage own solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can update solicitacoes"
  ON public.solicitacoes_sondagem FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      solicitante_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = solicitacoes_sondagem.cmei_id
        )
      )
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      solicitante_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = solicitacoes_sondagem.cmei_id
        )
      )
    )
  );

CREATE POLICY "Users can delete solicitacoes"
  ON public.solicitacoes_sondagem FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      solicitante_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notificacoes;
CREATE POLICY "Users can read own notifications"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      user_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = notificacoes.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notificacoes;
CREATE POLICY "Users can manage own notifications"
  ON public.notificacoes FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      user_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = notificacoes.cmei_id
        )
      )
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      user_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = notificacoes.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can read own sondagens" ON public.sondagens;
CREATE POLICY "Users can read own sondagens"
  ON public.sondagens FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.cache_criancas c ON c.id = sondagens.crianca_id
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = c.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own sondagens" ON public.sondagens;
CREATE POLICY "Users can insert own sondagens"
  ON public.sondagens FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR (
        aplicador_id = auth.uid()
        AND (
          NOT public.has_role(auth.uid(), 'coordenador'::text)
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.cache_criancas c ON c.id = sondagens.crianca_id
            WHERE p.id = auth.uid()
              AND p.cmei_id IS NOT NULL
              AND p.cmei_id = c.cmei_id
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage own sondagens" ON public.sondagens;
CREATE POLICY "Users can manage own sondagens"
  ON public.sondagens FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.cache_criancas c ON c.id = sondagens.crianca_id
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = c.cmei_id
        )
      )
      OR aplicador_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.cache_criancas c ON c.id = sondagens.crianca_id
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = c.cmei_id
        )
      )
      OR aplicador_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sondagens"
  ON public.sondagens FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.cache_criancas c ON c.id = sondagens.crianca_id
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = c.cmei_id
        )
      )
      OR aplicador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can read respostas via sondagem access" ON public.respostas_sondagem;
CREATE POLICY "Users can read respostas via sondagem access"
  ON public.respostas_sondagem FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (
          public.is_admin(auth.uid())
          OR public.has_role(auth.uid(), 'gestor'::public.app_role)
          OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
          OR (
            public.has_role(auth.uid(), 'coordenador'::text)
            AND EXISTS (
              SELECT 1
              FROM public.profiles p
              JOIN public.cache_criancas c ON c.id = s.crianca_id
              WHERE p.id = auth.uid()
                AND p.cmei_id IS NOT NULL
                AND p.cmei_id = c.cmei_id
            )
          )
          OR s.aplicador_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert respostas for own sondagens" ON public.respostas_sondagem;
CREATE POLICY "Users can insert respostas for own sondagens"
  ON public.respostas_sondagem FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (
          public.is_admin(auth.uid())
          OR (
            s.aplicador_id = auth.uid()
            AND (
              NOT public.has_role(auth.uid(), 'coordenador'::text)
              OR EXISTS (
                SELECT 1
                FROM public.profiles p
                JOIN public.cache_criancas c ON c.id = s.crianca_id
                WHERE p.id = auth.uid()
                  AND p.cmei_id IS NOT NULL
                  AND p.cmei_id = c.cmei_id
              )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can manage respostas for own sondagens" ON public.respostas_sondagem;
CREATE POLICY "Users can manage respostas for own sondagens"
  ON public.respostas_sondagem FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (
          public.is_admin(auth.uid())
          OR (
            public.has_role(auth.uid(), 'coordenador'::text)
            AND EXISTS (
              SELECT 1
              FROM public.profiles p
              JOIN public.cache_criancas c ON c.id = s.crianca_id
              WHERE p.id = auth.uid()
                AND p.cmei_id IS NOT NULL
                AND p.cmei_id = c.cmei_id
            )
          )
          OR s.aplicador_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (
          public.is_admin(auth.uid())
          OR (
            public.has_role(auth.uid(), 'coordenador'::text)
            AND EXISTS (
              SELECT 1
              FROM public.profiles p
              JOIN public.cache_criancas c ON c.id = s.crianca_id
              WHERE p.id = auth.uid()
                AND p.cmei_id IS NOT NULL
                AND p.cmei_id = c.cmei_id
            )
          )
          OR s.aplicador_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can delete respostas for own sondagens"
  ON public.respostas_sondagem FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (
          public.is_admin(auth.uid())
          OR (
            public.has_role(auth.uid(), 'coordenador'::text)
            AND EXISTS (
              SELECT 1
              FROM public.profiles p
              JOIN public.cache_criancas c ON c.id = s.crianca_id
              WHERE p.id = auth.uid()
                AND p.cmei_id IS NOT NULL
                AND p.cmei_id = c.cmei_id
            )
          )
          OR s.aplicador_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Admin and equipe can manage anotacoes" ON public.anotacoes_aluno;
CREATE POLICY "Admin and equipe can manage anotacoes"
  ON public.anotacoes_aluno FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.cache_criancas c ON c.id = anotacoes_aluno.crianca_id
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = c.cmei_id
        )
      )
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.cache_criancas c ON c.id = anotacoes_aluno.crianca_id
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = c.cmei_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated can read anotacoes" ON public.anotacoes_aluno;
CREATE POLICY "Authenticated can read anotacoes"
  ON public.anotacoes_aluno FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR (
        public.has_role(auth.uid(), 'coordenador'::text)
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.cache_criancas c ON c.id = anotacoes_aluno.crianca_id
          WHERE p.id = auth.uid()
            AND p.cmei_id IS NOT NULL
            AND p.cmei_id = c.cmei_id
        )
      )
    )
  );
