// Loads db/schema.sql into PGlite (PostgreSQL running inside Node) and checks the rules:
// ledger, buying, refunds, receipts, audit log, expiry jobs, photo limit, account deletion.
// Run: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

const sql = fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log("  ok   " + name); };
const bad = (name, why) => { fail++; console.log("  FAIL " + name + " -> " + why); };
const expectError = async (name, q, params, match) => {
  try { await db.query(q, params); bad(name, "no error raised"); }
  catch (e) { (!match || new RegExp(match, "i").test(e.message)) ? ok(name) : bad(name, "wrong error: " + e.message); }
};
const expectOk = async (name, fn) => { try { const r = await fn(); ok(name); return r; } catch (e) { bad(name, e.message); } };

// 1. load the schema
try { await db.exec(sql); ok("schema loads"); }
catch (e) { bad("schema loads", e.message); console.log("\nStopping: schema did not load."); process.exit(1); }

const one = async (q, p) => (await db.query(q, p)).rows[0];
const admin = (await one("insert into profiles (email, role, password_hash) values ('admin@x.dz','admin','h') returning id")).id;
const buyer = (await one("insert into profiles (email, password_hash, email_verified_at) values ('b@x.dz','h', now()) returning id")).id;
const buyer2 = (await one("insert into profiles (email, google_subject, email_verified_at) values ('g@x.dz','g-123', now()) returning id")).id;
const unverified = (await one("insert into profiles (email, password_hash) values ('u@x.dz','h') returning id")).id;
await db.exec("insert into models (id,name,tier,price_points,published) values ('m1','Model One','architect',100,true),('m2','Hidden','student',50,false)");
await db.exec("insert into templates (id,source_file,canvas_width,canvas_height,full_prefix) values ('t1','a.psd',9933,7016,'full/t1')");
const bal = async (u) => (await one("select balance_of($1) as b", [u])).b;

console.log("\nProfiles");
await expectError("a profile needs password or Google", "insert into profiles (email) values ('nopw@x.dz')", [], "check");
await expectError("email is unique", "insert into profiles (email, password_hash) values ('b@x.dz','h')", [], "unique");
await expectError("google subject is unique", "insert into profiles (email, google_subject) values ('g2@x.dz','g-123')", [], "unique");

console.log("\nTop-ups and adjustments");
await expectError("non-admin cannot credit points", "select credit_points($1,$2,'topup',100,'x',null,'cash',null)", [buyer, buyer], "admin");
await expectError("top-up must record how it was paid", "select credit_points($1,$2,'topup',100,'paid',null,null,null)", [admin, buyer], "how it was paid");
await expectError("purchase kind refused by credit_points", "select credit_points($1,$2,'purchase',-5,'x')", [admin, buyer], "spend_points");
await expectOk("admin tops up 150 points by CCP", () => db.query("select credit_points($1,$2,'topup',150,'Receipt 77',null,'ccp','CCP-77')", [admin, buyer]));
if ((await bal(buyer)) === 150) ok("balance is 150"); else bad("balance is 150", String(await bal(buyer)));
const row = await one("select payment_method, payment_reference from ledger where user_id=$1", [buyer]);
if (row.payment_method === "ccp" && row.payment_reference === "CCP-77") ok("payment method and reference stored"); else bad("payment method and reference stored", JSON.stringify(row));
await expectError("zero amount refused", "select credit_points($1,$2,'adjustment',0,'x')", [admin, buyer], "check");
await expectError("adjustment cannot make the balance negative", "select credit_points($1,$2,'adjustment',-151,'oops')", [admin, buyer], "negative");
await expectError("empty reason refused", "select credit_points($1,$2,'adjustment',-1,'  ')", [admin, buyer], "check");
await expectError("adjustment cannot carry a payment method", "insert into ledger (user_id,kind,amount,reason,payment_method,created_by) values ($1,'adjustment',-1,'x','cash',$2)", [buyer, admin], "check");
await expectError("unknown user refused", "select credit_points($1,'00000000-0000-0000-0000-000000000000','topup',10,'x',null,'cash')", [admin], "unknown");
await expectOk("online top-up with no admin is allowed", () => db.query("insert into ledger (user_id,kind,amount,reason,payment_method,created_by) values ($1,'topup',10,'Online payment','online',null)", [buyer2]));
await expectError("top-up with no admin and not online refused", "insert into ledger (user_id,kind,amount,reason,payment_method,created_by) values ($1,'topup',10,'x','cash',null)", [buyer2], "check");

