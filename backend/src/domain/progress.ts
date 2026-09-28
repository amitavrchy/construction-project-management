import { Context, Data, getRecord, list } from "./context";
export async function progress(
  c: Context,
  kind: string,
  d: Data,
): Promise<Data> {
  if (kind === "variation") await getRecord(c, d.boqId, "boq");
  if (kind !== "progress") return d;
  const boq = await getRecord(c, d.boqId, "boq");
  const variations = (await list(c, "variation")).filter(
    (r) => r.status === "APPROVED" && r.data.boqId === d.boqId,
  );
  const total =
    boq.data.quantity +
    variations.reduce((s, r) => s + r.data.additionalQuantity, 0);
  const previous = (await list(c, "progress"))
    .filter((r) => r.data.boqId === d.boqId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (d.quantity > total)
    throw new Error(
      "Progress exceeds approved quantity. Approve a variation first.",
    );
  if (d.quantity < (previous?.data.quantity || 0))
    throw new Error("Cumulative progress cannot decrease");
  const percent = Math.round((d.quantity / total) * 10000) / 100;
  if (percent - (previous?.data.percent || 0) > 15 && !d.photo)
    throw new Error("Photo evidence required for progress jumps above 15%");
  if (
    d.photo &&
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(d.photo)
  )
    throw new Error("Upload a PNG, JPEG or WebP photo");
  return { ...d, percent, approvedQuantity: total };
}
