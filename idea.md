# Idea del proyecto: reservas para pista de karting

> Borrador inicial basado en lo que definió el usuario. Todavía no es el `spec`: los puntos abiertos deben resolverse antes de fijar reglas de negocio.

## Idea del cliente

Queremos crear una página web para reservar turnos en una pista de karting. El predio tiene dos pistas pequeñas. Los turnos duran una hora y, para reservar una pista, el grupo debe incluir como mínimo dos participantes y como máximo ocho. La persona que hace la reserva puede registrar a los participantes. El kart y el casco los proporciona el establecimiento.

Al reservar, el cliente puede tomar una pista para su propio grupo o sumarse a un grupo que ya reservó esa pista y horario. Cuando se reserva para un grupo nuevo, el sistema asigna automáticamente una de las dos pistas libres, ya que ambas son iguales. Si no existe un grupo al que sumarse, se reserva para el grupo propio, aunque queden lugares libres. Al reservar, ese grupo puede quedar abierto a incorporaciones o requerir aprobación del anfitrión. En un grupo abierto, las incorporaciones se aceptan automáticamente hasta llegar a 8 personas; en los demás grupos, cada solicitud debe ser aprobada por el anfitrión. La página debe ofrecer únicamente opciones compatibles con la modalidad elegida. No se exige reservar con una semana de anticipación: si hay disponibilidad, se puede reservar. El establecimiento funciona de martes a domingo y cierra los lunes.

## Datos definidos hasta ahora

- **Tipo de producto:** sitio web de reservas para karting.
- **Instalaciones:** dos pistas pequeñas dentro del mismo predio.
- **Duración de cada turno:** una hora.
- **Participantes por reserva/pista:** mínimo 2, máximo 8.
- **Responsable de la reserva:** puede registrar a los participantes.
- **Modalidad:** reservar para el propio grupo o solicitar unirse a un grupo ya reservado. No se crea una sesión sin participantes.
- **Asignación de pista:** el sistema asigna automáticamente una pista libre al crear una reserva para un grupo; las dos pistas son equivalentes.
- **Acceso a un grupo reservado:** un grupo abierto acepta incorporaciones automáticamente hasta llegar a 8 participantes; un grupo que requiere aprobación deja cada solicitud pendiente de respuesta del anfitrión.
- **Capacidad:** máximo 8 participantes en una pista durante un turno; el mínimo de 2 aplica al turno/pista.
- **Equipamiento:** el establecimiento proporciona kart y casco.
- **Disponibilidad:** no permitir ofrecer una pista si ya está reservada para ese horario.
- **Anticipación:** sin requisito mínimo de una semana; se ofrecen los horarios que estén disponibles.
- **Días de funcionamiento:** martes a domingo; lunes cerrado.
- **Horario confirmado:** martes a viernes, de 13:00 a 01:00; sábados y domingos, de 13:00 a 03:00. El lunes permanece cerrado. El cierre general a las 02:00 queda descartado.

## Preguntas abiertas

1. **Cruce de medianoche:** ¿cómo se identifica el día operativo de una tanda que empieza después de medianoche? Por ejemplo, una tanda del sábado a las 02:00 que termina a las 03:00.
2. **Disponibilidad futura:** ¿se pueden reservar todos los días futuros que tengan agenda publicada, o habrá un límite de anticipación? ¿Se permiten reservas para el mismo día hasta que comience el turno?
3. **Participantes:** ¿la persona que reserva cuenta dentro del mínimo/máximo? ¿Se necesitan nombre y apellido de cada participante u otros datos? Al solicitar unirse, ¿se puede pedir lugar para una sola persona?
4. **Precio y pago:** ¿hay precio por participante o por pista? ¿Se paga al reservar, en el lugar o con una seña? ¿Qué pasa si el pago falla?
5. **Cambios y cancelaciones:** ¿se pueden cancelar o modificar reservas? ¿Hasta cuándo y con qué devolución o penalidad?
6. **Cuentas y administración:** ¿hace falta registrarse? ¿Qué puede hacer el administrador (por ejemplo, bloquear una pista, fijar horarios o precios)?
7. **Seguridad y elegibilidad:** ¿hay edad mínima, altura mínima, autorización de un adulto o requisitos de seguridad que el sistema deba validar?
8. **Fallos y excepciones:** ¿qué ocurre si una pista deja de funcionar, hay mal clima o el establecimiento debe cerrar?

## Alcance todavía por decidir

Este documento registra la idea inicial y sus dudas; no define todavía autenticación, precios, pagos, cancelaciones, panel administrativo ni arquitectura técnica. Esas decisiones se incorporarán después de aclararlas y acordar el alcance.
