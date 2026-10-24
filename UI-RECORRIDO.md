# Recorrido visual de Vino Costero

## Revisión integral posterior del 23 de octubre de 2026

El alcance se amplió a las diez pantallas operativas. Se conservaron las etiquetas REQ y los tooltips por instrucción expresa del usuario. WorkGuide presenta tareas y accesos por pantalla y modo de consulta; PageNotice ofrece recuperación de errores de carga. Se asociaron etiquetas con controles, se hicieron adaptables los formularios y se contuvo el desplazamiento de las tablas.

| Antes | Después | Motivo |
| --- | --- | --- |
| Entradas de formularios y encabezados de 600–700 ms | Contenido operativo inmediato en Motion.tsx | Las tareas repetidas deben estar disponibles sin esperar. |
| Filas con entrada escalonada | Filas visibles sin desplazamiento | Facilitar consultas frecuentes. |
| Tooltips de REQ con animación de entrada y salida | Explicación inmediata, con toque y teclado | Conservar la ayuda sin retrasar su lectura. |
| Menú animado sin cierre explícito | Menú inmediato, cierre, Escape y ciclo de foco | Mantener el control durante la navegación frecuente. |

Decisión de revisión del movimiento modificado: **Approve**. Se mantiene el recorrido explicativo del acceso, separado de los controles operativos.

Validación actual: compilación TypeScript/Vite y typecheck correctos; diez pantallas recorridas con Administrador; ingreso y navegación visible comprobados con Gerente, Agronomo, Enologo, Logistica y Marketing. Se comprobaron accesos a secciones, validación de Código vacío, tooltips de requisito dentro y fuera de etiquetas, Escape y ciclo de foco del menú. Capturas guardadas en Documents/Codex/vino-manuales-2026-10-23/ui-integral. Ambos manuales nativos se editaron en sus archivos originales y se verificaron sus nuevas páginas en PDF.

La revisión de seguridad fue estática y acotada al cambio de interfaz: se conservaron rutas de API, contratos y decisiones de permisos existentes. No se repitieron todos los guardados ni la matriz de autorización del servidor; tampoco se realizó una prueba formal con usuarios finales. Este registro actualiza el estado pendiente descrito en las secciones históricas de este archivo.

Adaptación del relato por escenas de https://jesusgabri3l.github.io/ceiba/ al sistema de producción vitivinícola. Ilustraciones SVG originales locales: viñedo, cosecha, bodega y despacho. No se incorporan scripts, videos, analítica ni dependencias de CEIBA.

## Decisiones de interfaz

- Acceso siempre visible; en pantallas de hasta 900 px aparece primero.
- Etapas con botones nativos y estado seleccionado anunciado. No avanzan automáticamente.
- Cada escena explica el trabajo y el rol correspondiente; no representa datos reales.
- Navegación visible usa la misma lista de módulos por rol que el menú existente.
- Se conserva el envío de credenciales, el tratamiento de sesión y las protecciones de rutas existentes. Se retiran del formulario las insignias técnicas de requisitos.

## Revisión del movimiento

| Antes | Después | Motivo |
| --- | --- | --- |
| Entrada del formulario de 700 ms | Formulario inmediato | La tarea de ingresar no necesita esperar una entrada animada. |
| Sin explicación visual del proceso | Transición de escenas de 240 ms con transform y opacity | Explicar el cambio de etapa sin alterar el layout. |
| Movimiento no aplicable al nuevo recorrido | Fundido de 120 ms con movimiento reducido; cambio inmediato con teclado | Respetar preferencias y respuesta de controles. |

Decisión de revisión estática del movimiento nuevo: **Approve**. No equivale a QA visual en navegador.

## Validación y límites

- `git diff --check`: correcto.
- Revisión estática: botones con type, aria-pressed y control de región; mensajes de etapa anunciados; ninguna solicitud de red ni HTML dinámico añadido; permisos de navegación derivados de roles existentes.
- Security-audit utilizado en modo de orientación. No es auditoría completa ni certificación. No se identifican nuevos cruces de confianza en el cambio estático.
- Pendientes: compilación TypeScript/Vite y comprobación visual a 375, 768 y 1440 px, teclado, movimiento reducido y acceso con cuentas de prueba de cada rol.
- No se ejecutaron el build ni la aplicación: esta sesión no dispone de un entorno de ejecución con todos los controles de aislamiento requeridos por security-audit. No se modificaron despliegues ni bases de datos.

Comprobación pendiente en un entorno aislado: `npm run build --prefix web`; después revisar `/login`, las cuatro escenas y los enlaces visibles con roles de prueba. Las comprobaciones de seguridad estáticas no prueban autorización del servidor.

## Vista previa solicitada
Compilación TypeScript y Vite completada correctamente tras la petición de vista visual. Servidor local de Vite iniciado en http://127.0.0.1:5174/login para revisar la interfaz. No implica validación de seguridad ni del backend.
