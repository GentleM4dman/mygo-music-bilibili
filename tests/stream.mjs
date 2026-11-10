// Picking a mirror for the app: each is asked for one byte, in order, and the
// first that answers is played. Offline: Bilibili's API and CDN are faked.
import assert from "node:assert/strict";
import { load } from "./harness.mjs";

const id = "BV1xx411c7mD";
const upos = "https://upos-sz-mirrorcos.bilivideo.com/audio.m4s?sig=1";
const uposAgain = "https://upos-sz-mirrorcos.bilivideo.com/audio.m4s?sig=2";
const backup = "https://upos-sz-mirrorhw.bilivideo.com/audio.m4s?sig=3";
const elsewhere = "https://abc.edge.example.cn:4483/audio.m4s?sig=4";

const cases = [
  { name: "the first answers", quality: "high", answers: { [upos]: 206 }, picked: upos, asked: [upos] },
  { name: "the first can't be reached", quality: "high", answers: { [upos]: "down", [backup]: 206 }, picked: backup, asked: [upos, backup] },
  { name: "the first refuses", quality: "lossless", answers: { [upos]: 403, [backup]: 200 }, picked: backup, asked: [upos, backup] },
  { name: "none answers", quality: "lossless", answers: { [upos]: 403, [backup]: 503 }, picked: upos, asked: [upos, backup] },
  {
    name: "one host listed twice is asked once",
    quality: "high",
    backups: [uposAgain, backup],
    answers: { [upos]: "down", [backup]: 206 },
    picked: backup,
    asked: [upos, backup],
  },
  {
    name: "a host the plugin can't reach isn't asked",
    quality: "high",
    backups: [elsewhere, backup],
    answers: { [upos]: "down", [backup]: 206 },
    picked: backup,
    asked: [upos, backup],
  },
];

for (const { name, quality, backups = [backup], answers, picked, asked } of cases) {
  const probes = [];
  const track = { baseUrl: upos, backupUrl: backups, codecs: "mp4a.40.2", bandwidth: 192000 };
  const { api } = await load({
    fetch: async (url, init) => {
      if (new URL(url).hostname !== "api.bilibili.com") {
        probes.push({ url, ...init });
        const answer = answers[url];
        if (answer === undefined) throw new Error(`asked ${url}`);
        if (answer === "down") throw new TypeError("connection failed");
        return new Response(null, { status: answer });
      }
      const { pathname } = new URL(url);
      if (pathname === "/x/frontend/finger/spi") return Response.json({ code: 0, data: { b_3: "B3", b_4: "B4" } });
      if (pathname === "/x/web-interface/nav") return Response.json({ code: -101 });
      if (pathname === "/x/web-interface/view") return Response.json({ code: 0, data: { bvid: id, cid: 99 } });
      if (pathname.endsWith("/playurl")) return Response.json({ code: 0, data: { dash: { audio: [track], flac: { audio: track } } } });
      throw new Error(`unexpected request ${pathname}`);
    },
  });

  const result = await api.stream({ id, quality });
  assert.equal(result.url, picked, name);
  assert.equal(result.type, "m4a", name);
  assert.equal(result.quality, quality, name);
  assert.equal(result.headers.Range, undefined, name);
  assert.deepEqual(probes.map(({ url }) => url), asked, name);
  for (const { headers, signal } of probes) {
    assert.equal(headers.Range, "bytes=0-0", name);
    assert.equal(headers.Referer, result.headers.Referer, name);
    // Every probe is cut off once answered, so no body is left downloading.
    assert.equal(signal.aborted, true, name);
  }
}
console.log("stream mirror tests passed");
