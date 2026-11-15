// Saved playlists list a video of many parts as its parts, in their order, so
// the playlist plays through them before the next video. Offline: Bilibili's
// API is faked, with BV1pr6aYiE97's real parts (100 of them, 24447 s).
// node --experimental-vm-modules tests/playlists.mjs
import assert from "node:assert/strict";
import { load } from "./harness.mjs";

// The plugin runs in its own context, whose arrays assert won't take for ours.
const plain = (x) => JSON.parse(JSON.stringify(x));

const target = "BV1pr6aYiE97";
const cids = `27595114187,27595114416,27595114847,27595115012,27595115389,27595115663,27595115920,27595116192,27595116382,27595178044,27595178470,27595178663,27595178725,27595179114,27595179481,27595179682,27595179989,27595180208,27595180533,27595180812,27595181055,27595181320,27595181517,27595181720,27595181933,27595243571,27595243900,27595244407,27595244561,27595244849,27595245252,27595245354,27595245674,27595245850,27595246098,27595246517,27595246757,27595247107,27595247272,27595247562,27595309210,27595309516,27595309943,27595310153,27595310327,27595310655,27595310927,27595311225,27595311307,27595311703,27595311804,27595312271,27595312138,27595312673,27595313047,27595374696,27595375011,27595375304,27595375471,27595375778,27595376196,27595376418,27595376701,27595376672,27595377295,27595377495,27595377563,27595377958,27595378058,27595440668,27595440944,27595441164,27595441294,27595441680,27595441985,27595442192,27595442472,27595442681,27595443007,27595443374,27595506373,27595506684,27595506849,27595507109,27595507411,27595508336,27595508545,27595509361,27595509524,27595509748,27595571523,27595571717,27595571786,27595572307,27595572391,27595572660,27595573074,27595573348,27595573599,27595636868`.split(",").map(Number);
const durations = `232,266,244,272,283,274,242,212,310,214,243,202,283,266,249,257,256,272,234,204,209,196,232,260,224,243,230,241,247,297,281,196,205,287,205,264,214,246,261,314,240,248,252,297,240,281,249,235,221,223,239,211,283,253,207,260,238,248,260,271,233,238,259,223,240,216,286,248,322,214,275,105,275,247,277,237,254,278,248,433,265,285,211,273,260,222,167,253,208,185,189,283,219,228,178,236,196,174,241,243`.split(",").map(Number);
const owner = { mid: 3546580254722351, name: "发狂的音乐细胞" };
const pagesOf = (cs, ds) => cs.map((cid, i) => ({ cid, page: i + 1, part: i === 0 ? "001. 郁可唯 - 去有风的地方" : `part ${i + 1}`, duration: ds[i] }));

const videos = {
  [target]: { bvid: target, aid: 113736153043922, title: "华语女声 | 温暖治愈 值得你单曲循环一整天的歌单", pic: "//i0.hdslb.com/bfs/archive/a.jpg", owner, cid: cids[0], pages: pagesOf(cids, durations) },
  BV1two11111A: { bvid: "BV1two11111A", aid: 2, title: "two parts", owner, pages: pagesOf([201, 202], [60, 70]) },
};
const media = (bvid, page, duration, extra = {}) => ({ id: 1, type: 2, bvid, title: videos[bvid]?.title || bvid, cover: "", duration, page, attr: 0, upper: owner, ...extra });

