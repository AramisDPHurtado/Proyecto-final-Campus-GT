# Instrucciones del proyecto

## Propósito y fuente de verdad

Este repositorio implementa una web de reservas para karting. Leer spec.md, plan.md, tareas.md, idea.md, decisiones.md y glosario.md antes de cambiar comportamiento.

El spec es la fuente de verdad funcional. Las decisiones provisionales están etiquetadas en decisiones.md; no presentarlas como confirmación del usuario. Si un requisito cambia o hay contradicción, detenerse, proponer la actualización documental y pedir confirmación antes de modificar reglas.

## Reglas generales

- Trabajar una tarea acotada por vez.
- Usar los términos del glosario.
- No añadir precios, pagos, edades, correos u otras funciones que el spec excluye.
- No guardar secretos, tokens, credenciales ni datos reales.
- Mantener la separación controller/service/repository. Las reglas de negocio van en domain/services, no en controllers ni en React.
- Validar entradas en backend aunque el frontend también las valide.
- Proteger endpoints según rol y propiedad del recurso.
- Persistir reservas, cupos y bloqueos con transacciones; no confiar en comprobaciones solo del cliente.
- Usar America/Argentina/Buenos_Aires y el reloj inyectable; no sumar/restar horas manualmente.
- Mantener nombres, mensajes y UI en español.
- No cambiar el spec para hacer pasar una implementación incorrecta.

## Rutina para cada tarea

1. Leer ID, criterio, reglas y dependencias en tareas.md.
2. Revisar el estado de Git y los archivos que se tocarán.
3. Escribir o ajustar pruebas según criterios antes de implementar.
4. Implementar el alcance mínimo.
5. Ejecutar pruebas, typecheck y build relevantes.
6. Revisar el diff contra spec y plan; reportar cualquier supuesto o desviación.
7. Solo con aprobación de revisión, actualizar estado de tarea y crear un commit descriptivo.

## Seguridad

- Las contraseñas se hashean; nunca se guardan ni devuelven en claro.
- Todas las consultas SQL deben estar parametrizadas.
- No exponer stack traces ni secretos en respuestas.
- El archivo .env es local y está ignorado por Git. Actualizar .env.example sin valores sensibles.
- No ejecutar comandos destructivos, migraciones de producción o publicación sin autorización explícita.

## Agentes de trabajo

Los roles detallados están en agents/. Cada rol debe limitarse a su área y leer el spec/glosario.
