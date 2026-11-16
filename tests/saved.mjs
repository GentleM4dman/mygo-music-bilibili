// Saved Collections: a page of every favorites folder, its videos as album
// cards, so a video of many parts is one card that opens to its parts.
// Offline: Bilibili's API is faked, with BV1pr6aYiE97's real parts.
// node --experimental-vm-modules tests/saved.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { load } from "./harness.mjs";

const plain = (x) => JSON.parse(JSON.stringify(x));

const target = "BV1pr6aYiE97";
const cids = `27595114187,27595114416,27595114847,27595115012,27595115389,27595115663,27595115920,27595116192,27595116382,27595178044,27595178470,27595178663,27595178725,27595179114,27595179481,27595179682,27595179989,27595180208,27595180533,27595180812,27595181055,27595181320,27595181517,27595181720,27595181933,27595243571,27595243900,27595244407,27595244561,27595244849,27595245252,27595245354,27595245674,27595245850,27595246098,27595246517,27595246757,27595247107,27595247272,27595247562,27595309210,27595309516,27595309943,27595310153,27595310327,27595310655,27595310927,27595311225,27595311307,27595311703,27595311804,27595312271,27595312138,27595312673,27595313047,27595374696,27595375011,27595375304,27595375471,27595375778,27595376196,27595376418,27595376701,27595376672,27595377295,27595377495,27595377563,27595377958,27595378058,27595440668,27595440944,27595441164,27595441294,27595441680,27595441985,27595442192,27595442472,27595442681,27595443007,27595443374,27595506373,27595506684,27595506849,27595507109,27595507411,27595508336,27595508545,27595509361,27595509524,27595509748,27595571523,27595571717,27595571786,27595572307,27595572391,27595572660,27595573074,27595573348,27595573599,27595636868`.split(",").map(Number);
const durations = `232,266,244,272,283,274,242,212,310,214,243,202,283,266,249,257,256,272,234,204,209,196,232,260,224,243,230,241,247,297,281,196,205,287,205,264,214,246,261,314,240,248,252,297,240,281,249,235,221,223,239,211,283,253,207,260,238,248,260,271,233,238,259,223,240,216,286,248,322,214,275,105,275,247,277,237,254,278,248,433,265,285,211,273,260,222,167,253,208,185,189,283,219,228,178,236,196,174,241,243`.split(",").map(Number);
const owner = { mid: 3546580254722351, name: "发狂的音乐细胞" };
const pagesOf = (cs, ds) => cs.map((cid, i) => ({ cid, page: i + 1, part: `part ${i + 1}`, duration: ds[i] }));
const videos = {
  [target]: { bvid: target, aid: 113736153043922, title: "华语女声 | 温暖治愈 值得你单曲循环一整天的歌单", pic: "//i0.hdslb.com/bfs/archive/a.jpg", owner, pubdate: 1735300000, cid: cids[0], pages: pagesOf(cids, durations) },
  BV1two11111A: { bvid: "BV1two11111A", aid: 2, title: "two parts", owner, pages: pagesOf([201, 202], [60, 70]) },
};
const media = (bvid, page, duration, extra = {}) => ({ id: 1, type: 2, bvid, title: videos[bvid]?.title || bvid, cover: "//i0.hdslb.com/bfs/archive/c.jpg", duration, page, attr: 0, upper: owner, pubtime: 1735300000, ...extra });

// The folders: id → { title, medias }, those of `down` failing to load.
function bilibili({ created = [], collected = [], contents = {}, down = new Set(), collectedDown = false }) {
  const asked = [];
  const fetch = async (url) => {
    const u = new URL(url);
    const q = Object.fromEntries(u.searchParams);
    asked.push(`${u.pathname}?${u.searchParams}`);
    if (u.pathname === "/x/frontend/finger/spi") return Response.json({ code: 0, data: { b_3: "B3", b_4: "B4" } });
    if (u.pathname === "/x/v3/fav/folder/created/list-all") return Response.json({ code: 0, data: { count: created.length, list: created } });
    if (u.pathname === "/x/v3/fav/folder/collected/list") {
      if (collectedDown) throw new TypeError("fetch failed");
      return Response.json({ code: 0, data: { count: collected.length, list: collected } });
    }
    if (u.pathname === "/x/v3/fav/resource/list") {
      if (down.has(q.media_id)) throw new TypeError("fetch failed");
      const f = contents[q.media_id];
      if (!f) return Response.json({ code: -404, message: "啥都木有" });
      const pn = +q.pn;
      const all = f.medias;
      return Response.json({ code: 0, data: { info: { id: +q.media_id, title: f.title, media_count: all.length, upper: { mid: 1, name: "me" } }, medias: all.slice((pn - 1) * 20, pn * 20), has_more: pn * 20 < all.length } });
    }
    if (u.pathname === "/x/web-interface/view") {
      const v = videos[q.bvid];
      return Response.json(v ? { code: 0, data: v } : { code: -404, message: "啥都木有" });
    }
    throw new Error(`unexpected ${url}`);
  };
  const count = (path) => asked.filter((a) => a.startsWith(path)).length;
  return { fetch, asked, count, folderReads: (id) => asked.filter((a) => a.startsWith("/x/v3/fav/resource/list") && new URLSearchParams(a.split("?")[1]).get("media_id") === String(id)).length };
}

