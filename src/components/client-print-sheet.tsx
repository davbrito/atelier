import type { OrganizationAuthClient } from "@better-auth-ui/core/plugins/organization";
import { useAuth } from "@better-auth-ui/react";
import { useActiveOrganization } from "@better-auth-ui/react/plugins/organization";
import { createPortal } from "react-dom";
import { useIsHydrated } from "#/components/auth/use-is-hydrated";
import { BodyBlueprint } from "#/components/body-blueprint";
import { shortClientId } from "#/lib/format";
import {
  formatCm,
  getDartDifference,
  getPatternFraction,
  groupMeasurements,
} from "#/lib/measurement-derived";

type Props = {
  client: {
    id: string;
    name: string;
    notes: string | null;
    updatedAt: Date | string;
    measurements: { id: string; name: string; value: number }[];
  };
};

/**
 * Ficha técnica de taller: una sola hoja vertical en blanco y negro. Solo se ve
 * al imprimir; se monta como hijo directo de <body> para que el CSS de
 * impresión (`[data-print-sheet]` en styles.css) oculte el resto de la app.
 */
export function ClientPrintSheet({ client }: Props) {
  const isHydrated = useIsHydrated();
  if (!isHydrated) return null;
  return createPortal(<PrintSheet client={client} />, document.body);
}

function PrintSheet({ client }: Props) {
  const { authClient } = useAuth<OrganizationAuthClient>();
  const { data: organization } = useActiveOrganization(authClient);

  const sections = groupMeasurements(client.measurements);
  const dart = getDartDifference(client.measurements);
  const issuedAt = new Intl.DateTimeFormat("es-VE", { dateStyle: "long" }).format(
    new Date(client.updatedAt),
  );

  return (
    <div data-print-sheet className="hidden bg-white font-sans text-[9pt] text-black print:flex">
      <header className="flex items-end justify-between gap-4 border-black border-b-2 pb-2">
        <div>
          <p className="text-[7pt] uppercase tracking-[0.2em]">Ficha técnica de taller</p>
          <p className="font-heading text-[16pt] leading-tight">{organization?.name ?? "Taller"}</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 text-right text-[8.5pt]">
          <dt className="uppercase tracking-wide">Cliente</dt>
          <dd className="font-semibold">{client.name}</dd>
          <dt className="uppercase tracking-wide">ID</dt>
          <dd className="font-mono">{shortClientId(client)}</dd>
          <dt className="uppercase tracking-wide">Medidas al</dt>
          <dd>{issuedAt}</dd>
        </dl>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[45fr_55fr] gap-5 py-3">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="min-h-0" style={{ flex: "500 1 0" }}>
            <BodyBlueprint
              measurements={client.measurements}
              view="front"
              variant="print"
              dartText={dart?.text}
              className="h-full"
            />
          </div>
          <div className="min-h-0" style={{ flex: "335 1 0" }}>
            <BodyBlueprint
              measurements={client.measurements}
              view="back"
              variant="print"
              dartText={dart?.text}
              className="h-full"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <table className="w-full border-collapse text-[8.5pt] tabular-nums">
            <thead>
              <tr className="border-black border-b text-left text-[7pt] uppercase tracking-wide">
                <th className="py-1 font-semibold">Medida</th>
                <th className="py-1 text-right font-semibold">cm</th>
                <th className="py-1 pl-3 text-right font-semibold">Fracción</th>
              </tr>
            </thead>
            {sections.map((section) => (
              <tbody key={section.title}>
                <tr>
                  <th
                    colSpan={3}
                    className="pt-2 pb-0.5 text-left font-semibold text-[7pt] uppercase tracking-[0.15em]"
                  >
                    {section.title}
                  </th>
                </tr>
                {section.items.map((m) => {
                  const fraction = getPatternFraction(m.name, m.value);
                  return (
                    <tr key={m.id} className="border-black/40 border-b border-dotted">
                      <td className="py-[1.5pt]">{m.name}</td>
                      <td className="py-[1.5pt] text-right font-semibold">{formatCm(m.value)}</td>
                      <td className="py-[1.5pt] pl-3 text-right">
                        {fraction ? `${fraction.label}: ${fraction.text}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>

          {dart && (
            <div className="border-2 border-black px-3 py-2">
              <p className="font-semibold text-[7pt] uppercase tracking-[0.15em]">
                Diferencia de talles / Pinza
              </p>
              <p className="mt-1 text-[10pt] tabular-nums">
                {formatCm(dart.front.value)} − {formatCm(dart.back.value)} ={" "}
                <span className="font-bold text-[12pt]">{dart.text} cm</span>
              </p>
              <p className="text-[7pt]">
                Talle delantero − talle trasero: cm a cerrar en la pinza.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="border border-black px-3 py-2">
        <p className="font-semibold text-[7pt] uppercase tracking-[0.15em]">
          Observaciones de confección
        </p>
        {client.notes ? (
          <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-[9pt]">{client.notes}</p>
        ) : (
          <div className="mt-1 flex flex-col">
            {[0, 1, 2, 3].map((line) => (
              <div key={line} className="h-[6mm] border-black/50 border-b" />
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
