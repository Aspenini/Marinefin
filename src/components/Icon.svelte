<script lang="ts">
  import { icons } from '../lib/icons';

  let { name, size = 20, filled = false }: { name: keyof typeof icons; size?: number; filled?: boolean } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={filled ? 'currentColor' : 'none'}
  stroke={filled ? 'none' : 'currentColor'}
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {@html icons[name] ?? ''}
</svg>