function bilibili({ folder = [], season = null, broken = new Set() } = {}) {
  const asked = [];
  let inFlight = 0;
  let mostAtOnce = 0;
  const fetch = async (url) => {
    const u = new URL(url);
    const q = Object.fromEntries(u.searchParams);
    asked.push(`${u.pathname}?${u.searchParams}`);
    if (u.pathname === "/x/frontend/finger/spi") return Response.json({ code: 0, data: { b_3: "B3", b_4: "B4" } });
    if (u.pathname === "/x/v3/fav/resource/list") {
      const pn = +q.pn;
      return Response.json({ code: 0, data: { info: { id: 9, title: "音乐合集", media_count: folder.length, upper: { mid: 1, name: "me" } }, medias: folder.slice((pn - 1) * 20, pn * 20), has_more: pn * 20 < folder.length } });
    }
    if (u.pathname === "/x/space/fav/season/list") {
      const pn = +q.pn;
      const all = season.medias;
      return Response.json({ code: 0, data: { info: { id: season.id, title: "合集", media_count: all.length }, medias: all.slice((pn - 1) * 20, pn * 20) } });
    }
    if (u.pathname === "/x/web-interface/view") {
      inFlight++;
      mostAtOnce = Math.max(mostAtOnce, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      if (broken.has(q.bvid)) throw new TypeError("fetch failed");
      const v = videos[q.bvid] || season?.views?.[q.bvid];
      return Response.json(v ? { code: 0, data: v } : { code: -404, message: "啥都木有" });
    }
    throw new Error(`unexpected ${url}`);
  };
  return { fetch, asked, views: () => asked.filter((a) => a.startsWith("/x/web-interface/view")), mostAtOnce: () => mostAtOnce };
}

const signedIn = () => new Map([["cookie", "DedeUserID=1; SESSDATA=x; bili_jct=y"]]);

{ // A folder of single- and many-part videos, deleted and private ones too.
  const b = bilibili({
    folder: [
      media("BV1one11111A", 1, 180),
      media(target, 100, 24447),
      media("BV1gone1111A", 3, 600, { attr: 9, title: "已失效视频" }),
      media("BV1priv1111A", 58, 14285, { attr: 1 }), // view: -404
      media("BV1two11111A", undefined, 130), // no page count: view says
      media("BV1down1111A", 5, 900), // view fails
      media("BV1one22222A", 1, 200),
    ],
    broken: new Set(["BV1down1111A"]),
  });
  const { api } = await load({ fetch: b.fetch, storage: signedIn() });
  const pl = plain(await api.playlist({ id: "fav:9" }));
  const ids = pl.tracks.map((t) => t.id);

  // The video's 100 parts, between the videos around it, in the parts' order.
  assert.equal(ids[0], "BV1one11111A");
  const parts = pl.tracks.slice(1, 101);
  assert.deepEqual(parts.map((t) => t.id), cids.map((cid, i) => (i === 0 ? target : `${target}|${cid}`)));
  assert.deepEqual(parts.map((t) => t.duration), durations.map((s) => s * 1000));
  assert.equal(parts.reduce((s, t) => s + t.duration, 0), 24447000);
  assert.equal(parts[0].name, "P1 001. 郁可唯 - 去有风的地方");
  assert.equal(parts[99].url, `https://www.bilibili.com/video/${target}?p=100`);
  assert.ok(parts.every((t) => t.album.id === target && !t.unavailable));
  // P52 and P53's cids are out of order: the parts' order is kept, not the cids'.
  assert.ok(cids[52] < cids[51] && parts[52].id === `${target}|${cids[52]}`);

  // What can't be expanded stays, one track as before, in its place.
  const rest = pl.tracks.slice(101);
  assert.deepEqual(rest.map((t) => t.id), ["BV1gone1111A", "BV1priv1111A", "BV1two11111A", "BV1two11111A|202", "BV1down1111A", "BV1one22222A"]);
  assert.equal(rest[0].unavailable, true);
  assert.equal(rest[1].duration, 14285000);
  assert.deepEqual([rest[2].duration, rest[3].duration], [60000, 70000]);
  assert.equal(rest[4].duration, 900000);

  assert.equal(pl.trackCount, pl.tracks.length);
  assert.equal(pl.tracks.length, 1 + 100 + 6);
  assert.equal(new Set(ids).size, ids.length, "no id twice");
  // Single-part and deleted videos aren't looked up; the rest a few at a time.
  assert.deepEqual(b.views().map((a) => new URLSearchParams(a.split("?")[1]).get("bvid")).sort(), [target, "BV1down1111A", "BV1priv1111A", "BV1two11111A"].sort());
  assert.ok(b.mostAtOnce() <= 4, `at most 4 views at once, was ${b.mostAtOnce()}`);
  console.log("PASS favorites folder: parts in order, unresolved videos kept");
}

{ // A folder of single-part videos asks Bilibili for nothing more.
  const b = bilibili({ folder: Array.from({ length: 45 }, (_, i) => media(`BV1one${String(i).padStart(5, "0")}A`, 1, 100 + i)) });
  const { api } = await load({ fetch: b.fetch, storage: signedIn() });
  const pl = plain(await api.playlist({ id: "fav:9" }));
  assert.equal(pl.tracks.length, 45);
  assert.equal(pl.trackCount, 45);
  assert.equal(b.views().length, 0);
  assert.deepEqual(pl.tracks.map((t) => t.duration), Array.from({ length: 45 }, (_, i) => (100 + i) * 1000));
  console.log("PASS favorites folder of single-part videos: unchanged, no extra requests");
}

{ // A saved collection over two pages: expanded parts don't end the paging.
  const bv = (i) => `BV1ep${String(i).padStart(6, "0")}`;
  const n = 25;
  const medias = Array.from({ length: n }, (_, i) => ({ id: i + 1, bvid: bv(i), title: `ep ${i}`, cover: "", duration: 100, upper: owner }));
  const episodes = medias.filter((_, i) => i !== 24).map((m, i) => ({
    bvid: m.bvid,
    // The second episode has 30 parts, enough to pass the count of videos.
    pages: i === 1 ? pagesOf(Array.from({ length: 30 }, (_, k) => 5000 + k), Array(30).fill(10)) : pagesOf([4000 + i], [100]),
  }));
  const views = {
    [bv(0)]: { bvid: bv(0), title: "ep 0", owner, pages: episodes[0].pages, ugc_season: { id: 77, sections: [{ episodes: episodes.slice(0, 12) }, { episodes: episodes.slice(12) }] } },
    // Not among the collection's episodes in that view: asked for by itself.
    [bv(24)]: { bvid: bv(24), title: "ep 24", owner, pages: pagesOf([6001, 6002], [40, 50]) },
  };
  const b = bilibili({ season: { id: 77, medias, views } });
  const { api } = await load({ fetch: b.fetch });
  const pl = plain(await api.playlist({ id: "season:77" }));
  assert.equal(b.asked.filter((a) => a.startsWith("/x/space/fav/season/list")).length, 2, "both pages read");
  assert.equal(pl.tracks.length, 23 + 30 + 2);
  assert.equal(pl.trackCount, pl.tracks.length);
  assert.deepEqual(pl.tracks.slice(0, 3).map((t) => t.id), [bv(0), bv(1), `${bv(1)}|5001`]);
  assert.equal(pl.tracks[31].id, bv(2));
  assert.deepEqual(pl.tracks.slice(-3).map((t) => t.id), [bv(23), bv(24), `${bv(24)}|6002`]);
  assert.deepEqual(pl.tracks.slice(-2).map((t) => t.duration), [40000, 50000]);
  // One view for the whole collection, one for the video it didn't list.
  assert.deepEqual(b.views().map((a) => new URLSearchParams(a.split("?")[1]).get("bvid")), [bv(0), bv(24)]);
  console.log("PASS saved collection: two pages, parts in order");
}

{ // The collection's view fails: every video is still there.
  const medias = [0, 1, 2].map((i) => ({ id: i, bvid: `BV1xx${i}000000`, title: `ep ${i}`, duration: 100 + i, upper: owner }));
  const b = bilibili({ season: { id: 5, medias, views: {} }, broken: new Set(medias.map((m) => m.bvid)) });
  const { api } = await load({ fetch: b.fetch });
  const pl = plain(await api.playlist({ id: "season:5" }));
  assert.deepEqual(pl.tracks.map((t) => [t.id, t.duration]), medias.map((m) => [m.bvid, m.duration * 1000]));
  console.log("PASS saved collection whose parts can't be found: kept as it was");
}

{ // A pasted link still lists the parts, the asked-for one first.
  const b = bilibili();
  const { api } = await load({ fetch: b.fetch });
  const { tracks } = plain(await api.search({ query: `https://www.bilibili.com/video/${target}?p=3`, kind: "tracks", offset: 0 }));
  assert.equal(tracks.length, 100);
  assert.equal(tracks[0].id, `${target}|${cids[2]}`);
  assert.equal(tracks[1].id, target);
  console.log("PASS pasted link: unchanged");
}
console.log("playlist tests passed");
