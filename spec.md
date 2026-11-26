# Spec — Reservas para karting

**Estado:** MVP definido con supuestos explícitos en decisiones.md.
**Fuente de verdad funcional:** este documento y las decisiones confirmadas/provisionales enlazadas arriba.

## Objetivo

Permitir que grupos reserven una de dos pistas de karting para una tanda de una hora, completen lugares hasta ocho participantes mediante grupos abiertos o solicitudes aprobadas, y consulten disponibilidad sin superponer sesiones.

## Usuarios y roles

- Visitante: consulta agenda y opciones de incorporación.
- Cliente autenticado: crea y cancela sus reservas, registra participantes, solicita unirse y administra las solicitudes de su grupo.
- Administrador: consulta todas las sesiones y bloquea pistas por mantenimiento.

## Fuera de alcance del MVP

- Cobros, tarifas, reembolsos y penalidades.
- Envío de correo, SMS o notificaciones push.
- Validación en línea de edad, altura o documentos.
- Selección manual de pista por el cliente.
- Reprogramación de una sesión ya confirmada.

## Reglas de negocio

- RN-01: La zona de negocio es America/Argentina/Buenos_Aires.
- RN-02: El establecimiento abre de martes a viernes a las 13:00 y cierra a la 01:00 del día siguiente.
- RN-03: Sábados y domingos abre a las 13:00 y cierra a las 03:00 del día siguiente. Los lunes no abre.
- RN-04: Las tandas duran exactamente 60 minutos y comienzan en horas en punto.
- RN-05: La última tanda de martes a viernes empieza a las 00:00; la última tanda de sábados y domingos empieza a las 02:00.
- RN-06: Las tandas de madrugada pertenecen al día operativo en que abrió el establecimiento.
- RN-07: El predio tiene dos pistas equivalentes, identificadas internamente como 1 y 2.
- RN-08: Una sesión ocupa una sola pista; sesiones activas en la misma pista no pueden superponerse.
- RN-09: Al crear una sesión propia, el sistema asigna automáticamente la pista libre con menor número.
- RN-10: Si ambas pistas están ocupadas o bloqueadas para el intervalo, no se crea una sesión nueva.
- RN-11: Un grupo anfitrión nuevo debe incluir de 2 a 8 participantes, contando al organizador.
- RN-12: Cada participante se registra con nombre. El kart y el casco son provistos por el local.
- RN-13: Una reserva para el grupo propio puede configurarse como abierta o con aprobación.
- RN-14: Un grupo abierto acepta una solicitud automáticamente si la sesión permanece futura y el total no supera 8.
- RN-15: En un grupo con aprobación, el organizador puede aprobar o rechazar una solicitud. Aprobar vuelve a validar el cupo.
- RN-16: Una solicitud para unirse puede incluir de 1 a 6 participantes y no puede hacer que el total aprobado supere 8.
- RN-17: Las solicitudes pendientes no ocupan cupo. No se puede aprobar una solicitud que exceda el máximo.
- RN-18: No se crea una sesión vacía. Para solicitar unirse debe existir una sesión y un grupo anfitrión.
- RN-19: El horario disponible para unirse debe ser de una sesión futura con lugares posibles, no bloqueada ni cancelada.
- RN-20: El organizador puede cambiar la política de incorporación de su sesión mientras no haya comenzado.
- RN-21: El organizador puede cancelar su propia sesión antes del inicio, sin cargo en el MVP. La pista vuelve a estar disponible y las solicitudes pendientes se cierran.
- RN-22: Una sesión iniciada no se puede cancelar desde la web.
- RN-23: No existe límite máximo de anticipación. No se permiten reservas con inicio pasado.
- RN-24: La agenda se puede consultar sin cuenta; crear, cancelar, solicitar o aprobar requiere autenticación.
- RN-25: El correo de cada cuenta es único; las contraseñas se almacenan como hash y nunca se devuelven por API.
- RN-26: Los datos personales de participantes se limitan a nombres. No se recolectan datos de pago.
- RN-27: No se cobra en línea ni se muestra un precio inventado en el MVP.
- RN-28: El administrador puede crear un bloqueo de mantenimiento para una pista futura. Se rechaza si se superpone con una sesión existente.
- RN-29: Las pistas bloqueadas por mantenimiento no se ofrecen para nuevas sesiones ni para grupos que se suman.
- RN-30: Las acciones de creación, unión, aprobación, cancelación y bloqueo verifican cupos y solapamientos dentro de una transacción para evitar carreras.
- RN-31: Solo el organizador de una sesión puede gestionar sus solicitudes y política; solo un administrador puede gestionar bloqueos.
- RN-32: Los avisos de solicitudes y cambios se muestran en la interfaz. No se envían correos.

