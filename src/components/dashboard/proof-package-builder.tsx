"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMPONENTS, DEFAULT_COST_ROWS, emptyPackage, newId, normalizePackage, REPORT_TYPES, usedFileIds, type AttachedDoc, type ComponentId, type ProofPackage, type StoredFile } from "@/lib/proof-package/model";
import { buildReportHtml, formatDate, isIllinois, iwsInput, reportFileName, starterCodes, type ReportFile } from "@/lib/proof-package/report";
import { describeMagnitude, formatCentralTime, KIND_LABEL, type NearbyReport } from "@/lib/proof-package/storms";
import { sanitizeVentInput, ventilation } from "@/lib/proof-package/ventilation";
import { CLADDING, FRAMING, iceBarrier } from "@/lib/proof-package/ice-barrier";
import { ST_LOUIS_COUNTY_JURISDICTION, ST_LOUIS_COUNTY_LIBRARY } from "@/lib/proof-package/code-library";
import { TOOLS } from "@/lib/proof-package/tools";
import { deleteDraft, listDrafts, loadDraft, saveDraft, type DraftSummary } from "@/lib/proof-package/drafts";
import { certificatePages, logoDataUrl, MAX_PDF_PAGES, pdfToPages, photoToStored } from "@/lib/proof-package/browser-files";
import { Area, btnLine, btnMain, Card, Check, Pick, small, Sub, Text, ToolLink } from "./proof-package-fields";

// Evidence package builder (owner dashboard), laid out like Mike's own evidence package. Photos and documents never
// leave this computer: they are shrunk in the browser and saved as drafts in this browser only. The only request that
// leaves the page is the storm lookup, which sends the address and date of loss to this site's own
// /dashboard/proof-package/storms route. The outside tools (hail maps, measurements, calculators) are links only.

type SaveState = "saved" | "saving" | "unsaved" | "error";

const SHINGLE_SYSTEMS = ["Owens Corning Duration", "Owens Corning Duration Tru-Def", "CertainTeed Landmark", "TAMKO Heritage", "IKO Dynasty"];

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const type = /data:([^;]+)/.exec(head)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

const JUMPS = [
  ["cover", "Cover"], ["damage", "Damage"], ["photos", "Photos"], ["weather", "Weather"], ["code", "Code"], ["scope", "Scope & cost"], ["attachments", "Attachments"],
] as const;

