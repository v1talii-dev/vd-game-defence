<template>
  <section class="panel">
    <slot />
  </section>
</template>

<style scoped>
.panel {
  background: rgb(40 36 26 / 92%);
  border: 1px solid var(--c-sand);
  border-radius: 6px;
  padding: 16px;
  box-sizing: border-box;
}
</style>
