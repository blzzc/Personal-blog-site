"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Download, FileText, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { categories, imageTypes, imageUrl, MAX_IMAGE_BYTES, MAX_IMAGES, sampleEntries, type Category, type Entry } from "../lib/journal";

import { deleteDraft, downloadPosts, getDrafts, getPublished, prepareImage, saveDraft } from "../lib/storage";

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai",
});
const displayDate = (time: number) => dateFormat.format(time).replaceAll("-", ".");

function Orbit({ className = "" }: { className?: string }) {
  return <span className={`orbit ${className}`} aria-hidden="true"><i /><b /></span>;
}

function LaunchArt() {
  return (
    <div className="launch-art" aria-hidden="true">
      <div className="launch-scene">
        <span className="launch-sun" />
        <span className="launch-moon" />
        <span className="launch-orbit" />
        <span className="launch-trail" />
        <span className="launch-rocket"><i /><b /></span>
        <span className="launch-star launch-star-top" />
        <span className="launch-star launch-star-bottom" />
      </div>
    </div>
  );
}

const sampleArt = new Map([
  ["sample-moon", "moon"],
  ["sample-antenna", "signal"],
  ["sample-helmet", "visor"],
]);

function EntryCover({ entry }: { entry: Entry }) {
  const artwork = sampleArt.get(entry.id);
  const cover = entry.blocks.find((block) => block.type === "image");
  return (
    <div className="cover">
      {artwork ? <div className={`sample-art sample-art-${artwork}`} aria-hidden="true"><i /><b /><span /></div>
        : cover ? <img src={imageUrl(entry, cover)} alt={cover.caption} /> : <FileText size={42} strokeWidth={1.2} />}
    </div>
  );
}

