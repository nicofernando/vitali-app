---
name: sprint-workflow
description: >
  Workflow completo de sprints para Proyector Financiero.
  Cubre: crear rama, template de commit con cuerpo detallado, manejo de QA fallido,
  mover features entre sprints, cierre del sprint con PR, y merge a main.
  Trigger: al crear rama de sprint, al hacer commit, al cerrar un sprint, al abrir un PR.
---

## Contexto del proyecto

- Un solo proyecto Supabase free tier — migraciones son permanentes, no hay staging de DB
- `main` = solo recibe sprints cerrados y validados por el usuario
- `feat/sprint-N` = sandbox del sprint, vive hasta que el sprint está correcto
- App no pasa a producción real hasta estar completa — datos de prueba siempre
- TDD obligatorio para núcleo matemático — errores en finanzas tienen costo real

---

## 1. Crear rama de sprint

```bash
git checkout main
git pull
git checkout -b feat/sprint-N
```

Siempre desde `main` actualizado. Nunca desde otra rama de sprint ni desde una rama sucia.

---

## 2. Template de cuerpo de commit

Todo commit dentro de un sprint lleva este cuerpo. Sin excepción.

```
<tipo>(<scope>): <descripción corta en español>

- <qué se hizo — bullet por módulo o archivo relevante>
- <decisión técnica no obvia, si la hay>

Probado: <qué verificó automáticamente — tests, typecheck, lint>
QA usuario: <qué debe validar el usuario en el browser — específico y accionable>
```

### Ejemplo real

```
feat(accounts): CRUD de template_accounts con jerarquía

- Tabla template_accounts: parent_id, sort_order, module, eerr_group
- useTemplateAccountsStore: fetch / create / update / delete / reorder
- TemplateAccountsView: árbol colapsable, inline edit de nombre

Probado: 14 tests unitarios nuevos, typecheck limpio, lint limpio
QA usuario: crear cuenta raíz, crear sub-cuenta, reordenar con flechas, eliminar hoja sin hijos
```

### Cuando no hay QA de usuario (infraestructura, tipos, config)

```
chore(types): sincronizar database.ts con schema de Supabase

- TemplateAccount interface agregada con todos los campos
- TemplateCurrency actualizada: is_active agregado

Probado: typecheck limpio, lint limpio
QA usuario: ninguno — cambio de tipos sin impacto en UI
```

---

## 3. Checklist pre-commit (obligatorio siempre)

```bash
pnpm typecheck   # debe pasar sin errores
pnpm lint        # debe pasar sin errores
pnpm test:run    # todos los tests deben pasar
```

Si alguno falla: arreglar antes de commitear. Nunca pushear código roto.

---

## 4. Cuando el QA del usuario detecta un problema

1. El usuario describe el problema (en el PR o en la conversación)
2. Claude reproduce o entiende el problema
3. Fix en la **misma rama** `feat/sprint-N`
4. Nuevo commit con cuerpo completo:
   ```
   fix(<scope>): <descripción del problema corregido>

   - <qué estaba mal>
   - <cómo se corrigió>

   Probado: <tests, typecheck, lint>
   QA usuario: <punto exacto que debe re-validar el usuario>
   ```
5. El usuario valida **solo ese punto** — no re-testea todo desde cero
6. No se mergea a main hasta que el checklist completo esté aprobado

---

## 5. Cuando algo se mueve a otro sprint

### Si aún no está commiteado

No commitear. Documentar en el PR o en TECH_DEBT.md a qué sprint va y por qué depende de qué.

### Si ya está commiteado en la rama

```bash
git revert <hash>
```

Cuerpo del commit de revert:
```
revert(<scope>): mover <feature> a sprint N+1

Depende de <X> que no existe todavía / arquitectura cambió.
Se implementa en sprint N+1 junto con <Y>.
```

### Nunca

- Dejar código commiteado que pertenece a otro sprint sin revertir
- Dejar comentarios `// TODO: esto va en sprint 4` en el código — o va o no va

---

## 6. Migraciones dentro del sprint

### Permitido sin restricción

```sql
ALTER TABLE x ADD COLUMN y TYPE DEFAULT z;
CREATE TABLE x (...);
CREATE INDEX ON x(y);
ALTER TABLE x ADD CONSTRAINT ... DEFAULT ...;
```

### Requiere migración inversa primero

```sql
-- Antes de hacer esto, escribir y aplicar la migración de rollback
ALTER TABLE x DROP COLUMN y;
DROP TABLE x;
ALTER COLUMN x TYPE nuevo_tipo;
RENAME TABLE/COLUMN;
```

### Formato de archivo de migración

```
supabase/migrations/YYYYMMDD_descripcion_snake_case.sql
```

Cada migración en su propio archivo. El archivo vive en el repo y se commitea junto con el código que lo usa.

---

## 7. Template de PR — cierre de sprint

```markdown
## Sprint N — <nombre descriptivo del sprint>

### Qué entra en este sprint
- feat(<scope>): descripción
- feat(<scope>): descripción
- fix(<scope>): descripción

### QA del usuario — checklist
- [ ] <acción concreta que el usuario debe probar — con datos reales>
- [ ] <acción concreta>
- [ ] <acción concreta>
- [ ] Comparar resultado con Excel en los puntos afectados (si aplica)

### Decisiones técnicas tomadas
- <decisión y justificación — para contexto futuro>

### Migraciones aplicadas
- `nombre_migracion`: qué hace exactamente

### Deuda técnica
- Sin deuda nueva detectada
- O: TD-XXX: descripción → Sprint Y (motivo del postergado)

### Próximo sprint
Sprint N+1 — <nombre> — <qué entra, qué decisiones hay que tomar antes>

### Tests
- [ ] `pnpm typecheck` pasa
- [ ] `pnpm lint` pasa
- [ ] `pnpm test:run` pasa (N tests)
```

---

## 8. Checklist de merge a main

Antes de mergear, verificar:

```
[ ] pnpm typecheck sin errores
[ ] pnpm lint sin errores
[ ] pnpm test:run todos pasan
[ ] Todos los checkboxes de QA del usuario marcados ✅
[ ] TECH_DEBT.md actualizado (deuda nueva documentada, resuelta marcada)
[ ] engram session_summary guardado
[ ] engram export corrido (viaja con el repo)
```

Solo entonces:

```bash
git checkout main
git merge feat/sprint-N --no-ff -m "feat: merge sprint N — <nombre>"
git push
git branch -d feat/sprint-N
git push origin --delete feat/sprint-N
```

El merge siempre con `--no-ff` para que quede el merge commit visible en el log.
