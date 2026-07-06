DROP POLICY IF EXISTS "Authenticated can read specialties" ON public.specialties;
CREATE POLICY "Authenticated can read specialties"
  ON public.specialties FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Admins can manage specialties" ON public.specialties;
CREATE POLICY "Admins can manage specialties"
  ON public.specialties FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
  );

DROP POLICY IF EXISTS "Schools are viewable by authenticated users" ON public.schools;
CREATE POLICY "Schools are viewable by authenticated users"
  ON public.schools FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Admins can manage schools" ON public.schools;
CREATE POLICY "Admins can manage schools"
  ON public.schools FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::text)
    )
  );

DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.institution_settings;
CREATE POLICY "Allow read for authenticated users"
  ON public.institution_settings FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Allow manage for authenticated users" ON public.institution_settings;
CREATE POLICY "Allow manage for authenticated users"
  ON public.institution_settings FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar') AND public.is_admin(auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sam.acessar') AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Classes viewable by authenticated users" ON public.school_classes;
CREATE POLICY "Classes viewable by authenticated users"
  ON public.school_classes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Admins and School Coords can manage classes" ON public.school_classes;
CREATE POLICY "Admins and School Coords can manage classes"
  ON public.school_classes FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'school_coord'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'school_coord'::text)
    )
  );

DROP POLICY IF EXISTS "Students are viewable by authenticated users" ON public.students;
CREATE POLICY "Students are viewable by authenticated users"
  ON public.students FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Admins and professionals can insert students" ON public.students;
CREATE POLICY "Admins and professionals can insert students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::text)
    )
  );

DROP POLICY IF EXISTS "Admins and professionals can manage students" ON public.students;
CREATE POLICY "Admins and professionals can manage students"
  ON public.students FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::text)
    )
  );

DROP POLICY IF EXISTS "Admins and professionals can delete students" ON public.students;
CREATE POLICY "Admins and professionals can delete students"
  ON public.students FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::text)
    )
  );

DROP POLICY IF EXISTS "Users can read complaints" ON public.school_complaints;
CREATE POLICY "Users can read complaints"
  ON public.school_complaints FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Authenticated can insert complaints" ON public.school_complaints;
CREATE POLICY "Authenticated can insert complaints"
  ON public.school_complaints FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sam.acessar') AND (reporter_id = auth.uid() OR reporter_id IS NULL));

DROP POLICY IF EXISTS "Admins and school team can manage complaints" ON public.school_complaints;
CREATE POLICY "Admins and school team can manage complaints"
  ON public.school_complaints FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      reporter_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::text)
      OR public.has_role(auth.uid(), 'school_coord'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      reporter_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'professional'::text)
      OR public.has_role(auth.uid(), 'school_coord'::text)
    )
  );

DROP POLICY IF EXISTS "Appointments viewable by authenticated users" ON public.appointments;
CREATE POLICY "Appointments viewable by authenticated users"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Admins and professionals can insert appointments" ON public.appointments;
CREATE POLICY "Admins and professionals can insert appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      auth.uid() = professional_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Admins and professionals can manage appointments" ON public.appointments;
CREATE POLICY "Admins and professionals can manage appointments"
  ON public.appointments FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      auth.uid() = professional_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      auth.uid() = professional_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Notes viewable by authenticated users" ON public.appointment_specialty_notes;
CREATE POLICY "Notes viewable by authenticated users"
  ON public.appointment_specialty_notes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Professionals can insert notes" ON public.appointment_specialty_notes;
