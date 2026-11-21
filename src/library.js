const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('groove-desk-library', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' })
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})
async function transaction(mode, operation) {
  const db = await database
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', mode)
    const request = operation(tx.objectStore('tracks'))
    tx.oncomplete = () => resolve(request.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
export const getTracks = () => transaction('readonly', store => store.getAll())
export const putTrack = track => transaction('readwrite', store => store.put(track))
export const deleteTrack = id => transaction('readwrite', store => store.delete(id))
