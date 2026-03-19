# OAuth Produccion para Upload Browser-Direct a Drive

Documento operativo para llevar a produccion el flujo `frontend -> Google Drive` con cuentas Google externas (no Workspace interno unico).

## 1. Contexto

El upload de grabaciones funciona con:

1. Frontend solicita token OAuth de usuario.
2. Frontend crea sesion resumable en Drive.
3. Frontend sube binario directo a Drive.
4. Backend controla `start/status/heartbeat/finalize`.

Si la app OAuth queda en `Testing`:

1. Solo entran usuarios de prueba.
2. Aparece advertencia de app en pruebas/no verificada.
3. Hay que agregar usuarios manualmente.

## 2. Objetivo de produccion

Publicar la app OAuth para:

1. Eliminar dependencia de `test users`.
2. Habilitar acceso a profesores reales con cuenta Google.
3. Reducir friccion de consentimiento en cada onboarding.

## 3. Requisitos obligatorios en Google Cloud

## 3.1 Pantalla de consentimiento OAuth

1. Tipo de usuario: `External`.
2. Informacion de marca completa:
   - nombre de app
   - correo de soporte
   - correo de contacto de desarrollador
3. Dominios autorizados correctos.

## 3.2 Scopes

Mantener minimo necesario:

1. `openid`
2. `email`
3. `profile`
4. `https://www.googleapis.com/auth/drive.file`

## 3.3 OAuth client Web

Verificar en el cliente usado por frontend:

1. `Authorized JavaScript origins` incluye:
   - `http://localhost:3000` (dev)
   - dominio(s) productivo(s), por ejemplo:
     - `https://academiapasalo.com`
     - `https://www.academiapasalo.com` (si aplica)

## 3.4 URLs publicas obligatorias

Para publicar/verificar en produccion se requieren URLs publicas:

1. Pagina principal de aplicacion.
2. Politica de privacidad.
3. Terminos y condiciones.

Sin estas URLs la publicacion/verificacion puede ser rechazada o quedar incompleta.

## 4. Que problema resuelve pasar a produccion

Pasa de:

1. manejo manual de usuarios de prueba
2. advertencias de app en pruebas para todos

A:

1. acceso abierto a usuarios externos autorizables por Google OAuth
2. operacion escalable para profesores sin alta manual uno a uno en `test users`

Nota:

1. Puede seguir apareciendo consentimiento inicial la primera vez por usuario/scope.
2. Eso es normal de OAuth y no implica fallo.

## 5. Contenido general recomendado de las paginas legales

## 5.1 Politica de privacidad (minimo)

1. Datos recolectados (email, perfil, identificadores de archivo Drive usados por la plataforma).
2. Finalidad del tratamiento (autenticacion, subida/publicacion de grabaciones, notificaciones).
3. Base operativa de almacenamiento/procesamiento.
4. Tiempo de retencion y eliminacion de datos.
5. Medidas de seguridad generales.
6. Canal de contacto para solicitudes de privacidad.

## 5.2 Terminos y condiciones (minimo)

1. Reglas de uso de la plataforma.
2. Responsabilidades del usuario.
3. Uso permitido/prohibido de contenidos.
4. Limitaciones de responsabilidad.
5. Causales de suspension/cierre de acceso.
6. Vigencia y cambios de terminos.
7. Canal de contacto.

## 6. Checklist de go-live OAuth

1. Confirmar proyecto GCP propietario del `GOOGLE_CLIENT_ID` activo.
2. Confirmar que frontend y backend usan el mismo client id esperado.
3. Completar consentimiento OAuth (marca + scopes + dominios + URLs legales).
4. Publicar app (estado `Production`).
5. Validar login Google en entorno productivo.
6. Validar upload real corto y luego largo.
7. Monitorear errores OAuth (`403`, `access_denied`, `unauthorized_client`).

## 7. Relacion con permisos Drive por grupos

OAuth y grupos Drive son capas distintas y ambas son obligatorias:

1. OAuth autoriza a la app a actuar en nombre del profesor.
2. Grupos/permisos Drive autorizan al profesor sobre carpeta destino.

Si falta cualquiera:

1. con OAuth correcto y sin permiso Drive writer -> upload falla por permisos.
2. con permisos Drive correctos y OAuth en testing/restringido -> usuario bloqueado por consentimiento/politica.
