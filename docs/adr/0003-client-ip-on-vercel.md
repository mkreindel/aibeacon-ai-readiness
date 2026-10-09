# ADR 0003: Tomar la IP del visitante de `x-forwarded-for` en Vercel

Estado: aceptado. Fecha: 09/10/2026.

## Contexto
El límite de envíos (spec, sección 9: 5 por IP por hora) necesita la IP del visitante. `src/lib/server/client-ip.ts` toma el primer valor de `x-forwarded-for`, lo guarda como HMAC-SHA256 con sal secreta (`ip_hash`) y, si el encabezado falta, usa una clave fija (`unknown`) y registra "missing client IP header".

La duda era si en el hosting elegido (Vercel) el visitante puede falsificar ese encabezado y así esquivar el límite.

## Lo que dice la documentación de Vercel
Fuente: [Request headers](https://vercel.com/docs/headers/request-headers), verificada por Marcelo el 09/10/2026.

- Cita textual: "If you are trying to use Vercel behind a proxy, we currently overwrite the X-Forwarded-For header and do not forward external IPs. This restriction is in place to prevent IP spoofing."
- La misma página indica que `x-real-ip` y `x-vercel-forwarded-for` son idénticos a `x-forwarded-for`.
- Usar un `X-Forwarded-For` propio de confianza (por ejemplo, desde un proxy delante de Vercel) es una función solo de Enterprise.

Alcance de la cita: habla de Vercel detrás de un proxy y de que Vercel sobrescribe el encabezado para evitar la falsificación de IP. Este ADR no extrae de ella nada más que eso.

## Lo que medimos (preview de Vercel)
Prueba de punta a punta del 09/10/2026, hecha por Marcelo en el preview de la rama `claude/gallant-bell-mhh9e1` (commit `e18973e`), con las variables de entorno cargadas solo en el entorno Preview de Vercel:

- Cinco envíos seguidos desde el mismo navegador respondieron 201; el sexto respondió 429 con el mensaje "You've sent several diagnostics in a short time. Please wait a while and try again."
- En Supabase, las cinco filas de la ráfaga (09/10/2026, de 01:31:42 a 01:33:09 UTC) tienen el mismo `ip_hash`, de 64 caracteres. El envío rechazado no se guardó.

Lo que esto demuestra: en Vercel, sin otro proxy delante, el código obtiene una IP estable para un mismo visitante, y el límite corta en el sexto envío como pide la spec.

Lo que no se verificó: los logs de Vercel no se revisaron para confirmar que no aparezca "missing client IP header". La prueba no distingue por sí sola entre "llegó la IP real" y "todos los envíos cayeron en la clave fija `unknown`"; ambos casos producirían un mismo `ip_hash`. Revisar esos logs en el primer despliegue de producción despeja la duda.

## Decisión
- Mantener `x-forwarded-for` (primer valor) como fuente de la IP mientras la app corra en Vercel sin proxy ni CDN propio delante.
- No usar ni confiar en otros encabezados enviados por el cliente.

## Consecuencias
- Si se agrega un proxy o CDN delante de Vercel, `x-forwarded-for` dejaría de traer la IP del visitante; habría que revisar esta decisión.
- Pendiente: revisar los logs de Vercel en producción buscando "missing client IP header". Si aparece, todos los visitantes compartirían un único límite y habría que corregir la obtención de la IP.