const signedIn = () => new Map([["cookie", "DedeUserID=1; SESSDATA=x; bili_jct=y"]]);
const folder = (id, title, media_count, extra = {}) => ({ id, fid: id, mid: 1, title, cover: "", media_count, attr: 0, upper: { mid: 1, name: "me" }, ...extra });
const locale = JSON.parse(await readFile(new URL("../locales/zh-CN.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../plugin.json", import.meta.url), "utf8"));

{ // The entry: in the sidebar after Favorites, its name in Chinese.
  const nav = manifest.navigation;
  const at = nav.findIndex((n) => n.page === "saved");
  assert.ok(at > 0 && nav[at - 1].builtin === "liked");
  assert.deepEqual(nav[at], { title: "Saved Collections", page: "saved", icon: "album" });
  assert.equal(locale["Saved Collections"], "收藏合集");
  console.log("PASS navigation: 收藏合集 after Favorites");
}

{ // The screenshot: 音乐合集, three videos, one of them 100 parts.
  const music = [media(target, 100, 24447), media("BV1two11111A", 2, 130), media("BV1one11111A", 1, 180)];
  const b = bilibili({
    created: [folder(1, "默认收藏夹", 2), folder(9, "音乐合集", 3), folder(10, "空的", 0), folder(11, "坏了", 4)],
    collected: [
      { id: 77, type: 21, title: "某个合集", cover: "//i0.hdslb.com/bfs/archive/s.jpg", media_count: 25, ctime: 1700000000, upper: { mid: 5, name: "up5" } },
      folder(30, "别人的收藏夹", 1, { type: 11, upper: { mid: 6, name: "up6" } }),
    ],
    contents: {
      1: { title: "默认收藏夹", medias: [media("BV1def11111A", 1, 100), media("BV1gone1111A", 3, 600, { attr: 9, title: "已失效视频" })] },
      9: { title: "音乐合集", medias: music },
      30: { title: "别人的收藏夹", medias: [media("BV1oth11111A", 1, 90)] },
    },
    down: new Set(["11"]),
  });
  const { api } = await load({ fetch: b.fetch, storage: signedIn() });
  const page = plain(await api.browse({ page: "saved" }));
  assert.equal(page.title, "收藏合集");
  assert.ok(!("subtitle" in page), "no subtitle");
  assert.deepEqual(page.sections.map((s) => s.title), ["默认收藏夹", "音乐合集", "空的", "坏了", "别人的收藏夹", "订阅的合集"]);
  const [def, mus, empty, broken, other, seasons] = page.sections;

  // Three cards, not 246 rows: no tracks, and no video looked up for them.
  assert.equal(mus.albums.length, 3);
  assert.ok(page.sections.every((s) => !s.tracks));
  assert.equal(b.count("/x/web-interface/view"), 0);
  assert.deepEqual(mus.albums.map((a) => a.id), [target, "BV1two11111A", "BV1one11111A"]);
  assert.deepEqual(mus.albums[0], {
    id: target,
    name: "华语女声 | 温暖治愈 值得你单曲循环一整天的歌单",
    imageUrl: "https://i0.hdslb.com/bfs/archive/c.jpg@480w_480h_1c.jpg",
    artists: [{ id: String(owner.mid), name: owner.name }],
    released: "2024-12-27",
  });
  assert.equal(mus.morePage, undefined, "all of it is here");

  // A video that's gone has no card. An empty folder isn't asked for; one
  // that fails says so, and can be tried again; the rest are there all the same.
  assert.deepEqual(def.albums.map((a) => a.id), ["BV1def11111A"]);
  assert.equal(b.folderReads(10), 0);
  assert.deepEqual([empty.albums, empty.empty], [undefined, "这个收藏夹是空的"]);
  assert.deepEqual([broken.albums, broken.empty, broken.morePage], [undefined, "这个收藏夹没能载入，请稍后再试", "saved:fav:11"]);
  assert.deepEqual(other.albums.map((a) => a.id), ["BV1oth11111A"]);
  // A saved collection is one card, opening as an uploader's collection does.
  assert.deepEqual(seasons.albums, [{ id: "season:5:77", name: "某个合集", imageUrl: "https://i0.hdslb.com/bfs/archive/s.jpg@480w_480h_1c.jpg", artists: [{ id: "5", name: "up5" }], released: "2023-11-14" }]);
  // Each folder once, one page of it.
  for (const id of [1, 9, 11, 30]) assert.equal(b.folderReads(id), 1);

  // The card opens to the video's 100 parts, in order, each its own length.
  const { album, tracks } = plain(await api.album({ id: target }));
  assert.equal(album.id, target);
  assert.equal(tracks.length, 100);
  assert.deepEqual(tracks.map((t) => t.id), cids.map((cid, i) => (i === 0 ? target : `${target}|${cid}`)));
  assert.deepEqual(tracks.map((t) => t.duration), durations.map((s) => s * 1000));
  assert.equal(tracks.reduce((s, t) => s + t.duration, 0), 24447000);
  assert.equal(new Set(tracks.map((t) => t.id)).size, 100);

  // And the folder as a playlist plays through the parts as before.
  const pl = plain(await api.playlist({ id: "fav:9" }));
  assert.deepEqual(pl.tracks.map((t) => t.id), [...cids.map((cid, i) => (i === 0 ? target : `${target}|${cid}`)), "BV1two11111A", "BV1two11111A|202", "BV1one11111A"]);
  console.log("PASS 收藏合集: 音乐合集 is 3 cards; the 100-part card opens to its parts");
}

