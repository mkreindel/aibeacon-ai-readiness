# AI Readiness Diagnostic (AI Beacon)

Trabajo Final del Máster en Desarrollo con IA E.2 (BIG school).

## 1. Descripción general

AI Readiness Diagnostic es un cuestionario web para dueños y gerentes de pequeñas y medianas empresas (de 1 a 200 empleados) en Houston. Muchos no saben por dónde empezar con la IA ni qué automatizar primero.

En unos 5 minutos y sin registrarse, el visitante responde 15 preguntas sobre cinco áreas (Data, Processes, Tools, Team y Governance). La app muestra un nivel de madurez de 1 a 3, un puntaje por área y un informe breve escrito por IA con 3 casos de uso sugeridos. Cada diagnóstico completo se guarda como un lead que los consultores de AI Beacon revisan en un panel de administración privado.

La especificación completa del MVP está en [docs/spec.md](docs/spec.md).

## 2. Stack tecnológico

Las versiones son las fijadas en `package.json` e instaladas por `package-lock.json`.

| Área | Tecnología |
|---|---|
| Framework | Next.js 16.4.0 (App Router), React 19.3.0, TypeScript 5.9 |
| Estilos | Tailwind CSS 4 |
| Validación | zod 4.6 |
| Base de datos y autenticación | Supabase (Postgres con Row Level Security, autenticación con email y contraseña) mediante `@supabase/supabase-js` 2.117 y `@supabase/ssr` 0.12 |
| Informe con IA | OpenAI `gpt-5.4-mini` mediante el Vercel AI SDK (`ai` 7.0.116, `@ai-sdk/openai` 4.0.77) |
| Tests | Vitest 5, Testing Library, jsdom, PGlite (Postgres en memoria para los tests de migración, RLS y seed) |
| Linting | ESLint 9 con `eslint-config-next` |
| Hosting | Vercel |
| CI | GitHub Actions: lint, typecheck, tests, build y `npm audit --omit=dev` |

## 3. Instalación y ejecución local

### Requisitos

- Node.js `^22.13.0` (ver `engines` en `package.json`; `.nvmrc` fija la versión mayor 22).
- Un proyecto de Supabase.
- Una API key de OpenAI (opcional: sin ella, los diagnósticos se guardan sin el informe con IA).

### Instalación

```bash
npm install
cp .env.example .env.local
```

### Variables de entorno

Completar `.env.local`. Nunca commitear valores reales.

| Variable | Qué es |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase. Pública por diseño. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publishable de Supabase (`sb_publishable_...`). Pública por diseño; RLS protege los datos. |
| `SUPABASE_SECRET_KEY` | Clave secreta de Supabase (`sb_secret_...`). Solo servidor: saltea RLS y se usa únicamente para guardar diagnósticos. |
| `IP_HASH_SALT` | Secreto aleatorio para hashear la IP de los visitantes en el límite de envíos. Se genera con `openssl rand -hex 32`. |
| `OPENAI_API_KEY` | API key de OpenAI para el informe con IA. Solo servidor. Sin ella, el informe se omite. |

### Base de datos

El repositorio no tiene configuración de Supabase CLI; los archivos SQL se ejecutan en el SQL Editor de Supabase, en este orden:

1. `supabase/migrations/20261008140000_diagnostics.sql`: tablas, restricciones, índices y políticas RLS.
2. En Supabase Auth, crear los usuarios del panel (email y contraseña) y desactivar el registro público.
3. Asignar un rol a cada usuario del panel (`admin` o `demo`):
   ```sql
   insert into public.panel_users (user_id, role) values ('<auth user id>', 'admin');
   ```
4. `supabase/seed/demo-data.sql`: 6 diagnósticos de demo ficticios.
5. `supabase/seed/demo-reports.sql`: informes con IA ficticios para esas 6 filas.

Los dos archivos de seed son idempotentes: ejecutarlos de nuevo no cambia nada.

### Ejecución

```bash
npm run dev        # servidor de desarrollo
npm test           # todos los tests (no requieren Supabase ni OpenAI)
npm run lint
npm run typecheck
npm run build
```

Los tests nunca llaman a OpenAI (el modelo está simulado) y prueban el SQL contra un Postgres en memoria (PGlite), así que corren sin ningún servicio externo.

## 4. Estructura del proyecto

