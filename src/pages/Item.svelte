<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import Poster from '../components/Poster.svelte';
  import Row from '../components/Row.svelte';
  import { api } from '../lib/api';
  import {
    episodeLabel,
    formatBitrate,
    formatBytes,
    formatClock,
    formatDate,
    formatDuration,
    formatRating,
    formatYear,
    isAudioItem,
    ticksToSeconds,
  } from '../lib/format';
  import { player } from '../lib/player.svelte';
  import { router } from '../lib/router.svelte';
  import type { BaseItem } from '../lib/types';

  let item = $state<BaseItem | null>(null);
  let similar = $state<BaseItem[]>([]);
  let seasons = $state<BaseItem[]>([]);
  let episodes = $state<BaseItem[]>([]);
  let tracks = $state<BaseItem[]>([]);
  let extras = $state<BaseItem[]>([]);
  let trailers = $state<BaseItem[]>([]);
  let albums = $state<BaseItem[]>([]);
  let seasonId = $state('');
  let loading = $state(true);
  let error = $state('');
  let lightbox = $state('');
  let busyFav = $state(false);
  let busyPlayed = $state(false);

  const id = $derived(router.current.params.id);
  const backdrop = $derived(item ? api.imageUrl(item, 'Backdrop', { w: 1920 }) || api.imageUrl(item, 'Primary', { w: 800 }) : '');
  const poster = $derived(item ? api.imageUrl(item, 'Primary', { w: 480 }) : '');
  const logo = $derived(item ? api.imageUrl(item, 'Logo', { w: 640 }) : '');
  const resume = $derived((item?.UserData?.PlaybackPositionTicks ?? 0) > 10_000_000 && !item?.UserData?.Played);
  const people = $derived(item?.People ?? []);
  const cast = $derived(people.filter((p) => p.Type === 'Actor').slice(0, 16));
  const crew = $derived(people.filter((p) => p.Type !== 'Actor').slice(0, 8));

  async function load() {
    if (!id) return;
    loading = true;
    error = '';
    item = null;
    similar = [];
    seasons = [];
    episodes = [];
    tracks = [];
    extras = [];
    trailers = [];
    albums = [];
    try {
      const it = await api.item(id);
      item = it;
      const jobs: Promise<void>[] = [];
      jobs.push(
        api.similar(id).then((r) => {
          similar = r.Items ?? [];
        }).catch(() => undefined),
      );
      if (it.Type === 'Series') {
        jobs.push(
          api.seasons(it.Id).then((r) => {
            seasons = (r.Items ?? []).filter((s) => s.Type === 'Season');
            const next = seasons.find((s) => (s.UserData?.UnplayedItemCount ?? 0) > 0) ?? seasons[0];
            if (next) void loadSeason(next.Id);
          }),
        );
      } else if (it.Type === 'Season' && it.SeriesId) {
        jobs.push(loadSeason(it.Id));
      } else if (it.Type === 'MusicAlbum' || it.Type === 'Playlist' || it.Type === 'BoxSet' || it.Type === 'PhotoAlbum') {
        jobs.push(
          api.items({ ParentId: it.Id, SortBy: it.Type === 'MusicAlbum' ? 'ParentIndexNumber,IndexNumber' : 'SortName' }).then((r) => {
            tracks = r.Items ?? [];
          }),
        );
      } else if (it.Type === 'MusicArtist') {
        jobs.push(
          api.items({ ArtistIds: it.Id, IncludeItemTypes: 'MusicAlbum', Recursive: true, SortBy: 'PremiereDate', SortOrder: 'Descending' }).then((r) => {
            albums = r.Items ?? [];
          }),
        );
        jobs.push(
          api.items({ ArtistIds: it.Id, IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'CommunityRating,PlayCount', Limit: 40 }).then((r) => {
            tracks = r.Items ?? [];
          }),
        );
      }
      if (it.LocalTrailerCount) {
        jobs.push(
          api.localTrailers(it.Id).then((r) => {
            trailers = r ?? [];
          }).catch(() => undefined),
        );
      }
      if (it.SpecialFeatureCount) {
        jobs.push(
          api.specialFeatures(it.Id).then((r) => {
            extras = r ?? [];
          }).catch(() => undefined),
        );
      }
      await Promise.all(jobs);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not load this title.';
    } finally {
      loading = false;
    }
  }

  async function loadSeason(sid: string) {
    if (!item) return;
    seasonId = sid;
    const seriesId = item.Type === 'Series' ? item.Id : item.SeriesId;
    if (!seriesId) return;
    const r = await api.episodes(seriesId, { SeasonId: sid });
    episodes = r.Items ?? [];
  }

  function playItem(target: BaseItem = item!, startOver = false) {
    if (!target) return;
    if (target.Type === 'Series') {
      const nxt = episodes.find((e) => !e.UserData?.Played) || episodes[0];
      if (nxt) router.go(`/play/${nxt.Id}`);
      return;
    }
    if (target.Type === 'Photo') {
      lightbox = api.imageUrl(target, 'Primary', { w: 2000 });
      return;
    }
    if (isAudioItem(target)) {
      const list = tracks.length ? tracks : [target];
      const idx = list.findIndex((t) => t.Id === target.Id);
      void player.startAudio(list, idx < 0 ? 0 : idx);
      return;
    }
    if (target.Type === 'MusicAlbum' || target.Type === 'Playlist') {
      void player.startAudio(tracks, 0);
      return;
    }
    const q = startOver ? '?t=0' : '';
    router.go(`/play/${target.Id}${q}`);
  }

  async function toggleFav() {
    if (!item) return;
    busyFav = true;
    const on = !item.UserData?.IsFavorite;
    try {
      await api.favorite(item.Id, on);
      item = { ...item, UserData: { ...item.UserData, IsFavorite: on } };
    } finally {
      busyFav = false;
    }
  }

  async function togglePlayed() {
    if (!item) return;
    busyPlayed = true;
    const on = !item.UserData?.Played;
    try {
      await api.played(item.Id, on);
      item = { ...item, UserData: { ...item.UserData, Played: on, PlaybackPositionTicks: on ? item.RunTimeTicks : 0 } };
    } finally {
      busyPlayed = false;
    }
  }

  $effect(() => {
    void id;
    void load();
  });
