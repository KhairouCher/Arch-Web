"use client";

// The buyer's uploaded photos for drafts, kept in the browser's IndexedDB
// (localStorage is far too small for photos). Placeholder for the private
// object store of the real backend (Backend Model class Photo, task T-022).
// Each photo is saved under "<draftId>|<page>|<zone>". Every function fails
// quietly (resolves with nothing) when IndexedDB is unavailable, for example in
// a private window, so the editor keeps working without photo saving.

const DB = "archpresent_draft_photos";
const STORE = "photos";

function open() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") { resolve(null); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function run(mode, fn) {
  return open().then((db) => new Promise((resolve) => {
    if (!db) { resolve(undefined); return; }
    let result;
    try {
      const tx = db.transaction(STORE, mode);
      result = fn(tx.objectStore(STORE));
      tx.oncomplete = () => { db.close(); resolve(result?.result); };
      tx.onerror = tx.onabort = () => { db.close(); resolve(undefined); };
    } catch {
      db.close();
      resolve(undefined);
    }
  }));
}

export const photoKey = (draftId, pageIndex, zoneId) => `${draftId}|${pageIndex}|${zoneId}`;

export const putPhoto = (key, blob) => run("readwrite", (s) => s.put(blob, key));
export const getPhoto = (key) => run("readonly", (s) => s.get(key));
export const deletePhoto = (key) => run("readwrite", (s) => s.delete(key));

// Every photo of one draft (all pages), for when the draft is deleted or expires.
export const deleteDraftPhotos = (draftId) =>
  run("readwrite", (s) => s.delete(IDBKeyRange.bound(`${draftId}|`, `${draftId}|￿`)));
