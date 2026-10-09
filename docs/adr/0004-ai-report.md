# ADR 0004: Informe con IA por Vercel AI SDK y OpenAI, generado antes de guardar

Estado: aceptado. Fecha: 09/10/2026.

## Contexto
La spec (sección 7) pide un informe redactado por IA con salida estructurada validada con zod (summary, exactamente 3 useCases y nextStep), proveedor por Vercel AI SDK con OpenAI como inicial, y que un fallo del modelo no impida ver el puntaje ni guardar el diagnóstico (report = null). La sección 9 prohíbe datos personales en el prompt y en los logs.

## Decisión

### Dependencias y API
- `ai` 7.0.116 y `@ai-sdk/openai` 4.0.77, con versión fija. Son las últimas publicadas con más de dos semanas de antigüedad (25/09/2026, según `npm view ai time` y `npm view @ai-sdk/openai time`).
- La documentación oficial de ai-sdk.dev y openai.com está bloqueada en el entorno de desarrollo; la API se tomó de la documentación oficial que viene dentro de los paquetes:
  - `ai@7.0.116`, `docs/03-ai-sdk-core/10-generating-structured-data.mdx`: `generateText` con `output: Output.object({ schema })`. Cita: "If the model response cannot be parsed or validated against the schema, `generateText` rejects with an `AI_NoObjectGeneratedError`".
  - `ai@7.0.116`, `docs/03-ai-sdk-core/25-settings.mdx`: `timeout` y `maxRetries` (por defecto 2).
  - `ai@7.0.116`, `docs/07-reference/01-ai-sdk-core/01-generate-text.mdx`: `instructions` para el prompt de sistema (`system` figura como "Deprecated: use `instructions` instead").
  - `@ai-sdk/openai@4.0.77`, `docs/03-openai.mdx`: la clave "defaults to the `OPENAI_API_KEY` environment variable"; las salidas estructuradas estrictas vienen activadas por defecto.