console.log("\nLedger is append only");
await expectError("update refused", "update ledger set amount = 999", [], "added to");
await expectError("delete refused", "delete from ledger", [], "added to");
await expectError("truncate refused", "truncate ledger", [], "added to|foreign key");

console.log("\nBuying");
await expectError("unpublished model cannot be bought", "select spend_points($1,'m2')", [buyer], "not available");
await expectError("unknown model refused", "select spend_points($1,'nope')", [buyer], "not available");
await db.query("select credit_points($1,$2,'topup',500,'Receipt 1',null,'cash',null)", [admin, unverified]);
await expectError("an unconfirmed email cannot buy", "select spend_points($1,'m1')", [unverified], "Confirm your email");
await expectError("not enough points refused", "select spend_points($1,'m1')", [buyer2], "Not enough");
const p1 = (await one("select spend_points($1,'m1') as p", [buyer])).p;
if ((await bal(buyer)) === 50) ok("buying charges 100 (150 -> 50)"); else bad("buying charges 100", String(await bal(buyer)));
const p2 = (await one("select spend_points($1,'m1') as p", [buyer])).p;
if (p1 === p2 && (await bal(buyer)) === 50) ok("buying twice returns the same purchase and charges once"); else bad("buying twice charges once", `${p1} ${p2} ${await bal(buyer)}`);
const cnt = (await one("select count(*)::int as n from ledger where user_id=$1 and kind='purchase'", [buyer])).n;
if (cnt === 1) ok("one purchase row in the ledger"); else bad("one purchase row", String(cnt));
const bv = (await one("select points from balances where user_id=$1", [buyer])).points;
if (bv === 50) ok("balances view agrees"); else bad("balances view agrees", String(bv));
await expectOk("refund is a negative adjustment", () => db.query("select credit_points($1,$2,'adjustment',-50,'Refund of model one')", [admin, buyer]));
if ((await bal(buyer)) === 0) ok("balance back to 0"); else bad("balance back to 0", String(await bal(buyer)));

console.log("\nExports, drafts, photos");
await db.query("insert into exports (purchase_id,user_id,status,storage_path,finished_at,expires_at) values ($1,$2,'ready','zips/a.zip',now(),now() - interval '1 day')", [p1, buyer]);
await db.query("insert into exports (purchase_id,user_id,status,storage_path,finished_at,expires_at) values ($1,$2,'ready','zips/b.zip',now(),now() + interval '6 days')", [p1, buyer]);
const gone = (await db.query("select * from expire_old_exports()")).rows.map((r) => r.storage_path);
if (gone.length === 1 && gone[0] === "zips/a.zip") ok("expire_old_exports returns only the old zip"); else bad("expire_old_exports", JSON.stringify(gone));
const st = (await db.query("select id, status from exports order by storage_path")).rows;
if (st[0].status === "expired" && st[1].status === "ready") ok("old export marked expired, new one untouched"); else bad("export statuses", JSON.stringify(st));
const d1 = (await one("insert into drafts (user_id,model_id,state) values ($1,'m1','{}') returning id", [buyer])).id;
const d2 = (await one("insert into drafts (user_id,model_id,state) values ($1,'m1','{}') returning id", [buyer2])).id;
await db.query("insert into photos (draft_id,storage_path,width,height,size_bytes) values ($1,'ph/1.jpg',4800,3200,500000),($1,'ph/2.jpg',800,600,50000),($2,'ph/3.jpg',1920,1280,140000)", [d1, d2]);
await db.query("alter table drafts disable trigger drafts_touch");   // the touch trigger would reset the expiry we set by hand
await db.query("update drafts set expires_at = now() - interval '1 day' where id=$1", [d1]);
await db.query("alter table drafts enable trigger drafts_touch");
const gp = (await db.query("select * from delete_expired_drafts() order by storage_path")).rows.map((r) => r.storage_path);
if (gp.join() === "ph/1.jpg,ph/2.jpg") ok("delete_expired_drafts returns the expired draft's photo files"); else bad("delete_expired_drafts", JSON.stringify(gp));
const nd = (await one("select count(*)::int as n from drafts")).n;
const np = (await one("select count(*)::int as n from photos")).n;
if (nd === 1 && np === 1) ok("expired draft and its photos are gone, the other draft stays"); else bad("drafts/photos left", `${nd}/${np}`);
await db.query("update drafts set state = '{\"a\":1}'::jsonb where id=$1", [d2]);
const ex_at = (await one("select expires_at > now() + interval '27 days' as ok from drafts where id=$1", [d2])).ok;
if (ex_at) ok("saving a draft pushes its expiry one month out"); else bad("draft expiry touch", "expiry not extended");