{ // A big folder: twenty here, all of it on its own page, gone videos counted.
  const many = Array.from({ length: 47 }, (_, i) =>
    i % 10 === 3 ? media(`BV1gone${String(i).padStart(4, "0")}A`, 1, 0, { attr: 9, title: "已失效视频" }) : media(`BV1big${String(i).padStart(5, "0")}A`, 1, 100),
  );
  const b = bilibili({ created: [folder(40, "大收藏夹", 47)], contents: { 40: { title: "大收藏夹", medias: many } } });
  const { api } = await load({ fetch: b.fetch, storage: signedIn() });
  const [sec] = plain(await api.browse({ page: "saved" })).sections;
  assert.equal(sec.albums.length, 18);
  assert.equal(sec.morePage, "saved:fav:40");
  const whole = plain(await api.browse({ page: sec.morePage }));
  assert.equal(whole.title, "大收藏夹");
  assert.equal(whole.subtitle, "5 个已失效视频未显示");
  assert.deepEqual(whole.sections[0].albums.map((a) => a.id), many.filter((m) => m.attr !== 9).map((m) => m.bvid));
  assert.equal(b.folderReads(40), 1 + 3, "every page of it");
  console.log("PASS big folder: first page here, all 42 playable on its own page");
}

{ // A folder of only gone videos; no collections list; no folders at all.
  const b = bilibili({ created: [folder(50, "全失效", 1)], contents: { 50: { title: "全失效", medias: [media("BV1gone1111A", 1, 0, { attr: 9 })] } }, collectedDown: true });
  const { api } = await load({ fetch: b.fetch, storage: signedIn() });
  const page = plain(await api.browse({ page: "saved" }));
  assert.deepEqual(page.sections, [{ title: "全失效", albums: [], empty: "这个收藏夹里的视频都已失效" }]);

  const none = bilibili({});
  const { api: api2 } = await load({ fetch: none.fetch, storage: signedIn() });
  assert.deepEqual(plain(await api2.browse({ page: "saved" })).sections, [{ empty: "你在B站还没有收藏夹" }]);
  console.log("PASS gone, failed and missing folders: said so, not an error");
}

{ // The order setting: in the manifest as a text field, labelled in Chinese.
  const st = manifest.settings.find((x) => x.key === "savedOrder");
  assert.equal(st.type, "text");
  assert.equal(locale[st.label], "收藏合集顺序");
  assert.match(locale[st.help], /例：音乐合集, 默认收藏夹/);
  assert.equal(locale["A video of many parts opens to its parts"], undefined);
  console.log("PASS setting: 收藏合集顺序, a text field with an example");
}

