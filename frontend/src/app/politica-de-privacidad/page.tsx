import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Política de Privacidad | Pásalo",
  description:
    "Política de Privacidad de Academia Pásalo para el uso de la web y la plataforma educativa.",
};

export default function PoliticaDePrivacidadPage() {
  return (
    <LegalPageLayout
      eyebrow="Documento Legal"
      title="Política de Privacidad"
      summary="Explica qué datos tratamos, para qué los usamos y cómo protegemos la información de estudiantes, docentes y usuarios de la plataforma Pásalo."
      updatedAt="14 de abril de 2026"
    >
      <h2>1. Identidad del responsable</h2>
      <p>
        Academia Pásalo es responsable del tratamiento de los datos personales
        utilizados en su sitio web y en su plataforma educativa. Para consultas
        relacionadas con privacidad, tratamiento de datos o solicitudes de
        acceso, rectificación o eliminación, puedes escribir a{" "}
        <a href="mailto:info@pasaloacademia.pe">info@pasaloacademia.pe</a>.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <p>Dependiendo del uso de la plataforma, podemos tratar la siguiente información:</p>
      <ul>
        <li>Datos de identificación como nombre, apellidos, correo electrónico y foto de perfil.</li>
        <li>Datos académicos relacionados con cursos, evaluaciones, clases, materiales y notificaciones.</li>
        <li>Datos técnicos de sesión como identificadores de dispositivo, registros de acceso y eventos de seguridad.</li>
        <li>Datos operativos vinculados a Google Drive cuando un docente sube grabaciones o materiales.</li>
      </ul>

      <h2>3. Finalidad del tratamiento</h2>
      <p>Utilizamos los datos personales para:</p>
      <ul>
        <li>Permitir el inicio de sesión y la autenticación segura en la plataforma.</li>
        <li>Gestionar el acceso a cursos, clases, evaluaciones, materiales y grabaciones.</li>
        <li>Habilitar la subida de archivos y grabaciones a Google Drive cuando el flujo lo requiera.</li>
        <li>Enviar notificaciones académicas y operativas relevantes para el usuario.</li>
        <li>Prevenir fraudes, accesos no autorizados y usos indebidos del sistema.</li>
        <li>Mejorar el servicio, resolver incidencias y mantener trazabilidad operativa.</li>
      </ul>

      <h2>4. Base de uso y tratamiento</h2>
      <p>
        El tratamiento de datos se realiza para prestar el servicio educativo,
        administrar el acceso a la plataforma y ejecutar funcionalidades
        directamente solicitadas por el usuario, como autenticación, navegación,
        consulta de contenidos o carga de archivos.
      </p>

      <h2>5. Integración con Google</h2>
      <p>
        Cuando un usuario inicia sesión con Google o utiliza funciones de carga
        de archivos hacia Google Drive, Pásalo puede solicitar permisos mínimos
        necesarios para autenticar al usuario y operar archivos relacionados con
        la plataforma. No usamos estos permisos para acceder de manera general a
        todo el contenido del Drive del usuario.
      </p>

      <h2>6. Conservación de la información</h2>
      <p>
        Conservamos los datos durante el tiempo necesario para operar la
        plataforma, atender requerimientos académicos, mantener seguridad,
        cumplir obligaciones administrativas y resolver incidencias. Cuando los
        datos dejan de ser necesarios, se eliminan o bloquean según corresponda.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger la
        información contra accesos no autorizados, alteración, pérdida o uso
        indebido. Estas medidas incluyen control de acceso, validaciones de
        sesión, auditoría de eventos y separación de permisos por rol.
      </p>

      <h2>8. Compartición de información</h2>
      <p>
        No vendemos datos personales. La información puede ser tratada por
        proveedores tecnológicos que soportan la operación de la plataforma,
        siempre bajo el alcance necesario para prestar el servicio. Cuando una
        funcionalidad depende de Google, el intercambio se limita al flujo
        autorizado por el usuario y por los permisos configurados.
      </p>

      <h2>9. Derechos del usuario</h2>
      <p>El usuario puede solicitar información sobre sus datos y, cuando corresponda:</p>
      <ul>
        <li>Acceso a la información personal tratada.</li>
        <li>Corrección de datos inexactos o incompletos.</li>
        <li>Eliminación o restricción del tratamiento, según la naturaleza del servicio.</li>
        <li>Atención de consultas o reclamos relacionados con privacidad.</li>
      </ul>

      <h2>10. Cambios en esta política</h2>
      <p>
        Pásalo puede actualizar esta política para reflejar cambios normativos,
        operativos o funcionales en la plataforma. La versión vigente será la
        publicada en esta misma URL.
      </p>
    </LegalPageLayout>
  );
}
