import { categories, imageTypes, type Entry } from "./journal";

const storeName = "drafts";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("orbital-log", 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function drafts<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = operation(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const getDrafts = () => drafts<Entry[]>("readonly", (store) => store.getAll());
export const saveDraft = (entry: Entry) => drafts("readwrite", (store) => store.put(entry));
export const deleteDraft = (id: string) => drafts("readwrite", (store) => store.delete(id));

export function isPublishableImage(value: string) {
  return imageTypes.some((type) => value.startsWith(`data:${type};base64,`));
}

export async function getPublished() {
  const response = await fetch(import.meta.env.DEV ? "./docs/posts.json" : "./posts.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("发布文件读取失败");
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("发布文件格式错误");
  const entries: Entry[] = [];
  for (const entry of data) {
    if (!entry || typeof entry.id !== "string" || typeof entry.title !== "string"
      || !categories.includes(entry.category) || !Number.isFinite(entry.createdAt) || !Number.isFinite(entry.updatedAt)
      || !Array.isArray(entry.blocks) || !entry.blocks.every((block: Entry["blocks"][number]) => block &&
        (block.type === "text" ? typeof block.text === "string"
          : block.type === "image" && typeof block.caption === "string" && typeof block.key === "string" && isPublishableImage(block.key)))) {
      throw new Error("发布文件格式错误");
    }
    entries.push(entry);
  }
  return entries;
}

export function downloadPosts(entries: Entry[]) {
  const file = new Blob([JSON.stringify(entries)], { type: "application/json" });
  if (file.size > 25 * 1024 * 1024) throw new Error("发布文件超过 25 MB，请减少图片数量或压缩图片。");
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "posts.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function prepareImage(file: File) {
  if (file.type === "image/gif") return imageToDataUrl(file);
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("图片处理失败");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.84);
  } finally {
    image.close();
  }
}
