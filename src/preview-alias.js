export default {
  fetch(request, env) {
    return env.STOREFRONT.fetch(request);
  },
};
