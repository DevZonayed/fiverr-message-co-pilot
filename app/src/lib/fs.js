// Lightweight helpers for optional File System Access API usage
// Guard everything to gracefully degrade on unsupported browsers

export function isFileSystemAPISupported(){
  return typeof window !== 'undefined' && !!window.showDirectoryPicker
}

export async function pickDirectory(){
  if(!isFileSystemAPISupported()) throw new Error('File System Access API not supported in this browser.')
  const handle = await window.showDirectoryPicker()
  return handle
}

export function fileNameFromConversation(c){
  const safeClient = c.clientName.replace(/[^a-z0-9-_]/gi, '_')
  const safeTitle = c.projectTitle.replace(/[^a-z0-9-_]/gi, '_')
  return `fiverr_${safeClient}__${safeTitle}__${new Date(c.createdAt).toISOString()}__${c.id}.json`
}

export async function writeConversationToFile(dirHandle, conversation){
  if(!dirHandle) return
  const name = fileNameFromConversation(conversation)
  const fileHandle = await dirHandle.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(conversation, null, 2))
  await writable.close()
}

export async function writeAllConversations(dirHandle, conversations){
  if(!dirHandle) return
  for(const c of conversations){
    try{ await writeConversationToFile(dirHandle, c) }catch{}
  }
}

export async function readAllConversationsFromFolder(dirHandle){
  if(!dirHandle) return []
  const result = []
  for await (const [name, entry] of dirHandle.entries()){
    if(!name.endsWith('.json')) continue
    if(entry.kind !== 'file') continue
    try{
      const file = await entry.getFile()
      const text = await file.text()
      const json = JSON.parse(text)
      if(json && typeof json === 'object' && json.id){ result.push(json) }
    }catch{}
  }
  return result
}


