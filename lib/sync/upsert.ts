import { exec } from "../db/duck";
import { baseUnitsToAmount } from "../money";
import type {
  AccountResource,
  AttachmentResource,
  CategoryResource,
  TagResource,
  TransactionResource,
} from "../up/types";

/** Map Up resources onto DuckDB rows via INSERT ... ON CONFLICT DO UPDATE. */

export async function upsertAccount(a: AccountResource): Promise<void> {
  await exec(
    `INSERT INTO accounts
       (id, display_name, account_type, ownership_type, balance_value_in_base_units,
        balance_currency_code, balance, created_at, raw, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, now())
     ON CONFLICT (id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       account_type = EXCLUDED.account_type,
       ownership_type = EXCLUDED.ownership_type,
       balance_value_in_base_units = EXCLUDED.balance_value_in_base_units,
       balance_currency_code = EXCLUDED.balance_currency_code,
       balance = EXCLUDED.balance,
       created_at = EXCLUDED.created_at,
       raw = EXCLUDED.raw,
       synced_at = EXCLUDED.synced_at`,
    [
      a.id,
      a.attributes.displayName,
      a.attributes.accountType,
      a.attributes.ownershipType,
      a.attributes.balance.valueInBaseUnits,
      a.attributes.balance.currencyCode,
      baseUnitsToAmount(a.attributes.balance.valueInBaseUnits),
      a.attributes.createdAt,
      JSON.stringify(a),
    ],
  );
}

export async function upsertCategory(c: CategoryResource): Promise<void> {
  await exec(
    `INSERT INTO categories (id, name, parent_id, raw)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       parent_id = EXCLUDED.parent_id,
       raw = EXCLUDED.raw`,
    [c.id, c.attributes.name, c.relationships.parent?.data?.id ?? null, JSON.stringify(c)],
  );
}

export async function upsertTag(t: TagResource | string): Promise<void> {
  const id = typeof t === "string" ? t : t.id;
  await exec("INSERT INTO tags (id) VALUES (?) ON CONFLICT (id) DO NOTHING", [id]);
}

export async function upsertTransaction(t: TransactionResource): Promise<void> {
  const at = t.attributes;
  const rel = t.relationships;
  await exec(
    `INSERT INTO transactions
       (id, account_id, status, raw_text, description, message, is_categorizable,
        hold_value_in_base_units, hold_currency_code,
        round_up_value_in_base_units, round_up_boost_in_base_units,
        cashback_description, cashback_value_in_base_units,
        amount_value_in_base_units, amount_currency_code, amount,
        foreign_amount_value_in_base_units, foreign_amount_currency_code,
        card_purchase_method, card_number_suffix,
        settled_at, created_at, transaction_type, note,
        category_id, parent_category_id, transfer_account_id, deep_link_url,
        raw, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
     ON CONFLICT (id) DO UPDATE SET
       account_id = EXCLUDED.account_id,
       status = EXCLUDED.status,
       raw_text = EXCLUDED.raw_text,
       description = EXCLUDED.description,
       message = EXCLUDED.message,
       is_categorizable = EXCLUDED.is_categorizable,
       hold_value_in_base_units = EXCLUDED.hold_value_in_base_units,
       hold_currency_code = EXCLUDED.hold_currency_code,
       round_up_value_in_base_units = EXCLUDED.round_up_value_in_base_units,
       round_up_boost_in_base_units = EXCLUDED.round_up_boost_in_base_units,
       cashback_description = EXCLUDED.cashback_description,
       cashback_value_in_base_units = EXCLUDED.cashback_value_in_base_units,
       amount_value_in_base_units = EXCLUDED.amount_value_in_base_units,
       amount_currency_code = EXCLUDED.amount_currency_code,
       amount = EXCLUDED.amount,
       foreign_amount_value_in_base_units = EXCLUDED.foreign_amount_value_in_base_units,
       foreign_amount_currency_code = EXCLUDED.foreign_amount_currency_code,
       card_purchase_method = EXCLUDED.card_purchase_method,
       card_number_suffix = EXCLUDED.card_number_suffix,
       settled_at = EXCLUDED.settled_at,
       created_at = EXCLUDED.created_at,
       transaction_type = EXCLUDED.transaction_type,
       note = EXCLUDED.note,
       category_id = EXCLUDED.category_id,
       parent_category_id = EXCLUDED.parent_category_id,
       transfer_account_id = EXCLUDED.transfer_account_id,
       deep_link_url = EXCLUDED.deep_link_url,
       raw = EXCLUDED.raw,
       synced_at = EXCLUDED.synced_at`,
    [
      t.id,
      rel.account?.data?.id ?? null,
      at.status,
      at.rawText,
      at.description,
      at.message,
      at.isCategorizable,
      at.holdInfo?.amount.valueInBaseUnits ?? null,
      at.holdInfo?.amount.currencyCode ?? null,
      at.roundUp?.amount.valueInBaseUnits ?? null,
      at.roundUp?.boostPortion?.valueInBaseUnits ?? null,
      at.cashback?.description ?? null,
      at.cashback?.amount.valueInBaseUnits ?? null,
      at.amount.valueInBaseUnits,
      at.amount.currencyCode,
      baseUnitsToAmount(at.amount.valueInBaseUnits),
      at.foreignAmount?.valueInBaseUnits ?? null,
      at.foreignAmount?.currencyCode ?? null,
      at.cardPurchaseMethod?.method ?? null,
      at.cardPurchaseMethod?.cardNumberSuffix ?? null,
      at.settledAt,
      at.createdAt,
      at.transactionType ?? null,
      at.note?.text ?? null,
      rel.category?.data?.id ?? null,
      rel.parentCategory?.data?.id ?? null,
      rel.transferAccount?.data?.id ?? null,
      at.deepLinkURL ?? null,
      JSON.stringify(t),
    ],
  );

  // Re-sync tag links so removals propagate.
  await exec("DELETE FROM transaction_tags WHERE transaction_id = ?", [t.id]);
  for (const tag of rel.tags?.data ?? []) {
    await upsertTag(tag.id);
    await exec(
      "INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
      [t.id, tag.id],
    );
  }
}

export async function upsertAttachment(a: AttachmentResource): Promise<void> {
  await exec(
    `INSERT INTO attachments
       (id, transaction_id, created_at, file_content_type, file_url, file_url_expires_at, raw)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       transaction_id = EXCLUDED.transaction_id,
       created_at = EXCLUDED.created_at,
       file_content_type = EXCLUDED.file_content_type,
       file_url = EXCLUDED.file_url,
       file_url_expires_at = EXCLUDED.file_url_expires_at,
       raw = EXCLUDED.raw`,
    [
      a.id,
      a.relationships.transaction?.data?.id ?? null,
      a.attributes.createdAt,
      a.attributes.fileContentType,
      a.attributes.fileURL,
      a.attributes.fileURLExpiresAt,
      JSON.stringify(a),
    ],
  );
}
