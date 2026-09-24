# Las Leñas Snow Monitor — reglas para agentes y personas

## Base de datos: Supabase compartido

nieve guarda sus datos en el **proyecto Supabase único** que comparte con wallealv id, flightly y
wallealv.com, en el schema **`nieve`**. Solo lo usan las Vercel Functions de `api/` con la secret key
(`SUPABASE_URL` + `SUPABASE_SECRET_KEY`, nunca con prefijo `VITE_`); sin esas variables todo sigue
funcionando como antes, sin guardar nada. La historia de migraciones de ese proyecto está **solo**
en el repo [`wallealv/wallealv-id`](https://github.com/wallealv/wallealv-id), carpeta `supabase/`.
Reglas completas y runbook: `wallealv-id/docs/shared-supabase.md`. Resumen obligatorio:

- **Nunca** crear `supabase/migrations` en este repo ni correr `supabase db push` desde acá: dos
  historias de migraciones sobre el mismo proyecto se rompen entre sí.
  `tests/database/no-local-migrations.test.ts` falla si aparece esa carpeta.
- Cambio de esquema = PR en `wallealv-id` con `npx supabase migration new nieve_<descripcion>`
  (timestamp UTC, scope `nieve`) + test pgTAP `supabase/tests/nieve_<NNN>_<descripcion>.test.sql`.
  Se aplica **antes** de deployar el código de nieve que lo usa, y tiene que ser compatible con el
  código en producción.
- En esa migración: solo objetos `nieve.*`, siempre calificados; `grant/revoke/alter default
  privileges ... in schema` solo `nieve`; jobs de `pg_cron` y buckets de Storage con prefijo
  `nieve-`; RLS en toda tabla nueva; permisos solo para `service_role` (nieve no tiene usuarios:
  `anon`/`authenticated` no reciben nada); `revoke execute ... from public, anon, authenticated` en
  cada función. Nunca tocar otro schema (`public`, `flightly`, `wallealv_com`, `auth`, ...): lo
  transversal va en una migración `shared`.
- Una migración ya mergeada no se edita ni se renombra: se escribe otra. Si `main` de wallealv-id
  recibió una migración más nueva que la tuya, renombrala con un timestamp nuevo antes de mergear
  (CI de wallealv-id lo verifica).
- Si nieve algún día tiene cuentas de usuario: sus tablas con `user_id` se agregan a
  `public.account_footprint` y el borrado de cuenta sigue la regla de las otras apps (nunca
  `auth.admin.deleteUser` sin revisar el footprint).
- El código de base de datos (`src/lib/database/`) es solo de servidor: nunca importarlo desde el
  bundle del navegador.
