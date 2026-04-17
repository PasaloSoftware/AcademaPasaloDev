# Academia Pasalo - Backend

API REST desarrollada con NestJS para la gestiÃ³n integral de la plataforma educativa Academia Pasalo. Este proyecto sigue una arquitectura modular y escalable, utilizando prÃ¡cticas de desarrollo profesionales y tipado estricto.

## Comandos importantes: ejecución SQL por entorno (Windows vs Linux)

### Desarrollo (academy-real)

Para ejecutar `scripts/academy-real/run-academy-real-sql.ts`, use el comando según sistema operativo:

#### Windows (PowerShell / CMD)

```bash
npx dotenv -e .env -- cmd /c "npx ts-node --transpile-only scripts/academy-real/run-academy-real-sql.ts"
```

#### Linux / Ubuntu (ej. EC2)

```bash
npx dotenv -e .env -- npx ts-node --transpile-only scripts/academy-real/run-academy-real-sql.ts
```

### Producción (production)

Para ejecutar `scripts/production/run-production-sql.ts`, use el comando según sistema operativo:

#### Windows (PowerShell / CMD)

```bash
npx dotenv -e .env -- cmd /c "npx ts-node --transpile-only scripts/production/run-production-sql.ts"
```

#### Linux / Ubuntu (ej. EC2)

```bash
npx dotenv -e .env -- npx ts-node --transpile-only scripts/production/run-production-sql.ts
```

## Requisitos Previos

AsegÃºrese de tener instalado el siguiente software antes de comenzar:

- Node.js (v20 o superior recomendado)
- Docker Desktop (para servicios de infraestructura como Redis)
- MySQL 8.0
- npm (gestor de paquetes)

## InstalaciÃ³n y ConfiguraciÃ³n

Siga estos pasos para configurar el entorno de desarrollo local.

### 1. Clonar el repositorio y acceder al directorio

```bash
git clone <url-del-repositorio>
cd academia-pasalo/backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. ConfiguraciÃ³n de Variables de Entorno

El proyecto utiliza un archivo `.env` para gestionar la configuraciÃ³n. Se proporciona un archivo de plantilla con las claves necesarias.

```bash
cp .env.example .env
```

Abra el archivo `.env` reciÃ©n creado y complete los valores correspondientes a su entorno local (Base de Datos, Google OAuth, etc.).

### Storage provider (LOCAL vs GDRIVE)

El backend usa `STORAGE_PROVIDER` para definir donde guardar archivos.

- `STORAGE_PROVIDER=LOCAL`
  - recomendado para desarrollo y `npm run test:e2e`
  - no requiere credenciales de Google Drive
- `STORAGE_PROVIDER=GDRIVE`
  - recomendado para produccion
  - requiere:
    - `GOOGLE_APPLICATION_CREDENTIALS`
    - `GOOGLE_DRIVE_ROOT_FOLDER_ID`

### 4. Base de Datos (MySQL)

Este proyecto **NO** utiliza sincronizaciÃ³n automÃ¡tica (`synchronize: true`) por seguridad y control estricto del esquema.

1. Cree la base de datos `academia_pasalo` en su servidor MySQL.
2. Ejecute manualmente los scripts SQL ubicados en la raÃ­z del proyecto para crear las tablas y datos iniciales:
   - `creacion_tablas_academia_pasalo_v1.sql`
   - `datos_iniciales_academa_pasalo_v1.sql` (si aplica)

### 5. Servicios de Infraestructura (Docker)

El proyecto utiliza Docker Compose para gestionar servicios auxiliares como Redis.

**Iniciar Redis (Obligatorio para Auth y CachÃ©):**

```bash
docker compose up -d redis
```
Esto levantarÃ¡ una instancia de Redis 8.0 (Alpine) optimizada para cachÃ© y gestiÃ³n de sesiones.

### 6. Actualizar Base de Datos de GeoIP

Para las funcionalidades de seguridad y detecciÃ³n de ubicaciÃ³n, es necesario descargar la base de datos local de GeoIP.

```bash
npm run geoip:update
```

## EjecuciÃ³n del Proyecto

### Desarrollo (Watch Mode)

```bash
npm run start:dev
```
La API estarÃ¡ disponible en `http://localhost:3000/api/v1` (o el puerto configurado).

### ProducciÃ³n

```bash
npm run build
npm run start:prod
```

## Pruebas (Testing)

El proyecto cuenta con suites de pruebas unitarias y de extremo a extremo (E2E) para garantizar la calidad y seguridad.

```bash
# Pruebas Unitarias
npm run test

# Pruebas E2E normales (forzado a LOCAL)
npm run test:e2e

# Prueba E2E live de Drive (forzado a GDRIVE)
npm run test:e2e:drive-live
```

## Infraestructura y Futuro

Actualmente, la infraestructura Docker soporta:

- **Redis 8.0:** Utilizado para cachÃ© de alto rendimiento (Cache-Aside) y gestiÃ³n segura de sesiones distribuidas.

**PlanificaciÃ³n Futura:**
Se tiene previsto integrar los siguientes servicios en el contenedor de Docker para soportar la escalabilidad del sistema:

- **BullMQ:** Para el manejo de colas de tareas en segundo plano (emails, procesamiento de videos).
- **ELK Stack:** Para centralizaciÃ³n de logs y observabilidad avanzada.

## ContribuciÃ³n

Por favor, revise los archivos `CONTRIBUTING.md` y `arquitectura_deseable.txt` antes de realizar cambios. Se aplican reglas estrictas de estilo, tipado y arquitectura.