export default function ProofPackageBuilder() {
  const [pkg, setPkg] = useState<ProofPackage>(() => emptyPackage(new Date(), starterCodes()));
  const [files, setFiles] = useState<Record<string, StoredFile>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [stormState, setStormState] = useState<{ loading: boolean; error: string | null; unread: string[] }>({ loading: false, error: null, unread: [] });
  const unsaved = useRef<Map<string, StoredFile>>(new Map());
  const urlsRef = useRef<Record<string, string>>({});
  const frame = useRef<HTMLIFrameElement>(null);
  const pendingPrint = useRef(false);

  // The logo as inline image data, so the preview and the downloaded file never depend on the page's address.
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => { logoDataUrl().then(setLogo).catch(() => setLogo(null)); }, []);

  const refreshDrafts = useCallback(() => {
    listDrafts().then(setDrafts).catch(() => setDrafts([]));
  }, []);
  useEffect(refreshDrafts, [refreshDrafts]);

  // Free the in-page image links when the page closes.
  useEffect(() => () => { for (const u of Object.values(urlsRef.current)) URL.revokeObjectURL(u); }, []);

  const addFiles = useCallback((list: StoredFile[]) => {
    const made: Record<string, string> = {};
    for (const f of list) {
      made[f.id] = URL.createObjectURL(dataUrlToBlob(f.dataUrl));
      unsaved.current.set(f.id, f);
    }
    urlsRef.current = { ...urlsRef.current, ...made };
    setUrls((u) => ({ ...u, ...made }));
    setFiles((cur) => ({ ...cur, ...Object.fromEntries(list.map((f) => [f.id, f])) }));
  }, []);

  const update = useCallback((fn: (p: ProofPackage) => ProofPackage) => {
    setPkg((p) => ({ ...fn(p), updatedAt: new Date().toISOString() }));
    setDirty(true);
    setSaveState("unsaved");
  }, []);
  const set = <K extends keyof ProofPackage>(key: K, value: ProofPackage[K]) => update((p) => ({ ...p, [key]: value }));
  const setIn = <K extends "iws" | "ventilation" | "manufacturer" | "scope" | "hailMap" | "storm" | "codes">(key: K, patch: Partial<ProofPackage[K]>) =>
    update((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  const setComponent = (id: ComponentId, patch: Partial<ProofPackage["components"][ComponentId]>) =>
    update((p) => ({ ...p, components: { ...p.components, [id]: { ...p.components[id], ...patch } } }));

  // Autosave 1.5 s after the last change.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      setSaveState("saving");
      const fresh = [...unsaved.current.values()];
      saveDraft(pkg, fresh, usedFileIds(pkg))
        .then(() => {
          for (const f of fresh) unsaved.current.delete(f.id);
          setDirty(false);
          setSaveState("saved");
          refreshDrafts();
        })
        .catch((e: Error) => { setSaveState("error"); setProblem(e.message); });
    }, 1500);
    return () => clearTimeout(t);
  }, [pkg, dirty, refreshDrafts]);

  function resetTo(next: ProofPackage, nextFiles: StoredFile[]) {
    for (const u of Object.values(urlsRef.current)) URL.revokeObjectURL(u);
    urlsRef.current = {};
    unsaved.current = new Map();
    setUrls({});
    setFiles({});
    setPkg(next);
    setDirty(false);
    setSaveState("saved");
    setStormState({ loading: false, error: null, unread: [] });
    if (nextFiles.length) {
      addFiles(nextFiles);
      unsaved.current = new Map();
    }
  }

  async function openDraft(id: string) {
    if (!id || id === pkg.id) return;
    setBusy("Opening the draft…");
    try {
      const d = await loadDraft(id);
      if (d) resetTo(normalizePackage(d.pkg, starterCodes()), d.files);
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removeDraft() {
    if (!window.confirm("Remove this draft and its photos from this computer? This can't be undone.")) return;
    await deleteDraft(pkg.id).catch(() => undefined);
    resetTo(emptyPackage(new Date(), starterCodes()), []);
    refreshDrafts();
  }

  async function onPhotos(list: FileList | null) {
    if (!list?.length) return;
    setProblem(null);
    const made: StoredFile[] = [];
    const errors: string[] = [];
    for (let i = 0; i < list.length; i++) {
      setBusy(`Adding photo ${i + 1} of ${list.length}…`);
      try { made.push(await photoToStored(list[i])); } catch (e) { errors.push((e as Error).message); }
    }
    made.sort((a, b) => (a.takenAt ?? "").localeCompare(b.takenAt ?? ""));
    addFiles(made);
    update((p) => ({ ...p, photos: [...p.photos, ...made.map((f) => ({ id: newId(), fileId: f.id, section: "shingles" as ComponentId, caption: "" }))] }));
    setBusy(null);
    if (errors.length) setProblem(errors.join(" "));
  }

  async function onDocuments(list: FileList | null) {
    if (!list?.length) return;
    setProblem(null);
    const errors: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setBusy(`Reading ${file.name}…`);
      try {
        let doc: AttachedDoc;
        if (/pdf/i.test(file.type) || /\.pdf$/i.test(file.name)) {
          const { pages, total } = await pdfToPages(file);
          addFiles(pages);
          doc = { id: newId(), title: file.name.replace(/\.pdf$/i, ""), source: "", pageFileIds: pages.map((pg) => pg.id), originalName: file.name, pagesTotal: total };
        } else {
          const img = await photoToStored(file);
          addFiles([img]);
          doc = { id: newId(), title: file.name.replace(/\.[a-z0-9]+$/i, ""), source: "", pageFileIds: [img.id], originalName: file.name, pagesTotal: 1 };
        }
        update((p) => ({ ...p, documents: [...p.documents, doc] }));
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    setBusy(null);
    if (errors.length) setProblem(errors.join(" "));
  }

  async function addCertificates() {
    setProblem(null);
    setBusy("Adding the certificates…");
    try {
      const { pages, total } = await certificatePages();
      addFiles(pages);
      const doc: AttachedDoc = { id: newId(), title: "Inspector certifications (Building Experts Institute)", source: "Building Experts Institute", pageFileIds: pages.map((pg) => pg.id), originalName: "Building Experts Institute certificates", pagesTotal: total };
      update((p) => ({ ...p, documents: [doc, ...p.documents] }));
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function findStorms() {
    const address = [pkg.address, pkg.cityStateZip].filter((s) => s.trim()).join(", ");
    if (!pkg.dateOfLoss) { setStormState({ loading: false, error: "Enter the storm event date first.", unread: [] }); return; }
    setStormState({ loading: true, error: null, unread: [] });
    try {
      const coords = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(pkg.storm.coords);
      const where: Record<string, string> = coords ? { lat: coords[1], lon: coords[2] } : { address };
      const q = new URLSearchParams({ ...where, date: pkg.dateOfLoss, radius: String(pkg.storm.radiusMiles), span: String(pkg.storm.span) });
      // Built from location.origin so it also works when the page was opened with the password in the address.
      const res = await fetch(`${window.location.origin}/dashboard/proof-package/storms?${q}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setStormState({ loading: false, error: typeof body.error === "string" ? body.error : "The storm lookup did not work. Try again in a minute.", unread: [] }); return; }
      const reports = (body.reports ?? []) as NearbyReport[];
      update((p) => ({ ...p, storm: { ...p.storm, place: body.place, reports, selected: reports.map((r) => r.id), lookedUpAt: body.checkedAt } }));
      setStormState({ loading: false, error: null, unread: Array.isArray(body.unread) ? body.unread : [] });
    } catch {
      setStormState({ loading: false, error: "The storm lookup did not answer. Check the internet connection and try again.", unread: [] });
    }
  }

  const reportFiles = useCallback((src: (f: StoredFile) => string): Record<string, ReportFile> => {
    const out: Record<string, ReportFile> = {};
    for (const f of Object.values(files)) out[f.id] = { src: src(f), takenAt: f.takenAt, width: f.width, height: f.height };
    return out;
  }, [files]);

  const previewHtml = useMemo(() => (tab === "preview"
    ? buildReportHtml(pkg, { files: reportFiles((f) => urls[f.id] ?? ""), logoSrc: logo, generatedAt: new Date() })
    : ""), [tab, pkg, reportFiles, urls, logo]);

  // Print from the preview frame once it (and its photos) has loaded; the browser's print window can save a PDF.
  function printReport() {
    const win = frame.current?.contentWindow;
    if (tab === "preview" && win) { win.focus(); win.print(); return; }
    pendingPrint.current = true;
    setTab("preview");
  }
  function onFrameLoad() {
    if (!pendingPrint.current) return;
    pendingPrint.current = false;
    const win = frame.current?.contentWindow;
    if (win) { win.focus(); win.print(); }
  }

  async function downloadHtml() {
    setBusy("Building the report file…");
    try {
      const html = buildReportHtml(pkg, { files: reportFiles((f) => f.dataUrl), logoSrc: logo ?? (await logoDataUrl()), generatedAt: new Date() });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = reportFileName(pkg);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } finally {
      setBusy(null);
    }
  }

  function loadCountyChecklist() {
    update((p) => {
      const have = new Set(p.codes.items.map((c) => c.id));
      const added = ST_LOUIS_COUNTY_LIBRARY.filter((c) => !have.has(c.id)).map((c) => ({ ...c, include: false }));
      return { ...p, codes: { ...p.codes, jurisdiction: p.codes.jurisdiction.trim() || ST_LOUIS_COUNTY_JURISDICTION, items: [...added, ...p.codes.items] } };
    });
  }

  const vent = ventilation(sanitizeVentInput({ ...pkg.ventilation }));
  const ventArea = Number(pkg.ventilation.atticSqFt.replace(/,/g, ""));
  const ice = pkg.iws.include ? iceBarrier(iwsInput(pkg)) : null;
  const il = isIllinois(pkg.cityStateZip);
  const selected = new Set(pkg.storm.selected);
  const photoCount = pkg.photos.length;
  const countyIceConflict = pkg.iws.include && (/st\.? louis county/i.test(pkg.codes.jurisdiction) || pkg.codes.items.some((c) => c.id.startsWith("slco-") && c.include));
  const countyIceTicked = pkg.codes.items.some((c) => c.id === "slco-ice-barrier" && c.include);

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Builder view" className="flex rounded-full border border-zinc-300 p-1">
            {(["edit", "preview"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)}
                className={`min-h-9 rounded-full px-4 text-sm font-bold ${tab === t ? "bg-brand-ink text-white" : "text-brand-ink"}`}>{t === "edit" ? "Edit" : "Preview"}</button>
            ))}
          </div>
          <button type="button" className={btnLine} onClick={printReport}>Print or save as PDF</button>
          <button type="button" className={btnMain} onClick={downloadHtml} disabled={!!busy}>Download report (.html)</button>
          <span className="ml-auto text-xs text-zinc-600" aria-live="polite">
            {saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Not saved yet" : saveState === "error" ? "Not saved" : "Saved on this computer"}
          </span>
        </div>
        {tab === "edit" && (
          <nav aria-label="Jump to a section" className="mt-2 flex gap-1 overflow-x-auto text-xs font-bold">
            {JUMPS.map(([id, label]) => <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-3 py-1 text-brand-ink hover:bg-brand-light">{label}</a>)}
          </nav>
        )}
        {busy && <p className="mt-2 text-sm font-bold text-brand-ink" role="status">{busy}</p>}
        {problem && <p className="mt-2 rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-900" role="alert">{problem} <button type="button" className="underline" onClick={() => setProblem(null)}>Dismiss</button></p>}
      </div>

      {tab === "preview" ? (
        <div>
          <p className="mb-2 text-sm text-zinc-600">This is the report as it prints. To save a PDF, choose &quot;Save as PDF&quot; in the print window.</p>
          <iframe ref={frame} onLoad={onFrameLoad} title="Report preview" srcDoc={previewHtml} sandbox="allow-same-origin allow-modals" className="h-[80vh] w-full rounded-xl border border-zinc-300 bg-zinc-100" />
        </div>
      ) : (
        <>
          <Card title="Drafts" hint="Everything is saved in this browser on this computer only. Photos are never uploaded.">
            <div className="flex flex-wrap items-end gap-2">
              <label className="block flex-1 text-sm font-bold">Open a draft
                <select className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 font-normal" value={drafts.some((d) => d.id === pkg.id) ? pkg.id : ""} onChange={(e) => openDraft(e.target.value)}>
                  <option value="">{drafts.some((d) => d.id === pkg.id) ? "" : "This new package"}</option>
                  {drafts.map((d) => <option key={d.id} value={d.id}>{d.address} · {formatCentralTime(d.updatedAt)} · {d.photos} photo{d.photos === 1 ? "" : "s"}</option>)}
                </select>
              </label>
              <button type="button" className={btnLine} onClick={() => resetTo(emptyPackage(new Date(), starterCodes()), [])}>New package</button>
              <button type="button" className={btnLine} onClick={removeDraft}>Remove this draft</button>
            </div>
          </Card>

          <Card id="cover" title="1. Cover, purpose and opinion" hint="The first page: who it's for, the property, the dates, why the report exists and the overall construction opinion.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Pick label="Damage type" value={pkg.reportType} onChange={(v) => set("reportType", v as ProofPackage["reportType"])} options={REPORT_TYPES} />
              <Text label="Prepared for (insurance company)" value={pkg.preparedFor} onChange={(v) => set("preparedFor", v)} />
              <Text label="Homeowner name" value={pkg.owner} onChange={(v) => set("owner", v)} />
              <Text label="Street address" value={pkg.address} onChange={(v) => set("address", v)} placeholder="123 Main St" />
              <Text label="City, state and ZIP" value={pkg.cityStateZip} onChange={(v) => set("cityStateZip", v)} placeholder="St. Louis, MO 63129" />
              <Text label="Claim number" value={pkg.claimNumber} onChange={(v) => set("claimNumber", v)} max={60} />
              <Text label="Structure type" value={pkg.structureType} onChange={(v) => set("structureType", v)} placeholder="single-family brick and vinyl siding residence" />
              <Text label="Roof system" value={pkg.roofSystem} onChange={(v) => set("roofSystem", v)} placeholder={'gable-style asphalt shingle roof, ~5:12 pitch, 5" gutters'} />
              <Text label="Storm event date (date of loss)" type="date" value={pkg.dateOfLoss} onChange={(v) => set("dateOfLoss", v)} />
              <div className="grid grid-cols-2 gap-2">
                <Text label="Inspection date" type="date" value={pkg.inspectionDate} onChange={(v) => set("inspectionDate", v)} />
                <Text label="Last inspection day" type="date" value={pkg.inspectionDateEnd} onChange={(v) => set("inspectionDateEnd", v)} />
              </div>
              <Text label="Prepared by" value={pkg.preparedBy} onChange={(v) => set("preparedBy", v)} placeholder="Mike Williamson" />
              <Text label="Report date" type="date" value={pkg.preparedOn} onChange={(v) => set("preparedOn", v)} />
              <Text label="Phone on the report" value={pkg.phone} onChange={(v) => set("phone", v)} placeholder={il ? "618-612-5192" : "314-202-7663"} max={40} />
              <Text label="Email on the report" type="email" value={pkg.email} onChange={(v) => set("email", v)} max={120} />
            </div>
            {il && (
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="note">
                <strong>Illinois property:</strong> we don&apos;t offer roofing in Illinois until the Illinois roofing license is issued. Keep this report to siding,
                gutters, soffit and fascia, and change the scope so it does not offer roof work. The report uses the Illinois number.
              </p>
            )}
            <Area label="Purpose of this report" hint="Lines starting with - become bullets. {prepared for}, {address}, {date of loss} and {inspection date} fill in." value={pkg.purpose} onChange={(v) => set("purpose", v)} rows={7} />
            <Area label="Construction opinion: what the roof system shows (one per line)" hint="For example: Shows functional hail damage across multiple test squares on the front slope (16–20 hits per 10' x 10')." value={pkg.opinionFindings} onChange={(v) => set("opinionFindings", v)} rows={5} />
            <Area label="Construction opinion: conclusion" value={pkg.opinionConclusion} onChange={(v) => set("opinionConclusion", v)} rows={4} />
          </Card>

          <Card id="damage" title="2. Inspection-based damage summary" hint="One part per component. Findings are one per line and print as bullets; parts left empty are left out.">
            {COMPONENTS.map((c) => (
              <Sub key={c.id} title={c.label}>
                {c.id === "shingles" && (
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-600">Test squares: hits counted in a 10 ft by 10 ft square on each slope. Rows with no count or notes are left out.</p>
                    {pkg.testSquares.map((t, i) => (
                      <div key={t.id} className="grid gap-2 sm:grid-cols-[1fr_8rem_2fr_auto] sm:items-end">
                        <Text label="Slope" value={t.slope} onChange={(v) => update((p) => ({ ...p, testSquares: p.testSquares.map((x, j) => (j === i ? { ...x, slope: v } : x)) }))} max={40} />
                        <Text label="Hits" value={t.hits} onChange={(v) => update((p) => ({ ...p, testSquares: p.testSquares.map((x, j) => (j === i ? { ...x, hits: v } : x)) }))} max={20} />
                        <Text label="Notes" value={t.notes} onChange={(v) => update((p) => ({ ...p, testSquares: p.testSquares.map((x, j) => (j === i ? { ...x, notes: v } : x)) }))} />
                        <button type="button" className={small} onClick={() => update((p) => ({ ...p, testSquares: p.testSquares.filter((_, j) => j !== i) }))}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className={small} onClick={() => update((p) => ({ ...p, testSquares: [...p.testSquares, { id: newId(), slope: "", hits: "", notes: "" }] }))}>Add a slope</button>
                  </div>
                )}
                <Area label={`${c.label}: findings (one per line)`} value={pkg.components[c.id].findings} onChange={(v) => setComponent(c.id, { findings: v })} rows={3} />
                <Area label={`${c.label}: what it means`} value={pkg.components[c.id].notes} onChange={(v) => setComponent(c.id, { notes: v })} rows={2} />
              </Sub>
            ))}
          </Card>

          <Card id="photos" title={`Photos (${photoCount})`} hint="Shrunk to print size on this computer and sorted by the time the camera recorded. Give each a component and a caption; they print as the photo report, numbered by component.">
            <label className={`${btnMain} cursor-pointer`}>
              Add photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { onPhotos(e.target.files); e.target.value = ""; }} />
            </label>
            <ul className="space-y-3">
              {pkg.photos.map((ph, i) => {
                const f = files[ph.fileId];
                return (
                  <li key={ph.id} className="grid gap-3 rounded-xl border border-zinc-200 p-3 sm:grid-cols-[9rem_1fr]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- in-browser photo, never uploaded */}
                    {urls[ph.fileId] ? <img src={urls[ph.fileId]} alt={ph.caption || `Photo ${i + 1}`} className="h-28 w-36 rounded-lg bg-zinc-100 object-cover" /> : <div className="h-28 w-36 rounded-lg bg-zinc-100" />}
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-600">Photo {i + 1}{f?.takenAt ? ` · taken ${formatDate(f.takenAt.slice(0, 10))} ${f.takenAt.slice(11, 16)}` : " · no date in the file"}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Pick label="Component" value={ph.section} onChange={(v) => update((p) => ({ ...p, photos: p.photos.map((x) => (x.id === ph.id ? { ...x, section: v as ComponentId } : x)) }))} options={COMPONENTS} />
                        <Text label="Caption" value={ph.caption} onChange={(v) => update((p) => ({ ...p, photos: p.photos.map((x) => (x.id === ph.id ? { ...x, caption: v } : x)) }))} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={small} disabled={i === 0} onClick={() => update((p) => { const a = [...p.photos]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { ...p, photos: a }; })}>Move up</button>
                        <button type="button" className={small} disabled={i === photoCount - 1} onClick={() => update((p) => { const a = [...p.photos]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return { ...p, photos: a }; })}>Move down</button>
                        <button type="button" className={small} onClick={() => update((p) => ({ ...p, photos: p.photos.filter((x) => x.id !== ph.id) }))}>Remove</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card id="weather" title="3. Weather / hail impact summary" hint="The Interactive Hail Maps report, NOAA storm reports for the date of loss, and how the storm matches the damage.">
            <Sub title="Interactive Hail Maps report">
              <div className="flex flex-wrap gap-2"><ToolLink href={TOOLS.hailMaps.url}>Open {TOOLS.hailMaps.label}</ToolLink></div>
              <p className="text-sm text-zinc-600">Run the Hail Impact Report there, attach its PDF under Attachments, and copy its numbers here.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Text label="Report number" value={pkg.hailMap.reportNumber} onChange={(v) => setIn("hailMap", { reportNumber: v })} max={60} />
                <Text label="Verification code" value={pkg.hailMap.verificationCode} onChange={(v) => setIn("hailMap", { verificationCode: v })} max={40} />
                <Text label="Report date" type="date" value={pkg.hailMap.reportDate} onChange={(v) => setIn("hailMap", { reportDate: v })} />
              </div>
              {pkg.hailMap.rows.map((r, i) => (
                <div key={r.id} className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr_1fr_1fr_auto] sm:items-end">
                  <Text label="Map date" type="date" value={r.date} onChange={(v) => setIn("hailMap", { rows: pkg.hailMap.rows.map((x, j) => (j === i ? { ...x, date: v } : x)) })} />
                  <Text label="At location" value={r.atLocation} onChange={(v) => setIn("hailMap", { rows: pkg.hailMap.rows.map((x, j) => (j === i ? { ...x, atLocation: v } : x)) })} placeholder='0.75"' max={20} />
                  <Text label="Within 1 mi" value={r.within1} onChange={(v) => setIn("hailMap", { rows: pkg.hailMap.rows.map((x, j) => (j === i ? { ...x, within1: v } : x)) })} max={20} />
                  <Text label="Within 3 mi" value={r.within3} onChange={(v) => setIn("hailMap", { rows: pkg.hailMap.rows.map((x, j) => (j === i ? { ...x, within3: v } : x)) })} max={20} />
                  <Text label="Within 10 mi" value={r.within10} onChange={(v) => setIn("hailMap", { rows: pkg.hailMap.rows.map((x, j) => (j === i ? { ...x, within10: v } : x)) })} max={20} />
                  <button type="button" className={small} onClick={() => setIn("hailMap", { rows: pkg.hailMap.rows.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              <button type="button" className={small} onClick={() => setIn("hailMap", { rows: [...pkg.hailMap.rows, { id: newId(), date: "", atLocation: "", within1: "", within3: "", within10: "" }] })}>Add a storm date</button>
              <Area label="Hail map notes (optional)" value={pkg.hailMap.notes} onChange={(v) => setIn("hailMap", { notes: v })} rows={2} />
            </Sub>
            <Sub title="NOAA storm reports">
              <p className="text-sm text-zinc-600">Finds NOAA storm reports (hail, damaging wind, tornado) near the address around the storm date. Sends only the address and date to the lookup.</p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-sm font-bold">Search within
                  <select className="mt-1 block min-h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal" value={pkg.storm.radiusMiles} onChange={(e) => setIn("storm", { radiusMiles: Number(e.target.value) })}>
                    {[3, 5, 10, 15, 25].map((m) => <option key={m} value={m}>{m} miles</option>)}
                  </select>
                </label>
                <label className="block text-sm font-bold">Days
                  <select className="mt-1 block min-h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal" value={pkg.storm.span} onChange={(e) => setIn("storm", { span: Number(e.target.value) })}>
                    <option value={0}>Storm date only</option>
                    <option value={1}>1 day either side</option>
                    <option value={2}>2 days either side</option>
                  </select>
                </label>
                <label className="block text-sm font-bold">Map coordinates (optional)
                  <input className="mt-1 block min-h-11 w-48 rounded-lg border border-zinc-300 bg-white px-3 font-normal" value={pkg.storm.coords} maxLength={40} placeholder="38.5123, -90.3345" onChange={(e) => setIn("storm", { coords: e.target.value })} />
                </label>
                <button type="button" className={btnMain} onClick={findStorms} disabled={stormState.loading}>{stormState.loading ? "Searching…" : "Find storm reports"}</button>
              </div>
              <p className="text-xs text-zinc-600">Coordinates are used instead of the address when filled in (right-click the house in Google Maps to copy them).</p>
              {stormState.error && <p className="text-sm text-red-800" role="alert">{stormState.error}</p>}
              {stormState.unread.length > 0 && <p className="text-sm text-amber-900">Some days could not be read and may be missing: {stormState.unread.join(", ")}. Try again later.</p>}
              {pkg.storm.place && (
                <div>
                  <p className="text-sm text-zinc-700">Location used: <strong>{pkg.storm.place.matched}</strong>. {pkg.storm.reports.length} report{pkg.storm.reports.length === 1 ? "" : "s"} within {pkg.storm.radiusMiles} miles. Ticked reports go in the report.</p>
                  {pkg.storm.reports.length > 0 && (
                    <div className="mt-2 max-h-80 overflow-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead><tr className="text-xs uppercase text-zinc-600"><th className="py-1 pr-2"><span className="sr-only">Include</span></th><th className="py-1 pr-3">Type</th><th className="py-1 pr-3">Size / speed</th><th className="py-1 pr-3">Time (Central)</th><th className="py-1 pr-3">Distance</th><th className="py-1">Near</th></tr></thead>
                        <tbody>
                          {pkg.storm.reports.map((r) => (
                            <tr key={r.id} className="border-t border-zinc-100 align-top">
                              <td className="py-1 pr-2"><input type="checkbox" className="h-5 w-5" aria-label={`Include ${KIND_LABEL[r.kind]} ${r.miles} miles ${r.direction}`} checked={selected.has(r.id)}
                                onChange={(e) => setIn("storm", { selected: e.target.checked ? [...pkg.storm.selected, r.id] : pkg.storm.selected.filter((x) => x !== r.id) })} /></td>
                              <td className="py-1 pr-3">{KIND_LABEL[r.kind]}</td>
                              <td className="py-1 pr-3 whitespace-nowrap">{describeMagnitude(r)}</td>
                              <td className="py-1 pr-3 whitespace-nowrap">{formatCentralTime(r.at)}</td>
                              <td className="py-1 pr-3 whitespace-nowrap">{r.miles} mi {r.direction}</td>
                              <td className="py-1">{r.location}, {r.county} Co.</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Sub>
            <Sub title="Correlation with observed damage">
              <Area label="How the storm matches the damage" value={pkg.correlation} onChange={(v) => set("correlation", v)} rows={5} />
            </Sub>
          </Card>

          <Card id="code" title="4. Code & manufacturer requirements" hint="Tick only what applies to this job. Counties and cities adopt different code editions and local changes, so check before ticking. Every item's wording can be edited.">
            <Sub title="Code requirements">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={small} onClick={loadCountyChecklist}>Add the St. Louis County re-roofing checklist items</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Text label="Jurisdiction" value={pkg.codes.jurisdiction} onChange={(v) => setIn("codes", { jurisdiction: v })} placeholder="St. Louis County, MO" />
                <Text label="Adopted code" value={pkg.codes.edition} onChange={(v) => setIn("codes", { edition: v })} placeholder="e.g. 2015 IRC as amended" />
              </div>
              <ul className="space-y-3">
                {pkg.codes.items.map((c, i) => (
                  <li key={c.id} className="rounded-xl border border-zinc-200 p-3">
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5 h-5 w-5" checked={c.include} onChange={(e) => setIn("codes", { items: pkg.codes.items.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)) })} />
                      <span><strong>{c.ref || "Code item"}</strong> · {c.title || "Untitled"}</span>
                    </label>
                    {c.include && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-[12rem_1fr]">
                        <Text label="Section" value={c.ref} onChange={(v) => setIn("codes", { items: pkg.codes.items.map((x, j) => (j === i ? { ...x, ref: v } : x)) })} max={60} />
                        <Text label="Title" value={c.title} onChange={(v) => setIn("codes", { items: pkg.codes.items.map((x, j) => (j === i ? { ...x, title: v } : x)) })} />
                        <div className="sm:col-span-2"><Area label="What it requires" value={c.text} onChange={(v) => setIn("codes", { items: pkg.codes.items.map((x, j) => (j === i ? { ...x, text: v } : x)) })} rows={2} /></div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <button type="button" className={small} onClick={() => setIn("codes", { items: [...pkg.codes.items, { id: newId(), ref: "", title: "", text: "", include: true }] })}>Add a code item</button>
            </Sub>

            <Sub title="Ice & water shield (ice barrier) courses">
              <Check label="Include the ice & water shield calculation" checked={pkg.iws.include} onChange={(v) => setIn("iws", { include: v })} />
              <div className="flex flex-wrap gap-2"><ToolLink href={TOOLS.iws.url}>Open the {TOOLS.iws.label}</ToolLink></div>
              {pkg.iws.include && (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Text label="Roof pitch (rise per 12)" value={pkg.iws.pitchRise} onChange={(v) => setIn("iws", { pitchRise: v })} placeholder="5" max={6} />
                    <Text label="Soffit overhang (in)" value={pkg.iws.overhangIn} onChange={(v) => setIn("iws", { overhangIn: v })} placeholder="13" max={8} />
                    <Text label="Calculation date" type="date" value={pkg.iws.reportDate} onChange={(v) => setIn("iws", { reportDate: v })} />
                    <Pick label="Cladding at the eave wall" value={pkg.iws.cladding} onChange={(v) => setIn("iws", { cladding: v })} options={CLADDING.map((c) => ({ id: c.id, label: c.id === "other" ? c.label : `${c.label} (${c.inches}")` }))} />
                    <Text label="Cladding depth override (in)" value={pkg.iws.claddingOverrideIn} onChange={(v) => setIn("iws", { claddingOverrideIn: v })} max={8} />
                    <Pick label="Wall framing" value={pkg.iws.framing} onChange={(v) => setIn("iws", { framing: v })} options={FRAMING} />
                    {pkg.iws.framing === "other" && <Text label="Framing depth (in)" value={pkg.iws.framingOtherIn} onChange={(v) => setIn("iws", { framingOtherIn: v })} max={8} />}
                    <Text label="Sheathing (in)" value={pkg.iws.sheathingIn} onChange={(v) => setIn("iws", { sheathingIn: v })} max={8} />
                    <Text label="Drywall (in)" value={pkg.iws.drywallIn} onChange={(v) => setIn("iws", { drywallIn: v })} max={8} />
                    <Text label="Roll width (in)" value={pkg.iws.rollWidthIn} onChange={(v) => setIn("iws", { rollWidthIn: v })} max={8} />
                    <Text label="Lap (in)" value={pkg.iws.lapIn} onChange={(v) => setIn("iws", { lapIn: v })} max={8} />
                  </div>
                  {ice ? (
                    <p className="rounded-xl border border-brand-ink/30 bg-brand-light/60 p-3 text-sm">
                      <strong>{ice.courses} course{ice.courses === 1 ? "" : "s"} required.</strong> Wall {ice.wallDepthIn}&quot;, horizontal run {ice.horizontalRunIn}&quot;, sloped distance {ice.slopedRequiredIn}&quot; to reach 24&quot; inside the warm wall line; {ice.courses} course{ice.courses === 1 ? "" : "s"} cover {ice.coverageIn}&quot;.
                    </p>
                  ) : <p className="text-sm text-zinc-600">Enter the pitch and overhang to calculate.</p>}
                  {countyIceConflict && (
                    <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="note">
                      <strong>Check before citing R905.1.2:</strong> the St. Louis County re-roofing checklist (2015 IRC as amended) says an ice barrier is <em>not required</em> in the county (R905.1.2; SLCO Rev. Ord. Table R301.2(1)).
                      Confirm the property&apos;s municipality and its adopted code, and say which one this calculation relies on, so an adjuster can&apos;t use the county checklist against it.
                      {countyIceTicked ? " The county's \"not required\" item is ticked above, which contradicts this section." : ""}
                    </p>
                  )}
                  <Area label="Ice & water shield notes (optional)" value={pkg.iws.notes} onChange={(v) => setIn("iws", { notes: v })} rows={2} />
                </>
              )}
            </Sub>

            <Sub title="Attic ventilation">
              <Check label="Include a ventilation section in the report" checked={pkg.ventilation.include} onChange={(v) => setIn("ventilation", { include: v })} />
              <div className="flex flex-wrap gap-2"><ToolLink href={TOOLS.lomanco.url}>Open the {TOOLS.lomanco.label}</ToolLink></div>
              {pkg.ventilation.include && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Text label="Attic floor area (sq ft)" value={pkg.ventilation.atticSqFt} onChange={(v) => setIn("ventilation", { atticSqFt: v })} max={10} />
                    <label className="block text-sm font-bold">Rule
                      <select className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 font-normal" value={pkg.ventilation.method} onChange={(e) => setIn("ventilation", { method: Number(e.target.value) === 150 ? 150 : 300 })}>
                        <option value={300}>1/300, balanced high and low vents</option>
                        <option value={150}>1/150</option>
                      </select>
                    </label>
                    <Text label="Intake NFA measured (sq in)" value={pkg.ventilation.intakeNfa} onChange={(v) => setIn("ventilation", { intakeNfa: v })} max={10} />
                    <Text label="Exhaust NFA measured (sq in)" value={pkg.ventilation.exhaustNfa} onChange={(v) => setIn("ventilation", { exhaustNfa: v })} max={10} />
                  </div>
                  {ventArea > 0 && ventArea < 300 && (
                    <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="note">
                      <strong>{ventArea} sq ft looks like roof squares, not attic square feet.</strong> The Lomanco calculator and this rule both need the attic floor area in square feet (a typical house is 1,000–2,500). 24 squares of roof is about 2,400 sq ft of roof surface, not attic floor.
                    </p>
                  )}
                  {vent && (
                    <div className={`rounded-xl border p-3 text-sm ${vent.meetsMinimum ? "border-green-300 bg-green-50 text-green-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
                      <p className="font-bold">Needs {vent.requiredTotal.toLocaleString("en-US")} sq in in total: about {vent.requiredIntake.toLocaleString("en-US")} intake and {vent.requiredExhaustMin === vent.requiredExhaustMax ? vent.requiredExhaustMax.toLocaleString("en-US") : `${vent.requiredExhaustMin.toLocaleString("en-US")} to ${vent.requiredExhaustMax.toLocaleString("en-US")}`} exhaust.</p>
                      <ul className="mt-1 list-disc pl-5">{vent.findings.map((f) => <li key={f}>{f}</li>)}</ul>
                    </div>
                  )}
                  <Area label="Ventilation notes (optional)" hint="For example: The existing roof already shows blistering from poor ventilation; correcting intake and exhaust is part of the reasonable and necessary work." value={pkg.ventilation.notes} onChange={(v) => setIn("ventilation", { notes: v })} rows={3} />
                </>
              )}
            </Sub>

            <Sub title="Flashings – reuse limitations">
              <Area label="Flashings text" hint="Printed when the Flashings & Penetrations part above has findings." value={pkg.flashingsNote} onChange={(v) => set("flashingsNote", v)} rows={3} />
            </Sub>

            <Sub title="Manufacturer system">
              <Check label="Include the manufacturer system approach" checked={pkg.manufacturer.include} onChange={(v) => setIn("manufacturer", { include: v })} />
              <Text label="Shingle system" value={pkg.manufacturer.system} onChange={(v) => setIn("manufacturer", { system: v })} list="shingle-systems" placeholder="Owens Corning Duration" />
              <datalist id="shingle-systems">{SHINGLE_SYSTEMS.map((s) => <option key={s} value={s} />)}</datalist>
              {pkg.manufacturer.include && (
                <>
                  <Area label="System parts (one per line)" value={pkg.manufacturer.points} onChange={(v) => setIn("manufacturer", { points: v })} rows={6} />
                  <Area label="Manufacturer notes (optional)" value={pkg.manufacturer.notes} onChange={(v) => setIn("manufacturer", { notes: v })} rows={2} />
                </>
              )}
            </Sub>
          </Card>

          <Card id="scope" title="5. Scope & cost summary" hint="Quantities from the roof measurement report make the scope bullets; the cost table can use {tear off}, {ice and water}, {underlayment}, {drip edge}, {starter}, {shingles}, {hip and ridge}, {ridge vent} and {shingle system}.">
            <Sub title="Measurements">
              <div className="flex flex-wrap gap-2"><ToolLink href={TOOLS.roofr.url}>Open {TOOLS.roofr.label}</ToolLink></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Text label="Tear-off (squares)" value={pkg.scope.tearOffSq} onChange={(v) => setIn("scope", { tearOffSq: v })} max={12} />
                <Text label="Ice & water shield (sq ft)" value={pkg.scope.iwsSf} onChange={(v) => setIn("scope", { iwsSf: v })} max={12} />
                <Text label="Underlayment (squares)" value={pkg.scope.underlaymentSq} onChange={(v) => setIn("scope", { underlaymentSq: v })} max={12} />
                <Text label="Drip edge (linear ft)" value={pkg.scope.dripEdgeLf} onChange={(v) => setIn("scope", { dripEdgeLf: v })} max={12} />
                <Text label="Starter (linear ft)" value={pkg.scope.starterLf} onChange={(v) => setIn("scope", { starterLf: v })} max={12} />
                <Text label="Shingles with waste (squares)" value={pkg.scope.shingleSq} onChange={(v) => setIn("scope", { shingleSq: v })} max={12} />
                <Text label="Ridge vent (linear ft)" value={pkg.scope.ridgeVentLf} onChange={(v) => setIn("scope", { ridgeVentLf: v })} max={12} />
                <Text label="Hip & ridge cap (linear ft)" value={pkg.scope.hipRidgeLf} onChange={(v) => setIn("scope", { hipRidgeLf: v })} max={12} />
                <Text label="Step flashing (linear ft)" value={pkg.scope.stepFlashingLf} onChange={(v) => setIn("scope", { stepFlashingLf: v })} max={12} />
                <Text label="Pipe boots" value={pkg.scope.pipeBoots} onChange={(v) => setIn("scope", { pipeBoots: v })} max={20} />
                <Text label="Measurement source" value={pkg.scope.source} onChange={(v) => setIn("scope", { source: v })} />
              </div>
              <Area label="More scope lines (one per line)" hint="For example: Replace hail-damaged window screens on front and left elevations." value={pkg.scope.extra} onChange={(v) => setIn("scope", { extra: v })} rows={4} />
            </Sub>
            <Sub title="Cost">
              {pkg.costRows.map((r, i) => (
                <div key={r.id} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
                  <Text label="Work category" value={r.category} onChange={(v) => update((p) => ({ ...p, costRows: p.costRows.map((x, j) => (j === i ? { ...x, category: v } : x)) }))} />
                  <Text label="Description" value={r.description} onChange={(v) => update((p) => ({ ...p, costRows: p.costRows.map((x, j) => (j === i ? { ...x, description: v } : x)) }))} max={400} />
                  <button type="button" className={small} onClick={() => update((p) => ({ ...p, costRows: p.costRows.filter((_, j) => j !== i) }))}>Remove</button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={small} onClick={() => update((p) => ({ ...p, costRows: [...p.costRows, { id: newId(), category: "", description: "" }] }))}>Add a row</button>
                <button type="button" className={small} onClick={() => update((p) => ({ ...p, costRows: DEFAULT_COST_ROWS.map((r) => ({ ...r, id: newId() })) }))}>Reset to the standard rows</button>
              </div>
              <Text label="Total contract price" value={pkg.totalPrice} onChange={(v) => set("totalPrice", v)} placeholder="13,845.00" max={20} />
              <Area label="Price statement" value={pkg.costNote} onChange={(v) => set("costNote", v)} rows={3} />
            </Sub>
          </Card>

          <Card id="attachments" title="Attachments" hint={`In Mike's usual order: certifications, the hail map report, the county checklist, the ice & water shield report, the Lomanco calculator, the estimate. PDFs become page images (up to ${MAX_PDF_PAGES} pages each).`}>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnLine} onClick={addCertificates} disabled={!!busy || pkg.documents.some((d) => d.originalName === "Building Experts Institute certificates")}>Add Mike&apos;s 4 Building Experts Institute certificates</button>
              <label className={`${btnMain} cursor-pointer`}>
                Attach PDFs or images
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { onDocuments(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
            <ul className="space-y-3">
              {pkg.documents.map((d, i) => (
                <li key={d.id} className="grid gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-2">
                  <Text label={`Attachment ${String.fromCharCode(65 + (i % 26))} title`} value={d.title} onChange={(v) => update((p) => ({ ...p, documents: p.documents.map((x) => (x.id === d.id ? { ...x, title: v } : x)) }))} />
                  <Text label="Source (who made it)" value={d.source} onChange={(v) => update((p) => ({ ...p, documents: p.documents.map((x) => (x.id === d.id ? { ...x, source: v } : x)) }))} />
                  <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 sm:col-span-2">{d.originalName} · {d.pageFileIds.length} of {d.pagesTotal} page{d.pagesTotal === 1 ? "" : "s"} included
                    <button type="button" className={small} disabled={i === 0} onClick={() => update((p) => { const a = [...p.documents]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { ...p, documents: a }; })}>Move up</button>
                    <button type="button" className={small} disabled={i === pkg.documents.length - 1} onClick={() => update((p) => { const a = [...p.documents]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return { ...p, documents: a }; })}>Move down</button>
                    <button type="button" className={small} onClick={() => update((p) => ({ ...p, documents: p.documents.filter((x) => x.id !== d.id) }))}>Remove</button>
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
