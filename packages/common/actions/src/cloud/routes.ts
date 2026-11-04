// @generated
const routes = {
  deleteCloud: {
    id: "cloud.delete",
    invalidates: ["cloud.get"],
    method: "DELETE",
    path: "/api/cloud/session",
  },
  getCloud: {
    id: "cloud.get",
    invalidates: [],
    method: "GET",
    path: "/api/cloud/session",
  },
  setCloud: {
    id: "cloud.set",
    invalidates: ["cloud.get"],
    method: "PUT",
    path: "/api/cloud/session",
  },
} as const;

export { routes };