</script>

{#if loading}
  <div class="page flush"><div class="skel banner"></div></div>
{:else if error || !item}
  <div class="page"><div class="empty"><h3>Not found</h3><p>{error}</p></div></div>
{:else}
  <div class="page flush">
    <section class="mast">
      {#if backdrop}<img class="bg" src={backdrop} alt="" />{/if}
      <div class="wash"></div>
      <div class="body">
        {#if poster}
          <img class="poster" src={poster} alt="" />
        {/if}
        <div class="info">
          {#if item.SeriesName && item.Type !== 'Series'}
            <a class="eyebrow" href={`#/item/${item.SeriesId}`}>{item.SeriesName}</a>
          {:else}
            <p class="eyebrow">{item.Type}</p>
          {/if}
          {#if logo && item.Type !== 'Episode'}
            <img class="logo" src={logo} alt={item.Name} />
          {:else}
            <h1 class="display">{item.Name}</h1>
          {/if}
          {#if item.Taglines?.[0]}<p class="tag">{item.Taglines[0]}</p>{/if}
          <p class="facts">
            {#if formatYear(item)}<span>{formatYear(item)}</span>{/if}
            {#if item.OfficialRating}<span>{item.OfficialRating}</span>{/if}
            {#if item.CommunityRating}<span class="gold"><Icon name="star" size={13} /> {formatRating(item.CommunityRating)}</span>{/if}
            {#if item.CriticRating}<span>RT {Math.round(item.CriticRating)}%</span>{/if}
            {#if item.RunTimeTicks}<span>{formatDuration(item.RunTimeTicks)}</span>{/if}
            {#if item.Status}<span>{item.Status}</span>{/if}
            {#if item.ChildCount}<span>{item.ChildCount} items</span>{/if}
          </p>
          {#if item.Genres?.length}
            <div class="chip-row">
              {#each item.Genres as g}<span class="chip">{g}</span>{/each}
            </div>
          {/if}
          {#if item.Overview}<p class="syn">{item.Overview}</p>{/if}
          <div class="acts">
            <button class="btn primary" onclick={() => playItem(item!, false)}>
              <Icon name="play" size={16} />
              {#if item.Type === 'Series'}Play next
              {:else if resume}Resume {formatClock(ticksToSeconds(item.UserData?.PlaybackPositionTicks))}
              {:else if isAudioItem(item) || item.Type === 'MusicAlbum' || item.Type === 'Playlist'}Play
              {:else}Play{/if}
            </button>
            {#if resume}
              <button class="btn ghost" onclick={() => playItem(item!, true)}>Play from start</button>
            {/if}
            {#if trailers[0]}
              <button class="btn ghost" onclick={() => router.go(`/play/${trailers[0].Id}`)}>Trailer</button>
            {:else if item.RemoteTrailers?.[0]}
              <a class="btn ghost" href={item.RemoteTrailers[0].Url} target="_blank" rel="noreferrer">Trailer</a>
            {/if}
            <button class="btn ghost icon" onclick={toggleFav} disabled={busyFav} aria-label="Favorite">
              <Icon name={item.UserData?.IsFavorite ? 'heartFill' : 'heart'} />
            </button>
            <button class="btn ghost icon" onclick={togglePlayed} disabled={busyPlayed} aria-label="Watched">
              <Icon name={item.UserData?.Played ? 'mark' : 'check'} />
            </button>
          </div>
          {#if crew.length}
            <p class="crew">
              {#each crew as p, i}{i ? ' · ' : ''}{p.Type}: <a href={`#/person/${p.Id}`}>{p.Name}</a>{/each}
            </p>
          {/if}
        </div>
      </div>
    </section>

    <div class="pad">
      {#if item.Type === 'Series' && seasons.length}
        <div class="section-head"><h2>Episodes</h2></div>
        <div class="chip-row">
          {#each seasons as s}
            <button class="chip" class:on={seasonId === s.Id} onclick={() => loadSeason(s.Id)}>
              {s.Name}{#if s.UserData?.UnplayedItemCount} · {s.UserData.UnplayedItemCount}{/if}
            </button>
          {/each}
        </div>
        <div class="eps">
          {#each episodes as ep}
            <button class="ep" onclick={() => playItem(ep)}>
              <div class="thumb">
                {#if api.imageUrl(ep, 'Primary', { w: 480 })}
                  <img src={api.imageUrl(ep, 'Primary', { w: 480 })} alt="" />
                {/if}
                <span class="play"><Icon name="play" size={16} /></span>
                {#if ep.UserData?.Played}<i class="done"><Icon name="check" size={12} /></i>{/if}
                {#if (ep.UserData?.PlayedPercentage ?? 0) > 2}
                  <div class="progress-line bar"><i style="width:{ep.UserData?.PlayedPercentage}%"></i></div>
                {/if}
              </div>
              <div>
                <strong>{episodeLabel(ep)}</strong>
                <small>{formatDuration(ep.RunTimeTicks)}{#if ep.PremiereDate} · {formatDate(ep.PremiereDate)}{/if}</small>
                <p>{ep.Overview || ''}</p>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      {#if item.Type === 'Season'}
        <div class="eps">
          {#each episodes as ep}
            <button class="ep" onclick={() => playItem(ep)}>
              <div class="thumb">
                {#if api.imageUrl(ep, 'Primary', { w: 480 })}<img src={api.imageUrl(ep, 'Primary', { w: 480 })} alt="" />{/if}
              </div>
              <div>
                <strong>{episodeLabel(ep)}</strong>
                <p>{ep.Overview || ''}</p>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      {#if item.Type === 'MusicAlbum' || item.Type === 'Playlist' || item.Type === 'MusicArtist'}
        {#if albums.length}
          <Row title="Albums" items={albums} />
        {/if}
        {#if tracks.length}
          <div class="section-head"><h2>{item.Type === 'Playlist' ? 'Tracks' : 'Songs'}</h2></div>
          <div class="tracks">
            {#each tracks as t, i}
              <button class="tr" onclick={() => playItem(t)}>
                <span class="n">{t.IndexNumber ?? i + 1}</span>
                <span class="tn">{t.Name}</span>
                <span class="ta">{t.AlbumArtist || t.Artists?.[0] || ''}</span>
                <span class="tt">{formatClock(ticksToSeconds(t.RunTimeTicks))}</span>
              </button>
            {/each}
          </div>
        {/if}
      {/if}

      {#if item.Type === 'BoxSet' || item.Type === 'PhotoAlbum'}
        <div class="grid {item.Type === 'PhotoAlbum' ? 'wide' : ''}">
          {#each tracks as child (child.Id)}
            {#if child.Type === 'Photo'}
              <button class="photo" onclick={() => (lightbox = api.imageUrl(child, 'Primary', { w: 2000 }))}>
                <img src={api.imageUrl(child, 'Primary', { w: 600 })} alt={child.Name} />
              </button>
            {:else}
              <Poster item={child} />
            {/if}
          {/each}
        </div>
      {/if}

      {#if item.MediaStreams?.length && (item.Type === 'Movie' || item.Type === 'Episode' || item.Type === 'Video')}
        <div class="section-head"><h2>Technical</h2></div>
        <div class="tech">
          {#each item.MediaStreams.filter((s) => s.Type === 'Video' || s.Type === 'Audio') as s}
            <div>
              <strong>{s.Type}</strong>
              <span>{s.DisplayTitle || [s.Codec, s.Width && `${s.Width}×${s.Height}`, s.Language, s.ChannelLayout].filter(Boolean).join(' · ')}</span>
            </div>
          {/each}
          {#if item.Container}<div><strong>Container</strong><span>{item.Container}{#if item.MediaSources?.[0]?.Size} · {formatBytes(item.MediaSources[0].Size)}{/if}{#if item.MediaSources?.[0]?.Bitrate} · {formatBitrate(item.MediaSources[0].Bitrate)}{/if}</span></div>{/if}
        </div>
      {/if}

      {#if cast.length}
        <div class="section-head"><h2>Cast</h2></div>
        <div class="cast">
          {#each cast as p}
            <a class="person" href={`#/person/${p.Id}`}>
              {#if p.PrimaryImageTag}
                <img src={api.personImage(p)} alt="" />
              {:else}
                <div class="ph">{p.Name.slice(0, 1)}</div>
              {/if}
              <strong>{p.Name}</strong>
              <small>{p.Role || p.Type}</small>
            </a>
          {/each}
        </div>
      {/if}

      {#if extras.length}<Row title="Special features" items={extras} landscape />{/if}
      {#if similar.length}<Row title="More like this" items={similar} />{/if}
    </div>
  </div>
{/if}

{#if lightbox}
  <button class="lb" onclick={() => (lightbox = '')}>
    <img src={lightbox} alt="" />
  </button>
{/if}

<style>
  .banner { height: 70vh; border-radius: 0; }
  .mast { position: relative; min-height: 78vh; display: flex; align-items: flex-end; }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .wash {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(6, 8, 13, 0.92) 12%, rgba(6, 8, 13, 0.4) 60%, transparent),
      linear-gradient(to top, var(--bg), transparent 48%);
  }
  .body {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 28px;
    padding: 120px 36px 40px;
    width: 100%;
  }
  .poster { width: 220px; border-radius: 14px; box-shadow: var(--shadow); }
  .logo { max-width: 380px; max-height: 120px; object-fit: contain; object-position: left; margin: 8px 0; }
  h1 { margin: 4px 0 8px; font-size: clamp(36px, 5vw, 64px); }
  .tag { font-style: italic; color: var(--accent-2); margin: 0 0 8px; }
  .facts { display: flex; flex-wrap: wrap; gap: 12px; color: var(--muted); }
  .gold { color: var(--gold); display: inline-flex; gap: 4px; align-items: center; }
  .syn { max-width: 68ch; color: #d0dbe2; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
  .crew { color: var(--muted); font-size: 13px; }
  .crew a:hover { color: var(--accent); }
  .pad { padding: 10px 36px 60px; }
  .eps { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
  .ep {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 14px;
    padding: 8px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    text-align: left;
  }
  .ep:hover { background: rgba(255, 255, 255, 0.04); }
  .thumb { position: relative; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; background: #111820; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .play {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--accent);
    color: #04211c;
    display: grid;
    place-items: center;
    opacity: 0;
  }
  .ep:hover .play { opacity: 1; }
  .done { position: absolute; top: 8px; right: 8px; color: var(--accent); }
  .bar { position: absolute; left: 8px; right: 8px; bottom: 8px; }
  .ep strong { display: block; }
  .ep small { color: var(--muted); }
  .ep p {
    margin: 6px 0 0;
    color: var(--muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tracks { display: flex; flex-direction: column; }
  .tr {
    display: grid;
    grid-template-columns: 40px 1fr 1fr 70px;
    gap: 10px;
    align-items: center;
    padding: 10px 8px;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: none;
    text-align: left;
  }
  .tr:hover { background: rgba(255, 255, 255, 0.04); }
  .n, .tt { color: var(--muted); font-variant-numeric: tabular-nums; }
  .ta { color: var(--muted); }
  .cast { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 14px; }
  .person strong, .person small { display: block; }
  .person small { color: var(--muted); }
  .person img, .ph {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 50%;
    background: #151c24;
    display: grid;
    place-items: center;
    margin-bottom: 8px;
  }
  .tech { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .tech strong { display: block; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .photo { padding: 0; border: 0; background: none; border-radius: 12px; overflow: hidden; }
  .photo img { width: 100%; aspect-ratio: 1; object-fit: cover; }
  .lb {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(0, 0, 0, 0.88);
    border: 0;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .lb img { max-width: 100%; max-height: 100%; object-fit: contain; }
  @media (max-width: 800px) {
    .body { grid-template-columns: 1fr; padding: 100px 16px 28px; }
    .poster { width: 140px; }
    .ep { grid-template-columns: 1fr; }
    .pad { padding: 10px 16px 60px; }
    .tr { grid-template-columns: 28px 1fr 48px; }
    .ta { display: none; }
  }
</style>
