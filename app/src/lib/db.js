// Minimal IndexedDB helpers for persistent storage

const DB_NAME = 'fiverr_copilot'
const DB_VERSION = 1
const STORES = {
  conversations: 'conversations',
  settings: 'settings',
  templates: 'templates',
}

function openDatabase(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if(!db.objectStoreNames.contains(STORES.conversations)){
        db.createObjectStore(STORES.conversations, { keyPath: 'id' })
      }
      if(!db.objectStoreNames.contains(STORES.settings)){
        db.createObjectStore(STORES.settings, { keyPath: 'id' })
      }
      if(!db.objectStoreNames.contains(STORES.templates)){
        db.createObjectStore(STORES.templates, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function withTx(mode, storeName, fn){
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const result = fn(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  }))
}

export async function getAll(storeName){
  return withTx('readonly', storeName, (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  })
}

export async function put(storeName, value){
  return withTx('readwrite', storeName, (store) => {
    store.put(value)
  })
}

export async function bulkPut(storeName, values){
  return withTx('readwrite', storeName, (store) => {
    for(const v of values){ store.put(v) }
  })
}

export async function clear(storeName){
  return withTx('readwrite', storeName, (store) => { store.clear() })
}

export async function getSettings(){
  const arr = await getAll(STORES.settings)
  const row = arr.find(x => x.id === 'settings')
  return row || null
}

export async function saveSettings(settings){
  const row = { id: 'settings', ...settings }
  await put(STORES.settings, row)
}

export const stores = STORES


