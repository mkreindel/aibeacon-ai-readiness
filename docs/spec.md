# Spec del MVP: AI Readiness Diagnostic (AI Beacon)

Estado: aprobado por Marcelo el 08/10/2026.

## 1. Problema
Los dueños de pymes no saben por dónde empezar con la IA ni qué les conviene automatizar primero. AI Beacon necesita una forma simple de mostrarles en qué punto están y, a la vez, conseguir contactos interesados.

## 2. Usuarios
| Usuario | Qué necesita |
|---|---|
| Dueño o gerente de una pyme (visitante) | Saber su nivel de madurez en IA y qué hacer primero, en 5 minutos y sin registrarse |
| Consultor de AI Beacon (administrador) | Ver los diagnósticos recibidos para preparar el primer contacto |

## 3. Alcance del MVP
Incluye:
1. Cuestionario público de 15 preguntas, sin login.
2. Puntaje determinista por dimensión y nivel de madurez.
3. Informe redactado por IA a partir del puntaje: resumen, 3 casos de uso priorizados y siguiente paso.
4. Captura del contacto (nombre, email, empresa, rubro, tamaño) con consentimiento explícito.
5. Panel de administración con login (email y contraseña) para listar y abrir diagnósticos.
6. Usuario de demo para el evaluador, sin MFA.

No incluye: pagos, envío de emails, varios idiomas, integración con CRM, edición del cuestionario desde el panel.

Idioma de la app: inglés (mercado: pymes de Houston). Documentación del TFM: castellano.

## 4. Flujo del visitante
1. Landing con qué es el diagnóstico y cuánto tarda.
2. Datos de la empresa: rubro (lista cerrada) y tamaño (1-10, 11-50, 51-200 empleados).
   Rubros, basados en sectores NAICS y aprobados por Marcelo el 08/10/2026: Construction; Manufacturing; Wholesale & distribution; Retail; Transportation & logistics; Energy (oil & gas); Professional services (legal, accounting, consulting); Healthcare; Real estate; Hospitality & food services; Other.
3. 15 preguntas, una dimensión por pantalla, con barra de progreso.
4. Datos de contacto y casilla de consentimiento (obligatoria).
5. Resultado: nivel, puntaje por dimensión (gráfico de barras) e informe.

La primera pantalla no es un login: cumple el requisito del TFM.

## 5. Modelo de puntaje (determinista)
Cada pregunta tiene 4 opciones con valor 0, 1, 2 y 3.

- Puntaje de dimensión = suma de sus 3 respuestas / 9 x 100, redondeado a entero.
- Puntaje global = promedio de las 5 dimensiones, redondeado a entero.

Nivel (modelo de tres niveles del bloque de Productividad del máster):

| Nivel | Nombre en la app | Regla |
|---|---|---|
| 1 | Individual use | Global menor a 40 |
| 2 | Team methodology | Global de 40 a 69 |
| 3 | Governed AI | Global de 70 o más y dimensión Gobernanza de 60 o más |

Si el global es 70 o más pero Gobernanza es menor a 60, el nivel es 2: no se llega a 3 sin gobernanza.

Todo el cálculo vive en una función pura con tests unitarios de cada borde (39/40, 69/70, Gobernanza 59/60).

Nota: los puntajes de dimensión solo toman 10 valores (0, 11, 22, 33, 44, 56, 67, 78, 89, 100), así que en la práctica el nivel 3 exige al menos 67 en Gobernanza. Los bordes de la regla se prueban sobre `getLevel`, que recibe los puntajes directamente.

## 6. Banco de preguntas
Opciones de cada pregunta en orden de valor 0 a 3.