CREATE POLICY "Professionals can insert notes"
  ON public.appointment_specialty_notes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.id = appointment_specialty_notes.appointment_id
          AND (a.professional_id = auth.uid() OR public.is_admin(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Professionals can manage notes" ON public.appointment_specialty_notes;
CREATE POLICY "Professionals can manage notes"
  ON public.appointment_specialty_notes FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.id = appointment_specialty_notes.appointment_id
          AND (a.professional_id = auth.uid() OR public.is_admin(auth.uid()))
      )
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.id = appointment_specialty_notes.appointment_id
          AND (a.professional_id = auth.uid() OR public.is_admin(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Records viewable by authenticated users" ON public.appointment_records;
CREATE POLICY "Records viewable by authenticated users"
  ON public.appointment_records FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Professionals can insert records" ON public.appointment_records;
CREATE POLICY "Professionals can insert records"
  ON public.appointment_records FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      auth.uid() = professional_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Professionals can manage own records" ON public.appointment_records;
CREATE POLICY "Professionals can manage own records"
  ON public.appointment_records FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      auth.uid() = professional_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (
      auth.uid() = professional_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Users can read complaint messages" ON public.school_complaint_messages;
CREATE POLICY "Users can read complaint messages"
  ON public.school_complaint_messages FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Authenticated can insert complaint messages" ON public.school_complaint_messages;
CREATE POLICY "Authenticated can insert complaint messages"
  ON public.school_complaint_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sam.acessar') AND (sender_id = auth.uid() OR sender_id IS NULL));

DROP POLICY IF EXISTS "Webhooks viewable by authenticated" ON public.webhooks;
CREATE POLICY "Webhooks viewable by authenticated"
  ON public.webhooks FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.webhooks;
CREATE POLICY "Admins can manage webhooks"
  ON public.webhooks FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sam.acessar')
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'superadmin'::public.app_role))
  );

DROP POLICY IF EXISTS "Logs viewable by authenticated" ON public.webhooks_exec_logs;
CREATE POLICY "Logs viewable by authenticated"
  ON public.webhooks_exec_logs FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "System can insert logs" ON public.webhooks_exec_logs;
CREATE POLICY "System can insert logs"
  ON public.webhooks_exec_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sam.acessar'));

DROP POLICY IF EXISTS "Authenticated users can read cache_criancas" ON public.cache_criancas;
CREATE POLICY "Authenticated users can read cache_criancas"
  ON public.cache_criancas FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admins can manage cache_criancas" ON public.cache_criancas;
CREATE POLICY "Admins can manage cache_criancas"
  ON public.cache_criancas FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read cache_usuarios" ON public.cache_usuarios;
CREATE POLICY "Authenticated users can read cache_usuarios"
  ON public.cache_usuarios FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admins can manage cache_usuarios" ON public.cache_usuarios;
CREATE POLICY "Admins can manage cache_usuarios"
  ON public.cache_usuarios FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated can read local_cmeis" ON public.local_cmeis;
CREATE POLICY "Authenticated can read local_cmeis"
  ON public.local_cmeis FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admin and equipe can manage local_cmeis" ON public.local_cmeis;
CREATE POLICY "Admin and equipe can manage local_cmeis"
  ON public.local_cmeis FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated can read local_turmas" ON public.local_turmas;
CREATE POLICY "Authenticated can read local_turmas"
  ON public.local_turmas FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admin and equipe can manage local_turmas" ON public.local_turmas;
CREATE POLICY "Admin and equipe can manage local_turmas"
  ON public.local_turmas FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated can read local_criancas" ON public.local_criancas;
CREATE POLICY "Authenticated can read local_criancas"
  ON public.local_criancas FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admin and equipe can manage local_criancas" ON public.local_criancas;
CREATE POLICY "Admin and equipe can manage local_criancas"
  ON public.local_criancas FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read modelos" ON public.modelos_sondagem;
CREATE POLICY "Authenticated users can read modelos"
  ON public.modelos_sondagem FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admins and equipe can manage modelos" ON public.modelos_sondagem;
CREATE POLICY "Admins and equipe can manage modelos"
  ON public.modelos_sondagem FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read niveis" ON public.niveis_aprendizagem;
CREATE POLICY "Authenticated users can read niveis"
  ON public.niveis_aprendizagem FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admins can manage niveis" ON public.niveis_aprendizagem;
CREATE POLICY "Admins can manage niveis"
  ON public.niveis_aprendizagem FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read perguntas" ON public.perguntas_modelo;
CREATE POLICY "Authenticated users can read perguntas"
  ON public.perguntas_modelo FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admins and equipe can manage perguntas" ON public.perguntas_modelo;
CREATE POLICY "Admins and equipe can manage perguntas"
  ON public.perguntas_modelo FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read periodos" ON public.periodos;
CREATE POLICY "Authenticated users can read periodos"
  ON public.periodos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admins can manage periodos" ON public.periodos;
CREATE POLICY "Admins can manage periodos"
  ON public.periodos FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sondagem.acessar') AND (user_id = auth.uid() OR user_id IS NULL));

DROP POLICY IF EXISTS "Admins can manage logs" ON public.logs_sincronizacao;
CREATE POLICY "Admins can manage logs"
  ON public.logs_sincronizacao FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Gestores can read logs" ON public.logs_sincronizacao;
CREATE POLICY "Gestores can read logs"
  ON public.logs_sincronizacao FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR public.has_role(auth.uid(), 'coordenador'::text)
    )
  );

