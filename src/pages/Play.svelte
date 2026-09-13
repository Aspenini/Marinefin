<script lang="ts">
  import VideoPlayer from '../components/VideoPlayer.svelte';
  import { api } from '../lib/api';
  import { isAudioItem } from '../lib/format';
  import { player } from '../lib/player.svelte';
  import { router } from '../lib/router.svelte';
  import type { BaseItem } from '../lib/types';

  let next = $state<BaseItem | null>(null);
  let ready = $state(false);

  const id = $derived(router.current.params.id);

  async function boot() {
    if (!id) return;
    ready = false;
    next = null;
    try {
      const item = await api.item(id);
      if (isAudioItem(item)) {
        await player.startAudio([item], 0);
        router.replace(`/item/${item.AlbumId || item.Id}`);
        return;
      }
      const startOver = router.current.query.t === '0';
      await player.startVideo(item, { startTicks: startOver ? 0 : item.UserData?.PlaybackPositionTicks });
      if (item.Type === 'Episode' && item.SeriesId) {
        const eps = await api.episodes(item.SeriesId, { AdjacentTo: item.Id }).catch(() => null);
        const list = eps?.Items ?? [];
        const idx = list.findIndex((e) => e.Id === item.Id);
        next = idx >= 0 ? list[idx + 1] ?? null : null;
        if (!next) {
          const all = await api.episodes(item.SeriesId, { SortBy: 'ParentIndexNumber,IndexNumber' }).catch(() => null);
          const arr = all?.Items ?? [];
          const i = arr.findIndex((e) => e.Id === item.Id);
          next = i >= 0 ? arr[i + 1] ?? null : null;
        }
      }
    } catch (e) {
      player.error = e instanceof Error ? e.message : 'Could not start playback.';
    } finally {
      ready = true;
    }
  }

  $effect(() => {
    void id;
    void boot();
  });
</script>

<VideoPlayer nextEpisode={next} onEnded={() => router.go(player.video ? `/item/${player.video.item.Id}` : '/home')} />
