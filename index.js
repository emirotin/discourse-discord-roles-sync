require("dotenv").config();

const Promise = require("bluebird");

const discourse = require("./discourse");
const discord = require("./discord");

const main = async () => {
  const {
    client: discordClient,
    guild: discordGuild,
  } = await discord.connect();

  const {
    // discourseUsers,
    // discordMembers,
    // discordRoles,
    discourseDiscordUsers,
  } = await Promise.props({
    // discourseUsers: discourse.fetchAllUsers(),
    // discordMembers: discord.fetchMembers(discordGuild),
    // discordRoles: discord.fetchRoles(discordGuild),
    discourseDiscordUsers: discourse.fetchDiscordUsers(),
  });

  console.log(discourseDiscordUsers);

  discordClient.destroy();
  discourse.cleanup();
};

(async () => {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

/*
1) fetch discord roles
2) fetch discourse roles
3) remove unneeded discourse roles
4) add missing discourse roles
5) fetch discourse<- discord users
6) fetch discord users with roles
7) for each role:
  - find users that need it added
  - find users that need it removed
  - remove as needed
  - add as needed
*/
