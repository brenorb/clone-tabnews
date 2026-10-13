module.exports = {
  async rewrites() {
    return [{ source: "/status", destination: "/api/v1/status" }];
  },
};
