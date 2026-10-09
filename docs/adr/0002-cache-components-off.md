# ADR 0002: Desactivar Cache Components para tener 404 reales en el panel

Estado: aceptado. Fecha: 08/10/2026.

## Contexto
`create-next-app@16.4.0` generó `next.config.ts` con `cacheComponents: true` y `partialPrefetching: true`.

El panel de administración lee la sesión (cookies) en cada request, y `/admin/[id]` tiene que responder 404 cuando no hay fila: el id no existe, o RLS la oculta porque el usuario demo intenta ver un diagnóstico real.

Con Cache Components activo, Next.js envía primero un esqueleto estático y eso fija el estado HTTP en 200 antes de que la página llame a `notFound()`. La documentación incluida en `node_modules/next/dist/docs` lo describe: "The response starts streaming from the `<Suspense>` boundary before `notFound()` runs, so it keeps its `200` status" y "Calling `notFound()` before streaming starts returns a `404`".

## Evidencia (medida con `next build` y `next start`, rutas de prueba temporales)
| Configuración | Página que lee cookies y llama a `notFound()` | Estado HTTP |
|---|---|---|
| `cacheComponents: true`, con `loading.tsx` | streaming | 200 |
| `cacheComponents: true`, con `export const instant = false` | ruta bloqueante | 200 |
| `cacheComponents: true`, ruta con `[id]` e `instant = false` | ruta bloqueante | 200 |
| `cacheComponents: false`, sin `loading.tsx` | render completo | 404 |
| `cacheComponents: false`, ruta con `[id]` | render completo | 404 |
| `cacheComponents: false`, con `loading.tsx` | streaming | 200 |

Con Cache Components activo, además, `next build` falla si una página lee cookies fuera de `<Suspense>` sin `instant = false`.

## Verificación en Vercel
En la prueba de punta a punta del 09/10/2026 en el preview de Vercel (commit `e18973e`), Marcelo abrió con la sesión del usuario demo la URL de un diagnóstico real, que RLS le oculta. Los Runtime Logs de Vercel registran ese `GET /admin/03161705-482d-49a2-a586-eb4ffbdad8fb` con estado 404 real, no un 200 con la página de no encontrado.

## Decisión
- `cacheComponents: false` y `partialPrefetching: false` (este último requiere el primero).
- Sin `loading.tsx` en las páginas del panel, para que `notFound()` corra antes de enviar la respuesta.

## Alternativas descartadas
- Mantener Cache Components y verificar en `proxy.ts` si el id es visible: agrega una segunda consulta por cada detalle y duplica la lógica de lectura.
- Aceptar 200 con `noindex`: no cumple el requisito de responder 404.

## Consecuencias
- Se pierden el prerender parcial y la navegación instantánea, que esta app no aprovecha: el panel se genera en cada request y las páginas públicas (`/`, `/diagnostic`, `/admin/login`) siguen estáticas.
- Revisar esta decisión si en el futuro una página necesita streaming con datos de la sesión.