### Datos
1. Where does your key business information live? (Paper or people's heads / Scattered spreadsheets and email / A few core systems / Integrated systems with a single source of truth)
2. How easy is it to get a report on sales or operations? (Not possible / Takes days of manual work / A few hours / Available on demand)
3. How is customer data kept up to date? (It isn't / Occasionally by hand / Regularly by a person / Automatically)

### Procesos
4. How documented are your main processes? (Not documented / Some notes / Most are written down / Documented and reviewed)
5. How much of your team's week goes to repetitive tasks? (Most of it / About half / A quarter / Very little)
6. Have you automated any process (even without AI)? (No / Tried once / A few / Many, maintained)

### Herramientas
7. Which AI tools does your team use today? (None / Free chat tools, individually / Paid licenses for some people / Company-wide tools)
8. Are your tools connected to each other? (No / Copy and paste / Some integrations / Most are integrated)
9. Do you pay for AI tools at company level? (No / Individuals expense them / One team plan / Company plan with admin control)

### Equipo
10. How comfortable is your team with AI? (Avoids it / A few curious people / Most try it / It is part of daily work)
11. Has anyone received AI training? (No / Self-taught only / Some formal training / Ongoing training plan)
12. Is someone responsible for AI initiatives? (No / Informally / Part-time owner / Dedicated owner)

### Gobernanza
13. Do you have rules on what data can go into AI tools? (No / Unwritten / Written policy / Written and enforced)
14. Does a person review AI outputs before they reach customers? (No review / Sometimes / Usually / Always, by process)
15. Do you measure results of AI or automation projects? (No / Gut feeling / Some metrics / Before-and-after metrics)

## 7. Informe con IA
- Entrada al modelo: rubro, tamaño, puntajes, nivel y respuestas. Nunca nombre, email ni empresa del contacto.
- Salida estructurada validada con un esquema (zod):
  - summary: 2 a 3 oraciones (se pide en el prompt; el esquema valida hasta 600 caracteres).
  - useCases: exactamente 3, cada uno con title, why, effort (low, medium, high), risk (low, medium, high) y firstStep.
  - nextStep: 1 oración (se pide en el prompt; el esquema valida hasta 250 caracteres).
- Criterios del prompt (del bloque de Productividad del máster):
  - comprobar primero si alcanza con automatización clásica;
  - priorizar casos internos y medibles antes que chatbots de cara al cliente;
  - filtrar por precisión requerida y costo del error.
- El modelo no cambia el puntaje ni el nivel.
- Si el modelo falla o la salida no valida: se muestra el resultado sin informe y un aviso. El diagnóstico se guarda igual.
- Proveedor por Vercel AI SDK. Inicial: OpenAI.

## 8. Datos (Supabase)
Tabla `diagnostics`:

| Columna | Tipo |
|---|---|
| id | uuid |
| created_at | timestamptz |
| company, contact_name, email | text |
| industry, company_size | text |
| answers | jsonb |
| scores | jsonb |
| level | int |
| report | jsonb, puede ser null |
| consent | boolean, debe ser true |
| ip_hash | text, hash SHA-256 de la IP con sal secreta; null en datos de demo |
| is_demo | boolean, true solo en datos de demo |

Tabla `panel_users` (lista de usuarios habilitados en el panel):

| Columna | Tipo |
|---|---|
| user_id | uuid, referencia a `auth.users` |
| role | text: `admin` o `demo` |
| created_at | timestamptz |

Acceso:
- RLS activado en las dos tablas.
- El visitante no accede a ninguna tabla: los datos los guarda una ruta del servidor con la clave secreta.
- Lectura de `diagnostics` solo para usuarios de `panel_users`: `admin` lee todo; `demo` lee solo filas con `is_demo = true`.
- Nadie modifica ni borra desde el panel: no hay políticas de escritura.
- Estar autenticado no alcanza: un usuario fuera de `panel_users` no lee nada.
- Esquema versionado en `supabase/migrations/`.

## 9. Seguridad y privacidad
- Claves solo en variables de entorno; `.env.example` sin valores.
- Validación del lado del servidor de todo lo que llega del formulario.
- Límite de 5 envíos por IP por hora. La IP no se guarda en claro: se guarda su hash con sal secreta (`ip_hash`).
- El servidor recalcula puntaje y nivel; nunca guarda un puntaje enviado por el navegador.
- Ningún dato personal en el prompt ni en los logs.
- Usuario de demo con permisos de solo lectura, que ve solo datos de demo. Su contraseña se publica en el README.
- Datos de demo claramente ficticios: empresas inventadas y emails con dominio `example.com`.

## 10. Criterios de aceptación
1. Un visitante completa el diagnóstico en menos de 5 minutos y ve su nivel e informe.
2. Mismas respuestas dan siempre el mismo puntaje y nivel.
3. Sin consentimiento no se puede enviar.
4. Si la IA falla, el visitante igual ve su puntaje.
5. El administrador ve la lista de diagnósticos ordenada por fecha y abre cada uno.
6. Tests del puntaje y de la validación del informe pasan en CI.
7. App desplegada con URL pública y usuario de demo documentado en el README.

## 11. Fases
1. Spec y repositorio (esta fase).
2. Puntaje y cuestionario con tests.
3. Persistencia en Supabase y panel con login.
4. Informe con IA.
5. Despliegue, README completo, slides y video.
