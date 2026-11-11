export const categories = ["随笔", "观测", "照片", "项目"] as const;
export type Category = (typeof categories)[number];

export type Block =
  | { type: "text"; text: string }
  | { type: "image"; key: string; caption: string };

export type Entry = {
  id: string;
  title: string;
  category: Category;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
};

export const MAX_IMAGES = 6;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const examples = [
  {
    id: "sample-moon",
    title: "月球背面的来信",
    category: "随笔",
    date: "2026-11-08T12:00:00+08:00",
    image: "moon",
    caption: "月面明暗交界处",
    text: "有些事要离远一点，才能看清轮廓。今晚抬头看月亮时，我给自己留了一段安静的时间。",
  },
  {
    id: "sample-antenna",
    title: "深夜的低频信号",
    category: "观测",
    date: "2026-11-03T12:00:00+08:00",
    image: "antenna",
    caption: "暮色中的抛物面天线",
    text: "城市慢慢安静下来。风经过屋顶的天线，传来一点很轻的震动，我把它记进了今天的观察。",
  },
  {
    id: "sample-helmet",
    title: "头盔里的橙色余晖",
    category: "照片",
    date: "2026-10-27T12:00:00+08:00",
    image: "helmet",
    caption: "金色面罩映出余晖",
    text: "玻璃面罩反射出一小片橙色。想把这一刻留下来，就像把最后一点日光夹进书里。",
  },
] as const;

export const sampleEntries: Entry[] = examples.map((example) => ({
  id: example.id,
  title: example.title,
  category: example.category,
  blocks: [
    { type: "text", text: example.text },
    { type: "image", key: `./assets/${example.image}.webp`, caption: example.caption },
  ],
  createdAt: Date.parse(example.date),
  updatedAt: Date.parse(example.date),
}));

export function imageUrl(_entry: Entry, block: Extract<Block, { type: "image" }>) {
  return block.key;
}
