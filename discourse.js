const axios = require("axios");
const knex = require("knex");

let db, headers, host;

exports.connect = ({ dbConnection, apiKey, apiHost }) => {
  headers = {
    "Api-Key": apiKey,
    "Api-Username": "system",
  };
  host = apiHost;
  db = knex({
    connection: {
      ...dbConnection,
      ssl: { rejectUnauthorized: false },
    },
    client: "pg",
  });
};

exports.request = async (options) => {
  const { data } = await axios({
    ...options,
    url: `https://${host}${options.url}`,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  return data;
};

exports.getWithPaging = async (
  url,
  {
    mapper = (data) => data,
    startPage = 1,
    pageParamName = "page",
    pageInc = 1,
  } = {}
) => {
  let page = startPage;
  const results = [];
  while (true) {
    let data = await exports.request({
      url: url + (url.includes("?") ? "&" : "?") + `${pageParamName}=${page}`,
    });
    data = mapper(data);
    if (data.length) {
      results.push(...data);
      page += pageInc;
    } else {
      break;
    }
  }
  return results;
};

exports.fetchAllUsers = () =>
  exports.getWithPaging("/admin/users/list/active.json");

exports.fetchAllGroups = () =>
  exports.getWithPaging("/groups.json", {
    startPage: 0,
    mapper: (data) => data.groups,
  });

exports.fetchDiscordUsers = async () => {
  const data = await db("user_associated_accounts")
    .select("provider_uid", "extra", "username")
    .where({ provider_name: "discord" })
    .leftJoin("users", "user_associated_accounts.user_id", "users.id");
  return data.map(({ provider_uid, extra, username }) => ({
    discourseUsername: username,
    discordId: provider_uid,
    ...extra.raw_info,
  }));
};

exports.deleteGroup = async (id) => {
  console.log(`Deleting Discourse group ${id}`);
  try {
    await exports.request({
      url: `/admin/groups/${id}.json`,
      method: "DELETE",
    });
  } catch (err) {
    console.error("ERROR", err?.response?.data?.errors || err);
    throw err;
  }
};

exports.createGroup = async (name) => {
  console.log(`Creating Discourse group ${name}`);
  try {
    await exports.request({
      url: `/admin/groups.json`,
      method: "POST",
      data: {
        group: { name },
      },
    });
  } catch (err) {
    console.error("ERROR", err?.response?.data?.errors || err);
    throw err;
  }
};

exports.getGroupId = async (name) => {
  try {
    const data = await exports.request({ url: `/groups/${name}.json` });
    return data.group.id;
  } catch (err) {
    console.error("ERROR", err?.response?.data?.errors || err);
    throw err;
  }
};

exports.getGroupMembers = async (name) => {
  try {
    const data = await exports.getWithPaging(
      `/groups/${name}/members.json?limit=20`,
      {
        startPage: 0,
        pageInc: 20,
        pageParamName: "offset",
        mapper: (data) => data.members,
      }
    );
    return data;
  } catch (err) {
    console.error("ERROR", err?.response?.data?.errors || err);
    throw err;
  }
};

exports.removeGroupMembers = async (groupId, usernames) => {
  console.log(`Removing Discourse group ${groupId} members`);
  try {
    const data = await exports.request({
      url: `/groups/${groupId}/members.json`,
      method: "DELETE",
      data: {
        usernames: usernames.join(","),
      },
    });
    return data.success;
  } catch (err) {
    console.error("ERROR", err?.response?.data?.errors || err);
    throw err;
  }
};

exports.addGroupMembers = async (groupId, usernames) => {
  console.log(`Adding Discourse group ${groupId} members`);
  try {
    const data = await exports.request({
      url: `/groups/${groupId}/members.json`,
      method: "PUT",
      data: {
        usernames: usernames.join(","),
      },
    });
    return data.success;
  } catch (err) {
    console.error("ERROR", err?.response?.data?.errors || err);
    throw err;
  }
};

exports.cleanup = () => db.destroy();
