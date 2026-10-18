<template>
  <section class="panel">
    <slot />
  </section>
</template>

<style scoped>
.panel {
  --edge: 14px;
  position: relative;
  box-sizing: border-box;
  padding: 20px 24px;
  clip-path: polygon(
    var(--edge) 0,
    100% 0,
    100% calc(100% - var(--edge)),
    calc(100% - var(--edge)) 100%,
    0 100%,
    0 var(--edge)
  );
  background:
    linear-gradient(180deg, rgb(255 255 255 / 5%), transparent 40%),
    repeating-linear-gradient(135deg, transparent 0 6px, rgb(0 0 0 / 12%) 6px 7px),
    linear-gradient(160deg, var(--c-steel-700), var(--c-steel-900));
  box-shadow:
    inset 0 0 0 2px var(--c-brass),
    inset 0 0 0 3px rgb(0 0 0 / 60%),
    inset 0 0 40px rgb(0 0 0 / 45%);
}
</style>