{ // The folders in the order the setting gives; the videos in theirs.
  const music = [media(target, 100, 24447), media("BV1two11111A", 2, 130), media("BV1one11111A", 1, 180)];
  const world = () => bilibili({
    created: [folder(1, "默认收藏夹", 1), folder(2, "游戏", 1), folder(9, "音乐合集", 3), folder(3, "Live", 1), folder(4, "游戏", 1)],
    collected: [
      { id: 77, type: 21, title: "某个合集", media_count: 2, upper: { mid: 5, name: "up5" } },
      folder(30, "别人的收藏夹", 1, { type: 11 }),
    ],
    contents: {
      1: { title: "默认收藏夹", medias: [media("BV1def11111A", 1, 100)] },
      2: { title: "游戏", medias: [media("BV1gam11111A", 1, 100)] },
      9: { title: "音乐合集", medias: music },
      3: { title: "Live", medias: [media("BV1liv11111A", 1, 100)] },
      4: { title: "游戏", medias: [media("BV1gam22222A", 1, 100)] },
      30: { title: "别人的收藏夹", medias: [media("BV1oth11111A", 1, 90)] },
    },
  });
  const order = async (savedOrder) => {
    const b = world();
    const { api } = await load({ fetch: b.fetch, storage: signedIn(), settings: { savedOrder } });
    const page = plain(await api.browse({ page: "saved" }));
    return { page, titles: page.sections.map((s) => s.title), b };
  };
  const bilibiliOrder = ["默认收藏夹", "游戏", "音乐合集", "Live", "游戏", "别人的收藏夹", "订阅的合集"];

  // Blank, or only spaces and commas: Bilibili's order.
  for (const blank of [undefined, "", "  ", " , ，、 "]) assert.deepEqual((await order(blank)).titles, bilibiliOrder, `blank ${JSON.stringify(blank)}`);

  // 音乐合集 first; the rest as they were.
  const { page, titles, b } = await order("音乐合集");
  assert.deepEqual(titles, ["音乐合集", "默认收藏夹", "游戏", "Live", "游戏", "别人的收藏夹", "订阅的合集"]);
  assert.deepEqual(page.sections[0].albums.map((a) => a.id), [target, "BV1two11111A", "BV1one11111A"], "its videos in their order");
  assert.equal(b.count("/x/web-interface/view"), 0);
  assert.equal(b.count("/x/v3/fav/folder/sort"), 0, "Bilibili's order is left alone");
  assert.ok(b.asked.every((a) => !/\/(deal|sort|move|edit)/.test(a)), "nothing asked of Bilibili but to read");

  // The help's example, with spaces, either comma, a name twice, one not found
  // and one in other case; a folder of another's, by name; one by its id.
  assert.deepEqual((await order(" 音乐合集 ，默认收藏夹, 音乐合集, 没有这个, live")).titles, ["音乐合集", "默认收藏夹", "Live", "游戏", "游戏", "别人的收藏夹", "订阅的合集"]);
  assert.deepEqual((await order("别人的收藏夹、3")).titles, ["别人的收藏夹", "Live", "默认收藏夹", "游戏", "音乐合集", "游戏", "订阅的合集"]);
  // Two folders of one name go together, as they were between themselves.
  const games = await order("游戏, 音乐合集");
  assert.deepEqual(games.titles, ["游戏", "游戏", "音乐合集", "默认收藏夹", "Live", "别人的收藏夹", "订阅的合集"]);
  assert.deepEqual(games.page.sections.slice(0, 2).map((s) => s.albums[0].id), ["BV1gam11111A", "BV1gam22222A"]);
  assert.deepEqual(games.page.sections.slice(0, 2).map((s) => s.morePage), [undefined, undefined]);
  // Every folder there once, whatever the setting.
  for (const o of ["音乐合集,音乐合集,音乐合集", "游戏,游戏", "4,游戏", "9, 音乐合集, 1"]) {
    const { titles } = await order(o);
    assert.deepEqual([...titles].sort(), [...bilibiliOrder].sort(), o);
  }
  assert.deepEqual((await order("4,游戏")).page.sections.slice(0, 2).map((s) => s.albums[0].id), ["BV1gam22222A", "BV1gam11111A"]);

  // The card still opens to the parts; the playlist still plays them.
  const { api } = await load({ fetch: world().fetch, storage: signedIn(), settings: { savedOrder: "音乐合集" } });
  assert.equal(plain(await api.album({ id: target })).tracks.length, 100);
  assert.equal(plain(await api.playlist({ id: "fav:9" })).tracks.length, 103);
  console.log("PASS order setting: named folders first, the rest as they were");
}

{ // Signed out: asks to sign in, as Following does, and asks Bilibili nothing.
  const b = bilibili({});
  const { api } = await load({ fetch: b.fetch });
  await assert.rejects(api.browse({ page: "saved" }), (e) => /signIn/.test(e.code || e.message));
  assert.equal(b.count("/x/v3/fav"), 0);
  // Other pages are as they were.
  await assert.rejects(api.browse({ page: "saved:nope" }), (e) => /unavailable/.test(e.code || e.message));
  console.log("PASS signed out: sign in first");
}
console.log("saved collections tests passed");
