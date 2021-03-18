require("dotenv").config();

const Promise = require("bluebird");

const discourse = require("./discourse");
const discord = require("./discord");
const { symDiff } = require("./util");

const groupNamePrefix = "discord_";

/*
1) fetch discord roles
2) fetch discourse groups
3) remove unneeded discourse groups
4) add missing discourse groups
5) fetch discourse <- discord users
6) fetch discord users with roles
7) for each role:
  - find users that need it removed
  - find users that need it added
  - remove as needed
  - add as needed
*/

const main = async () => {
  const {
    client: discordClient,
    guild: discordGuild,
  } = await discord.connect();

  const {
    discordMembers,
    discordRoles,
    discourseDiscordUsers,
    discourseGroups,
  } = await Promise.props({
    discordMembers: discord.fetchMembers(discordGuild),
    discordRoles: discord.fetchRoles(discordGuild),
    discourseDiscordUsers: discourse.fetchDiscordUsers(),
    discourseGroups: discourse.fetchAllGroups(),
  });

  const discourseDiscodGroups = discourseGroups
    .filter(({ name }) => name.startsWith(groupNamePrefix))
    .map((o) => ({ ...o, discordName: o.name.slice(groupNamePrefix.length) }));

  const [groupsToRemove, groupsToCreate] = symDiff({
    arr1: discourseDiscodGroups,
    key1: "discordName",
    arr2: discordRoles,
    key2: "name",
  });

  console.log(
    "\nGroups to remove:",
    groupsToRemove.map((g) => g.discordName).join(", ") || "none"
  );
  console.log(
    "\nGroups to create:",
    groupsToCreate.map((g) => g.name).join(", ") || "none"
  );

  await Promise.mapSeries(groupsToRemove, ({ id }) =>
    discourse.deleteGroup(id)
  );
  await Promise.mapSeries(groupsToCreate, ({ name }) =>
    discourse.createGroup(`${groupNamePrefix}${name}`)
  );

  await Promise.mapSeries(discordRoles, async ({ id, name }) => {
    const roleMembers = discordMembers
      .filter(({ roles }) => roles.includes(id))
      .map(({ id }) => id);
    const targetUsers = discourseDiscordUsers
      .filter(({ discordId }) => roleMembers.includes(discordId))
      .map(({ discourseUsername }) => discourseUsername);

    console.log(`\nGroup "${name}"`);

    const discourseGroupName = groupNamePrefix + name;

    const currentUsers = (
      await discourse.getGroupMembers(discourseGroupName)
    ).map(({ username }) => username);

    const [usersToRemove, usersToAdd] = symDiff({
      arr1: currentUsers,
      arr2: targetUsers,
    });

    if (!usersToRemove.length && !usersToAdd.length) {
      console.log("Nothing to do");
      return;
    }

    console.log("Users to remove:", usersToRemove.join(", ") || "none");
    console.log("Users to add:", usersToAdd.join(", ") || "none");

    const groupId = await discourse.getGroupId(discourseGroupName);

    if (usersToRemove.length) {
      await discourse.removeGroupMembers(groupId, usersToRemove);
    }

    if (usersToAdd.length) {
      await discourse.addGroupMembers(groupId, usersToAdd);
    }
  });

  discordClient.destroy();
  discourse.cleanup();

  console.log("All done");
};

(async () => {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
