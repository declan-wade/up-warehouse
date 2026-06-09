/**
 * Minimal TypeScript shapes for the Up API (JSON:API) resources we ingest.
 * See https://developer.up.com.au/ — we keep the full payload as `raw` in the DB,
 * so these types only need to cover the fields we map into columns.
 */

export interface UpMoney {
  currencyCode: string;
  value: string;
  valueInBaseUnits: number;
}

export interface RelationshipRef {
  data: { type: string; id: string } | null;
}

export interface RelationshipRefList {
  data: { type: string; id: string }[];
}

export interface UpList<T> {
  data: T[];
  links: { prev: string | null; next: string | null };
}

export interface UpSingle<T> {
  data: T;
}

export interface AccountResource {
  type: "accounts";
  id: string;
  attributes: {
    displayName: string;
    accountType: string;
    ownershipType: string;
    balance: UpMoney;
    createdAt: string;
  };
}

export interface CategoryResource {
  type: "categories";
  id: string;
  attributes: { name: string };
  relationships: {
    parent: RelationshipRef;
    children?: RelationshipRefList;
  };
}

export interface TagResource {
  type: "tags";
  id: string;
}

export interface TransactionResource {
  type: "transactions";
  id: string;
  attributes: {
    status: string;
    rawText: string | null;
    description: string;
    message: string | null;
    isCategorizable: boolean;
    holdInfo: { amount: UpMoney; foreignAmount: UpMoney | null } | null;
    roundUp: { amount: UpMoney; boostPortion: UpMoney | null } | null;
    cashback: { description: string; amount: UpMoney } | null;
    amount: UpMoney;
    foreignAmount: UpMoney | null;
    cardPurchaseMethod: { method: string; cardNumberSuffix: string | null } | null;
    settledAt: string | null;
    createdAt: string;
    transactionType?: string | null;
    note?: { text: string } | null;
    deepLinkURL?: string | null;
  };
  relationships: {
    account: RelationshipRef;
    transferAccount?: RelationshipRef;
    category: RelationshipRef;
    parentCategory: RelationshipRef;
    tags: RelationshipRefList;
    attachment?: RelationshipRef;
  };
}

export interface AttachmentResource {
  type: "attachments";
  id: string;
  attributes: {
    createdAt: string;
    fileContentType: string | null;
    fileURL: string | null;
    fileURLExpiresAt: string | null;
  };
  relationships: {
    transaction: RelationshipRef;
  };
}