function Modal({ children, onClose, locked = false }: { children: ReactNode; onClose: () => void; locked?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return (
    <dialog ref={ref} aria-labelledby="modal-heading" onCancel={(event) => {
      event.preventDefault();
      if (!locked) onClose();
    }}>
      <button className="icon-button close" aria-label="关闭" onClick={onClose} disabled={locked}><X size={21} /></button>
      {children}
    </dialog>
  );
}

type DraftBlock =
  | { type: "text"; text: string }
  | { type: "image"; caption: string; key: string };

function Editor({ entry, onClose, onSaved }: { entry?: Entry; onClose: () => void; onSaved: (entry: Entry) => void }) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [category, setCategory] = useState<Category>(entry?.category ?? "随笔");
  const [blocks, setBlocks] = useState<DraftBlock[]>(() => entry
    ? entry.blocks
    : [{ type: "text", text: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const newFiles = Array.from(files);
    if (blocks.filter((block) => block.type === "image").length + newFiles.length > MAX_IMAGES
      || blocks.length + newFiles.length > 50) {
      setError("每篇日志最多可添加 6 张图片、50 个图文段落。");
      return;
    }
    if (newFiles.some((file) => !imageTypes.includes(file.type) || !file.size || file.size > MAX_IMAGE_BYTES)) {
      setError("请选择 JPG、PNG、WebP 或 GIF 图片，每张不超过 8 MB。");
      return;
    }
    setBusy(true);
    try {
      const images: DraftBlock[] = [];
      for (const file of newFiles) {
        images.push({ type: "image" as const, caption: "", key: await prepareImage(file) });
      }
      setBlocks((previous) => [...previous, ...images]);
    } catch {
      setError("无法读取这张图片，请试试另一张。");
    } finally {
      setBusy(false);
    }
  }

  function updateBlock(index: number, block: DraftBlock) {
    setBlocks((previous) => previous.map((old, position) => position === index ? block : old));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!title.trim() || !blocks.some((block) => block.type === "image" || block.text.trim())) {
      setError("请输入标题，并写一点正文或添加图片。");
      return;
    }
    setBusy(true);
    const now = Date.now();
    const saved: Entry = {
      id: entry?.id ?? crypto.randomUUID(),
      title: title.trim(),
      category,
      blocks: blocks.filter((block) => block.type === "image" || block.text.trim()),
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await saveDraft(saved);
      onSaved(saved);
    } catch {
      setError("无法保存草稿，请检查浏览器的存储空间后重试。");

    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} locked={busy}>
      <div className="dialog-content">
        <h2 id="modal-heading">{entry ? "编辑日志" : "写日志"}</h2>
        <form onSubmit={save}>
          <fieldset disabled={busy}>
            <div className="editor-meta">
              <label>标题<input autoFocus required maxLength={100} placeholder="给这篇日志起个名字" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>分类<select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
                {categories.map((option) => <option key={option}>{option}</option>)}
              </select></label>
            </div>
            <div className="blocks">
              {blocks.map((block, index) => (
                <div className="editor-block" key={index}>
                  {block.type === "text"
                    ? <label>正文<textarea rows={5} maxLength={20000} placeholder="今天想记下什么？" value={block.text} onChange={(event) => updateBlock(index, { type: "text", text: event.target.value })} /></label>
                    : <label><img src={block.key} alt={block.caption || "待保存的图片"} /><input aria-label="图片说明" maxLength={200} placeholder="图片说明（可选）" value={block.caption} onChange={(event) => updateBlock(index, { ...block, caption: event.target.value })} /></label>}
                  <button type="button" className="icon-button remove" aria-label={block.type === "text" ? "移除段落" : "移除图片"} onClick={() => setBlocks((previous) => previous.filter((_, position) => position !== index))}><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
            <div className="block-actions">
              <button type="button" className="outline-button" disabled={blocks.length >= 50} onClick={() => setBlocks((previous) => [...previous, { type: "text", text: "" }])}><FileText size={16} /> 加文字</button>
              <button type="button" className="outline-button" onClick={() => fileInput.current?.click()}><ImagePlus size={16} /> 插入图片</button>
              <input hidden ref={fileInput} type="file" multiple accept={imageTypes.join(",")} onChange={(event) => {
                addImages(event.target.files);
                event.target.value = "";
              }} />
            </div>
          </fieldset>
          {error && <p role="alert" className="error">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="outline-button" onClick={onClose} disabled={busy}>取消</button>
            <button type="submit" className="orange-button" disabled={busy}>{busy ? "处理中…" : "保存草稿"} <ArrowUpRight size={18} /></button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function Reader({ entry, draft, onClose, onEdit, onDelete }: { entry: Entry; draft: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exported, setExported] = useState(false);
  const demo = entry.id.startsWith("sample-");

  async function deleteEntry() {
    setBusy(true);
    setError("");
    try {
      await deleteDraft(entry.id);
      onDelete();
    } catch (cause) {
      setError("删除失败，请稍后重试。");
      setBusy(false);
    }
  }

  async function exportEntry() {
    setBusy(true);
    setError("");
    try {
      const live = await getPublished();
      downloadPosts([entry, ...live.filter((post) => post.id !== entry.id)]);
      setExported(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "导出失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} locked={busy}>
      <article className="dialog-content reader">
        <p className="entry-meta"><span>{entry.category}</span><time dateTime={new Date(entry.createdAt).toISOString()}>{displayDate(entry.createdAt)}</time>{demo && <span>示例</span>}{draft && <span>本机草稿</span>}</p>
        <h2 id="modal-heading">{entry.title}</h2>
        {entry.blocks.map((block, index) => block.type === "text"
          ? <p className="entry-text" key={index}>{block.text}</p>
          : <figure key={index}>
              <img src={imageUrl(entry, block)} alt={block.caption || "日志配图"} />
              {block.caption && <figcaption>{block.caption}</figcaption>}
            </figure>)}
        {!demo && (
          <>
            {error && <p role="alert" className="error">{error}</p>}
            {confirm && <p>确定删除这篇草稿及其图片？</p>}
            {exported && <p className="publish-help">将下载的 posts.json 上传到 GitHub 仓库，替换 docs/posts.json。它包含这篇草稿以及网站上已有的日志。</p>}
            <div className="dialog-actions">
              {confirm ? <>
                <button className="outline-button" onClick={() => setConfirm(false)} disabled={busy}>取消</button>
                <button className="orange-button" onClick={deleteEntry} disabled={busy}>{busy ? "删除中…" : "确认删除"}</button>
              </> : <>
                {draft && <button className="outline-button" onClick={() => setConfirm(true)} disabled={busy}><Trash2 size={16} /> 删除草稿</button>}
                <button className="outline-button" onClick={onEdit} disabled={busy}>编辑日志 <ArrowUpRight size={16} /></button>
                {draft && <button className="orange-button" onClick={exportEntry} disabled={busy}><Download size={16} /> {busy ? "处理中…" : "导出发布文件"}</button>}
              </>}
            </div>
          </>
        )}
      </article>
    </Modal>
  );
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [drafts, setDrafts] = useState<Entry[]>([]);
  const [draftError, setDraftError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<"journal" | "gallery" | "drafts">("journal");
  const [filter, setFilter] = useState<Category | "全部">("全部");
  const [modal, setModal] = useState<{ mode: "edit"; entry?: Entry } | { mode: "read"; entry: Entry; draft?: boolean } | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    getPublished().then((result) => {
      if (active) setEntries(result);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    getDrafts().then((result) => {
      if (active) setDrafts(result);
    }).catch(() => {
      if (active) setDraftError(true);
    });
    return () => { active = false; };
  }, []);

  const demo = !loading && !loadError && entries.length === 0;
  const displayed = demo ? sampleEntries : entries;
  const visible = (view === "drafts" ? [...drafts] : displayed.filter((entry) => filter === "全部" || entry.category === filter))
    .sort((left, right) => right.createdAt - left.createdAt);
  const gallery = displayed.flatMap((entry) => entry.blocks.flatMap((block) => block.type === "image" ? [{ entry, block }] : []));
  const close = () => setModal(null);
  const write = () => { setStatus(""); setModal({ mode: "edit" }); };

  function navigate(next: typeof view) {
    setView(next);
    document.getElementById("archive")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" aria-label="轨道日志首页" onClick={() => setView("journal")}>
            <span className="brand-mark"><Orbit /></span>
            <span><strong>ORBITAL LOG</strong><small>轨道日志</small></span>
          </a>
          <nav aria-label="站点导航">
            <button aria-current={view === "journal" ? "page" : undefined} onClick={() => navigate("journal")}>日志档案</button>
            <button aria-current={view === "gallery" ? "page" : undefined} onClick={() => navigate("gallery")}>影像集</button>
            <button aria-current={view === "drafts" ? "page" : undefined} onClick={() => navigate("drafts")}>草稿</button>
          </nav>
          <button className="orange-button header-write" onClick={write} disabled={draftError}><Plus size={17} /> 写日志</button>
        </div>
      </header>

      <main className="shell">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-content">
            <p className="hero-label">个人图文博客</p>
            <h1 id="hero-title">ORBITAL<br />LOG<span>.</span></h1>
            <p className="hero-description">用文字和照片，记录地球上的日常。</p>
            <a href="#archive" className="hero-link" onClick={() => setView("journal")}>浏览日志 <ArrowDown size={15} /></a>
          </div>
          <LaunchArt />
        </section>

        <section className="archive" id="archive" aria-labelledby="archive-title">
          <div className="section-header">
            <div className="section-title">
              <h2 id="archive-title">{view === "journal" ? "日志档案" : view === "gallery" ? "影像集" : "本机草稿"}</h2>
            </div>
            {view === "journal" && (
              <div className="filters" role="group" aria-label="筛选日志分类">
                {(["全部", ...categories] as const).map((item) => (
                  <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>
                ))}
              </div>
            )}
          </div>
          {view !== "drafts" && loading ? <p className="empty">正在读取日志…</p> : view !== "drafts" && loadError ? (
            <p className="empty" role="alert">暂时无法读取日志。<button className="outline-button" onClick={() => location.reload()}>重试</button></p>
          ) : view !== "gallery" ? (
            <>
              {view === "journal" && demo && <p className="sample-note">示例日志 · 发布第一篇日志后将自动替换。</p>}
              {view === "drafts" && <p className="sample-note">{draftError ? "此浏览器暂时无法读取草稿。" : "草稿保存在当前浏览器。打开草稿可导出 GitHub 发布文件。"}</p>}
              {visible.length === 0 && <p className="empty">{view === "drafts" ? "还没有草稿。" : "这个分类还没有日志。"}<button className="outline-button" onClick={write}><Plus size={16} /> 写日志</button></p>}
              <div className="grid">
                {visible.map((entry) => {
                  const excerpt = entry.blocks.find((block) => block.type === "text");
                  return (
                    <article className="card" key={entry.id}>
                      <button className="card-button" onClick={() => setModal({ mode: "read", entry, draft: view === "drafts" })} aria-label={`阅读${entry.title}`}>
                        <EntryCover entry={entry} />
                        <div className="card-content">
                          <p className="entry-meta"><span>{entry.category}</span><time dateTime={new Date(entry.createdAt).toISOString()}>{displayDate(entry.createdAt)}</time></p>
                          <h3>{entry.title}</h3>
                          {excerpt && <p className="excerpt">{excerpt.text}</p>}
                          <span className="card-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
                        </div>
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {demo && <p className="sample-note">示例影像</p>}
              {gallery.length === 0 && <p className="empty">日志中还没有图片。</p>}
              <div className="grid">
                {gallery.map(({ entry, block }, index) => (
                  <button className="gallery-item" key={`${entry.id}-${index}`} onClick={() => setModal({ mode: "read", entry })}>
                    <img src={imageUrl(entry, block)} alt={block.caption || "日志配图"} />
                    <span>{block.caption || entry.title}<ArrowUpRight size={17} /></span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="sr-only" role="status">{status}</div>
          {status && <p className="toast" aria-hidden="true">{status}</p>}
        </section>

        <footer><span><Orbit /> ORBITAL LOG</span><a href="#"><ArrowUp size={14} /> 返回顶部</a></footer>
      </main>

      {modal?.mode === "edit" && (
        <Editor entry={modal.entry} onClose={close} onSaved={(saved) => {
          setDrafts((previous) => [saved, ...previous.filter((entry) => entry.id !== saved.id)]);
          setView("drafts");
          setStatus("草稿已保存");
          setModal({ mode: "read", entry: saved, draft: true });
        }} />
      )}
      {modal?.mode === "read" && (
        <Reader entry={modal.entry} draft={!!modal.draft} onClose={close} onEdit={() => setModal({ mode: "edit", entry: drafts.find((draft) => draft.id === modal.entry.id) ?? modal.entry })} onDelete={() => {
          setDrafts((previous) => previous.filter((entry) => entry.id !== modal.entry.id));
          setStatus("草稿已删除");
          close();
        }} />
      )}
    </>
  );
}
