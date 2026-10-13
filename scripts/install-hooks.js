async function install() {
  if (
    process.env.CI ||
    process.env.NODE_ENV === "production" ||
    process.env.HUSKY === "0"
  )
    return;
  const { default: husky } = await import("husky");
  const message = husky();
  if (message) console.warn(message);
}

install().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