```
src/
  app/                  Páginas y la ruta de API (App Router)
    page.tsx            Landing
    diagnostic/         Cuestionario público
    api/diagnostics/    Ruta POST: valida, aplica el límite, calcula el puntaje, genera el informe con IA y guarda
    admin/              Panel de administración: login, lista y detalle de diagnósticos
  components/           Flujo del cuestionario, barras de puntaje, vista del informe con IA, vistas del panel
  lib/                  Puntaje, preguntas, esquemas de validación, prompt y esquema del informe con IA
    server/             Código solo de servidor: hash de IP, flujo de envío, clientes de Supabase y OpenAI
    admin/              Acceso a datos y ayudas de sesión del panel
    supabase/           Clientes de Supabase para el código de servidor y el proxy
  proxy.ts              Mantiene vigente la sesión del panel y redirige las rutas /admin
supabase/
  migrations/           Esquema de la base de datos y políticas RLS
  seed/                 Datos de demo ficticios e informes con IA de demo
  tests/                Tests de RLS y de seed sobre PGlite
docs/
  spec.md               Especificación del MVP (fuente de verdad)
  adr/                  Registros de decisiones de arquitectura (ADR)
  slides.pdf            Slides de presentación del TFM (PDF)
```

## 5. Funcionalidades principales

- **Cuestionario.** Datos de la empresa (rubro de una lista cerrada, tamaño), luego 15 preguntas, un área por pantalla con barra de progreso, y al final los datos de contacto con una casilla de consentimiento obligatoria. Sin login.
- **Puntaje y nivel.** Deterministas: cada área tiene un puntaje de 0 a 100 y el puntaje global es su promedio. El nivel (1 a 3) depende del puntaje global, y el nivel 3 además exige un puntaje mínimo en Governance. El servidor recalcula todo; nunca confía en un puntaje enviado por el navegador.
- **Informe con IA.** Un resumen, exactamente 3 casos de uso sugeridos (cada uno con por qué, esfuerzo, riesgo y un primer paso) y un siguiente paso, escritos por OpenAI y validados con un esquema zod. El modelo solo recibe rubro, tamaño, puntajes, nivel y respuestas, nunca el nombre, el email ni la empresa del contacto. Si el modelo falla, se pasa del tiempo límite o devuelve una salida que no valida, el visitante igual ve el nivel y los puntajes con un aviso, y el diagnóstico se guarda sin informe.
- **Panel de administración.** Login con email y contraseña en `/admin`. Lista los diagnósticos del más nuevo al más viejo y abre cada uno con los datos de contacto, puntajes, respuestas y el informe con IA. El panel es de solo lectura y lee con la sesión del usuario que inició sesión, así que se aplica RLS.
- **Usuario demo de solo lectura.** Un rol `demo` que solo ve las filas marcadas como datos de demo (empresas ficticias y emails `@example.com`).
- **Límite de envíos.** 5 envíos por IP por hora; el siguiente recibe HTTP 429. La IP nunca se guarda en claro, solo como hash HMAC-SHA256 con una sal secreta.

Decisiones de diseño:

- [ADR 0001](docs/adr/0001-audit-braces-dev.md): aceptar la alerta de `npm audit` sobre `braces` (solo desarrollo).
- [ADR 0002](docs/adr/0002-cache-components-off.md): Cache Components desactivado para que un diagnóstico inexistente devuelva un 404 real.
- [ADR 0003](docs/adr/0003-client-ip-on-vercel.md): tomar la IP del visitante de `x-forwarded-for` en Vercel.
- [ADR 0004](docs/adr/0004-ai-report.md): informe con IA mediante el Vercel AI SDK y OpenAI, generado antes de guardar.

Especificación: [docs/spec.md](docs/spec.md).

## 6. Usuario de prueba

| Campo | Valor |
|---|---|
| Email | `demo@example.com` |
| Contraseña | `DEMO_PASSWORD_HERE` |

Se inicia sesión en `/admin` de la app desplegada. El usuario demo solo puede leer y solo ve los 6 diagnósticos de demo ficticios; RLS le oculta los envíos reales.

## 7. Enlaces

- App desplegada: https://aibeacon-ai-readiness.vercel.app
- Slides: [docs/slides.pdf](docs/slides.pdf)
- Video: VIDEO_URL_HERE

## Despliegue

- Alojado en Vercel, conectado a este repositorio de GitHub.
- Cargar las variables de entorno de `.env.example` en Vercel para cada entorno que las necesite (Preview, Production). `SUPABASE_SECRET_KEY`, `IP_HASH_SALT` y `OPENAI_API_KEY` quedan solo en el servidor; nunca exponerlas con el prefijo `NEXT_PUBLIC_`.
- El proyecto corre en el plan Hobby de Vercel, usado solo para la demo.

## Licencia

MIT. Ver [LICENSE](LICENSE).
