import { MOCK_DASHBOARD_RECORDS } from "./mock-fixtures.mjs";

export const createMockDashboardSource = () => Object.freeze({
  async load() {
    return MOCK_DASHBOARD_RECORDS.map((record) => ({ ...record }));
  },
});
