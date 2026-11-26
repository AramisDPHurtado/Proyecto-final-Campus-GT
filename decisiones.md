# Decisiones del MVP

Este documento distingue las decisiones confirmadas por el dueño del proyecto de los valores provisionales elegidos para que el MVP sea implementable. Los supuestos se pueden cambiar; si se cambian, actualizar primero este documento y el spec.

## Confirmadas por el usuario

- D-001: El negocio tiene dos pistas pequeñas equivalentes.
- D-002: Cada sesión dura una hora.
- D-003: Hay de martes a domingo; los lunes el negocio está cerrado.
- D-004: El horario es martes a viernes de 13:00 a 01:00 del día siguiente; sábados y domingos de 13:00 a 03:00 del día siguiente.
- D-005: El sistema asigna automáticamente una pista libre.
- D-006: Una sesión comienza con un grupo de 2 a 8 personas. La persona que reserva puede registrar participantes.
- D-007: Si no hay una sesión existente a la cual unirse, el cliente reserva para su propio grupo, incluso si quedan lugares libres.
- D-008: Un grupo puede estar abierto, con incorporación automática hasta completar 8 lugares, o requerir aprobación de su anfitrión.
- D-009: Los karts y cascos los proporciona el establecimiento.
- D-010: No hay requisito de reservar con una semana de anticipación; se muestran horarios disponibles.

## Supuestos de alcance para hacer el MVP coherente

- D-011: La zona horaria del negocio es America/Argentina/Buenos_Aires. Todas las fechas y horas de interfaz y reglas se interpretan allí.
- D-012: Las tandas comienzan en horas en punto. Un cierre a la 01:00 permite iniciar la última tanda a las 00:00; un cierre a las 03:00 permite iniciar a las 02:00.
- D-013: La operación que cierra después de medianoche pertenece al día en que abrió. La vista de disponibilidad muestra también las tandas que continúan durante la madrugada.
- D-014: El organizador cuenta como participante y el mínimo de dos y máximo de ocho se aplica al total de la sesión.
- D-015: Una solicitud para unirse puede pedir de una a seis personas, sujeto al cupo disponible. En grupos abiertos se confirma automáticamente; en grupos con aprobación queda pendiente hasta que el anfitrión decida.
- D-016: Las solicitudes pendientes no reservan cupo. La aprobación vuelve a comprobar el máximo dentro de una transacción; si ya no hay lugar, se rechaza sin alterar el grupo.
- D-017: Cada pista admite una sola sesión por intervalo. Dos grupos que comparten participan de la misma sesión y ocupan una pista juntos; nunca se crea una sesión sin un grupo inicial.
- D-018: Las reservas propias se confirman al completar el formulario. Se pueden cancelar sin cargo hasta el comienzo de la tanda; una tanda iniciada ya no se puede cancelar desde la web.
- D-019: El MVP no cobra en línea ni fija tarifas. No se inventa un precio; el pago queda fuera del flujo de esta primera versión.
- D-020: Se necesita una cuenta para reservar, solicitar unirse o administrar un grupo. La disponibilidad puede consultarse sin iniciar sesión.
- D-021: Solo se guardan nombres de participantes. No se recopilan edades, documentos ni datos de pago; la comprobación de requisitos de seguridad ocurre en el establecimiento.
- D-022: El administrador puede consultar sesiones y bloquear una pista por mantenimiento. Un bloqueo nuevo se rechaza si se superpone con una sesión existente.
- D-023: Las notificaciones de solicitudes se muestran dentro de la aplicación. No se envían correos en el MVP.
- D-024: No se limita la anticipación máxima; se puede elegir cualquier fecha futura en que la agenda esté abierta.
- D-025: Para reservas nuevas se asigna la pista libre con menor número, de forma atómica. El número de pista no es una preferencia del cliente.

## Revisión

Antes de una entrega externa, el dueño debe confirmar que los supuestos D-011 a D-025 representan el producto deseado. El código y los tests deben seguir el spec vigente mientras tanto.
