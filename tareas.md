# Tareas de implementación

Las tareas se ejecutan por dependencias, no por número. Cada tarea termina con tests, revisión y commit antes de avanzar.

| ID | Tarea | Área | Cubre | Dependencias | Terminado cuando |
|---|---|---|---|---|---|
| T01 | Monorepo, toolchain, lint/typecheck y configuración de entorno | Base | Calidad | — | Build y typecheck iniciales pasan |
| T02 | Esquema PostgreSQL, migraciones y repositorios | Backend | RN-07, RN-08, RN-28, RN-30 | T01 | Migraciones aplican y restricciones/repositorios tienen tests |
| T03 | Dominio de calendario y disponibilidad horaria | Backend | RN-01 a RN-06, RN-23 | T01 | Casos de cierres, madrugada, lunes y zona horaria tienen tests |
| T04 | Registro, login, permisos y seed de administrador | Backend | RN-24, RN-25, RN-31 | T02 | Auth y permisos tienen tests |
| T05 | Crear sesión y asignar pista automáticamente | Backend | RN-07 a RN-12, RN-30 | T02, T03, T04 | Cupo, pista, solapamientos y concurrencia cubiertos |
| T06 | Uniones, grupos abiertos y aprobación | Backend | RN-13 a RN-20, RN-30 | T05 | Aceptación, rechazo, cupos y solicitudes duplicadas tienen tests |
| T07 | Cancelación y mantenimiento | Backend | RN-21, RN-22, RN-28, RN-29 | T05, T06 | Liberación y bloqueos con conflictos tienen tests |
| T08 | API REST, validación, errores y documentación OpenAPI | Backend | RN-24 a RN-32 | T04-T07 | Contratos HTTP cubiertos por Supertest |
| T09 | Sistema visual, navegación y disponibilidad | Frontend | HU-01 | T08 | Responsive, accesible y prueba de estados vacíos/error |
| T10 | Registro/login, reserva y registro de participantes | Frontend | HU-02 | T09, T08 | Flujo completo integrado |
| T11 | Unirse, administrar grupos y gestionar solicitudes | Frontend | HU-03, HU-04, HU-05 | T10 | Flujos abiertos, aprobación y cancelación funcionan |
| T12 | Panel de administración | Frontend | HU-06 | T11 | Bloqueos visibles, creables y removibles |
| T13 | Integración final, pruebas de extremo a extremo y accesibilidad | Full stack | HU-01 a HU-06 | T02-T12 | Suite, build y revisión pasan |
| T14 | Documentación, CI y configuración de despliegue | Entrega | Entrega | T13 | Instrucciones reproducibles y variables documentadas |

## Ciclo por tarea

1. Tester deriva casos de aceptación del spec y los ejecuta; las pruebas nuevas deben fallar antes de implementar.
2. Desarrollador implementa solo el alcance de la tarea y no modifica tests para ocultar fallas.
3. Se ejecutan tests, typecheck y revisión contra spec/plan.
4. Si la revisión rechaza, se corrige y vuelve a revisar.
5. Con aprobado, se crea commit y se marca la tarea completa.
