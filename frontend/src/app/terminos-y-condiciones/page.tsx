import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Pásalo",
  description:
    "Términos y condiciones de uso de la web y la plataforma educativa de Academia Pásalo.",
};

export default function TerminosYCondicionesPage() {
  return (
    <LegalPageLayout
      eyebrow="Documento Legal"
      title="Términos y Condiciones"
      summary="Regulan el acceso y uso de la plataforma, los contenidos académicos y las funcionalidades digitales ofrecidas por Academia Pásalo."
      updatedAt="14 de abril de 2026"
    >
      <h2>1. Aceptación de los términos</h2>
      <p>
        Al acceder al sitio web o a la plataforma de Pásalo, el usuario acepta
        estos términos y condiciones. Si no está de acuerdo con ellos, debe
        abstenerse de utilizar el servicio.
      </p>

      <h2>2. Objeto del servicio</h2>
      <p>
        Pásalo ofrece una plataforma de apoyo académico que puede incluir
        autenticación, acceso a cursos, materiales, clases grabadas, calendario,
        evaluaciones, notificaciones y herramientas para gestión de contenido.
      </p>

      <h2>3. Requisitos de acceso</h2>
      <ul>
        <li>El usuario debe proporcionar información auténtica y actualizada.</li>
        <li>El acceso a determinadas áreas depende del rol asignado dentro de la plataforma.</li>
        <li>Algunas funciones pueden requerir autenticación mediante Google.</li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>El usuario se compromete a utilizar la plataforma únicamente para fines legítimos y académicos. Esto incluye:</p>
      <ul>
        <li>Acceder a contenidos autorizados según su rol y matrícula.</li>
        <li>Usar materiales, grabaciones y recursos dentro del marco educativo del servicio.</li>
        <li>Respetar las restricciones técnicas y de acceso establecidas por la plataforma.</li>
      </ul>

      <h2>5. Uso prohibido</h2>
      <p>No está permitido:</p>
      <ul>
        <li>Compartir accesos, tokens, enlaces privados o contenido restringido con terceros no autorizados.</li>
        <li>Intentar vulnerar la seguridad, manipular sesiones o eludir controles de acceso.</li>
        <li>Subir archivos ilícitos, maliciosos o que vulneren derechos de terceros.</li>
        <li>Reproducir, redistribuir o comercializar contenidos de la plataforma sin autorización.</li>
      </ul>

      <h2>6. Contenido y propiedad intelectual</h2>
      <p>
        Los materiales, grabaciones, documentos, marcas, diseños y demás
        contenidos disponibles en la plataforma pertenecen a Pásalo o a sus
        respectivos titulares. Su uso está limitado al contexto autorizado por
        la academia y por la propia plataforma.
      </p>

      <h2>7. Responsabilidad del usuario</h2>
      <p>
        Cada usuario es responsable por la actividad realizada con su cuenta, por
        la veracidad de la información que proporciona y por el uso que haga de
        los recursos académicos y tecnológicos habilitados.
      </p>

      <h2>8. Suspensión o restricción de acceso</h2>
      <p>
        Pásalo podrá restringir, suspender o cancelar accesos cuando detecte
        incumplimientos de estos términos, uso indebido, riesgos de seguridad,
        requerimientos operativos o decisiones administrativas justificadas.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        Pásalo realiza esfuerzos razonables para mantener la disponibilidad y
        seguridad del servicio, pero no garantiza operación ininterrumpida ni
        ausencia absoluta de errores. La plataforma también puede depender de
        servicios de terceros, como Google, para ciertas funcionalidades.
      </p>

      <h2>10. Modificaciones</h2>
      <p>
        Estos términos pueden actualizarse para reflejar cambios funcionales,
        regulatorios o de operación. La versión vigente será la publicada en
        esta URL y entrará en efecto desde su publicación.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para consultas relacionadas con estos términos o con el uso de la
        plataforma, puedes escribir a{" "}
        <a href="mailto:info@pasaloacademia.pe">info@pasaloacademia.pe</a>.
      </p>
    </LegalPageLayout>
  );
}
