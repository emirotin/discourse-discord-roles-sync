const axios = require("axios");
const knex = require("knex");

const db = knex({
  connection: {
    host: process.env.DISCOURSE_DB_HOST,
    user: process.env.DISCOURSE_DB_USER,
    password: process.env.DISCOURSE_DB_PASSWORD,
    database: process.env.DISCOURSE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  },
  client: "pg",
});

const apiKey = process.env.DISCOURSE_API_KEY;
const host = process.env.DISCOURSE_HOST;

const headers = {
  "Api-Key": apiKey,
  "Api-Username": "system",
};

exports.request = async (options) => {
  const { data } = await axios({
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  return data;
};

exports.getWithPaging = async (url) => {
  let page = 1;
  const results = [];
  while (true) {
    const data = await exports.request({
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

exports.fetchAllUsers = () =>
  getWithPaging(`https://${host}/admin/users/list/active.json`);

exports.fetchDiscordUsers = async () => {
  const data = await db("user_associated_accounts")
    .select("provider_uid", "extra")
    .where({ provider_name: "discord" });
  return data.map(({ provider_uid, extra }) => ({
    discordId: provider_uid,
    ...extra.raw_info,
  }));
};

exports.cleanup = () => db.destroy();
