const axios = require("axios");

const apiKey = process.env.DISCOURSE_API_KEY;

const headers = {
  "Api-Key": apiKey,
  "Api-Username": "system",
};

const request = async (options) => {
  const { data } = await axios({
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  return data;
};

const getWithPaging = async (url) => {
  let page = 1;
  const results = [];
  while (true) {
    const data = await request({
      url: url + (url.includes("?") ? "&" : "?") + `page=${page}`,
    });
    if (data.length) {
      results.push(...data);
      page += 1;
    } else {
      break;
    }
  }
  return results;
};

module.exports = {
  request,
  getWithPaging,
};
