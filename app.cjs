import('./dist/server/entry.mjs').catch((err) => {
  console.error(err);
  process.exit(1);
});
