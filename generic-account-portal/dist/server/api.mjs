import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { DB } from "./store.mjs";
//#region server/api.ts
var env = process.env, mode = env.FS_MODE || "simulation";
if (!["simulation", "test"].includes(mode)) throw Error("FS_MODE must be simulation or test");
var test = mode === "test";
var credentials = {
	customer: [env.CUSTOMER_USERNAME || "customer@demo.example", env.CUSTOMER_PASSWORD || "CustomerDemo!"],
	admin: [env.ADMIN_USERNAME || "admin@demo.example", env.ADMIN_PASSWORD || "AdminDemo123!"]
};
if (test && [
	"FS_API_USERNAME",
	"FS_API_PASSWORD",
	"FS_SUBSCRIPTION_ID",
	"FS_ACCOUNT_ID",
	"CUSTOMER_USERNAME",
	"CUSTOMER_PASSWORD",
	"ADMIN_USERNAME",
	"ADMIN_PASSWORD"
].some((k) => !env[k])) throw Error("Test mode requires all settings in .env.example");
if (test && (credentials.customer[1].length < 12 || credentials.admin[1].length < 12 || credentials.customer[1] === credentials.admin[1])) throw Error("Use distinct portal passwords of at least 12 characters");
var hash = (s) => createHash("sha256").update(s).digest("hex");
var fingerprint = hash(JSON.stringify([
	mode,
	credentials,
	env.FS_SUBSCRIPTION_ID,
	env.FS_ACCOUNT_ID,
	env.FS_API_USERNAME,
	env.FS_API_PASSWORD
]));
var json = (data, status = 200, headers = {}) => Response.json(data, {
	status,
	headers: {
		"Cache-Control": "no-store",
		...headers
	}
});
var Failure = class extends Error {
	status;
	constructor(message, status = 400) {
		super(message);
		this.status = status;
	}
};
var q = (sql, ...args) => DB.prepare(sql).bind(...args);
function session(req, role) {
	const s = q("SELECT * FROM portal_sessions WHERE token_hash=? AND expires>? AND fingerprint=?", hash(req.headers.get("cookie")?.match(/(?:^|;\s*)portal_session=([a-f0-9]+)/)?.[1] || ""), Date.now(), fingerprint).first();
	if (!s) throw new Failure("Please sign in.", 401);
	if (role && s.role !== role) throw new Failure("Administrator access required.", 403);
	return s;
}
function safeEqual(a, b) {
	return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
function csrf(req) {
	if (req.headers.get("origin") !== new URL(req.url).origin) throw new Failure("Invalid request origin.", 403);
	if (!req.headers.get("content-type")?.startsWith("application/json")) throw new Failure("JSON required.", 415);
}
async function wrap(fn) {
	try {
		return await fn();
	} catch (e) {
		return json({ error: e instanceof Failure ? e.message : "The request failed. Please retry or check server configuration." }, e instanceof Failure ? e.status : 500);
	}
}
async function fs(path, method = "GET", body) {
	let r;
	try {
		r = await fetch("https://api.fastspring.com" + path, {
			method,
			headers: {
				Authorization: "Basic " + Buffer.from(env.FS_API_USERNAME + ":" + env.FS_API_PASSWORD).toString("base64"),
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: body ? JSON.stringify(body) : void 0,
			signal: AbortSignal.timeout(15e3),
			redirect: "error"
		});
	} catch {
		throw new Failure("FastSpring could not be reached. The outcome may be unknown; refresh before retrying.", 502);
	}
	if (!r.ok) throw new Failure(`FastSpring returned HTTP ${r.status}.${r.status === 429 ? " Please retry after " + (r.headers.get("retry-after") || "a short wait") + " seconds." : ""}`, 502);
	const data = await r.json();
	if (data.error || data.errors) throw new Failure("FastSpring reported an API error. Review the test subscription in FastSpring.", 502);
	return data;
}
async function mutation(operation, sub, path, method, body, simulated) {
	const id = randomBytes(16).toString("hex");
	q("INSERT INTO portal_api_activity(id,subscription,operation,method,path,request,outcome,created,source) VALUES(?,?,?,?,?,?,?,?,?)", id, sub, operation, method, path, body === void 0 ? null : JSON.stringify(body), "pending", (/* @__PURE__ */ new Date()).toISOString(), mode).run();
	try {
		let data, status = 200;
		if (test) {
			const r = await fetch("https://api.fastspring.com" + path, {
				method,
				headers: {
					Authorization: "Basic " + Buffer.from(env.FS_API_USERNAME + ":" + env.FS_API_PASSWORD).toString("base64"),
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				body: body === void 0 ? void 0 : JSON.stringify(body),
				signal: AbortSignal.timeout(15e3),
				redirect: "error"
			});
			status = r.status;
			try {
				data = await r.json();
			} catch {
				data = { error: "Non-JSON API response" };
			}
			q("UPDATE portal_api_activity SET response=?,status=?,outcome=? WHERE id=?", JSON.stringify(data), status, r.ok ? "received" : "failed", id).run();
			if (!r.ok) throw new Failure("FastSpring returned HTTP " + status + ". Refresh before retrying.", 502);
		} else {
			data = simulated;
			q("UPDATE portal_api_activity SET response=?,status=200,outcome='received' WHERE id=?", JSON.stringify(data), id).run();
		}
		if (data.error || data.errors) throw new Failure("FastSpring reported an API error.", 502);
		return data;
	} catch (e) {
		q("UPDATE portal_api_activity SET outcome=CASE WHEN status IS NULL THEN 'unknown' ELSE 'failed' END WHERE id=?", id).run();
		throw e instanceof Failure ? e : new Failure("FastSpring could not be reached. Refresh and review the outcome before retrying.", 502);
	}
}
var subscriptionId = () => env.FS_SUBSCRIPTION_ID;
async function subscription(s) {
	if (!test) return {
		id: "demo-subscription",
		display: env.PRODUCT_NAME || "Pro membership",
		state: s.state,
		active: s.state !== "deactivated",
		autoRenew: s.state === "active",
		priceDisplay: "£19.00 / month",
		nextChargeDate: "2026-10-17",
		live: false
	};
	const data = await fs("/subscriptions/" + encodeURIComponent(subscriptionId()) + "?scope=test");
	const sub = data.subscriptions?.[0] || data;
	if (sub.live !== false || sub.account !== env.FS_ACCOUNT_ID || (sub.id || sub.subscription) !== subscriptionId()) throw new Failure("Subscription verification failed: test mode, account ownership, or ID did not match.", 409);
	return {
		id: sub.id || sub.subscription,
		display: sub.display || sub.product,
		state: sub.state,
		active: sub.active,
		autoRenew: sub.autoRenew,
		priceDisplay: sub.priceDisplay || "",
		nextChargeDate: sub.nextChargeDate || null,
		live: sub.live
	};
}
var sampleReasons = [
	"Too expensive",
	"No longer needed",
	"Difficult to use",
	"Support experience",
	"Missing integration",
	"Found an alternative",
	"Other"
].map((displayName, i) => ({
	id: String(i + 1),
	displayName,
	name: [
		"cost",
		"need",
		"usability",
		"support",
		"integration",
		"alternative",
		"other"
	][i],
	enabled: true
}));
async function survey() {
	return test ? fs("/subscriptions/cancelSurvey/reasons/" + encodeURIComponent(subscriptionId()) + "?lang=en") : {
		language: "en",
		reasons: sampleReasons
	};
}
var stopped = (sub) => ["canceled", "deactivated"].includes(sub.state) || sub.autoRenew === false;
async function META() {
	return json({
		brand: env.BRAND_NAME || "YourBrand",
		mode,
		credentials: test ? null : {
			customer: credentials.customer,
			admin: credentials.admin
		}
	});
}
async function GET(req) {
	return wrap(async () => {
		const s = session(req);
		if (s.role === "admin") return json({ role: "admin" });
		const sub = await subscription(s);
		if (test && sub.state === "active" && sub.autoRenew === true) q("UPDATE portal_api_activity SET outcome='reconciled' WHERE subscription=? AND source='test' AND operation='uncancel' AND outcome IN ('pending','unknown')", sub.id).run();
		const surveyData = stopped(sub) ? null : await survey();
		return json({
			role: "customer",
			subscription: sub,
			canUncancel: sub.state === "canceled" && sub.active === true,
			reasons: surveyData?.reasons?.filter((r) => r.enabled !== false) || [],
			language: surveyData?.language || "en"
		});
	});
}
async function ADMIN(req) {
	return wrap(async () => {
		session(req, "admin");
		if (req.method !== "GET") throw new Failure("Read only.", 405);
		const rows = q("SELECT id,subscription,reason_id,reason_name,comment,language,period,created,status,error,source FROM portal_surveys ORDER BY created DESC LIMIT 200").all().results;
		let remote = null, remoteError = null;
		if (test) try {
			await subscription({});
			const result = await survey();
			remote = result.cancelSurvey ? {
				subscription: result.subscription,
				cancelSurvey: result.cancelSurvey,
				language: result.language
			} : null;
		} catch (e) {
			remoteError = e.message;
		}
		const activity = q("SELECT * FROM portal_api_activity ORDER BY created DESC LIMIT 100").all().results.map((r) => ({
			...r,
			request: r.request ? JSON.parse(r.request) : null,
			response: r.response ? JSON.parse(r.response) : null
		}));
		return json({
			rows,
			remote,
			remoteError,
			mode,
			activity
		});
	});
}
async function POST(req) {
	return wrap(async () => {
		csrf(req);
		let body;
		try {
			body = await req.json();
		} catch {
			throw new Failure("Invalid JSON.");
		}
		if (body.action === "login") {
			const role = body.role === "admin" ? "admin" : "customer";
			const key = role;
			const now = Date.now();
			q("DELETE FROM portal_limits WHERE reset_at<?", now).run();
			if (q("SELECT * FROM portal_limits WHERE key=?", key).first()?.attempts >= 20) throw new Failure("Too many attempts. Try again in 15 minutes.", 429);
			q("INSERT INTO portal_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1", key, now + 9e5).run();
			if (typeof body.username !== "string" || typeof body.password !== "string" || !safeEqual(body.username, credentials[role][0]) || !safeEqual(body.password, credentials[role][1])) throw new Failure("Incorrect username or password.", 401);
			q("DELETE FROM portal_limits WHERE key=?", key).run();
			const token = randomBytes(32).toString("hex");
			q("DELETE FROM portal_sessions WHERE expires<?", now).run();
			q("INSERT INTO portal_sessions(token_hash,role,expires,fingerprint) VALUES(?,?,?,?)", hash(token), role, now + 36e5, fingerprint).run();
			const secure = new URL(req.url).protocol === "https:";
			return json({ role }, 200, { "Set-Cookie": `portal_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${secure ? "; Secure" : ""}` });
		}
		const s = session(req);
		if (body.action === "logout") {
			q("DELETE FROM portal_sessions WHERE token_hash=?", s.token_hash).run();
			return json({ ok: true }, 200, { "Set-Cookie": "portal_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
		}
		if (s.role !== "customer") throw new Failure("Customer access required.", 403);
		if (body.action === "uncancel") {
			if (body.confirm !== true) throw new Failure("Confirm that you want to restore renewal.");
			const key = test ? subscriptionId() : s.token_hash;
			try {
				q("INSERT INTO portal_locks(subscription,acquired) VALUES(?,?)", key, Date.now()).run();
			} catch {
				throw new Failure("A subscription change is already in progress or needs review.", 409);
			}
			try {
				const sub = await subscription(s);
				if (sub.state === "active" && sub.autoRenew === true) return json({
					ok: true,
					alreadyActive: true
				});
				if (sub.state !== "canceled" || sub.active !== true) throw new Failure("Only a scheduled cancellation can be undone. This subscription is not eligible for uncancel.", 409);
				if (test && q("SELECT id FROM portal_api_activity WHERE subscription=? AND source='test' AND operation='uncancel' AND outcome IN ('pending','unknown') LIMIT 1", sub.id).first()) throw new Failure("A previous uncancel request needs review in FastSpring before retrying.", 409);
				if ((await mutation("uncancel", sub.id, "/subscriptions", "POST", { subscriptions: [{
					subscription: sub.id,
					deactivation: null
				}] }, { subscriptions: [{
					subscription: sub.id,
					action: "subscription.update",
					result: "success"
				}] })).subscriptions?.find((x) => x.subscription === sub.id)?.result !== "success") throw new Failure("FastSpring did not confirm uncancel success. Refresh and review the subscription.", 502);
				if (!test) q("UPDATE portal_sessions SET state='active',period=NULL WHERE token_hash=?", s.token_hash).run();
				q("UPDATE portal_surveys SET status='complete',error=NULL WHERE subscription=? AND source=? AND status='cancel_requested'", sub.id, mode).run();
				return json({ ok: true });
			} finally {
				q("DELETE FROM portal_locks WHERE subscription=?", key).run();
			}
		}
		if (body.action === "reset") {
			if (test) throw new Failure("Create a fresh test subscription in FastSpring to repeat this demo.", 409);
			q("UPDATE portal_sessions SET state='active',period=NULL WHERE token_hash=?", s.token_hash).run();
			return json({ ok: true });
		}
		if (body.action !== "cancel") throw new Failure("Unknown action.");
		if (![0, 1].includes(body.billingPeriod) || typeof body.reasonId !== "string" || typeof body.feedbackText !== "string" || body.feedbackText.length > 2e3 || body.confirm !== true) throw new Failure("Select a reason, cancellation timing, and confirm. Feedback is limited to 2,000 characters.");
		const id = test ? subscriptionId() : s.token_hash;
		try {
			q("INSERT INTO portal_locks(subscription,acquired) VALUES(?,?)", id, Date.now()).run();
		} catch {
			throw new Failure("A cancellation is already in progress or needs administrator review.", 409);
		}
		let attempt;
		try {
			const sub = await subscription(s);
			if (stopped(sub)) {
				q("UPDATE portal_surveys SET status='complete',error=NULL WHERE subscription=? AND source=? AND status='cancel_requested'", sub.id, mode).run();
				return json({
					ok: true,
					alreadyCanceled: true,
					subscription: sub
				});
			}
			if (test && q("SELECT id FROM portal_surveys WHERE subscription=? AND source='test' AND status='cancel_requested' LIMIT 1", sub.id).first()) throw new Failure("A previous cancellation outcome needs review in FastSpring before another attempt.", 409);
			const data = await survey();
			const reason = data.reasons?.find((r) => r.id === body.reasonId && r.enabled !== false);
			if (!reason) throw new Failure("Please refresh and select an available cancellation reason.");
			attempt = q("SELECT * FROM portal_surveys WHERE token_hash=? AND subscription=? AND status!='complete' ORDER BY created DESC LIMIT 1", s.token_hash, sub.id).first();
			if (attempt?.status === "cancel_requested") throw new Failure("The previous cancellation outcome needs review in FastSpring before another attempt.", 409);
			const surveyID = attempt?.id || randomBytes(16).toString("hex");
			const payload = {
				subscription: sub.id,
				cancelSurvey: {
					reasonId: reason.id,
					feedbackText: body.feedbackText,
					lang: data.language || "en"
				}
			};
			q("INSERT INTO portal_surveys(id,token_hash,subscription,reason_id,reason_name,comment,language,period,created,status,source) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET reason_id=excluded.reason_id,reason_name=excluded.reason_name,comment=excluded.comment,period=excluded.period,status=excluded.status,error=NULL", surveyID, s.token_hash, sub.id, reason.id, reason.displayName, body.feedbackText, data.language || "en", body.billingPeriod, (/* @__PURE__ */ new Date()).toISOString(), "saving_survey", mode).run();
			attempt = { id: surveyID };
			if ((await mutation("survey", sub.id, "/subscriptions/cancelSurvey/response", "POST", payload, {
				reasonId: reason.id,
				feedbackText: body.feedbackText,
				lang: data.language || "en"
			})).reasonId !== reason.id) throw new Failure("FastSpring did not confirm the selected survey reason. Cancellation was not sent.", 502);
			q("UPDATE portal_surveys SET status='survey_saved' WHERE id=?", surveyID).run();
			if (test) {
				q("UPDATE portal_surveys SET status='cancel_requested' WHERE id=?", surveyID).run();
				if (((await mutation("cancel", sub.id, "/subscriptions/" + encodeURIComponent(sub.id) + "?billingPeriod=" + body.billingPeriod, "DELETE", void 0, null)).subscriptions?.find((x) => x.subscription === sub.id))?.result !== "success") throw new Failure("FastSpring did not confirm cancellation success. Review the subscription before retrying.", 502);
			} else {
				await mutation("cancel", sub.id, "/subscriptions/" + encodeURIComponent(sub.id) + "?billingPeriod=" + body.billingPeriod, "DELETE", void 0, { subscriptions: [{
					subscription: sub.id,
					action: "subscription.cancel",
					result: "success"
				}] });
				q("UPDATE portal_sessions SET state=?,period=? WHERE token_hash=?", body.billingPeriod === 0 ? "deactivated" : "canceled", body.billingPeriod, s.token_hash).run();
			}
			q("UPDATE portal_surveys SET status='complete' WHERE id=?", surveyID).run();
			return json({
				ok: true,
				billingPeriod: body.billingPeriod
			});
		} catch (e) {
			if (attempt) q("UPDATE portal_surveys SET error=? WHERE id=?", e.message, attempt.id).run();
			throw e;
		} finally {
			q("DELETE FROM portal_locks WHERE subscription=?", id).run();
		}
	});
}
//#endregion
export { ADMIN, GET, META, POST };
