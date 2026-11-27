# 哔哩哔哩 for MyGo Music

在 [MyGo Music](https://github.com/egoist/mygo-music) 里听 B站视频的音轨：搜索、粘贴链接、B站音乐榜、分区排行、多P和合集、收藏夹、历史、评论、字幕歌词。仅供个人收听，与哔哩哔哩官方无关；用的是网页端接口，B站改接口时可能失效。

[English](#english)

## 安装

1. 安装插件：点这个链接 [mygo-music://install-plugin?repo=hhym/mygo-music-bilibili](mygo-music://install-plugin?repo=hhym/mygo-music-bilibili)，或在「设置 → 插件 → +」里粘贴 `https://github.com/hhym/mygo-music-bilibili`。
2. 登录：点登录会打开B站自己的登录页，可以用哔哩哔哩 App 扫码，也可以用短信验证码或密码，手机不在身边也能登。

需要 MyGo Music 0.1.21 及以上：从这个版本起 MyGo 能直接播放 B站的音轨（分片 MP4 里的 AAC 和 FLAC），不用另外装什么。

少数视频只有 HE-AAC 音轨，MyGo 还解不了，要靠 [ffmpeg](https://ffmpeg.org) 解码后播放。想听这类视频的话：

```bash
brew install ffmpeg            # macOS
winget install Gyan.FFmpeg     # Windows（在终端里运行，装完重启 MyGo Music）
sudo apt install ffmpeg        # Debian / Ubuntu，其他发行版用各自的包管理器
```

再在「设置 → 插件」里允许哔哩哔哩启动程序。它只会启动 ffmpeg，位置限定为 PATH、`/opt/homebrew/bin` 或 `/usr/local/bin`。没装 ffmpeg 时，播到这类视频会提示怎么安装。

## 能做什么

插件保留B站原本的样子：曲名就是视频标题，「歌手」是 UP 主，「专辑」是一个视频的全部分P或它所属的合集，「歌单」是收藏夹。MyGo 的「歌曲 / 歌手 / 专辑 / 歌单」这些叫法是 App 定的，插件改不了。


- **不登录**：搜视频和 UP 主；在搜索框粘贴视频链接、b23.tv 短链、BV 号或 av 号（带 `?p=3` 时那一P排最前）；B站音乐榜（周榜）；音乐区热门；音乐区新鲜投稿（每次打开都不一样）；排行榜页里还有全站排行榜、综合热门和入站必刷；多P视频当专辑，每P一首；单P视频属于合集时，专辑页列出整个合集；UP 主的页面：最新 500 个投稿，「专辑」里是 ta 的合集和系列；评论第一页；「相关推荐」电台。
- **有声书目录**：从石头听书站群抓取书目卡片；文章内嵌 B 站播放器，打开后按 B 站分 P 作为剧集，播放仍走本插件的 B 站音轨链路，不重复接入石头自己的下载地址。首页和分类页仅保留「下一页」链接卡片，电影、电视剧、动漫、综艺、铃声等其他分类快捷入口不再显示。
- **登录后**：默认收藏夹作为「喜欢」；其他收藏夹和收藏的合集作为歌单，歌单里的多P视频按顺序展开成每P一首，能一P接一P连续播放，搜索的「歌单」标签会在这些收藏夹里按名字找；侧边栏的「收藏合集」页：按收藏夹分组，每个视频一张封面卡片（每个收藏夹先显示 20 个，「查看全部」看全部），点开就是它的分P专辑页，收藏的合集在最后的「订阅的合集」里；收藏夹的排列顺序可以在「设置 → 插件 → 哔哩哔哩 → 收藏合集顺序」里填收藏夹名称（逗号隔开，如 `音乐合集, 默认收藏夹`）来调整，只改 MyGo 里的显示，不动 B站上的收藏夹；往自己的收藏夹里加歌、删歌，新建和重命名收藏夹；历史记录；首页推荐和「首页推荐」电台；关注 UP 主；侧边栏的「关注」页：关注的 UP 主最新投稿（按发布时间，新的在前）和关注列表；全部评论、点赞和发评论；视频带有字幕轨时把字幕当歌词（UP 主上传的优先，其次是 B站 AI 字幕；同时有外语和中文字幕时，外语作歌词、中文作翻译）。烧在画面里的字幕提取不了。
- **音质**：播放的是 B站原始的 AAC，由 MyGo 直接从 B站服务器读取，不重新压缩。高是最高的一档（一般 192 kbps 左右），标准是 132 kbps 左右的一档。无损会播放 Hi-Res 稿件的 FLAC，需要大会员；拿不到时退回高。只有 HE-AAC 音轨的视频由 ffmpeg 解码成 WAV 播放，不再二次有损压缩，拖动进度条也快；代价是缓存较大（一小时约 600 MB）。

## 登录与隐私

登录后的 Cookie 以明文保存在本机这个插件的数据目录里，只发给 B站。在 App 里退出登录只会删掉本机保存的这份；要让这次登录在 B站那边失效，请在哔哩哔哩 App 的登录设备管理里下线。

## 开发

```bash
npm test            # 离线测试登录（网页登录和扫码）、字幕歌词、播放、歌单分P展开和「收藏合集」页
npm run test:live   # 不登录，用真实的 B站接口把各功能跑一遍
npm run test:signed-in  # 用 MyGo 里已保存的登录只读地试字幕歌词（只在本机读取，不打印、不写入）
```

测试在 Node 22+ 里加载 `index.js`，用一个模拟的 `host` 代替 MyGo Music 提供的宿主对象。

---

## English

Plays the audio of Bilibili videos in [MyGo Music](https://github.com/egoist/mygo-music). For personal listening; not affiliated with Bilibili. It uses the website's own API and may stop working when that changes.

**Install** with [mygo-music://install-plugin?repo=hhym/mygo-music-bilibili](mygo-music://install-plugin?repo=hhym/mygo-music-bilibili). Needs MyGo Music 0.1.21 or later, which plays Bilibili's audio (AAC or FLAC in fragmented MP4) itself, with nothing else to install.

A few videos have only HE-AAC, which MyGo Music doesn't decode yet. Those play through [ffmpeg](https://ffmpeg.org), which decodes them: install it with `brew install ffmpeg` on macOS, `winget install Gyan.FFmpeg` on Windows (then restart MyGo Music), or your package manager on Linux, and in Settings > Plugins allow Bilibili to start programs. It only starts ffmpeg, from the PATH, `/opt/homebrew/bin` or `/usr/local/bin`. Without it, those videos say how to install it.

**Signed out**: search videos and uploaders, paste links (`bilibili.com/video/…`, `b23.tv/…`, BV or av IDs), the weekly Bilibili Music Chart, what's trending and what's new in the music category, and on the Charts page the whole site's ranking, what's popular now and Bilibili's must-see classics, a video's parts (or its collection) as an album, an uploader's latest 500 videos, with their collections and series as albums, the first page of comments, and a station of related videos.

**Audiobook directory**: browse book cards from the Shitou audiobook station; home and category pages keep only a single next-page link card, while movie, TV, anime, variety, ringtone and other category shortcut cards are hidden. Each article embeds a Bilibili player; opening a book lists that video's parts as episodes, and playback still uses this plugin's normal Bilibili audio path instead of Shitou's own download links.

**Signed in** (on Bilibili's own sign-in page, in a window of the app: scan its QR code with the Bilibili app, or use a text message or password): your default favorites folder as Liked, other folders and saved collections as playlists, a video's parts in them one track each, in order, so they play through (the Playlists search tab finds them by name), a Saved Collections page in the sidebar with each folder's videos as cards (twenty a folder, See All for the rest) that open to their parts, and saved collections last; the folders' order there can be set in Settings > Plugins > Bilibili > Saved Collections order (folder names, comma-separated), in MyGo only, editing your own folders, history, recommendations, following uploaders, a Following page in the sidebar with the latest videos of who you follow (newest first) and the list of them, all comments, liking and posting comments, and a video's subtitle track as lyrics (the uploader's first, then Bilibili's AI ones; with a foreign-language and a Chinese track, the Chinese is shown as the translation). Subtitles burned into the picture can't be read.

**Quality**: Bilibili's own AAC, which MyGo Music reads from Bilibili's servers, not re-encoded: High is its best (usually about 192 kbps), Standard one of about 132 kbps. Lossless plays the FLAC of Hi-Res uploads (needs a premium account) and falls back to High. Videos with only HE-AAC are decoded to WAV by ffmpeg: no second lossy encoding, and quick to seek, but large to cache (about 600 MB an hour).

**Privacy**: the session's cookies are kept unencrypted in the plugin's data on this machine and are only sent to Bilibili. Signing out forgets them here. To end the session on Bilibili's side, log out the device in the Bilibili app.

## License

MIT
