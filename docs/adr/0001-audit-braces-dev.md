# ADR 0001: Aceptar la alerta de npm audit sobre braces (solo desarrollo)

Estado: aceptado. Fecha: 08/10/2026.

## Contexto
`npm audit` informa 5 vulnerabilidades de severidad alta. Todas son una sola cadena que nace en `braces`:

```
eslint-config-next@16.4.0
 └─ @next/eslint-plugin-next@16.4.0
     └─ fast-glob@3.3.1
         └─ micromatch@4.0.8
             └─ braces@3.0.3
```

Aviso: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), "braces vulnerable to stack-exhaustion denial of service through deeply nested patterns", rango afectado `<=3.0.3`.

## Evidencia
- `npm audit --omit=dev` devuelve 0 vulnerabilidades: la cadena viene de `eslint-config-next`, que es devDependency y solo corre al hacer lint. No forma parte del build ni del servidor.
- `npm view braces versions` muestra que 3.0.3 es la última versión publicada. No hay versión corregida a la que subir, ni siquiera con un override.
- `npm audit fix --dry-run` no aplica ningún arreglo sin `--force`.
- El único arreglo que propone `npm audit fix --force` es bajar `eslint-config-next` a 14.2.35: un cambio mayor, dos versiones por detrás de Next 16.4.0.
- Los patrones de glob que procesa ESLint salen de la configuración del repo, no de datos de los visitantes.

## Decisión
- No aplicar `npm audit fix --force` ni bajar `eslint-config-next`.
- En CI, auditar solo dependencias de producción: `npm audit --omit=dev --audit-level=high`. El CI falla si aparece una vulnerabilidad alta que llegue a producción.

## Criterio de revisión
Revisar esta decisión cuando ocurra cualquiera de estos casos:
- se publica una versión de `braces` fuera del rango afectado;
- una versión nueva de `eslint-config-next` o `@next/eslint-plugin-next` deja de depender de una versión vulnerable;
- `npm audit --omit=dev` empieza a mostrar esta cadena (es decir, llega a producción).

## Consecuencias
- `npm audit` sin filtros seguirá mostrando estas 5 alertas en desarrollo.
- El CI no se bloquea por esta alerta, pero sí por cualquier vulnerabilidad alta de producción.
