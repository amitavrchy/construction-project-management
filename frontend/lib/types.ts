export type Data = Record<string, any>;
export type DomainRecord = { id: string; kind: string; status: string; data: Data; createdBy: string; createdAt: string; version: number };
export type User = { id: string; name: string; email: string; role: string; companyId: string };
export type Project = { id: string; name: string; code: string; address: string; status: string; startsOn: string; endsOn: string; sites: { id: string; name: string; address: string }[] };
export type Snapshot = { project: Project; role: string; records: DomainRecord[]; stock: { id: string; siteId: string; materialId: string; quantity: string; averageCostMinor: number }[]; ledger: { id: string; costCode: string; sourceType: string; sourceId: string; amountMinor: number; createdAt: string }[]; audits: { id: string; action: string; actorId: string; createdAt: string; detail: Data }[] };
export type Field = { key: string; label: string; type?: 'number' | 'money' | 'date' | 'file' | 'textarea' | 'email' | 'password'; options?: string[]; ref?: string; default?: string | number; optional?: boolean };
export type Module = { title: string; singular: string; subtitle: string; fields: Field[]; columns: string[] };
