// Shitou audiobook directory: category cards open a Shitou article, whose
// embedded Bilibili video opens as its parts. Offline: the Shitou HTML and
// Bilibili view API are faked.
// node --experimental-vm-modules tests/audiobooks.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { load } from "./harness.mjs";

const plain = (x) => JSON.parse(JSON.stringify(x));
const bvid = "BV1aud000001";
const pid = "2325223";

const homeHtml = `
<article class="post">
  <div class="entry-media">
    <a href="/p/${pid}.html" title="《测试书》有声书合集（作者：测试作者）">
      <img class="lazyload" data-original="//i2.hdslb.com/bfs/archive/a.jpg" />
    </a>
  </div>
  <div class="entry-wrapper">
    <span class="meta-category-dot">
      <a href="/list/cls/10070.html">故事</a>
    </span>
  </div>
</article>`;

const categoryHtml = `
<h1 class="term-title">故事</h1>
<article class="post">
  <div class="entry-media">
    <a href="/p/${pid}.html" title="《测试书》有声书合集（作者：测试作者）">
      <img data-original="https://i1.hdslb.com/bfs/archive/b.jpg" />
    </a>
  </div>
</article>`;

const articleHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<title>《测试书》有声书合集（作者：测试作者） - 【故事】</title>
<meta name="description" content="这是一段测试简介，用来验证文章页可以提取书名、作者、分类和 B 站视频编号。">
</head>
<body>
<iframe src="https://player.bilibili.com/player.html?isOutside=true&amp;bvid=${bvid}"></iframe>
<p>${"测试内容占位符，让页面长度达到站点 HTML 的正常规模。".repeat(8)}</p>
</body>
</html>`;

const brokenArticleHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head><title>《没有视频》 - 【故事】</title></head>
<body><p>${"这篇文章没有嵌入 B 站播放器。".repeat(12)}</p></body>
</html>`;

const videos = {
  [bvid]: {
    bvid,
    aid: 1137,
    title: "测试书原始标题",
    pic: "//i0.hdslb.com/bfs/archive/v.jpg",
    owner: { mid: 7, name: "B站UP" },
    pages: [
      { cid: 11, page: 1, part: "第1集", duration: 60 },
      { cid: 12, page: 2, part: "第2集", duration: 90 },
    ],
  },
};

function fetchFor(article = articleHtml) {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === "/list/cls/10042.html") return new Response(homeHtml);
    if (u.pathname === "/list/cls/10070.html") return new Response(categoryHtml);
    if (u.pathname === `/p/${pid}.html`) return new Response(article);
    if (u.pathname === "/x/frontend/finger/spi") return Response.json({ code: 0, data: { b_3: "B3", b_4: "B4" } });
    if (u.pathname === "/x/web-interface/view") {
      const v = videos[u.searchParams.get("bvid")];
      return Response.json(v ? { code: 0, data: v } : { code: -404, message: "啥都木有" });
    }
    throw new Error(`unexpected ${url}`);
  };
}

const manifest = JSON.parse(await readFile(new URL("../plugin.json", import.meta.url), "utf8"));
const locale = JSON.parse(await readFile(new URL("../locales/zh-CN.json", import.meta.url), "utf8"));

{
  const nav = manifest.navigation.find((n) => n.page === "audiobooks");
  assert.deepEqual(nav, { title: "Audiobooks", page: "audiobooks", icon: "playlist" });
  assert.equal(locale[nav.title], "有声书");
  assert.ok(manifest.permissions.network.includes("www.shitou.club"));
  console.log("PASS navigation: 有声书 sidebar entry and Shitou permission");
}

{
  const { api } = await load({ fetch: fetchFor() });
  const home = plain(await api.browse({ page: "audiobooks" }));
  assert.equal(home.title, "有声书");
  assert.equal(home.sections.length, 1);
  const [latest] = home.sections;
  assert.equal(latest.albums.length, 1);
  assert.equal(latest.links, undefined);
  assert.deepEqual(latest.albums[0], {
    id: `shitou:${pid}`,
    name: "《测试书》有声书合集",
    imageUrl: "https://i2.hdslb.com/bfs/archive/a.jpg@480w_480h_1c.jpg",
    artists: [{ name: "测试作者" }],
    description: "故事",
  });

  const category = plain(await api.browse({ page: "cat:10070:1" }));
  assert.equal(category.title, "故事");
  assert.equal(category.sections.length, 1);
  assert.equal(category.sections[0].albums.length, 1);
  assert.equal(category.sections[0].albums[0].id, `shitou:${pid}`);
  assert.equal(category.sections[0].links, undefined);
  assert.equal(category.sections[0].morePage, undefined);
  console.log("PASS audiobooks: cards open the right page without placeholder link cards");
}

{
  const { api } = await load({ fetch: fetchFor() });
  const { album, tracks } = plain(await api.album({ id: `shitou:${pid}` }));
  assert.equal(album.id, `shitou:${pid}`);
  assert.equal(album.name, "测试书");
  assert.deepEqual(album.artists, [{ name: "测试作者" }]);
  assert.match(album.description, /这是一段测试简介/);
  assert.match(album.description, new RegExp(bvid));
  assert.deepEqual(tracks.map((t) => t.id), [bvid, `${bvid}|12`]);
  assert.deepEqual(tracks.map((t) => t.duration), [60000, 90000]);
  assert.deepEqual(tracks.map((t) => t.album.id), [`shitou:${pid}`, `shitou:${pid}`]);
  console.log("PASS audiobooks: article BVID opens its Bilibili parts as episodes");
}

{
  const { api } = await load({ fetch: fetchFor(brokenArticleHtml) });
  await assert.rejects(() => api.album({ id: `shitou:${pid}` }), /没有可播放的 B 站视频/);
  console.log("PASS audiobooks: an article without a Bilibili video says so");
}
