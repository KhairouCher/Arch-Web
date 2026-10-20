"use client";

// Placeholder drafts for the editor, kept in the browser (localStorage for the
// edits, IndexedDB for the photos). It follows the Draft rules of
// docs/backend-model.json and web/db/schema.sql, so the real backend replaces
// this file (task T-022): a draft belongs to a signed-in user, is saved
// automatically, and is deleted one month after its last save together with its
// photos. The mock keeps one draft per user and model.
//
// None of it is shared between devices or browsers.

import { deleteDraftPhotos } from "./photoStore";
import { expiryOf, isExpired } from "../editor/lib/draftState";

const KEY = "archpresent_drafts";

const hasWindow = () => typeof window !== "undefined";

function read() {
  if (!hasWindow()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(list, notify) {
  localStorage.setItem(KEY, JSON.stringify(list));
  if (notify) window.dispatchEvent(new Event("archpresent:store"));
}

export const draftId = (userId, modelId) => `${userId}|${modelId}`;

// Deletes drafts past their expiry, with their photos. Returns how many went.
export function purgeExpiredDrafts() {
  const all = read();
  const keep = all.filter((d) => !isExpired(d));
  const gone = all.filter((d) => isExpired(d));
  if (!gone.length) return 0;
  write(keep, true);
  gone.forEach((d) => deleteDraftPhotos(d.id));
  return gone.length;
}

export function getDraft(userId, modelId) {
  const id = draftId(userId, modelId);
  const d = read().find((x) => x.id === id);
  return d && !isExpired(d) ? d : null;
}

export function listDrafts(userId) {
  return read()
    .filter((d) => d.userId === userId && !isExpired(d))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// Called by the autosave. Does not notify other components: it runs every few
// seconds while editing.
export function saveDraft(userId, model, state) {
  const savedAt = new Date().toISOString();
  const draft = {
    id: draftId(userId, model.id), userId, modelId: model.id, modelName: model.name,
    state, savedAt, expiresAt: expiryOf(savedAt),
  };
  write([...read().filter((d) => d.id !== draft.id), draft], false);
  return draft;
}

export function deleteDraft(id) {
  write(read().filter((d) => d.id !== id), true);
  deleteDraftPhotos(id);
}