## Historias de usuario y criterios de aceptación

### HU-01 — Consultar agenda

Como visitante, quiero ver fechas y sesiones disponibles para elegir una tanda.

- Dado un día operativo abierto y pistas libres, cuando consulto esa fecha, entonces veo inicios por hora local desde las 13:00 hasta la última tanda permitida.
- Dado un cierre nocturno, cuando consulto la madrugada siguiente, entonces las tandas de continuación se muestran bajo su fecha calendario y se validan según el día operativo que las originó.
- Dado un lunes sin continuación del domingo, cuando consulto disponibilidad, entonces no puedo crear una nueva tanda de lunes.

### HU-02 — Reservar para mi grupo

Como cliente, quiero reservar una pista para mi grupo y registrar a sus participantes.

- Dado un usuario autenticado, una tanda futura y dos a ocho nombres, cuando confirma la reserva, entonces se crea una sesión y se asigna una pista libre automáticamente.
- Dado menos de dos o más de ocho participantes, cuando intenta confirmar, entonces se explica el límite y no se crea la sesión.
- Dadas las dos pistas ocupadas, cuando intenta reservar la tanda, entonces recibe un conflicto y no se superpone otra sesión.

### HU-03 — Abrir grupo o pedir aprobación

Como organizador, quiero elegir cómo se incorporan otros participantes.

- Dada una sesión futura, cuando elijo “abierto”, entonces nuevas solicitudes se agregan automáticamente si hay cupo.
- Dada una sesión futura, cuando elijo “requiere aprobación”, entonces la solicitud queda pendiente y solo el organizador puede aprobarla o rechazarla.
- Dada una solicitud cuya aprobación superaría ocho personas, cuando el organizador intenta aprobarla, entonces no se agrega y se informa que no hay cupo.

### HU-04 — Unirse a un grupo

Como cliente autenticado, quiero pedir un lugar en una sesión ya reservada.

- Dada una sesión abierta con cupo, cuando solicito uno o más lugares, entonces se incorporan automáticamente sin superar ocho personas.
- Dada una sesión con aprobación, cuando solicito lugares, entonces veo el estado pendiente y no se duplican solicitudes activas de la misma cuenta para esa sesión.
- Dada una sesión inexistente, cancelada, iniciada o completa, cuando intento sumarme, entonces el sistema rechaza la solicitud.

### HU-05 — Administrar mis reservas

Como organizador, quiero ver y cancelar mis sesiones futuras.

- Dada una sesión propia futura, cuando la cancelo, entonces se libera la pista y se cierran sus solicitudes pendientes.
- Dada una sesión iniciada, cuando intento cancelarla desde la web, entonces el sistema lo rechaza.
- Dada una sesión ajena, cuando intento administrarla, entonces recibo una respuesta de autorización denegada.

### HU-06 — Gestionar mantenimiento

Como administrador, quiero bloquear una pista cuando no pueda utilizarse.

- Dada una pista libre y un intervalo futuro, cuando creo un bloqueo, entonces la pista deja de aparecer como disponible durante ese intervalo.
- Dado un intervalo que se superpone con una sesión confirmada, cuando intento bloquearlo, entonces el sistema rechaza el bloqueo y conserva la sesión.
- Dado un usuario no administrador, cuando intenta crear o borrar bloqueos, entonces recibe una respuesta de autorización denegada.

## Restricciones de seguridad y calidad

- Validar entradas en backend; no confiar en validaciones del navegador.
- Usar consultas parametrizadas y contraseñas con hash.
- No guardar secretos en Git. Variables sensibles solo en archivos ignorados y configuración del hosting.
- Respuestas de error consistentes, sin stack traces ni secretos.
- La UI debe ser usable en móvil y escritorio, en español y con foco accesible.

## Definición de terminado

- Historias cubiertas por pruebas automatizadas relacionadas a RN.
- Pruebas y build pasan.
- Revisión contra este spec sin funcionalidades inventadas.
- Tarea marcada completa en tareas.md y commit creado.
- Documentación y configuración de despliegue actualizadas.
