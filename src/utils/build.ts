export const BUILD_ID = Object.values(
  import.meta.glob("../../.BUILD_ID.txt", {
    eager: true,
    as: "raw",
  })
)[0] || ""
