export const BUILD_ID = Object.values(
  import.meta.glob("../../build-id.txt", {
    eager: true,
    as: "raw",
  })
)[0] || ""
