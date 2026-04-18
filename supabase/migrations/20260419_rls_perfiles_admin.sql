-- ══════════════════════════════════════════════════════════════════════
-- RLS: tabla perfiles — solo admin puede modificar registros
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- 1. Activar RLS en la tabla perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 2. Lectura: cualquier usuario autenticado puede leer su propio perfil
CREATE POLICY "perfil_select_own"
  ON perfiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 3. Lectura ampliada: admin puede leer todos los perfiles
CREATE POLICY "perfil_select_admin"
  ON perfiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- 4. INSERT: solo admin puede crear perfiles manualmente
CREATE POLICY "perfil_insert_admin"
  ON perfiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- 5. UPDATE: admin puede modificar cualquier perfil
CREATE POLICY "perfil_update_admin"
  ON perfiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- 6. UPDATE: cada usuario puede actualizar solo su propio nombre
--    (para guardarPerfil desde el menú de usuario)
CREATE POLICY "perfil_update_own_nombre"
  ON perfiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 7. DELETE: solo admin puede eliminar perfiles
CREATE POLICY "perfil_delete_admin"
  ON perfiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- 8. Trigger: al registrarse un usuario nuevo, crear su perfil automáticamente
--    (si no existe ya este trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO perfiles (id, email, nombre, rol, aprobado)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'ajustador'),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
