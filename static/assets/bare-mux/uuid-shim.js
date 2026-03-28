/* Bare-mux v1 bare.cjs expects globalThis.uuid (Node provides via require("uuid")). */
globalThis.uuid = {
  v4: () => crypto.randomUUID(),
};
