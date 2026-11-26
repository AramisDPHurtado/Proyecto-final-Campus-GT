# Karting Campus GT

Sitio de reservas para dos pistas de karting. Los grupos pueden reservar una tanda de una hora, marcarse abiertos para incorporar gente automáticamente o requerir aprobación del anfitrión.

## Funciones del MVP

- Agenda pública con horarios locales y cierres nocturnos.
- Reserva de 2 a 8 participantes con asignación automática de pista.
- Solicitudes para sumarse a grupos con incorporación abierta o aprobación del anfitrión.
- Gestión de reservas propias y de solicitudes entrantes.
- Acceso administrativo para bloquear una pista por mantenimiento.
- API Express en capas, PostgreSQL con migraciones y pruebas automatizadas.

No se inventan tarifas ni se procesa dinero. Las decisiones provisionales están listadas en decisiones.md.

## Requisitos

- Node.js 22 o superior.
- npm 10 o superior.
- PostgreSQL 16 para persistencia local, o Docker Desktop para iniciar la base incluida.

## Inicio local

1. Copiar .env.example a backend/.env y cambiar JWT_SECRET, ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD por valores propios.
2. Iniciar PostgreSQL con docker compose up -d db o configurar una instancia y DATABASE_URL.
3. Instalar dependencias con npm install.
4. Crear tablas con npm run db:migrate.
5. Crear el administrador inicial con npm run db:seed:admin.
6. Iniciar frontend y API con npm run dev.
7. Abrir http://localhost:5173.

Si DATABASE_URL está vacío en NODE_ENV=development, el backend usa almacenamiento en memoria para una vista previa rápida. Los datos se pierden al reiniciar; para conservarlos, configurar PostgreSQL.

## Pruebas y compilación

- npm test ejecuta pruebas de backend y frontend.
- npm run typecheck revisa los dos proyectos TypeScript.
- npm run build compila API y frontend.

## Usuario administrador

El administrador se crea a partir de ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD al correr el seed. El archivo .env.example contiene marcadores que deben reemplazarse y nunca deben usarse en un entorno público. Para una prueba inicial, crear una cuenta de cliente desde la web y cargar el administrador con variables locales.

## Despliegue

Se puede desplegar el frontend como sitio estático, la API como servicio Node y PostgreSQL como base gestionada. Configurar DATABASE_URL, JWT_SECRET y FRONTEND_ORIGIN como variables del proveedor, ejecutar las migraciones y revisar /api/health. Nunca subir archivos .env ni cadenas de conexión al repositorio.

La publicación real requiere una cuenta de hosting y una base PostgreSQL configurada. Este repositorio incluye la aplicación y las instrucciones; no contiene credenciales de proveedores.

## Verificación en GitHub

El workflow de integración continua instala dependencias, ejecuta pruebas, revisa tipos y compila ambos proyectos en cada push y pull request.

## Documentación del proyecto

- idea.md: visión inicial y requisitos expresados por el dueño.
- decisiones.md: reglas confirmadas y supuestos MVP.
- glosario.md: términos de negocio.
- preguntas-abiertas.md: asuntos a validar antes de producción.
- spec.md: alcance, reglas numeradas e historias de usuario.
- plan.md: arquitectura, modelo de datos y API.
- tareas.md: secuencia de implementación y ciclo de revisión.
- AGENTS.md y agents/: reglas generales y responsabilidades de agentes.