### Modelo
`gpt-5.4-mini` con la Responses API (`openai("gpt-5.4-mini")`, en `src/lib/server/openai-report.ts`). Verificado por Marcelo (con Claude en Cowork) el 09/10/2026 en [la página del modelo](https://developers.openai.com/api/docs/models/gpt-5.4-mini):
- Features: "Structured outputs: Supported".
- Endpoints: Responses (`v1/responses`) y Chat Completions habilitados.
- Precio: US$0,75 por 1M tokens de entrada y US$4,50 por 1M de salida; sin aviso de deprecación; snapshot `gpt-5.4-mini-2026-03-17`.

### Qué datos salen a OpenAI
A OpenAI solo salen rubro, tamaño, puntajes, nivel y respuestas (con el texto de cada pregunta y de la opción elegida). Nunca nombre, email ni empresa del contacto.
- `reportInputFrom` (`src/lib/report-prompt.ts`) es el único punto que arma la entrada del modelo y deja solo esos campos.
- Lo prueban tests con valores de contacto únicos que no aparecen ni en el prompt (`src/lib/report-prompt.test.ts`) ni en lo que recibe el modelo simulado de punta a punta (`src/lib/server/submit-diagnostic.test.ts`).
- Todos los valores salen de listas cerradas validadas por zod, así que el visitante no puede meter texto propio en el prompt.
- Fuentes verificadas para esta decisión: [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini) (modelo y endpoint al que se envían esos datos) y [Vercel Hobby](https://vercel.com/docs/plans/hobby) (la función que hace la llamada corre en el servidor de Vercel).

### Esquema estricto con dos esquemas
Se mantiene el modo estricto de OpenAI (no se usa `strictJsonSchema: false`). Verificado por Marcelo (con Claude en Cowork) en [la guía de Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), sección de esquemas soportados, api-mode=responses:
- Arrays: "minItems — The array must have at least this many items." y "maxItems — The array must have at most this many items." figuran como soportados.
- Strings: en la lista de soportados solo figuran `pattern` y `format`; `minLength` y `maxLength` solo aparecen en la lista de no soportados para modelos fine-tuned, y la guía no dice que estén soportados para modelos base.
- "If you turn on Structured Outputs by supplying strict: true and call the API with an unsupported JSON Schema, you will receive an error."

Por eso (`src/lib/report.ts`):
- `reportModelSchema` va al modelo: exactamente 3 useCases (minItems y maxItems), enums para effort y risk, objetos estrictos, sin topes de largo en los textos.
- `reportSchema` se aplica a la salida después: agrega los topes (summary 600, nextStep 250, title 100, why 400, firstStep 250 caracteres). Las 2 a 3 oraciones y la 1 oración se piden en el prompt.
- Un test verifica que el JSON Schema que recibe el modelo no contiene `maxLength` ni `minLength` (`src/lib/server/generate-report.test.ts`).

### Cuándo y dónde corre
- En el servidor, dentro de `POST /api/diagnostics`. El módulo que crea el modelo importa `server-only`.
- Orden: validar, chequear el límite por IP, calcular el puntaje, generar el informe y hacer un único insert con `report`. Con 400 o 429 no se llama al modelo.
- `timeout: 15000` y `maxRetries: 0`: el visitante espera como máximo unos 15 s. La duración máxima de una Vercel Function en el plan Hobby es de 300 s, según [Vercel Hobby](https://vercel.com/docs/plans/hobby) (verificado por Marcelo el 09/10/2026), así que el timeout corta antes que la plataforma.
- Alternativa descartada: insertar primero y actualizar después. Suma una escritura y un método de actualización; su única ventaja (no perder la fila si la plataforma corta la función) la cubre el timeout.

### Si falla
- Error del proveedor, timeout, JSON inválido, salida que no valida o falta de `OPENAI_API_KEY`: se guarda `report = null`, se responde 201 con `{ score, report: null }` y el visitante ve su resultado con un aviso.
- El modelo no cambia puntaje ni nivel: se calculan antes y el esquema estricto no acepta campos extra.
- El log registra solo el nombre del error, por ejemplo `report generation failed: AI_NoObjectGeneratedError`, o `unknown` si no tiene un nombre útil. Nunca el mensaje del error ni el texto del modelo. Sin clave: `report generation disabled`.
- En el panel, un informe guardado que no valida se trata como ausente y el diagnóstico se muestra igual.

## Limitación conocida
El insert ocurre después de la llamada al modelo (hasta 15 s). Durante ese tiempo, envíos concurrentes desde la misma IP pueden pasar el chequeo del límite antes de que exista la primera fila. Aceptado para el MVP; no se corrige ahora.

## Evidencia en el preview
Prueba hecha por Marcelo el 09/10/2026 en el preview de la rama `claude/gallant-bell-mhh9e1`, redeploy del commit `0fe40c2` con `OPENAI_API_KEY` cargada solo en el entorno Preview de Vercel. La clave es de una service account de un proyecto de OpenAI dedicado, con acceso solo a `gpt-5.4-mini` y un tope de gasto de US$10 que corta.
- Diagnóstico de prueba (Construction, 11-50, todas las respuestas en la opción 1): respuesta 201 en 5,7 s y el informe visible para el visitante.
- Supabase: la fila guardada tiene level 1 y un `report` con 3 useCases, summary de 283 caracteres y nextStep de 129.
- Panel: el detalle muestra el informe completo para el admin; el usuario demo sigue viendo solo las 6 filas demo.
- Runtime Logs de Vercel (últimos 30 minutos): ninguna línea "report generation", 0 warnings y 0 errores.
- OpenAI aceptó el esquema estricto con `minItems` y `maxItems` y sin topes de largo en los textos.
- `supabase/seed/demo-reports.sql` (blob `68a04768`) ejecutado en Supabase con el OK de Marcelo: las 6 filas demo tienen informe y las 7 filas de prueba no se tocaron.

Ajuste a partir de la prueba: el modelo escribió "no rules" cuando la respuesta era "Unwritten". Se agregó al prompt la instrucción de describir cada respuesta con el sentido exacto de la opción elegida, sin exagerarla ni suavizarla (con test en `src/lib/report-prompt.test.ts`).

## Pendiente
- El nombre de error que produce un timeout real: con el modelo simulado no se pudo reproducir y en la prueba no hubo timeouts.

## Consecuencias
- Cada diagnóstico con informe implica una llamada a OpenAI con costo por tokens.
- Cambiar de proveedor o de modelo se hace en `src/lib/server/openai-report.ts`; el resto del flujo recibe el modelo inyectado.
- Si OpenAI empieza a soportar `minLength` y `maxLength` en modo estricto, se puede volver a un solo esquema; hasta entonces los topes se validan después.
- Los datos de demo reciben informes ficticios escritos a mano (`supabase/seed/demo-reports.sql`), sin llamar al modelo.