console.log("\nReceipts, audit, tokens");
const lid = (await one("select id from ledger where user_id=$1 and kind='topup'", [buyer])).id;
await expectOk("email receipt recorded", () => db.query("insert into email_receipts (user_id,kind,ledger_id,status) values ($1,'topup',$2,'sent')", [buyer, lid]));
await expectError("receipt kind is limited", "insert into email_receipts (user_id,kind,ledger_id,status) values ($1,'other',$2,'sent')", [buyer, lid], "check");
await expectOk("audit event recorded", () => db.query("insert into audit_events (actor_id,action,target_type,target_id) values ($1,'model_published','model','m1')", [admin]));
await expectError("audit log cannot be edited", "update audit_events set detail='x'", [], "added to");
await expectError("audit log cannot be deleted", "delete from audit_events", [], "added to");
await expectOk("auth token stored", () => db.query("insert into auth_tokens (user_id,purpose,token_hash,expires_at) values ($1,'reset_password','hash1', now() + interval '1 hour')", [buyer]));
await expectError("token hash is unique", "insert into auth_tokens (user_id,purpose,token_hash,expires_at) values ($1,'verify_email','hash1', now())", [buyer], "unique");

console.log("\nAccount deletion");
const files = (await db.query("select * from delete_account($1)", [buyer])).rows.map((r) => r.storage_path).sort();
if (files.join() === "zips/a.zip,zips/b.zip") ok("delete_account returns the export zips to remove"); else bad("delete_account files", JSON.stringify(files));
const pr = await one("select email, display_name, password_hash, google_subject, deleted_at, role from profiles where id=$1", [buyer]);
if (pr.email.startsWith("deleted-") && pr.password_hash === null && pr.deleted_at && pr.role === "buyer") ok("profile emptied of personal and sign-in details"); else bad("profile scrubbed", JSON.stringify(pr));
const c = await one("select (select count(*) from purchases where user_id=$1)::int as pu, (select count(*) from exports where user_id=$1)::int as ex, (select count(*) from email_receipts where user_id=$1)::int as re, (select count(*) from auth_tokens where user_id=$1)::int as tk, (select count(*) from ledger where user_id=$1)::int as lg", [buyer]);
if (c.pu === 0 && c.ex === 0 && c.re === 0 && c.tk === 0) ok("purchases, exports, receipts and tokens deleted"); else bad("deleted rows", JSON.stringify(c));
if (c.lg === 3) ok("ledger rows kept (top-up, purchase, refund)"); else bad("ledger rows kept", String(c.lg));
if ((await bal(buyer)) === 0) ok("balance still computes after deletion"); else bad("balance after deletion", String(await bal(buyer)));
await expectError("cannot delete the same account twice", "select * from delete_account($1)", [buyer], "already deleted");
await expectOk("a new account can use the old email", () => db.query("insert into profiles (email, password_hash) values ('b@x.dz','h2')"));
await expectError("a deleted account cannot buy", "select spend_points($1,'m1')", [buyer], "Unknown user");

console.log("\nPhoto storage limit");
const dq = (await one("insert into drafts (user_id,model_id,state) values ($1,'m1','{}') returning id", [buyer2])).id;
await expectOk("photos under 1 GB are accepted", () => db.query("insert into photos (draft_id,storage_path,width,height,size_bytes) values ($1,'q/1.jpg',9000,6000,900000000)", [dq]));
await expectError("a photo that would pass 1 GB is refused", "insert into photos (draft_id,storage_path,width,height,size_bytes) values ($1,'q/2.jpg',9000,6000,200000000)", [dq], "1 GB per user");
const dq2 = (await one("insert into drafts (user_id,model_id,state) values ($1,'m1','{}') returning id", [buyer2])).id;
await expectError("the limit counts all of the user's drafts together", "insert into photos (draft_id,storage_path,width,height,size_bytes) values ($1,'q/3.jpg',9000,6000,200000000)", [dq2], "1 GB per user");
await expectOk("another user is not affected", async () => { const d = (await one("insert into drafts (user_id,model_id,state) values ($1,'m1','{}') returning id", [admin])).id; await db.query("insert into photos (draft_id,storage_path,width,height,size_bytes) values ($1,'q/4.jpg',9000,6000,200000000)", [d]); });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
