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

Lo que esto demuestra: el límite corta en el sexto envío como pide la spec.

La prueba del 429, sola, no distingue entre "llegó la IP real" y "todos los envíos cayeron en la clave fija `unknown`": los dos casos producen un mismo `ip_hash`. Para descartar el segundo caso, Marcelo revisó el 09/10/2026 dos evidencias independientes:

- **Runtime Logs de Vercel** (ventana que incluye la ráfaga; el plan Hobby retiene 1 hora): los 5 `POST /api/diagnostics` figuran con 201 y el sexto con 429. La búsqueda "missing client IP" devolvió "No request logs found for the selected filters", y la columna Messages está vacía en todos los requests de la ráfaga.
- **Datos en Supabase:** la fila del 08/10/2026 17:02:05 UTC tiene un `ip_hash` con prefijo `573b68d6`, y las 5 filas de la ráfaga tienen el prefijo `1ed264a5`. Las dos tandas salieron del mismo deploy (`e18973e`), con la misma sal. Si no hubiera llegado la IP, las dos serían el hash de `unknown` y coincidirían; no coinciden.

Conclusión: en esta prueba la IP del cliente llegó en `x-forwarded-for`; el límite no estaba usando la clave fija `unknown`.

Alcance de lo medido: vale para Vercel sin otro proxy ni CDN delante, que es como corre hoy la app.

## Decisión
- Mantener `x-forwarded-for` (primer valor) como fuente de la IP mientras la app corra en Vercel sin proxy ni CDN propio delante.
- No usar ni confiar en otros encabezados enviados por el cliente.

## Consecuencias
- Si se agrega un proxy o CDN delante de Vercel, `x-forwarded-for` dejaría de traer la IP del visitante; habría que revisar esta decisión.
- Si en algún momento aparece "missing client IP header" en los logs, todos esos visitantes compartirían un único límite y habría que revisar la obtención de la IP.
