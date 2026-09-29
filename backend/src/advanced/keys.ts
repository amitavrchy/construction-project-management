import { Data } from "../domain/context";
export function advancedKey(kind: string, data: Data, id: string) {
  if (kind === "delivery")
    return `${data.supplierId}:${data.invoiceNo.toLowerCase()}`;
  if (kind === "dailyreport") return `${data.siteId}:${data.date}`;
  if (kind === "measurementbill")
    return `${data.contractpackageId}:${data.reference.toLowerCase()}`;
  if (kind === "approvalrule") return `${data.kind}:${data.thresholdMinor}`;
  return data.reference?.toLowerCase() || data.code?.toLowerCase() || id;
}