DROP POLICY IF EXISTS "Admins can manage sync_controle" ON public.sync_controle;
CREATE POLICY "Admins can manage sync_controle"
  ON public.sync_controle FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Gestores can read sync_controle" ON public.sync_controle;
CREATE POLICY "Gestores can read sync_controle"
  ON public.sync_controle FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read sondagem_niveis" ON public.sondagem_niveis;
CREATE POLICY "Authenticated users can read sondagem_niveis"
  ON public.sondagem_niveis FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admins and equipe can manage sondagem_niveis" ON public.sondagem_niveis;
CREATE POLICY "Admins and equipe can manage sondagem_niveis"
  ON public.sondagem_niveis FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  );

DROP POLICY IF EXISTS "Users can read own sondagens" ON public.sondagens;
CREATE POLICY "Users can read own sondagens"
  ON public.sondagens FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      aplicador_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR public.has_role(auth.uid(), 'coordenador'::text)
    )
  );

DROP POLICY IF EXISTS "Users can insert own sondagens" ON public.sondagens;
CREATE POLICY "Users can insert own sondagens"
  ON public.sondagens FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sondagem.acessar') AND (aplicador_id = auth.uid() OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Users can manage own sondagens" ON public.sondagens;
CREATE POLICY "Users can manage own sondagens"
  ON public.sondagens FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar') AND (aplicador_id = auth.uid() OR public.is_admin(auth.uid())))
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sondagem.acessar') AND (aplicador_id = auth.uid() OR public.is_admin(auth.uid())));

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
          s.aplicador_id = auth.uid()
          OR public.is_admin(auth.uid())
          OR public.has_role(auth.uid(), 'gestor'::public.app_role)
          OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
          OR public.has_role(auth.uid(), 'coordenador'::text)
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
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can manage respostas for own sondagens" ON public.respostas_sondagem;
CREATE POLICY "Users can manage respostas for own sondagens"
  ON public.respostas_sondagem FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND EXISTS (
      SELECT 1
      FROM public.sondagens s
      WHERE s.id = respostas_sondagem.sondagem_id
        AND (s.aplicador_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins can manage smtp_config" ON public.smtp_config;
CREATE POLICY "Admins can manage smtp_config"
  ON public.smtp_config FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
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
      OR public.has_role(auth.uid(), 'coordenador'::text)
    )
  );

DROP POLICY IF EXISTS "Users can insert own solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can insert own solicitacoes"
  ON public.solicitacoes_sondagem FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sondagem.acessar') AND (solicitante_id = auth.uid() OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Users can manage own solicitacoes" ON public.solicitacoes_sondagem;
CREATE POLICY "Users can manage own solicitacoes"
  ON public.solicitacoes_sondagem FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      solicitante_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
    )
  )
  WITH CHECK (
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
      OR public.has_role(auth.uid(), 'coordenador'::text)
    )
  );

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notificacoes;
CREATE POLICY "Users can manage own notifications"
  ON public.notificacoes FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      user_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR public.has_role(auth.uid(), 'coordenador'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      user_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR public.has_role(auth.uid(), 'coordenador'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notificacoes;
CREATE POLICY "Authenticated can insert notifications"
  ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Equipe and admin can manage metas" ON public.metas_sondagem;
CREATE POLICY "Equipe and admin can manage metas"
  ON public.metas_sondagem FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
  );

DROP POLICY IF EXISTS "Authenticated can read metas" ON public.metas_sondagem;
CREATE POLICY "Authenticated can read metas"
  ON public.metas_sondagem FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Admin and equipe can manage anotacoes" ON public.anotacoes_aluno;
CREATE POLICY "Admin and equipe can manage anotacoes"
  ON public.anotacoes_aluno FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR public.has_role(auth.uid(), 'coordenador'::text)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'equipe_pedagogica'::text)
      OR public.has_role(auth.uid(), 'coordenador'::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated can read anotacoes" ON public.anotacoes_aluno;
CREATE POLICY "Authenticated can read anotacoes"
  ON public.anotacoes_aluno FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'modulos.sondagem.acessar'));

DROP POLICY IF EXISTS "Users can read responsavel_aluno" ON public.responsavel_aluno;
CREATE POLICY "Users can read responsavel_aluno"
  ON public.responsavel_aluno FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
  );

DROP POLICY IF EXISTS "Admins can manage responsavel_aluno" ON public.responsavel_aluno;
CREATE POLICY "Admins can manage responsavel_aluno"
  ON public.responsavel_aluno FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'modulos.sondagem.acessar')
    AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'equipe_pedagogica'::text))
  );
