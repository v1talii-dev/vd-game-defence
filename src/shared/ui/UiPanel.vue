<template>
  <section class="panel">
    <slot />
  </section>
</template>

<style scoped>
.panel {
  box-sizing: border-box;
  padding: 20px 24px;
  border: var(--panel-border);
  border-radius: var(--r-lg);
  background: var(--panel-bg);
}
</style>
